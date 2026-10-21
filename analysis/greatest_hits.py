"""Greatest Hits engine: find each variable's most dramatic moments.

Reads data/processed/data.json and writes data/processed/hits.json.
"""

from pathlib import Path
import json
import sys

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "processed" / "data.json"
HITS_FILE = ROOT / "data" / "processed" / "hits.json"

# First 30 years of the shared record serve as the reference period.
BASELINE = (1983, 2012)
Z_THRESHOLD = 2.0       # |z| above this counts as an anomaly
RECORD_WARMUP = 10      # years of history before a record counts
ROLLING_WINDOW = 5      # years on each side for change-point detection
SHIFT_THRESHOLD = 1.0   # minimum mean shift, in baseline σ
MAX_SHIFTS = 2          # change points kept per variable
WINDOW_HALF = 4         # hit window: [year - 4, year + 4]
MIN_HITS, MAX_HITS = 5, 8
MIN_SCORE = 2.0         # hits beyond MIN_HITS must reach this score

# Bonus added to the drama score so records outrank plain anomalies.
RECORD_BONUS = {True: 1.0, False: 0.5}  # keyed by all-time record

VARIABLES = {
    "temperature": {
        "subject": "the global temperature anomaly",
        "value": lambda v: f"{v:+.2f} °C",
        "delta": lambda d: f"{abs(d):.2f} °C",
    },
    "sea_ice": {
        "subject": "Arctic September sea ice",
        "value": lambda v: f"{v:.2f} M km²",
        "delta": lambda d: f"{abs(d):.2f} M km²",
    },
    "wildfire": {
        "subject": "U.S. wildfire area burned",
        "value": lambda v: f"{v:.2f} M acres",
        "delta": lambda d: f"{abs(d):.2f} M acres",
    },
}

# Title for an all-time record, then a pool for every other event type.
ALL_TIME_TITLES = {
    ("temperature", "record_high"): "Hottest Year on Record",
    ("temperature", "record_low"): "Coldest Year on Record",
    ("sea_ice", "record_low"): "The Great Melt",
    ("sea_ice", "record_high"): "The Big Freeze",
    ("wildfire", "record_high"): "Year of Fire",
    ("wildfire", "record_low"): "The Quietest Season",
}

TITLES = {
    "temperature": {
        "record_high": ["New Heat Record", "Fever Pitch", "Turning Up the Heat",
                        "Heat Climbs Again"],
        "record_low": ["Cold Snap Record"],
        "anomaly_high": ["Running Hot", "Heatwave Year", "Warm Spell",
                         "Hot Streak", "Simmering", "No Cooling Off"],
        "anomaly_low": ["Cool Interlude"],
        "largest_rise": ["The Big Spike"],
        "largest_drop": ["The Big Chill"],
        "shift_up": ["The Warming Shift", "Another Step Up"],
        "shift_down": ["The Cooling Shift"],
    },
    "sea_ice": {
        "record_low": ["Record Melt", "Vanishing Ice", "Thinner Still"],
        "record_high": ["Ice Comeback"],
        "anomaly_low": ["Thin Ice", "Open Water"],
        "anomaly_high": ["Frozen Fortress"],
        "largest_rise": ["Ice Rebound"],
        "largest_drop": ["The Big Thaw"],
        "shift_up": ["The Ice Returns"],
        "shift_down": ["The Ice Retreat", "Another Step Down"],
    },
    "wildfire": {
        "record_high": ["Record Burn", "Firestorm", "Fire Climbs Higher"],
        "record_low": ["Quiet Season"],
        "anomaly_high": ["Inferno", "Burning Season", "Smoke Season",
                         "Ember Storm"],
        "anomaly_low": ["Calm Before the Fire"],
        "largest_rise": ["The Flare-Up"],
        "largest_drop": ["The Big Lull"],
        "shift_up": ["Fire Regime Shift", "The Fire Ratchet"],
        "shift_down": ["Cooling Embers"],
    },
}


# Source caveats appended to the liner notes of affected years.
SOURCE_NOTES = {
    ("wildfire", 2004): "NIFC's 2004 figure excludes North Carolina state lands.",
}


def baseline_stats(years, values):
    mask = (years >= BASELINE[0]) & (years <= BASELINE[1])
    return values[mask].mean(), values[mask].std(ddof=1)


def find_records(years, values):
    """Running records: a year that beats every earlier year."""
    events = []
    for kind, better in (("record_high", np.greater), ("record_low", np.less)):
        record_years = [
            i for i in range(RECORD_WARMUP, len(values))
            if better(values[i], values[:i]).all()
        ]
        for n, i in enumerate(record_years):
            later = record_years[n + 1] if n + 1 < len(record_years) else None
            events.append({
                "index": i,
                "type": kind,
                "all_time": later is None,
                "surpassed_in": int(years[later]) if later is not None else None,
            })
    return events


def find_anomalies(z):
    return [
        {"index": i, "type": "anomaly_high" if z[i] > 0 else "anomaly_low"}
        for i in np.flatnonzero(np.abs(z) > Z_THRESHOLD)
    ]


def find_largest_changes(values):
    """Largest single-year rise and drop, scored against typical change."""
    diffs = np.diff(values)
    spread = diffs.std(ddof=1)
    events = []
    for kind, j in (("largest_rise", diffs.argmax()), ("largest_drop", diffs.argmin())):
        if (kind == "largest_rise") != (diffs[j] > 0):
            continue
        events.append({
            "index": int(j) + 1,
            "type": kind,
            "delta": float(diffs[j]),
            "score": abs(diffs[j]) / spread,
        })
    return events


