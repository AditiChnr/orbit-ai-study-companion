# seed_data.py — Run once to populate 30 days of fake data

import random
from datetime import datetime, timedelta
from db import init_db, save_session

init_db()

today = datetime.now().date()

print("Seeding 30 days of fake study data...")

for i in range(30):
    d = today - timedelta(days=(29 - i))
    date_str = d.strftime("%Y-%m-%d")

    # Realistic patterns — weekends less study, weekdays more
    weekday = d.weekday()  # 0=Monday, 6=Sunday

    if weekday in (5, 6):  # Weekend
        study   = random.randint(1800,  7200)   # 0.5 - 2 hrs
        sleep   = random.randint(0,     3600)   # 0 - 1 hr
        inactive= random.randint(1800,  5400)   # 0.5 - 1.5 hrs
    else:  # Weekday
        study   = random.randint(7200, 21600)   # 2 - 6 hrs
        sleep   = random.randint(0,    3600)    # 0 - 1 hr
        inactive= random.randint(1800, 7200)    # 0.5 - 2 hrs

    save_session(date_str, study, sleep, inactive)
    print(f"  {date_str} — study: {round(study/3600,2)}h  sleep: {round(sleep/3600,2)}h  away: {round(inactive/3600,2)}h")

print("\nDone! 30 days of data added.")
print("Refresh the Graph tab in your browser.")