.PHONY: all process hits tension test test-python test-js test-ui ui-build

all: process hits tension test ui-build

process:
	python scripts/process_data.py

hits:
	python analysis/greatest_hits.py

tension:
	python harmony/tension.py

test: test-python test-js test-ui

test-python:
	python -m pytest -v

test-js:
	node --test tests/test_audio.mjs

test-ui:
	npm --prefix ui test

ui-build:
	npm --prefix ui run build
