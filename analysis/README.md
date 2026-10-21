# analysis — "Greatest Hits" engine

`greatest_hits.py` finds each variable's most dramatic moments in
`data/processed/data.json` and writes `data/processed/hits.json`.

```bash
python analysis/greatest_hits.py   # or: make hits
```

## Method

All statistics use the `raw` values. The baseline is **1983–2012**, the first
30 years of the shared record.

| Step | Detector | Event `type` |
|---|---|---|
| 1 | z-score vs baseline mean/σ, flag \|z\| > 2 | `anomaly_high`, `anomaly_low` |
| 2 | Running records: a year that beats every earlier year (after 10 years of history) | `record_high`, `record_low` |
| 3 | Largest single-year rise and drop | `largest_rise`, `largest_drop` |
| 4 | Change points: 5-year mean after minus 5-year mean before (shift ≥ 1 σ, up to 2, at least 5 years apart) | `shift_up`, `shift_down` |

**Ranking (step 5).** Each event gets a drama `score`:

- anomalies: \|z\|
- records: \|z\| + 1.0 if all-time, + 0.5 if later broken
- largest changes: change ÷ σ of all year-over-year changes
- change points: shift ÷ (σ·√(2/5)), a two-sample z-score

Each year keeps only its highest-scoring event. The top 5 always stay, and
events ranked 6–8 stay only if their score is at least 2.0. The strongest
change point always gets a slot, even if its year already has a hit, because
it marks an era rather than a single year.

**Liner notes (step 6)** are filled in from templates for each event type.
Titles come from a pool for each variable and type. All-time records get a
fixed headline, such as "The Great Melt".

## `hits.json` schema (step 7)

A list sorted by `year`, then variable. `id` runs from 1 to n.

| Field | Meaning |
|---|---|
| `id` | Unique, 1..n in chronological order |
| `variable` | `temperature`, `sea_ice` or `wildfire` (keys in `data.json`) |
| `year` | Year of the event |
| `type` | One of the event types above |
| `zscore` | z of that year's value vs the 1983–2012 baseline |
| `value` | Raw value that year, in the variable's `unit` from `data.json` |
| `window` | `[year-4, year+4]`, clipped to 1983–2025, for playback context |
| `rank` | 1 = most dramatic within its variable |
| `score` | Drama score used for ranking; can drive loudness or emphasis |
| `title` | Short headline |
| `liner_notes` | One-sentence explanation |

Two hits can share a year when one of them is a change point. For example,
2007 sea ice is both a running record low and the start of a lower regime.
