from pathlib import Path
import json

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "processed"

NASA_FILE = RAW / "nasa_gistemp_global.csv"
NSIDC_FILE = RAW / "nsidc_arctic_september_extent.csv"
NIFC_FILE = RAW / "nifc_wildfires_acres.html"


def load_nasa():
    df = pd.read_csv(NASA_FILE, skiprows=1)
    df.columns = df.columns.str.strip()

    df = df[["Year", "J-D"]].copy()
    df.columns = ["year", "temperature_anomaly_c"]

    df["year"] = pd.to_numeric(df["year"], errors="coerce")
    df["temperature_anomaly_c"] = pd.to_numeric(
        df["temperature_anomaly_c"], errors="coerce"
    )

    return df.dropna(subset=["year"]).astype({"year": int})


def load_nsidc():
    df = pd.read_csv(NSIDC_FILE, skipinitialspace=True)
    df.columns = df.columns.str.strip()

    df["year"] = pd.to_numeric(df["year"], errors="coerce")
    df["mo"] = pd.to_numeric(df["mo"], errors="coerce")
    df["extent"] = pd.to_numeric(df["extent"], errors="coerce")

    df = df[(df["mo"] == 9) & (df["region"].astype(str).str.strip() == "N")]

    df = df[["year", "extent"]].copy()
    df.columns = ["year", "arctic_sea_ice_extent_million_km2"]

    return df.dropna(subset=["year"]).astype({"year": int})


def load_nifc():
    table = pd.read_html(NIFC_FILE, header=None)[0]

    years = table[0].astype(str).str.strip()
    mask = years.str.fullmatch(r"\d{4}")

    df = table.loc[mask, [0, 1, 2]].copy()
    df.columns = ["year", "wildfire_count", "wildfire_acres"]

    for column in ["wildfire_count", "wildfire_acres"]:
        df[column] = (
            df[column]
            .astype(str)
            .str.replace(",", "", regex=False)
            .str.replace("*", "", regex=False)
            .str.strip()
        )
        df[column] = pd.to_numeric(df[column], errors="coerce")

    df["year"] = pd.to_numeric(df["year"], errors="coerce")
    df = df.dropna()

    return df.astype({
        "year": int,
        "wildfire_count": int,
        "wildfire_acres": int,
    })


def validate(df):
    required = [
        "temperature_anomaly_c",
        "arctic_sea_ice_extent_million_km2",
        "wildfire_count",
        "wildfire_acres",
    ]

    if df.empty:
        raise ValueError("No overlapping years found.")

    if df["year"].duplicated().any():
        raise ValueError("Duplicate years found in combined data.")

    if df[required].isna().any().any():
        raise ValueError("Missing values found in required fields.")

    if (df["arctic_sea_ice_extent_million_km2"] < 0).any():
        raise ValueError("Negative sea-ice extent found.")

    if (df["wildfire_count"] < 0).any() or (df["wildfire_acres"] < 0).any():
        raise ValueError("Negative wildfire values found.")

    if not df["year"].between(1983, 2025).all():
        raise ValueError("Year outside the expected NIFC period.")


def min_max_normalize(series):
    minimum = series.min()
    maximum = series.max()

    if maximum == minimum:
        raise ValueError(f"Cannot normalize constant field: {series.name}")

    return (series - minimum) / (maximum - minimum)


def main():
    print("Loading source datasets...")

    nasa = load_nasa()
    nsidc = load_nsidc()
    nifc = load_nifc()

    print(f"NASA annual records: {len(nasa)}")
    print(f"NSIDC September records: {len(nsidc)}")
    print(f"NIFC annual records: {len(nifc)}")

    # Inner joins retain only years present in all three sources.
    df = nasa.merge(nsidc, on="year", how="inner")
    df = df.merge(nifc, on="year", how="inner")
    df = df.sort_values("year").reset_index(drop=True)

    validate(df)

    # Normalize each metric across the overlapping years.
    normalization_fields = {
        "temperature_anomaly_c": "temperature_normalized",
        "arctic_sea_ice_extent_million_km2": "sea_ice_normalized",
        "wildfire_acres": "wildfire_acres_normalized",
    }

    for source_column, output_column in normalization_fields.items():
        df[output_column] = min_max_normalize(df[source_column])

    # Check that normalized values are in the expected range.
    for column in normalization_fields.values():
        if not df[column].between(0, 1).all():
            raise ValueError(f"Normalization failed for {column}")

    OUT.mkdir(parents=True, exist_ok=True)

    records = df.round(6).to_dict(orient="records")
    data_path = OUT / "data.json"
    data_path.write_text(json.dumps(records, indent=2) + "\n", encoding="utf-8")

    report = {
        "status": "passed",
        "records": len(df),
        "first_year": int(df["year"].min()),
        "last_year": int(df["year"].max()),
        "missing_values": int(df.isna().sum().sum()),
        "duplicate_years": int(df["year"].duplicated().sum()),
        "normalization": "min-max scaling across overlapping years",
        "normalized_range": [0, 1],
                "sources": {
            "temperature": "NASA GISTEMP global annual mean (J-D), degrees Celsius anomaly",
            "sea_ice": "NSIDC September Arctic extent, million square kilometres",
            "wildfires": "NIFC annual U.S. wildfire count and acres burned",
        },
        "notes": [
            "Only years present in all three sources are retained.",
            "Original downloaded files remain in data/raw.",
            "Normalized values depend on the overlapping years in this run.",
            "Normalization is a scale transformation, not a measure of causation.",
            "NIFC's 2004 figures exclude North Carolina state lands.",
        ],
    }

    report_path = OUT / "validation_report.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    print("\nValidation passed.")
    print(f"Years: {report['first_year']}–{report['last_year']}")
    print(f"Records: {report['records']}")
    print(f"JSON: {data_path.relative_to(ROOT)}")
    print(f"Report: {report_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
