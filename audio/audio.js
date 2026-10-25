/**
 * EarthTunes audio engine (Person 3)
 *
 * Turns data/processed/data.json into sound with Tone.js.
 *   temperature -> bright synth, pitch rises with temperature
 *   sea_ice     -> low string pad, pitch falls as ice falls
 *   wildfire    -> noise percussion, more hits and louder with more fire
 *
 * Every pitch is snapped to the C major pentatonic scale so it always sounds pleasant.
 * One year = one beat. At speed 1 that is 90 years per minute (~0.67 s per year).
 *
 * Usage (browser, Tone loaded from a <script> tag):
 *   import { createEngine } from './audio.js';
 *   const engine = createEngine();
 *   await engine.load('../data/processed/data.json');
 *   engine.onYear(({ year }) => console.log(year));
 *   button.onclick = () => engine.play(hit);   // must start from a click (browser rule)
 *
 * Usage (React / Vite with `npm i tone`):
 *   import * as Tone from 'tone';
 *   const engine = createEngine({ Tone });
 */

import { createHarmonyVoice, computeTension, getIntervals } from '../harmony/harmony.js';

export const LAYERS = ['temperature', 'sea_ice', 'wildfire', 'harmony'];

const BASE_BPM = 90;             // beats (= years) per minute at speed 1
const PENTATONIC = [0, 2, 4, 7, 9];

/** All pentatonic MIDI notes from lowMidi up `octaves` octaves (top note included). */
function pentatonicRange(lowMidi, octaves) {
  const notes = [];
  for (let o = 0; o < octaves; o++) {
    for (const step of PENTATONIC) notes.push(lowMidi + 12 * o + step);
  }
  notes.push(lowMidi + 12 * octaves);
  return notes;
}

const clamp01 = (x) => Math.min(1, Math.max(0, Number(x) || 0));

/** Map a 0-1 value onto the nearest note of a scale. */
function quantize(norm, scale) {
  return scale[Math.round(clamp01(norm) * (scale.length - 1))];
}

const TEMP_SCALE = pentatonicRange(60, 2); // C4..C6, 11 notes
const ICE_SCALE = pentatonicRange(36, 2);  // C2..C4, 11 notes
const FIRE_MAX_HITS = 8;                   // hits per year at the worst fire year

export class EarthTunesEngine {
  constructor({ Tone } = {}) {
    this.Tone = Tone || globalThis.Tone;
    if (!this.Tone) {
      throw new Error('EarthTunes: Tone.js not found. Load it before audio.js or pass createEngine({ Tone }).');
    }
    this.data = null;
    this.years = [];
    this.track = [];          // precomputed notes per year
    this.state = 'idle';      // idle | ready | playing | paused | ended
    this.speed = 1;
    this.currentYear = null;
    this.currentHit = null;

    this._cursor = 0;
    this._end = 0;
    this._start = 0;
    this._eventId = null;
    this._yearCbs = new Set();
    this._endCbs = new Set();
    this._stateCbs = new Set();
    this._hooks = new Set();
    this._graph = null;
    this._harmonyVoice = null;
    this._layerOn = { temperature: true, sea_ice: true, wildfire: true, harmony: true };
    this._layerVol = { temperature: 0.8, sea_ice: 0.7, wildfire: 0.6, harmony: 0.7 };
    this._masterVol = 0.8;
  }

  // ---------- Tone helpers (works with Tone v14 and v15) ----------
  get _transport() { return this.Tone.getTransport ? this.Tone.getTransport() : this.Tone.Transport; }
  get _draw() { return this.Tone.getDraw ? this.Tone.getDraw() : this.Tone.Draw; }
  get _destination() { return this.Tone.getDestination ? this.Tone.getDestination() : this.Tone.Destination; }

  // ---------- Loading ----------

