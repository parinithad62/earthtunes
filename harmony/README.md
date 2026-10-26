# harmony

`harmony.js` is the browser module used by the audio engine. It converts the
temperature/sea-ice tension score into chords and controls detune, distortion,
and filter cutoff.

`tension.py` generates the standalone `tension.json` data artifact and
`tension_plot.png` reference chart:

```bash
python harmony/tension.py
```

The full formulas and frontend callback payload are documented in
`HANDOFF.md`.