def find_change_points(values, sigma):
    """Rolling-mean difference: mean of the next w years minus the previous w."""
    w = ROLLING_WINDOW
    shifts = {
        t: values[t:t + w].mean() - values[t - w:t].mean()
        for t in range(w, len(values) - w + 1)
    }
    events = []
    candidates = sorted(shifts, key=lambda t: abs(shifts[t]), reverse=True)
    for t in candidates:
        if len(events) == MAX_SHIFTS or abs(shifts[t]) / sigma < SHIFT_THRESHOLD:
            break
        if any(abs(t - e["index"]) < w for e in events):
            continue  # suppress neighbours of a stronger change point
        events.append({
            "index": t,
            "type": "shift_up" if shifts[t] > 0 else "shift_down",
            "before": float(values[t - w:t].mean()),
            "after": float(values[t:t + w].mean()),
            # Scale like a two-sample z-score so shifts rank alongside events.
            "score": abs(shifts[t]) / (sigma * np.sqrt(2 / w)),
        })
    return events


def liner_notes(name, event, year, value, z):
    fmt = VARIABLES[name]
    subject = fmt["subject"]
    base = f"{BASELINE[0]}–{BASELINE[1]} average"
    sigma = f"{abs(z):.1f} σ {'above' if z > 0 else 'below'} the {base}"
    kind = event["type"]

    if kind.startswith("record_"):
        level = kind.split("_")[1]
        if event["all_time"]:
            return (f"{year}: {subject} hit an all-time record {level} of "
                    f"{fmt['value'](value)}, {sigma}.")
        return (f"{year}: {subject} set a new record {level} of "
                f"{fmt['value'](value)} ({sigma}), a record that stood until "
                f"{event['surpassed_in']}.")
    if kind.startswith("anomaly_"):
        return f"{year}: {subject} reached {fmt['value'](value)}, {sigma}."
    if kind.startswith("largest_"):
        verb, noun = ("rose", "rise") if event["delta"] > 0 else ("fell", "drop")
        return (f"{year}: the biggest one-year {noun} in the record — {subject} "
                f"{verb} by {fmt['delta'](event['delta'])} from {year - 1}, "
                f"to {fmt['value'](value)}.")
    verb = "rose" if event["after"] > event["before"] else "fell"
    return (f"{year}: {subject} shifted to a new normal — its "
            f"{ROLLING_WINDOW}-year average {verb} from "
            f"{fmt['value'](event['before'])} to {fmt['value'](event['after'])}.")


def pick_title(name, event, used):
    key = (name, event["type"])
    if event.get("all_time") and key in ALL_TIME_TITLES:
        return ALL_TIME_TITLES[key]
    pool = TITLES[name][event["type"]]
    count = used.get(key, 0)
    used[key] = count + 1
    title = pool[count % len(pool)]
    return title if count < len(pool) else f"{title} {count // len(pool) + 1}"


def find_hits(name, years, values):
    mean, sigma = baseline_stats(years, values)
    z = (values - mean) / sigma

    candidates = (
        find_records(years, values)
        + find_anomalies(z)
        + find_largest_changes(values)
    )
    shifts = find_change_points(values, sigma)
    for event in candidates:
        if "score" not in event:
            event["score"] = abs(z[event["index"]])
            if event["type"].startswith("record_"):
                event["score"] += RECORD_BONUS[event["all_time"]]

    # Keep only the most dramatic event for each year.
    best = {}
    for event in candidates:
        i = event["index"]
        if i not in best or event["score"] > best[i]["score"]:
            best[i] = event

    ranked = sorted(best.values(), key=lambda e: (-e["score"], e["index"]))
    keep = [
        e for n, e in enumerate(ranked[:MAX_HITS])
        if n < MIN_HITS or e["score"] >= MIN_SCORE
    ]

    # A change point marks an era rather than a single year, so the
    # strongest one always gets a slot even if its year is already a hit.
    if shifts:
        if len(keep) == MAX_HITS:
            keep.pop()
        keep.append(shifts[0])
        keep.sort(key=lambda e: (-e["score"], e["index"]))

    used_titles = {}
    hits = []
    for rank, event in enumerate(keep, start=1):
        i = event["index"]
        year = int(years[i])
        hits.append({
            "variable": name,
            "year": year,
            "type": event["type"],
            "zscore": round(float(z[i]), 2),
            "value": float(values[i]),
            "window": [max(year - WINDOW_HALF, int(years[0])),
                       min(year + WINDOW_HALF, int(years[-1]))],
            "rank": rank,
            "score": round(float(event["score"]), 2),
            "title": pick_title(name, event, used_titles),
            "liner_notes": " ".join(filter(None, [
                liner_notes(name, event, year, float(values[i]), z[i]),
                SOURCE_NOTES.get((name, year)),
            ])),
        })
    return hits


def build_hits(data):
    years = np.array(data["years"])
    hits = []
    for name in VARIABLES:
        values = np.array(data["variables"][name]["raw"], dtype=float)
        hits += find_hits(name, years, values)

    order = list(VARIABLES)
    hits.sort(key=lambda h: (h["year"], order.index(h["variable"])))
    return [{"id": n, **hit} for n, hit in enumerate(hits, start=1)]


def main():
    # Liner notes contain σ and °, which some consoles cannot encode.
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    hits = build_hits(data)
    HITS_FILE.write_text(
        json.dumps(hits, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(hits)} hits to {HITS_FILE.relative_to(ROOT)}")
    for hit in sorted(hits, key=lambda h: (h["variable"], h["rank"])):
        print(f"  [{hit['variable']} #{hit['rank']}] {hit['title']}: "
              f"{hit['liner_notes']}")


if __name__ == "__main__":
    main()
