
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "processed" / "data.json"
RECORDS_FILE = ROOT / "data" / "processed" / "data_records.json"
REPORT_FILE = ROOT / "data" / "processed" / "validation_report.json"


def load_records():
    return json.loads(RECORDS_FILE.read_text(encoding="utf-8"))


def load_schema():
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def test_all_years_are_present():
    records = load_records()
    years = [row["year"] for row in records]

    assert years == list(range(1983, 2026))


def test_no_duplicate_years():
    records = load_records()
    years = [row["year"] for row in records]

    assert len(years) == len(set(years))


def test_required_values_are_present():
    records = load_records()
    fields = [
        "temperature_anomaly_c",
        "arctic_sea_ice_extent_million_km2",
        "wildfire_count",
        "wildfire_acres",
    ]

    for row in records:
        for field in fields:
            assert row[field] is not None


def test_normalized_values_are_between_zero_and_one():
    records = load_records()
    fields = [
        "temperature_normalized",
        "sea_ice_normalized",
        "wildfire_acres_normalized",
    ]

    for row in records:
        for field in fields:
            assert 0 <= row[field] <= 1


def test_2004_wildfire_data_is_preserved():
    records = load_records()
    row = next(item for item in records if item["year"] == 2004)

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


def test_agreed_json_schema():
    data = load_schema()

    assert set(data.keys()) == {"years", "variables"}
    assert data["years"] == list(range(1983, 2026))

    variables = data["variables"]
    assert set(variables.keys()) == {"temperature", "sea_ice", "wildfire"}

    expected_units = {
        "temperature": "°C",
        "sea_ice": "M km²",
        "wildfire": "M acres",
    }

    for name, unit in expected_units.items():
        variable = variables[name]

        assert set(variable.keys()) == {"unit", "raw", "norm"}
        assert variable["unit"] == unit
        assert len(variable["raw"]) == 43
        assert len(variable["norm"]) == 43
        assert all(value is not None for value in variable["raw"])
        assert all(0 <= value <= 1 for value in variable["norm"])


def test_wildfire_raw_values_are_in_millions_of_acres():
    data = load_schema()
    index = data["years"].index(2004)

    assert data["variables"]["wildfire"]["raw"][index] == 8.098
