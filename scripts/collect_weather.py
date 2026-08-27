"""Collect the latest hourly weather observation for Seoul from Open-Meteo."""

import csv
import json
import os
import tempfile
from datetime import datetime
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen


LATITUDE = 37.5665
LONGITUDE = 126.9780
TIMEZONE = "Asia/Seoul"
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "weather.csv"
FIELDS = [
    "time",
    "latitude",
    "longitude",
    "temperature_2m",
    "apparent_temperature",
    "relative_humidity_2m",
    "precipitation",
    "weather_code",
    "wind_speed_10m",
]


def fetch_latest_hour():
    params = urlencode(
        {
            "latitude": LATITUDE,
            "longitude": LONGITUDE,
            "hourly": ",".join(FIELDS[3:]),
            "forecast_days": 2,
            "timezone": TIMEZONE,
        }
    )
    with urlopen(f"https://api.open-meteo.com/v1/forecast?{params}", timeout=30) as response:
        payload = json.load(response)

    hourly = payload["hourly"]
    now = datetime.now().astimezone()
    current_hour = now.strftime("%Y-%m-%dT%H:00")
    index = min(
        range(len(hourly["time"])),
        key=lambda i: abs(
            datetime.fromisoformat(hourly["time"][i]).replace(tzinfo=now.tzinfo) - now
        ),
    )
    # Use the API's nearest current hour; this remains stable across Action run times.
    return {
        "time": hourly["time"][index],
        "latitude": LATITUDE,
        "longitude": LONGITUDE,
        **{field: hourly[field][index] for field in FIELDS[3:]},
    }


def append_if_new(row):
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    rows = []
    if OUTPUT_PATH.exists():
        with OUTPUT_PATH.open("r", newline="", encoding="utf-8") as file:
            rows = list(csv.DictReader(file))

    if any(existing.get("time") == row["time"] for existing in rows):
        print(f"Already collected: {row['time']}")
        return False

    rows.append({field: row.get(field, "") for field in FIELDS})
    rows.sort(key=lambda item: item["time"])

    # Atomic replacement prevents a partially written CSV if the process is interrupted.
    fd, temporary_name = tempfile.mkstemp(dir=OUTPUT_PATH.parent, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=FIELDS)
            writer.writeheader()
            writer.writerows(rows)
        os.replace(temporary_name, OUTPUT_PATH)
    finally:
        if os.path.exists(temporary_name):
            os.remove(temporary_name)

    print(f"Collected: {row['time']} -> {OUTPUT_PATH}")
    return True


if __name__ == "__main__":
    append_if_new(fetch_latest_hour())
