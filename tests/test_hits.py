import json
import statistics
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "processed" / "data.json"
HITS_FILE = ROOT / "data" / "processed" / "hits.json"

sys.path.insert(0, str(ROOT / "analysis"))
import greatest_hits  # noqa: E402

EVENT_TYPES = {
    "record_high", "record_low", "anomaly_high", "anomaly_low",
    "largest_rise", "largest_drop", "shift_up", "shift_down",
}


def load_hits():
    return json.loads(HITS_FILE.read_text(encoding="utf-8"))


def load_data():
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def test_hits_file_matches_a_fresh_run():
    assert load_hits() == greatest_hits.build_hits(load_data())


def test_hit_schema():
    data = load_data()
    first, last = data["years"][0], data["years"][-1]

    for n, hit in enumerate(load_hits(), start=1):
        assert hit["id"] == n
        assert hit["variable"] in data["variables"]
        assert first <= hit["year"] <= last
        assert hit["type"] in EVENT_TYPES
        assert isinstance(hit["zscore"], float)
        start, end = hit["window"]
        assert first <= start <= hit["year"] <= end <= last
        assert hit["title"] and hit["liner_notes"]


def test_five_to_eight_hits_per_variable():
    hits = load_hits()

    for name in load_data()["variables"]:
        ranks = [h["rank"] for h in hits if h["variable"] == name]
        assert 5 <= len(ranks) <= 8
        assert sorted(ranks) == list(range(1, len(ranks) + 1))


def test_values_and_zscores_match_data():
    data = load_data()
    start, end = greatest_hits.BASELINE

    for hit in load_hits():
        raw = data["variables"][hit["variable"]]["raw"]
        baseline = [
            v for y, v in zip(data["years"], raw) if start <= y <= end
        ]
        z = (
            raw[data["years"].index(hit["year"])] - statistics.mean(baseline)
        ) / statistics.stdev(baseline)

        assert hit["value"] == raw[data["years"].index(hit["year"])]
        assert hit["zscore"] == round(z, 2)


def test_records_beat_all_earlier_years():
    data = load_data()

    for hit in load_hits():
        if not hit["type"].startswith("record_"):
            continue
        raw = data["variables"][hit["variable"]]["raw"]
        i = data["years"].index(hit["year"])
        if hit["type"] == "record_high":
            assert raw[i] > max(raw[:i])
        else:
            assert raw[i] < min(raw[:i])


def test_known_greatest_hits():
    hits = {(h["variable"], h["year"], h["type"]) for h in load_hits()}

    assert ("sea_ice", 2012, "record_low") in hits
    assert ("temperature", 2024, "record_high") in hits
    assert ("wildfire", 2015, "record_high") in hits


def test_each_variable_has_a_change_point():
    for name in load_data()["variables"]:
        assert any(
            h["variable"] == name and h["type"].startswith("shift_")
            for h in load_hits()
        )


def test_2004_wildfire_hits_note_source_limitation():
    for hit in load_hits():
        if hit["variable"] == "wildfire" and hit["year"] == 2004:
            assert "North Carolina" in hit["liner_notes"]
