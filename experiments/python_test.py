import requests
from datetime import datetime

def get_tide_predictions(station_id, date):
    url = (
        "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter"
        "?product=predictions"
        "&application=demo_app"
        f"&begin_date={date}"
        f"&end_date={date}"
        "&datum=MLLW"
        f"&station={station_id}"
        "&time_zone=lst_ldt"
        "&units=english"
        "&interval=hilo"
        "&format=json"
    )

    response = requests.get(url)
    if response.status_code != 200:
        print(f"Error fetching data: {response.status_code}")
        return

    data = response.json().get('predictions', [])
    if not data:
        print("No tide data found.")
        return

    print(f"Tide predictions for station {station_id} on {date}:")
    for entry in data:
        time = datetime.strptime(entry['t'], '%Y-%m-%d %H:%M')
        tide_type = "High Tide" if entry['type'] == 'H' else "Low Tide"
        height = entry['v']
        print(f"{tide_type} at {time.strftime('%I:%M %p')} — {height} ft")

# Example usage
station_id = "9413745"  # Santa Cruz, CA
date = "20250511"       # Format: YYYYMMDD

get_tide_predictions(station_id, date)