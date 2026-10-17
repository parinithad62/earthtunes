# data/processed

- `data.json`: the agreed handoff file. Keys: `years`, `variables.{temperature, sea_ice, wildfire}`, each with `unit`, `raw`, `norm`. 43 entries each, 1983-2025.
- `data_records.json`: the same data as per-year records, plus `wildfire_count` (unreliable before 1985).
- `validation_report.json`: validation results and source notes.

| Variable | Source | Unit | Notes |
|---|---|---|---|
| temperature | NASA GISTEMP, global annual (J-D) | °C | Anomaly vs 1951-1980 |
| sea_ice | NSIDC, September Arctic extent | M km² | Not inverted: higher norm = more ice |
| wildfire | NIFC, U.S. acres burned | M acres | 2004 excludes North Carolina state lands |

`norm` is min-max scaled over 1983-2025 (0 = lowest, 1 = highest).
See the root README for full details and limitations.