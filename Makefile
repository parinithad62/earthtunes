.PHONY: all process test

all: process test

process:
	python scripts/process_data.py

test:
	python -m pytest -v
