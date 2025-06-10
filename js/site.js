// js/site.js
// Code base and prototype designed by ChatGPT
// Enhanced with detailed comments for clarity and maintainability

// Toggle date-picker on/off for debugging and UX control
const ENABLE_DATE_PICKER = true;

// NOAA Tides & Currents API base endpoint for data retrieval
const API_BASE   = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
// Station ID for Santa Cruz; change to target a different location
const STATION_ID = '9413745';
// Height threshold in feet for determining if tidepooling conditions are 'good'
const THRESHOLD  = 1.5;
// Look-ahead window (in hours) for the next low tide check
const LOOK_AHEAD = 12;

// Utility: format a Date object into 'YYYYMMDD' string for the API
function formatYYYYMMDD(d) {
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

// Fetch high/low tide predictions ('hilo') for a specific date or today
async function fetchHilo(dateStr) {
  // If a date string is provided (YYYYMMDD), use it; otherwise, default to today
  const date = dateStr || formatYYYYMMDD(new Date());
  // Construct the full API URL with query parameters
  const url  = `${API_BASE}` +
               `?product=predictions` +         // Tide predictions
               `&application=tidepool_app` +    // App identifier for NOAA usage stats
               `&begin_date=${date}` +
               `&end_date=${date}` +
               `&datum=MLLW` +                  // Mean Lower Low Water datum
               `&station=${STATION_ID}` +
               `&time_zone=lst_ldt` +           // Local standard/daylight time
               `&units=english` +               // Feet units
               `&interval=hilo` +               // High/Low interval data
               `&format=json`;                  // JSON response

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`API error ${resp.status}`); // Handle HTTP errors
  // Return the array of predictions, or empty array if none
  return (await resp.json()).predictions || [];
}

// Evaluate the upcoming low tides against threshold and look-ahead window
function evaluateTide(hilos, refTimeMs = Date.now()) {
  const now    = refTimeMs;
  const cutoff = now + LOOK_AHEAD * 3600e3; // Convert hours to milliseconds

  for (let p of hilos) {
    if (p.type !== 'L') continue; // Skip high tides
    const tideMs = new Date(p.t).getTime();
    // Check if tide falls within the look-ahead window
    if (tideMs >= now && tideMs <= cutoff) {
      const height = +p.v;
      const ok     = height <= THRESHOLD; // Good tide if below threshold
      // Format the tide time for user-friendly display
      const timeStr = new Date(p.t).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true
      });
      return { ok, timeStr, height: height.toFixed(2) };
    }
  }
  // If no low tide found in window, return a negative result and message
  return { ok: false, message: `No low tide in next ${LOOK_AHEAD} hrs.` };
}

// Render the tide table UI by populating rows for each prediction
function renderTable(hilos) {
  const tbl = document.getElementById('tide-table');
  // Remove old data rows, keep header intact
  tbl.querySelectorAll('tr:not(:first-child)').forEach(row => row.remove());

  hilos.forEach(p => {
    const row        = tbl.insertRow();
    const timeCell   = row.insertCell();
    const heightCell = row.insertCell();
    const typeCell   = row.insertCell();
    const dt         = new Date(p.t);

    // Display time in 12-hour format
    timeCell.textContent   = dt.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true
    });
    // Show tide height with unit
    heightCell.textContent = `${(+p.v).toFixed(2)} ft`;
    // Label cell as 'High' or 'Low'
    typeCell.textContent   = p.type === 'H' ? 'High' : 'Low';
  });
}

// Main logic to fetch, evaluate, and render tide data on page or custom date/time
async function checkTide(useCustomDate = false) {
  const resultDiv  = document.getElementById('result');
  const headerEl   = document.getElementById('tide-header');
  resultDiv.textContent = 'Fetching tide data…'; // User feedback

  let displayDate = null;
  let dateStr     = null;
  let refTimeMs   = Date.now(); // Default reference is current time

  if (useCustomDate) {
    const datePicker = document.getElementById('tide-date-picker').value; // YYYY-MM-DD
    const timePicker = document.getElementById('tide-time-picker').value; // HH:MM
    if (datePicker) {
      // Convert to API format and build a custom Date object
      dateStr = datePicker.replace(/-/g, '');
      const [year, month, day]     = datePicker.split('-').map(Number);
      const [hour = 9, minute = 0] = timePicker.split(':').map(Number);
      const customDate = new Date(year, month - 1, day, hour, minute);
      refTimeMs     = customDate.getTime();
      // For header display (e.g., "June 9, 2025")
      displayDate   = customDate.toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      });
    }
  }

  // Update header to reflect chosen or current date
  headerEl.textContent = displayDate
    ? `${displayDate} High/Low Tides`
    : `Today's High/Low Tides`;

  try {
    const hilos = await fetchHilo(dateStr);
    const ev    = evaluateTide(hilos, refTimeMs);

    // Display result with styling based on outcome
    if (ev.ok) {
      resultDiv.innerHTML = `
        <p class="yes"><strong>Yes!</strong> Next low tide at ${ev.timeStr} is ${ev.height} ft (≤ ${THRESHOLD} ft).</p>
      `;
    } else {
      const msg = ev.message || `Next low tide is above ${THRESHOLD} ft.`;
      resultDiv.innerHTML = `<p class="no"><strong>No.</strong> ${msg}</p>`;
    }

    // Populate the tide table with all predictions
    renderTable(hilos);
  } catch (err) {
    // Handle and log any unexpected errors
    resultDiv.innerHTML = `<p class="no">Error: ${err.message}</p>`;
    console.error(err);
  }
}

// Initialize UI: set up date picker defaults and button handlers on page load
document.addEventListener('DOMContentLoaded', () => {
  if (ENABLE_DATE_PICKER) {
    const now = new Date();
    // Format local date/time for input controls
    const localDate =
      `${now.getFullYear()}-` +
      `${String(now.getMonth() + 1).padStart(2, '0')}-` +
      `${String(now.getDate()).padStart(2, '0')}`;
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const dp = document.getElementById('tide-date-picker');
    const tp = document.getElementById('tide-time-picker');
    if (dp) dp.value = localDate;
    if (tp) tp.value = `${hh}:${mm}`;
  }

  // Show or hide the date picker section based on config
  const dateContainer = document.getElementById('date-container');
  if (!ENABLE_DATE_PICKER) {
    dateContainer.style.display = 'none';
  } else {
    document.getElementById('date-check-btn')
            .addEventListener('click', () => checkTide(true));
  }

  // Perform initial tide check for current date/time
  checkTide(false);
});
