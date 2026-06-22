# seed_data.py — Run once to populate 90 days of fake data

import random
from datetime import datetime, timedelta
from db import init_db, save_session

init_db()

today = datetime.now().date()

print("Seeding 90 days of fake study data...")

for i in range(90):
    d = today - timedelta(days=(89 - i))
    date_str = d.strftime("%Y-%m-%d")

    weekday = d.weekday()

    if weekday in (5, 6):  # Weekend
        study    = random.randint(1800,  7200)
        sleep    = random.randint(0,     3600)
        inactive = random.randint(1800,  5400)
    else:  # Weekday
        study    = random.randint(7200, 21600)
        sleep    = random.randint(0,    3600)
        inactive = random.randint(1800, 7200)

    save_session(date_str, study, sleep, inactive)
    print(f"  {date_str} — study: {round(study/3600,2)}h  sleep: {round(sleep/3600,2)}h  away: {round(inactive/3600,2)}h")

print("\nDone! 90 days of data added.")
print("Refresh the Graph tab in your browser.")
