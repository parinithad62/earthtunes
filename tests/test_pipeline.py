import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "processed" / "data.json"
REPORT_FILE = ROOT / "data" / "processed" / "validation_report.json"


def load_data():
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def test_all_years_are_present():
    data = load_data()
    years = [row["year"] for row in data]

    assert years == list(range(1983, 2026))


def test_no_duplicate_years():
    data = load_data()
    years = [row["year"] for row in data]

    assert len(years) == len(set(years))


def test_required_values_are_present():
    data = load_data()
    fields = [
        "temperature_anomaly_c",
        "arctic_sea_ice_extent_million_km2",
        "wildfire_count",
        "wildfire_acres",
    ]

    for row in data:
        for field in fields:
            assert row[field] is not None


def test_normalized_values_are_between_zero_and_one():
    data = load_data()
    fields = [
        "temperature_normalized",
        "sea_ice_normalized",
        "wildfire_acres_normalized",
    ]

    for row in data:
        for field in fields:
            assert 0 <= row[field] <= 1


def test_2004_wildfire_data_is_preserved():
    data = load_data()
    row = next(item for item in data if item["year"] == 2004)

    assert row["wildfire_count"] == 65461
    assert row["wildfire_acres"] == 8097880


def test_validation_report_documents_source_limitation():
    report = json.loads(REPORT_FILE.read_text(encoding="utf-8"))

    assert report["status"] == "passed"
    assert report["records"] == 43
    assert any(
        "2004 figures exclude North Carolina state lands" in note
        for note in report["notes"]
    )
