"""EarthTunes - Tension Score Generator (Person 4).

Computes climate tension scores from processed data:
- Formula A: norm_temp * (1 - norm_ice), min-max rescaled to [0, 1].
- Formula B: 0.8 * tension_A + 0.2 * norm_wildfire, min-max rescaled to [0, 1].

Outputs:
- harmony/tension.json
- harmony/tension_plot.png
"""

import json
from pathlib import Path
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "processed" / "data.json"
HITS_PATH = ROOT / "data" / "processed" / "hits.json"
OUT_JSON = ROOT / "harmony" / "tension.json"
OUT_PLOT = ROOT / "harmony" / "tension_plot.png"


def compute_tension(data):
    years = data["years"]
    norm_temp = data["variables"]["temperature"]["norm"]
    norm_ice = data["variables"]["sea_ice"]["norm"]
    norm_fire = data["variables"]["wildfire"]["norm"]

    # Formula A: global temperature anomaly * (1 - sea ice extent)
    raw_a = [t * (1.0 - ice) for t, ice in zip(norm_temp, norm_ice)]
    min_a, max_a = min(raw_a), max(raw_a)
    span_a = (max_a - min_a) if max_a != min_a else 1.0
    tension = [(x - min_a) / span_a for x in raw_a]

    # Formula B: 0.8 * A + 0.2 * norm_wildfire
    raw_b = [0.8 * a + 0.2 * fire for a, fire in zip(tension, norm_fire)]
    min_b, max_b = min(raw_b), max(raw_b)
    span_b = (max_b - min_b) if max_b != min_b else 1.0
    alt_with_fire = [(x - min_b) / span_b for x in raw_b]

    return {
        "years": years,
        "formula": "min_max(norm_temp * (1 - norm_ice))",
        "tension": [round(t, 6) for t in tension],
        "alt_with_fire": [round(b, 6) for b in alt_with_fire],
        "stats": {
            "raw_a_min": min_a,
            "raw_a_max": max_a,
            "raw_b_min": min_b,
            "raw_b_max": max_b,
        },
    }


def print_table(result, hits):
    hit_map = {}
    for h in hits:
        y = h["year"]
        hit_map.setdefault(y, []).append(f"{h['title']} ({h['variable']} {h['type']})")

    print("=" * 86)
    print(f"{'Year':<6} | {'Tension (A)':<12} | {'Alt Fire (B)':<12} | {'Hits / Key Events'}")
    print("-" * 86)
    for y, t, b in zip(result["years"], result["tension"], result["alt_with_fire"]):
        event_str = "; ".join(hit_map.get(y, []))
        print(f"{y:<6} | {t:<12.4f} | {b:<12.4f} | {event_str}")
    print("=" * 86)


def generate_plot(result, hits, out_path):
    years = result["years"]
    tension = result["tension"]
    alt_with_fire = result["alt_with_fire"]

    fig, ax = plt.subplots(figsize=(12, 6), dpi=150)
    fig.patch.set_facecolor("#0f1115")
    ax.set_facecolor("#181b22")

    ax.plot(years, tension, color="#ff4d4d", linewidth=2.4, label="Tension (Formula A: Temp × (1 - Ice))", zorder=3)
    ax.plot(years, alt_with_fire, color="#ff9f43", linewidth=1.8, linestyle="--", alpha=0.85, label="Alt (Formula B: 0.8A + 0.2Fire)", zorder=2)

    # Highlight major hits
    hit_dict = {}
    for h in hits:
        y = h["year"]
        if y not in hit_dict or h["rank"] < hit_dict[y]["rank"]:
            hit_dict[y] = h

    # Select representative hits to annotate clearly without clutter
    key_annotated_years = {1996, 2007, 2012, 2015, 2016, 2020, 2024}
    for y, h in hit_dict.items():
        idx = years.index(y)
        t_val = tension[idx]
        ax.scatter(y, t_val, color="#6cc4ff", s=40, zorder=4, edgecolor="#ffffff", linewidth=0.8)

        if y in key_annotated_years:
            offset_y = 22 if t_val < 0.8 else -28
            ax.annotate(
                f"{y}: {h['title']}",
                xy=(y, t_val),
                xytext=(0, offset_y),
                textcoords="offset points",
                ha="center",
                fontsize=8,
                color="#e8eaf0",
                fontweight="bold",
                bbox=dict(boxstyle="round,pad=0.3", fc="#232835", ec="#6cc4ff", lw=0.8, alpha=0.9),
                arrowprops=dict(arrowstyle="->", color="#6cc4ff", lw=0.8),
            )

    ax.set_title("EarthTunes Climate Tension Over Time (1983–2025)", color="#e8eaf0", fontsize=14, pad=14, fontweight="bold")
    ax.set_xlabel("Year", color="#8a90a0", fontsize=11, labelpad=8)
    ax.set_ylabel("Normalized Tension (0.0 – 1.0)", color="#8a90a0", fontsize=11, labelpad=8)
    ax.set_xlim(years[0] - 1, years[-1] + 1)
    ax.set_ylim(-0.05, 1.08)

    ax.grid(True, color="#2a2f3a", linestyle=":", linewidth=0.8)
    ax.tick_params(colors="#8a90a0", which="both")
    for spine in ax.spines.values():
        spine.set_color("#2a2f3a")

    legend = ax.legend(facecolor="#232835", edgecolor="#2a2f3a", fontsize=9, loc="upper left")
    for text in legend.get_texts():
        text.set_color("#e8eaf0")

    fig.tight_layout()
    fig.savefig(out_path, facecolor=fig.get_facecolor(), edgecolor="none")
    plt.close(fig)


def main():
    with open(DATA_PATH, encoding="utf-8") as f:
        data = json.load(f)
    with open(HITS_PATH, encoding="utf-8") as f:
        hits = json.load(f)

    result = compute_tension(data)

    # Save JSON without extra stats field for exact required schema
    export_data = {
        "years": result["years"],
        "formula": result["formula"],
        "tension": result["tension"],
        "alt_with_fire": result["alt_with_fire"],
    }
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(export_data, f, indent=2)

    print(f"Exported tension scores to {OUT_JSON}")
    print(f"Formula A raw range: [{result['stats']['raw_a_min']:.6f}, {result['stats']['raw_a_max']:.6f}]")
    print(f"Formula B raw range: [{result['stats']['raw_b_min']:.6f}, {result['stats']['raw_b_max']:.6f}]")

    print_table(result, hits)
    generate_plot(result, hits, OUT_PLOT)
    print(f"Saved tension plot to {OUT_PLOT}")


if __name__ == "__main__":
    main()