  /** Load data.json from a URL, or pass the parsed object directly. */
  async load(source = '../data/processed/data.json') {
    const data = typeof source === 'string' ? await (await fetch(source)).json() : source;
    if (!data || !Array.isArray(data.years) || !data.variables) {
      throw new Error('EarthTunes: data.json must have "years" and "variables".');
    }
    const DATA_VARIABLES = ['temperature', 'sea_ice', 'wildfire'];
    for (const name of DATA_VARIABLES) {
      const v = data.variables[name];
      if (!v || v.norm.length !== data.years.length || v.raw.length !== data.years.length) {
        throw new Error(`EarthTunes: variable "${name}" is missing or not aligned with years.`);
      }
    }
    this.data = data;
    this.years = data.years.slice();
    const rawA = data.years.map((_, idx) => data.variables.temperature.norm[idx] * (1.0 - data.variables.sea_ice.norm[idx]));
    const minA = Math.min(...rawA);
    const maxA = Math.max(...rawA);

    this.track = this.years.map((year, i) => {
      const t = data.variables.temperature;
      const s = data.variables.sea_ice;
      const w = data.variables.wildfire;
      return {
        year,
        tension: computeTension(t.norm[i], s.norm[i], minA, maxA),
        temperature: { raw: t.raw[i], norm: t.norm[i], midi: quantize(t.norm[i], TEMP_SCALE) },
        sea_ice: { raw: s.raw[i], norm: s.norm[i], midi: quantize(s.norm[i], ICE_SCALE) },
        wildfire: { raw: w.raw[i], norm: w.norm[i], hits: 1 + Math.round(clamp01(w.norm[i]) * (FIRE_MAX_HITS - 1)) },
      };
    });
    this._buildGraph();
    this._setState('ready');
    return this;
  }

