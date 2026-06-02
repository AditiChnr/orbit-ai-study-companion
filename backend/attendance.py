# attendance.py — Attendance logic

from db import load_attendance, save_attendance

_subjects = []


def _load():
    global _subjects
    _subjects = load_attendance()


_load()


def get_all():
    return _subjects


def add_subject(name: str):
    name = name.strip()
    if not name:
        return {"error": "Name cannot be empty"}
    if any(s["name"].lower() == name.lower() for s in _subjects):
        return {"error": "Subject already exists"}
    _subjects.append({"name": name, "records": {}})
    save_attendance(_subjects)
    return {"ok": True}


def remove_subject(name: str):
    global _subjects
    _subjects = [s for s in _subjects if s["name"] != name]
    save_attendance(_subjects)
    return {"ok": True}


def toggle_day(name: str, date_str: str):
    for s in _subjects:
        if s["name"] == name:
            current = s["records"].get(date_str, "")
            if current == "":
                s["records"][date_str] = "P"
            elif current == "P":
                s["records"][date_str] = "A"
            else:
                s["records"].pop(date_str, None)
            save_attendance(_subjects)
            return {"ok": True, "status": s["records"].get(date_str, "")}
    return {"error": "Subject not found"}


def get_stats(name: str):
    for s in _subjects:
        if s["name"] == name:
            total   = len(s["records"])
            present = sum(1 for v in s["records"].values() if v == "P")
            absent  = total - present
            pct     = round((present / total * 100) if total > 0 else 0, 1)
            needed_for_75 = 0
            if pct < 75 and total > 0:
                needed        = max(0, int((0.75 * total - present) / 0.25) + 1)
                needed_for_75 = needed
            return {
                "total":         total,
                "present":       present,
                "absent":        absent,
                "pct":           pct,
                "needed_for_75": needed_for_75
            }
    return {}