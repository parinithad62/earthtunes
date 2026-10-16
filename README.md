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

The current processed dataset contains 43 annual records covering 1983–2025.

**Source limitation:** NIFC's 2004 wildfire figures exclude North Carolina state lands. This limitation is documented in the validation report.

## Setup

Use Python 3 and create a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
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

Run the pipeline and automated tests:

```bash
make
```

Run the tests separately:

```bash
python -m pytest -v
```

## Repository Structure

- `scripts/` — data download and processing scripts.
- `data/raw/` — downloaded source datasets.
- `data/processed/` — processed JSON and validation report.
- `tests/` — automated pipeline tests.
- `analysis/` — project analysis.
- `ui/` — user interface.
- `audio/` — audio-related project components.
- `harmony/` — harmony-related project components.

## Data Validation

The pipeline checks for missing values, duplicate years, expected year coverage, invalid numeric values, negative sea-ice or wildfire values, and out-of-range normalized values.

The automated tests cover year coverage, duplicate years, required values, normalized ranges, preservation of the 2004 wildfire data, and documentation of the source limitation.
