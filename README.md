# EarthTunes

EarthTunes turns NASA Earth data into sound through interactive sonification.

## Project Overview

EarthTunes explores environmental changes by combining climate and wildfire datasets. The processed data can be used by the project to create sound-based representations of environmental patterns.

## Data Engineering

The data pipeline collects, cleans, combines, validates, and normalizes data from three sources:

- **NASA GISTEMP:** Annual global temperature anomaly in degrees Celsius.
- **NSIDC:** September Arctic sea-ice extent for the Northern Hemisphere.
- **NIFC:** Annual US wildfire counts and acres burned.

## Pipeline

1. Download the source datasets.
2. Clean and extract the required fields.
3. Combine datasets by year.
4. Validate the combined data.
5. Normalize selected measurements to a range from 0 to 1.
6. Export the processed data and validation report.

## Project Outputs

- `data/processed/data.json` — combined annual environmental data, including raw and normalized measurements.
- `data/processed/validation_report.json` — validation status, record counts, year range, and source notes.
- `data/processed/hits.json` — each variable's most dramatic moments (records, anomalies, largest changes, change points) with titles and liner notes. See `analysis/README.md`.

The current processed dataset contains 43 annual records covering 1983–2025.

**Source limitation:** NIFC's 2004 wildfire figures exclude North Carolina state lands. This limitation is documented in the validation report.

## Setup

Use Python 3 and Node.js 18+ and create a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
npm --prefix ui install
```

## Run the Pipeline

Download the source datasets:

```bash
python scripts/download_data.py
```

Process, validate, and export the data:

```bash
python scripts/process_data.py
```

Find the greatest hits:

```bash
python analysis/greatest_hits.py
```

Run the pipeline, hits engine, tension export, and all automated tests:

```bash
make
```

Run the tests separately:

```bash
python -m pytest -v
node --test tests/test_audio.mjs
npm --prefix ui test
```

## Run the Frontend

Start the React and Vite development server:

```bash
npm --prefix ui run dev
```

Vite prints the local URL when the server is ready. The production frontend
build is generated with `npm --prefix ui run build` or as part of `make`.

## Repository Structure

- `scripts/` — data download and processing scripts.
- `data/raw/` — downloaded source datasets.
- `data/processed/` — processed JSON and validation report.
- `tests/` — automated pipeline tests.
- `analysis/` — "greatest hits" engine that finds dramatic events.
- `ui/` — user interface.
- `audio/` — audio-related project components.
- `harmony/` — harmony-related project components.

## Data Validation

The pipeline checks for missing values, duplicate years, expected year coverage, invalid numeric values, negative sea-ice or wildfire values, and out-of-range normalized values.

The automated tests cover year coverage, duplicate years, required values, normalized ranges, preservation of the 2004 wildfire data, and documentation of the source limitation.


## Processed Data Schema and Interpretation

The final dataset is available at `data/processed/data.json`. It covers **1983–2025**, containing 43 annual records shared across all three sources.

The JSON structure contains:
- `years`: the ordered list of years.
- `variables.temperature`: global annual temperature anomaly.
- `variables.sea_ice`: September Arctic sea-ice extent.
- `variables.wildfire`: annual U.S. wildfire acres burned.

Each variable contains `unit`, `raw`, and `norm` arrays. Each array has 43 entries aligned by year.

### Units and source interpretation

- **Temperature:** Degrees Celsius (°C), relative to the 1951–1980 baseline, from NASA GISTEMP global annual mean data (J-D).
- **Sea ice:** Million square kilometres (M km²), using September Arctic sea-ice extent, representing the seasonal minimum period.
- **Wildfire:** Million acres (M acres) burned in the United States, from NIFC annual data. The global temperature and Arctic sea-ice series have different geographic coverage from the U.S. wildfire series.

Wildfire `raw` values are converted from acres to millions of acres and rounded to three decimal places for export. Wildfire normalization is calculated from the original, unrounded acres-burned values before export rounding.

### Normalization

The `norm` arrays use min-max normalization across the overlapping 1983–2025 period. Values range from 0 to 1. For sea ice, higher normalized values indicate greater sea-ice extent; the series is not inverted.

Normalization is a scale transformation and does not establish causation.

### Data limitations

- NASA's incomplete 2026 annual temperature value is excluded.
- NIFC's reported 2004 wildfire figures exclude North Carolina state lands.
- Wildfire-count reporting may be inconsistent before 1985. The final `data.json` export contains wildfire acres burned, not `wildfire_count`.
- The original detailed yearly records are retained separately at `data/processed/data_records.json`.
- The validation report is available at `data/processed/validation_report.json`.
