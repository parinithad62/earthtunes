# EarthTunes UI

React and Vite frontend for the EarthTunes climate sonification experience.

## Commands

```bash
npm install
npm run dev
npm run test
npm run build
```

The frontend reads the checked-in project data and will integrate the existing
audio engine in `../audio/` during the audio phase.

## Design direction

Orbital Midnight uses Bricolage Grotesque for display typography, Instrument
Sans for interface copy, and IBM Plex Mono for measurements. The interface
avoids generic purple gradients and uses navy, cyan, teal, amber, and coral.

The homepage Earth viewer is the official Sketchfab embed for the model
“Earth” by Akshat. A small attribution is retained below the viewer.

## Current experience

- Phase 1: responsive visual foundation and interactive Earth hero.
- Phase 2: normalized 1983–2025 climate timeline, year inspector, Greatest
  Hits filters, event details, and linked playback-window highlighting.

Phase 3 will connect these controls to the existing Tone.js audio engine.

The production frontend has not been scaffolded yet. Its stable inputs are:

- `data/processed/data.json` for the timeline and metric values;
- `data/processed/hits.json` for curated event cards and playback windows;
- `audio/audio.js` for playback, mixer controls, progress, and live year data.

The existing `audio/test.html` is the integration reference, not the final UI.
The frontend must start audio from a user gesture, show loading/error states,
unsubscribe event listeners on unmount, and call `engine.dispose()` on final
teardown.
