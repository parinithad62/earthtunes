# audio (Person 3: Audio Engine)

Turns `data/processed/data.json` into sound with [Tone.js](https://tonejs.github.io/) and plays the Greatest Hits from `hits.json`.

| File | What it is |
|---|---|
| `audio.js` | The engine (ES module). No build step. |
| `test.html` | Test page: hit list, play/pause/stop, layer toggles, volume, speed, live year readout. |

## Run the test page

Browsers block `fetch()` on `file://`, so serve the repo root:

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000/audio/test.html> and click a hit.

## Sound mapping

One year = one beat. At speed 1 that is 90 years per minute (~0.67 s per year), so a 9-year hit window lasts about 6 s and the full 1983–2025 record about 29 s.

| Layer | Instrument | Mapping |
|---|---|---|
| `temperature` | Triangle synth with a light echo | `norm` → C4–C6 pentatonic; hotter = higher and slightly louder |
| `sea_ice` | Low sawtooth string pad | `norm` → C2–C4 pentatonic; less ice = lower pitch (`norm` is not inverted, higher = more ice) |
| `wildfire` | Pink-noise hits + low kick | `norm` → 1–8 hits per year; more fire = more hits, louder, brighter filter |

All pitches snap to C major pentatonic, so any combination sounds consonant. Dissonance is Person 4's job.

## API

```js
import { createEngine } from './audio.js';      // Tone must already be loaded as window.Tone
// React/Vite: import * as Tone from 'tone'; const engine = createEngine({ Tone });

const engine = createEngine();
await engine.load('../data/processed/data.json');   // or pass the parsed object

engine.play(hit);              // plays hit.window (clamped to 1983–2025)
engine.playWindow(2005, 2015, speed);
engine.playAll(speed);
engine.pause(); await engine.resume(); await engine.toggle(); engine.stop();
engine.setSpeed(2);            // 2 = twice as fast, works mid-playback

engine.setVolume(0.5);                 // master, 0–1
engine.setVolume(0.3, 'wildfire');     // one layer, 0–1
engine.setLayer('sea_ice', false);     // mute / unmute a layer
engine.getLayers();                    // [{ name, on, volume }, ...]

engine.onYear(cb);          // returns an unsubscribe function
engine.onEnd(cb);           // ({ hit, window })
engine.onStateChange(cb);   // 'ready' | 'playing' | 'paused' | 'ended'
engine.currentYear;         // last year emitted
await engine.auditionHarmony(0.75); // unlocks audio and previews a tension chord
engine.dispose();           // permanent cleanup (for example on app teardown)
```

**Browser rule:** the first `play*()` call must come from a click or key press, or the browser keeps audio muted.

### `onYear` payload

```js
{
  year: 2012, index: 29, step: 5, steps: 9, progress: 0.556,
  window: [2008, 2016], hit: { ...the hit, or null },
  values: {
    temperature: { raw: 0.65, norm: 0.457, midi: 72, note: 'C5' },
    sea_ice:     { raw: 3.57, norm: 0,     midi: 36, note: 'C2' },
    wildfire:    { raw: 9.326, norm: 0.911, hits: 7 }
  }
}
```

## For Person 4 (harmony & tension)

Two hooks so you don't have to edit the engine:

```js
// Runs every year on the audio clock, before onYear callbacks.
// Anything you add to payload reaches every onYear listener (Person 5 gets { year, tension }).
engine.addYearHook((payload, time) => {
  const t = payload.values.temperature.norm;
  const ice = payload.values.sea_ice.norm;
  payload.tension = t * (1 - ice);
  // schedule extra harmony notes at `time` with your own Tone synths
});

// Insert effects into a layer or the master bus ([] removes them)
engine.setEffects('temperature', [new Tone.Distortion(0.3)]);
engine.setEffects('master', [new Tone.Filter(800, 'lowpass')]);
```

`engine.nodes` exposes the raw Tone nodes (`instruments`, `channels`, `filters`, `masterVol`) if you need to automate parameters directly.

## Tested

In headless Chromium with Tone 15.1.22: all 20 hits play exactly the years in their window, pause holds the year and resume continues it, layer mute, per-layer and master volume, live speed change, `addYearHook` passing `tension` through to `onYear`, `setEffects` on a layer and master. No console errors.
