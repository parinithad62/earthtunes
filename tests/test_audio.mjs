import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { createEngine, LAYERS } from '../audio/audio.js';

class Param {
  constructor(value = 0) { this.value = value; }
  rampTo(value) { this.value = value; }
  setValueAtTime(value) { this.value = value; }
}

class AudioNode {
  constructor(options = {}) {
    this.options = options;
    this.volume = new Param(options.volume ?? 0);
    this.frequency = new Param(options.frequency ?? 0);
    this.detune = new Param(0);
    this.mute = options.mute ?? false;
    this.disposed = false;
    this.events = [];
  }
  connect(output) { this.output = output; return this; }
  chain(...nodes) {
    let current = this;
    for (const node of nodes) current = current.connect(node);
    return this;
  }
  disconnect() { this.output = null; return this; }
  triggerAttackRelease(...args) { this.events.push(args); }
  releaseAll() { this.released = true; }
  set(values) { Object.assign(this, values); }
  dispose() { this.disposed = true; }
}

class Distortion extends AudioNode {
  constructor(options = {}) {
    super(options);
    this.distortion = options.distortion ?? 0;
  }
}

function createFakeTone() {
  const transport = {
    bpm: new Param(90),
    position: 0,
    event: null,
    scheduleRepeat(callback) { this.event = callback; return 1; },
    clear() { this.event = null; },
    cancel() {},
    start() { this.started = true; },
    pause() { this.paused = true; },
    stop() { this.started = false; },
  };
  const destination = new AudioNode();
  let startCalls = 0;

  const Tone = {
    Volume: AudioNode,
    Freeverb: AudioNode,
    Gain: AudioNode,
    Channel: AudioNode,
    FeedbackDelay: AudioNode,
    PolySynth: AudioNode,
    Synth: AudioNode,
    Filter: AudioNode,
    NoiseSynth: AudioNode,
    MembraneSynth: AudioNode,
    Distortion,
    gainToDb: (value) => value === 0 ? -Infinity : 20 * Math.log10(value),
    getTransport: () => transport,
    getDestination: () => destination,
    getDraw: () => ({ schedule: (callback) => callback() }),
    Time: () => ({ toSeconds: () => 2 / 3 }),
    Frequency: (value) => ({
      toFrequency: () => Number(value),
      toNote: () => `midi-${value}`,
    }),
    start: async () => { startCalls += 1; },
  };

  return { Tone, transport, getStartCalls: () => startCalls };
}

const data = JSON.parse(
  await readFile(new URL('../data/processed/data.json', import.meta.url), 'utf8'),
);
const hits = JSON.parse(
  await readFile(new URL('../data/processed/hits.json', import.meta.url), 'utf8'),
);
const tension = JSON.parse(
  await readFile(new URL('../harmony/tension.json', import.meta.url), 'utf8'),
);

test('loads aligned data and reproduces the checked-in tension series', async () => {
  const { Tone } = createFakeTone();
  const engine = createEngine({ Tone });
  await engine.load(data);

  assert.equal(engine.state, 'ready');
  assert.equal(engine.years.length, 43);
  assert.deepEqual(LAYERS, ['temperature', 'sea_ice', 'wildfire', 'harmony']);
  assert.deepEqual(
    engine.track.map((row) => Number(row.tension.toFixed(6))),
    tension.tension,
  );
});

test('plays a hit and emits the frontend callback payload', async () => {
  const { Tone, transport } = createFakeTone();
  const engine = createEngine({ Tone });
  await engine.load(data);

  let payload;
  engine.onYear((value) => { payload = value; });
  await engine.play(hits[0]);
  transport.event(0);

  assert.equal(engine.state, 'playing');
  assert.equal(payload.year, hits[0].window[0]);
  assert.equal(payload.hit.id, hits[0].id);
  assert.equal(payload.step, 1);
  assert.ok(payload.tension >= 0 && payload.tension <= 1);
  assert.ok(payload.values.temperature.note.startsWith('midi-'));
  assert.ok(Array.isArray(payload.values.harmony.notes));
});

test('unlocks audio for direct harmony auditions', async () => {
  const { Tone, getStartCalls } = createFakeTone();
  const engine = createEngine({ Tone });
  await engine.load(data);

  const result = await engine.auditionHarmony(0.75);

  assert.equal(getStartCalls(), 1);
  assert.equal(result.tension, 0.75);
  assert.deepEqual(result.intervals, [1]);
});

test('rejects malformed data and playback years absent from the dataset', async () => {
  const first = createEngine({ Tone: createFakeTone().Tone });
  await assert.rejects(
    first.load({ years: [2000], variables: {} }),
    /variable "temperature" is missing/,
  );

  const second = createEngine({ Tone: createFakeTone().Tone });
  await second.load(data);
  await assert.rejects(second.playWindow(2000.5, 2005), /years must exist/);
});

test('updates mixer state and disposes the engine', async () => {
  const { Tone } = createFakeTone();
  const engine = createEngine({ Tone });
  await engine.load(data);

  engine.setVolume(0.25, 'wildfire');
  engine.setLayer('sea_ice', false);
  assert.equal(engine.getVolume('wildfire'), 0.25);
  assert.equal(engine.getLayers().find(({ name }) => name === 'sea_ice').on, false);

  engine.dispose();
  assert.equal(engine.state, 'idle');
  assert.equal(engine.data, null);
  assert.deepEqual(engine.years, []);
});
