.PHONY: all process hits test

all: process hits test

process:
	python scripts/process_data.py

hits:
	python analysis/greatest_hits.py

test:
	python -m pytest -v
