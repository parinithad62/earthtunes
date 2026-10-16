from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

SOURCES = {
    "nasa_gistemp_global.csv": (
        "https://data.giss.nasa.gov/gistemp/tabledata_v4/"
        "GLB.Ts%2BdSST.csv"
    ),
    "nsidc_arctic_september_extent.csv": (
        "https://noaadata.apps.nsidc.org/NOAA/G02135/"
        "north/monthly/data/N_09_extent_v4.0.csv"
    ),
    "nifc_wildfires_acres.html": (
        "https://www.nifc.gov/fire-information/statistics/wildfires"
    ),
}


def download_file(filename, url):
    print(f"\nDownloading: {filename}")

    response = requests.get(
        url,
        timeout=60,
        headers={"User-Agent": "EarthTunes-DataPipeline/1.0"},
    )
    response.raise_for_status()

    if not response.content:
        raise ValueError(f"Empty response received for {filename}")

    output_path = RAW_DIR / filename
    output_path.write_bytes(response.content)

    print(f"Saved: {output_path.relative_to(ROOT)}")
    print(f"Size: {len(response.content):,} bytes")
    print(f"Content-Type: {response.headers.get('Content-Type', 'unknown')}")


def main():
    for filename, url in SOURCES.items():
        try:
            download_file(filename, url)
        except (requests.RequestException, ValueError) as error:
            raise SystemExit(
                f"\nDownload failed for {filename}: {error}"
            ) from error

    print("\nAll three source files downloaded successfully.")


if __name__ == "__main__":
    main()
