// js/site.js
// Code base and prototype designed by ChatGPT

// Toggle date-picker on/off for debugging
const ENABLE_DATE_PICKER = true;

// NOAA Tides & Currents API base URL
const API_BASE   = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
const STATION_ID = '9413745';   // Santa Cruz
const THRESHOLD  = 1.5;         // ft for “good” tidepooling
const LOOK_AHEAD = 12;          // hrs ahead to check next low tide

// Format YYYYMMDD for the API (e.g., 20250523)
function formatYYYYMMDD(d) {
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

// Fetch high/low (hilo) predictions for a given date (YYYYMMDD) or today
async function fetchHilo(dateStr) {
  const date = dateStr || formatYYYYMMDD(new Date());
  const url  = `${API_BASE}`
    + `?product=predictions`
    + `&application=tidepool_app`
    + `&begin_date=${date}`
    + `&end_date=${date}`
    + `&datum=MLLW`
    + `&station=${STATION_ID}`
    + `&time_zone=lst_ldt`
    + `&units=english`
    + `&interval=hilo`
    + `&format=json`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`API error ${resp.status}`);
  return (await resp.json()).predictions || [];
}

// Decide yes/no based on the next low tide within LOOK_AHEAD hours from a reference time
function evaluateTide(hilos, refTimeMs = Date.now()) {
  const now    = refTimeMs;
  const cutoff = now + LOOK_AHEAD * 3600e3;

  for (let p of hilos) {
    if (p.type !== 'L') continue;
    const tideMs = new Date(p.t).getTime();
    if (tideMs >= now && tideMs <= cutoff) {
      const height = +p.v;
      const ok     = height <= THRESHOLD;
      const timeStr = new Date(p.t).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true
      });
      return { ok, timeStr, height: height.toFixed(2) };
    }
  }
  return { ok: false, message: `No low tide in next ${LOOK_AHEAD} hrs.` };
}

// Populate the high/low tide table
function renderTable(hilos) {
  const tbl = document.getElementById('tide-table');
  // Clear existing rows except header
  tbl.querySelectorAll('tr:not(:first-child)').forEach(row => row.remove());

  hilos.forEach(p => {
    const row        = tbl.insertRow();
    const timeCell   = row.insertCell();
    const heightCell = row.insertCell();
    const typeCell   = row.insertCell();
    const dt         = new Date(p.t);

    timeCell.textContent   = dt.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true
    });
    heightCell.textContent = `${(+p.v).toFixed(2)} ft`;
    typeCell.textContent   = p.type === 'H' ? 'High' : 'Low';
  });
}

// Fetch & render on pageload or date selection
async function checkTide(useCustomDate = false) {
  const resultDiv  = document.getElementById('result');
  const headerEl   = document.getElementById('tide-header');
  resultDiv.textContent = 'Fetching tide data…';

  // We'll set this to display in the header if custom date is used
  let displayDate = null;

  // Determine date string for fetchHilo and reference time
  let dateStr   = null;
  let refTimeMs = Date.now();

  if (useCustomDate) {
    const datePicker = document.getElementById('tide-date-picker').value; // 'YYYY-MM-DD'
    const timePicker = document.getElementById('tide-time-picker').value; // 'HH:MM'
    if (datePicker) {
      dateStr = datePicker.replace(/-/g, '');
      // build reference Date from picker values
      const [year, month, day] = datePicker.split('-').map(Number);
      const [hour = 9, minute = 0] = timePicker.split(':').map(Number);
      const customDate = new Date(year, month - 1, day, hour, minute);
      refTimeMs     = customDate.getTime();
      displayDate   = customDate.toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      });
    }
  }

  // Update the table header text
  if (displayDate) {
    headerEl.textContent = `${displayDate} High/Low Tides`;
  } else {
    headerEl.textContent = `Today's High/Low Tides`;
  }

  try {
    const hilos = await fetchHilo(dateStr);
    const ev    = evaluateTide(hilos, refTimeMs);

    if (ev.ok) {
      resultDiv.innerHTML = `
        <p class="yes"><strong>Yes!</strong> Next low tide at ${ev.timeStr} is ${ev.height} ft (≤ ${THRESHOLD} ft).</p>
      `;
    } else {
      const msg = ev.message || `Next low tide is above ${THRESHOLD} ft.`;
      resultDiv.innerHTML = `<p class="no"><strong>No.</strong> ${msg}</p>`;
    }

    renderTable(hilos);
  } catch (err) {
    resultDiv.innerHTML = `<p class="no">Error: ${err.message}</p>`;
    console.error(err);
  }
}

// Setup on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // If enabled, set default date & time picker to current
  if (ENABLE_DATE_PICKER) {
    const now      = new Date();
    const isoDate  = now.toISOString().split('T')[0];
    const hh       = String(now.getHours()).padStart(2, '0');
    const mm       = String(now.getMinutes()).padStart(2, '0');
    const dp       = document.getElementById('tide-date-picker');
    const tp       = document.getElementById('tide-time-picker');
    if (dp) dp.value = isoDate;
    if (tp) tp.value = `${hh}:${mm}`;
  }

  const dateContainer = document.getElementById('date-container');
  if (!ENABLE_DATE_PICKER) {
    dateContainer.style.display = 'none';
  } else {
    // Listen for date/time check
    document.getElementById('date-check-btn')
      .addEventListener('click', () => checkTide(true));
  }

  // Initial load for today at current time
  checkTide(false);
});
