# scripts

- `download_data.py` downloads the three upstream source snapshots into
  `data/raw/`. It requires network access and replaces the existing snapshots.
- `process_data.py` parses those snapshots, keeps the shared 1983–2025 range,
  validates it, normalizes the three audio variables, and writes the files in
  `data/processed/`.

Run both from the repository root. Use `make` when the raw snapshots are
already present.