  _buildGraph() {
    if (this._graph) return;
    const T = this.Tone;

    const masterVol = new T.Volume(T.gainToDb(this._masterVol)).connect(this._destination);
    const reverb = new T.Freeverb({ roomSize: 0.7, dampening: 3000, wet: 0.2 }).connect(masterVol);
    const masterBus = new T.Gain(1).connect(reverb);

    const channel = (name) => new T.Channel({
      volume: T.gainToDb(this._layerVol[name]),
      mute: !this._layerOn[name],
    }).connect(masterBus);

    const channels = {
      temperature: channel('temperature'),
      sea_ice: channel('sea_ice'),
      wildfire: channel('wildfire'),
      harmony: channel('harmony'),
    };

    // Temperature: plucky triangle synth with a bit of echo
    const tempDelay = new T.FeedbackDelay({ delayTime: '8n', feedback: 0.2, wet: 0.15 }).connect(channels.temperature);
    const temperature = new T.PolySynth(T.Synth, {
      oscillator: { type: 'triangle8' },
      envelope: { attack: 0.01, decay: 0.25, sustain: 0.3, release: 0.8 },
    }).connect(tempDelay);
    temperature.volume.value = -8;

    // Sea ice: slow, warm string pad
    const iceFilter = new T.Filter({ type: 'lowpass', frequency: 1100, Q: 0.7 }).connect(channels.sea_ice);
    const seaIce = new T.PolySynth(T.Synth, {
      oscillator: { type: 'fatsawtooth', count: 3, spread: 25 },
      envelope: { attack: 0.25, decay: 0.3, sustain: 0.8, release: 1.2 },
    }).connect(iceFilter);
    seaIce.volume.value = -16;

    // Wildfire: filtered noise hits + a low thump on the downbeat
    const fireFilter = new T.Filter({ type: 'bandpass', frequency: 1500, Q: 0.9 }).connect(channels.wildfire);
    const fireNoise = new T.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.002, decay: 0.12, sustain: 0, release: 0.05 },
    }).connect(fireFilter);
    const fireKick = new T.MembraneSynth({
      pitchDecay: 0.04, octaves: 4,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
    }).connect(channels.wildfire);
    fireKick.volume.value = -10;

    // Harmony (Person 4): tension-driven voice & effects
    this._harmonyVoice = createHarmonyVoice(T, channels.harmony);

    this._graph = {
      masterVol, reverb, masterBus, channels,
      instruments: {
        temperature,
        sea_ice: seaIce,
        wildfire: fireNoise,
        wildfireKick: fireKick,
        harmony: this._harmonyVoice.synth,
      },
      filters: { sea_ice: iceFilter, wildfire: fireFilter, harmony: this._harmonyVoice.filter },
      inserts: {
        temperature: tempDelay,
        sea_ice: iceFilter,
        wildfire: fireFilter,
        harmony: this._harmonyVoice.filter,
      },
      harmonyVoice: this._harmonyVoice,
    };
  }

  // ---------- Playback ----------

  /** Play a Greatest Hit from hits.json (uses hit.window, clamped to the data range). */
  async play(hit, speed = this.speed) {
    if (!hit || !Array.isArray(hit.window)) throw new Error('EarthTunes: play(hit) needs a hit with a "window".');
    this.currentHit = hit;
    return this.playWindow(hit.window[0], hit.window[1], speed, hit);
  }

  /** Play the full 1983-2025 record. */
  async playAll(speed = this.speed) {
    this.currentHit = null;
    return this.playWindow(this.years[0], this.years[this.years.length - 1], speed);
  }

  /** Play every year from startYear to endYear (inclusive). speed 2 = twice as fast. */
  async playWindow(startYear, endYear, speed = this.speed, hit = null) {
    this._requireLoaded();
    const T = this.Tone;
    await T.start(); // unlocks audio; must be triggered by a user click the first time

    const first = this.years[0];
    const last = this.years[this.years.length - 1];
    let a = Math.min(startYear, endYear);
    let b = Math.max(startYear, endYear);
    a = Math.max(first, Math.min(last, a));
    b = Math.max(first, Math.min(last, b));

    this._clearSchedule();
    this.currentHit = hit;
    this._start = this.years.indexOf(a);
    this._end = this.years.indexOf(b);
    this._cursor = this._start;
    if (this._harmonyVoice && this.track[this._start]) {
      this._harmonyVoice.resetSmoothing(this.track[this._start].tension);
    }
    this.setSpeed(speed);

    const transport = this._transport;
    transport.position = 0;
    this._eventId = transport.scheduleRepeat((time) => this._tick(time), '4n', 0);
    transport.start('+0.05');
    this._setState('playing');
  }

  pause() {
    if (this.state !== 'playing') return;
    this._transport.pause();
    this._releaseAll();
    this._setState('paused');
  }

  async resume() {
    if (this.state !== 'paused') return;
    await this.Tone.start();
    this._transport.start('+0.02');
    this._setState('playing');
  }

  /** Pause if playing, resume if paused. */
  async toggle() {
    if (this.state === 'playing') this.pause();
    else if (this.state === 'paused') await this.resume();
  }

  stop() {
    this._clearSchedule();
    this._releaseAll();
    this.currentYear = null;
    if (this.data) this._setState('ready');
  }

  /** Change tempo, also while playing. 1 = 90 years/min. */
  setSpeed(speed) {
    this.speed = Math.max(0.1, Number(speed) || 1);
    this._transport.bpm.value = BASE_BPM * this.speed;
  }

  // ---------- Mixer ----------

  /**
   * Volume from 0 to 1.
   *   setVolume(0.5)              -> master volume
   *   setVolume(0.3, 'wildfire')  -> one layer
   */
  setVolume(value, layer) {
    const v = clamp01(value);
    const db = v <= 0.0001 ? -Infinity : this.Tone.gainToDb(v);
    if (layer) {
      this._checkLayer(layer);
      this._layerVol[layer] = v;
      if (this._graph) this._graph.channels[layer].volume.value = db;
    } else {
      this._masterVol = v;
      if (this._graph) this._graph.masterVol.volume.value = db;
    }
  }

  getVolume(layer) {
    if (layer) { this._checkLayer(layer); return this._layerVol[layer]; }
    return this._masterVol;
  }

  /** Turn a layer on (true) or off (false). */
  setLayer(name, on) {
    this._checkLayer(name);
    this._layerOn[name] = Boolean(on);
    if (this._graph) this._graph.channels[name].mute = !on;
  }

  getLayers() {
    return LAYERS.map((name) => ({ name, on: this._layerOn[name], volume: this._layerVol[name] }));
  }

  // ---------- Events ----------

  /** Called once per year, in sync with the sound. Returns an unsubscribe function. */
  onYear(cb) { this._yearCbs.add(cb); return () => this._yearCbs.delete(cb); }

  /** Called when a window finishes playing. */
  onEnd(cb) { this._endCbs.add(cb); return () => this._endCbs.delete(cb); }

  /** Called with the new state: ready | playing | paused | ended. */
  onStateChange(cb) { this._stateCbs.add(cb); return () => this._stateCbs.delete(cb); }

  // ---------- Hooks for Person 4 (harmony & tension) ----------

  /**
   * Runs every year on the audio clock, before onYear callbacks.
   * hook(payload, time) can add fields (e.g. payload.tension) and schedule extra
   * notes at `time`. Whatever it adds is passed on to every onYear callback.
   */
  addYearHook(hook) { this._hooks.add(hook); return () => this._hooks.delete(hook); }

  /**
   * Insert effects into a layer or the master bus.
   *   setEffects('temperature', [new Tone.Distortion(0.3)])
   *   setEffects('master', [new Tone.Filter(800, 'lowpass')])
   * Pass [] to remove them again.
   */
  setEffects(target, effects = []) {
    this._requireLoaded();
    const g = this._graph;
    if (target === 'master') {
      g.masterBus.disconnect();
      g.masterBus.chain(...effects, g.reverb);
      return;
    }
    this._checkLayer(target);
    const insert = g.inserts[target];
    insert.disconnect();
    insert.chain(...effects, g.channels[target]);
  }

  /** Tone nodes (synths, channels, master) for advanced use. */
  get nodes() { return this._graph; }

  /** Precomputed notes and values for one year. */
  getYear(year) { return this.track[this.years.indexOf(year)] || null; }

  /** Audition harmony voice at a specific tension value (0..1) for manual testing. */
  auditionHarmony(tensionVal, duration = 1.5) {
    this._requireLoaded();
    return this._harmonyVoice ? this._harmonyVoice.audition(tensionVal, duration) : null;
  }

  // ---------- Internals ----------

  _tick(time) {
    if (this._cursor > this._end) {
      // one beat after the last year, so its notes can ring out
      this._draw.schedule(() => this._finish(), time);
      this._clearSchedule(false);
      return;
    }
    const T = this.Tone;
    const g = this._graph;
    const i = this._cursor++;
    const row = this.track[i];
    const beat = T.Time('4n').toSeconds();
    const freq = (midi) => T.Frequency(midi, 'midi').toFrequency();

    // temperature: one note per year, brighter and louder when hotter
    g.instruments.temperature.triggerAttackRelease(
      freq(row.temperature.midi), beat * 0.8, time, 0.5 + 0.4 * row.temperature.norm,
    );

    // sea ice: sustained pad that overlaps into the next year
    g.instruments.sea_ice.triggerAttackRelease(freq(row.sea_ice.midi), beat * 1.1, time, 0.7);

    // wildfire: n evenly spaced hits; filter opens and hits get louder with more fire
    const fire = row.wildfire;
    g.filters.wildfire.frequency.setValueAtTime(800 + 4500 * fire.norm, time);
    const vel = 0.25 + 0.75 * fire.norm;
    for (let k = 0; k < fire.hits; k++) {
      g.instruments.wildfire.triggerAttackRelease(0.08, time + (k * beat) / fire.hits, vel * (k === 0 ? 1 : 0.8));
    }
    g.instruments.wildfireKick.triggerAttackRelease('C1', '8n', time, 0.3 + 0.7 * fire.norm);

    // Harmony (Person 4): play root + tension-driven intervals
    let harmonyInfo = null;
    if (this._harmonyVoice) {
      harmonyInfo = this._harmonyVoice.tick(row.tension, beat, time);
    }

    const steps = this._end - this._start + 1;
    const payload = {
      year: row.year,
      tension: row.tension,
      index: i,
      step: i - this._start + 1,
      steps,
      progress: (i - this._start + 1) / steps,
      window: [this.years[this._start], this.years[this._end]],
      hit: this.currentHit,
      values: {
        temperature: { ...row.temperature, note: T.Frequency(row.temperature.midi, 'midi').toNote() },
        sea_ice: { ...row.sea_ice, note: T.Frequency(row.sea_ice.midi, 'midi').toNote() },
        wildfire: { ...row.wildfire },
        harmony: harmonyInfo ? { ...harmonyInfo } : null,
      },
    };
    for (const hook of this._hooks) {
      try { hook(payload, time); } catch (e) { console.error('EarthTunes year hook failed:', e); }
    }
    this._draw.schedule(() => {
      this.currentYear = payload.year;
      for (const cb of this._yearCbs) cb(payload);
    }, time);
  }

  _finish() {
    this._transport.stop();
    this._setState('ended');
    const info = { hit: this.currentHit, window: [this.years[this._start], this.years[this._end]] };
    for (const cb of this._endCbs) cb(info);
  }

  _clearSchedule(stopTransport = true) {
    const transport = this._transport;
    if (this._eventId !== null) {
      transport.clear(this._eventId);
      this._eventId = null;
    }
    if (stopTransport) {
      transport.stop();
      transport.cancel(0);
    }
  }

  _releaseAll() {
    if (!this._graph) return;
    this._graph.instruments.temperature.releaseAll();
    this._graph.instruments.sea_ice.releaseAll();
    if (this._harmonyVoice) this._harmonyVoice.releaseAll();
  }

  _setState(state) {
    this.state = state;
    for (const cb of this._stateCbs) cb(state);
  }

  _requireLoaded() {
    if (!this.data) throw new Error('EarthTunes: call await engine.load() first.');
  }

  _checkLayer(name) {
    if (!LAYERS.includes(name)) throw new Error(`EarthTunes: unknown layer "${name}". Use one of ${LAYERS.join(', ')}.`);
  }
}

export function createEngine(options) {
  return new EarthTunesEngine(options);
}

export default createEngine;
