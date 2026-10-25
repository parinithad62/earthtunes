# Person 4: Harmony & Tension Developer — Handoff Document

This document summarizes the harmony voice, tension score calculations, interval mappings, audio effects, and integration into the EarthTunes audio engine.

---

## 1. Formulas & Tension Score Statistics

### Formula Used (Default Formula A)
$$\text{raw\_tension}_A = \text{norm\_temp} \times (1 - \text{norm\_ice})$$
$$\text{tension} = \frac{\text{raw\_tension}_A - \min(\text{raw\_tension}_A)}{\max(\text{raw\_tension}_A) - \min(\text{raw\_tension}_A)}$$

- **Actual Raw A Minimum:** `0.000000` (occurred in 1985 when $\text{norm\_temp}=0$ and 1996 when $\text{norm\_ice}=1.0$)
- **Actual Raw A Maximum:** `0.805486` (occurred in 2024 with $\text{norm\_temp}=1.0$ and $\text{norm\_ice}=0.194514$)
- **Rescaled Range:** Exactly $[0.000000, 1.000000]$.

### Alternative Formula (Formula B with Wildfire)
$$\text{raw\_tension}_B = 0.8 \times \text{tension}_A + 0.2 \times \text{norm\_wildfire}$$
$$\text{alt\_with\_fire} = \frac{\text{raw\_tension}_B - \min(\text{raw\_tension}_B)}{\max(\text{raw\_tension}_B) - \min(\text{raw\_tension}_B)}$$

- **Actual Raw B Minimum:** `0.006576` (1984)
- **Actual Raw B Maximum:** `0.973258` (2024)
- **Rescaled Range:** Exactly $[0.000000, 1.000000]$.

### Why Formula A is Defaulted
Formula A reflects planetary-scale climate physics (global temperature anomaly paired with Northern Hemisphere Arctic sea ice collapse). It produces smooth, macro-climatic tension that peaks precisely at dramatic climate milestones:
- **1996:** Absolute minimum tension (`0.0000`) matching "The Big Freeze" (sea ice record high).
- **2007:** Sharp local peak (`0.4770`) matching "Record Melt" / "The Ice Retreat".
- **2012:** Clear peak (`0.5672`) matching "The Great Melt" (all-time Arctic sea ice record low).
- **2015:** Jump (`0.6083`) matching "Turning Up the Heat" / "The Warming Shift".
- **2016:** Rise (`0.7245`) matching "Fever Pitch".
- **2020:** Local peak (`0.8504`) matching "Heatwave Year" / "Thin Ice".
- **2024:** Global peak (`1.0000`) matching "Hottest Year on Record".

Wildfire data is U.S.-only, exhibits high seasonal spikes, and undercounts 2004 (excluding North Carolina state lands). Formula A is cleaner and superior.

---

## 2. Intervals & Root Note Mapping

- **Key / Root Note:** Root is $C_3$ (MIDI 48, 130.81 Hz), positioned in the tenor register between sea ice ($C_2 \dots C_4$) and temperature ($C_4 \dots C_6$).
- **Function:** `getIntervals(tension)` returns semitone offsets above the root:
  - **0.0 – 0.3:** `[4, 7]` (Major third, Perfect fifth $\rightarrow$ consonant C Major triad: $C_3, E_3, G_3$)
  - **0.3 – 0.6:** `[3, 11]` (Minor third, Major seventh $\rightarrow$ nostalgic/melancholy $Cm(\text{maj7})$: $C_3, E\flat_3, B_3$)
  - **0.6 – 0.7:** `[6]` (Tritone $\rightarrow$ diabolus in musica / unsettled interval: $C_3, F\sharp_3$)
  - **0.7 – 0.8:** `[1]` (Minor second $\rightarrow$ sharp half-step dissonance: $C_3, D\flat_3$)
  - **0.8 – 1.0:** `[1, 6]` (Tritone + Minor second together $\rightarrow$ maximum tension cluster: $C_3, D\flat_3, F\sharp_3$)

---

## 3. Tension-Driven Effects & Smooth Transitions

1. **Detune:**
   - Ranges from `0` to `~50 cents` as tension increases from 0 to 1 (`cents = tension * 50`).
   - Ramped smoothly with Tone.js `detune.rampTo` tied to tempo (`rampTime = beat * 0.85`).
