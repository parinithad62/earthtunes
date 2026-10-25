"""Tests for Person 4: Tension Score Calculation & Export Schema."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TENSION_FILE = ROOT / "harmony" / "tension.json"
DATA_FILE = ROOT / "data" / "processed" / "data.json"
HITS_FILE = ROOT / "data" / "processed" / "hits.json"


def test_tension_json_exists_and_matches_schema():
    assert TENSION_FILE.exists(), "harmony/tension.json does not exist"
    data = json.loads(TENSION_FILE.read_text(encoding="utf-8"))

    assert set(data.keys()) == {"years", "formula", "tension", "alt_with_fire"}
    assert len(data["years"]) == 43
    assert data["years"][0] == 1983
    assert data["years"][-1] == 2025
    assert len(data["tension"]) == 43
    assert len(data["alt_with_fire"]) == 43


def test_tension_range_spans_zero_to_one():
    data = json.loads(TENSION_FILE.read_text(encoding="utf-8"))
    tensions = data["tension"]

    assert min(tensions) == 0.0, f"Expected min tension to be 0.0, got {min(tensions)}"
    assert max(tensions) == 1.0, f"Expected max tension to be 1.0, got {max(tensions)}"
    assert all(0.0 <= t <= 1.0 for t in tensions)


def test_alt_formula_range_spans_zero_to_one():
    data = json.loads(TENSION_FILE.read_text(encoding="utf-8"))
    alts = data["alt_with_fire"]

    assert min(alts) == 0.0, f"Expected min alt tension to be 0.0, got {min(alts)}"
    assert max(alts) == 1.0, f"Expected max alt tension to be 1.0, got {max(alts)}"
    assert all(0.0 <= a <= 1.0 for a in alts)


def test_tension_calculation_matches_formula():
    data_json = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    tension_json = json.loads(TENSION_FILE.read_text(encoding="utf-8"))

    temp_norm = data_json["variables"]["temperature"]["norm"]
    ice_norm = data_json["variables"]["sea_ice"]["norm"]

    raw_a = [t * (1.0 - ice) for t, ice in zip(temp_norm, ice_norm)]
    min_a, max_a = min(raw_a), max(raw_a)
    expected_t = [round((x - min_a) / (max_a - min_a), 6) for x in raw_a]

    assert tension_json["tension"] == expected_t


def test_key_dramatic_hits_align_with_tension():
    tension_json = json.loads(TENSION_FILE.read_text(encoding="utf-8"))
    years = tension_json["years"]
    tension = tension_json["tension"]

    # 1996 "The Big Freeze" (sea ice record high) should have min tension
    idx_1996 = years.index(1996)
    assert tension[idx_1996] == 0.0

    # 2024 "Hottest Year on Record" should have global max tension
    idx_2024 = years.index(2024)
    assert tension[idx_2024] == 1.0

    # 2012 "The Great Melt" (sea ice record low) should be a local peak
    idx_2012 = years.index(2012)
    assert tension[idx_2012] > tension[years.index(2011)]
    assert tension[idx_2012] > tension[years.index(2013)]
