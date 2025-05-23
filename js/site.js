document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('load-tide-btn').addEventListener('click', fetchTideData);
});

async function fetchTideData() {
  const stationId = '9413745'; // Santa Cruz Station Id
  const product = 'predictions';
  const datum = 'MLLW';
  const units = 'english';
  const timeZone = 'lst_ldt';
  const format = 'json';

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const date = `${yyyy}${mm}${dd}`;

  const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=${product}&application=my_app&begin_date=${date}&end_date=${date}&datum=${datum}&station=${stationId}&time_zone=${timeZone}&units=${units}&interval=hilo&format=${format}`;


  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    displayTideData(data);
  } catch (error) {
    const container = document.getElementById('tide-data');
    container.innerHTML = `<p style="color: red;">Error loading tide data.</p>`;
    console.error('Fetch error:', error);
  }
}

function displayTideData(data) {
  const container = document.getElementById('tide-data');
  container.innerHTML = '<h2>Tide Predictions for Today:</h2>';

  if (!data.predictions || data.predictions.length === 0) {
    container.innerHTML += '<p>No tide data available.</p>';
    return;
  }

  const list = document.createElement('ul');
  data.predictions.forEach(prediction => {
    const item = document.createElement('li');
    item.textContent = `Time: ${prediction.t}, Height: ${prediction.v} ft`;
    list.appendChild(item);
  });

  container.appendChild(list);
}