2. **Distortion:**
   - Tone.Distortion with oversampling `2x` and wet `1`.
   - Distortion parameter scales from `0` to `~0.4` (`distortion = tension * 0.4`), introducing subtle saturation and harmonic grit at high tension.
3. **Lowpass Filter Cutoff:**
   - Tone.Filter (lowpass, $Q=0.8$) cutoff frequency opens from `800 Hz` up to `~4000 Hz` (`cutoff = 800 + tension * 3200`). Ramped continuously over the beat duration.
4. **Year-to-Year Smoothing (Lerp / Low-Pass):**
   - Softens sudden annual jumps with an exponential smoothing factor ($\alpha = 0.55$):
     $$\text{smoothed\_tension} = \text{smoothed\_tension} + \alpha \times (\text{target\_tension} - \text{smoothed\_tension})$$
   - Snaps / resets to hit starting tension during seek or jump events so playback doesn't lag behind the start of a window.
5. **Crossfade Between Interval Sets:**
   - Voice uses `Tone.PolySynth` with envelope attack ($0.15\text{ s}$), decay ($0.3\text{ s}$), sustain ($0.85$), and release ($0.5\text{ s}$).
   - Chords trigger with $15\%$ overlap into the subsequent beat (`duration = beat * 1.15`), allowing consecutive chords to smoothly crossfade without harsh audio cuts or clicks.

---

## 4. Callback Format (`onYear`)

Listeners subscribed via `engine.onYear(cb)` now receive both `year` and `tension` directly at the top level of the payload, as well as in `payload.values.harmony`:

```javascript
engine.onYear(({ year, tension, values }) => {
  console.log(`Year: ${year}, Tension: ${(tension * 100).toFixed(1)}%`);
  // values.harmony contains:
  // {
  //   smoothedTension: 0.567,
  //   intervals: [1],
  //   notes: ['C3', 'Db3']
  // }
});
```

### Full Payload Schema

```json
{
  "year": 2012,
  "tension": 0.5672,
  "index": 29,
  "step": 5,
  "steps": 9,
  "progress": 0.556,
  "window": [2008, 2016],
  "hit": { ... },
  "values": {
    "temperature": { "raw": 0.65, "norm": 0.457, "midi": 72, "note": "C5" },
    "sea_ice": { "raw": 3.57, "norm": 0.0, "midi": 36, "note": "C2" },
    "wildfire": { "raw": 9.326, "norm": 0.911, "hits": 7 },
    "harmony": {
      "smoothedTension": 0.518,
      "intervals": [3, 11],
      "notes": ["C3", "Eb3", "B3"]
    }
  }
}
```

---

## 5. Mixer & Engine API Changes

- **Layers List:** `LAYERS` now includes `'harmony'`:
  `['temperature', 'sea_ice', 'wildfire', 'harmony']`
- **Layer Volume Control:**
  `engine.setVolume(0.7, 'harmony');` (Volume 0–1; controls harmony channel gain).
- **Layer Mute / Toggle:**
  `engine.setLayer('harmony', false);` (Mutes harmony channel).
  `engine.setLayer('harmony', true);` (Unmutes harmony channel).
- **Pause & Stop Handling:**
  `engine.pause()`, `engine.stop()`, and `engine._releaseAll()` immediately release all sustaining harmony notes.
- **Manual Audition Helper (Test & UI):**
  `engine.auditionHarmony(tensionValue, duration = 1.5);`
  Allows interactive auditioning of harmony chords and tension effects at any custom tension (0.0 to 1.0).

---

## 6. Known Quirks & Browser Behavior

1. **User Gesture Requirement for Web Audio:**
   - Modern browsers block the Web Audio `AudioContext` from starting before an explicit user interaction (click, tap, or key press).
   - Calling `engine.play()`, `engine.playAll()`, or `engine.auditionHarmony()` must be triggered from a user click event handler (e.g. clicking a button or hit item).
2. **First Hit Playback Delay:**
   - On the very first user interaction, `Tone.start()` unlocks the audio hardware, which can introduce a ~20–50 ms hardware initialization latency before sound is heard. Subsequent triggers are immediate.
3. **Local File Fetch (`file://` protocol):**
   - Browsers prevent `fetch()` on `file://` URLs due to CORS restrictions. The repository must be served via an HTTP server (e.g., `python -m http.server 8000`) when testing `audio/test.html`.
