/**
 * EarthTunes Harmony & Tension Module (Person 4)
 *
 * Implements climate tension calculation, interval mapping, harmony voice,
 * and tension-driven audio effects (detune, distortion, filter cutoff).
 */

export const DEFAULT_ROOT_MIDI = 48; // C3 (tenor range, between sea ice C2-C4 and temp C4-C6)

// Precomputed min and max for Formula A: norm_temp * (1 - norm_ice) across 1983-2025
export const RAW_TENSION_MIN = 0.0;
export const RAW_TENSION_MAX = 0.805486;

const clamp01 = (x) => Math.min(1, Math.max(0, Number(x) || 0));

/**
 * Compute normalized tension score from normalized temperature and sea ice extent.
 * Formula A: min_max(norm_temp * (1 - norm_ice))
 */
export function computeTension(normTemp, normIce, minA = RAW_TENSION_MIN, maxA = RAW_TENSION_MAX) {
  const t = clamp01(normTemp);
  const ice = clamp01(normIce);
  const raw = t * (1.0 - ice);
  const span = maxA - minA;
  if (span <= 0) return 0;
  return clamp01((raw - minA) / span);
}

/**
 * Returns semitone offsets above the root for a given tension score (0.0 to 1.0).
 * - 0.0 - 0.3: perfect fifth (7), major third (4)
 * - 0.3 - 0.6: minor third (3), major seventh (11)
 * - 0.6 - 0.7: tritone (6)
 * - 0.7 - 0.8: minor second (1)
 * - 0.8 - 1.0: tritone + minor second together [1, 6]
 */
export function getIntervals(tension) {
  const t = clamp01(tension);
  if (t < 0.3) {
    return [4, 7];
  } else if (t < 0.6) {
    return [3, 11];
  } else if (t < 0.7) {
    return [6];
  } else if (t < 0.8) {
    return [1];
  } else {
    return [1, 6];
  }
}

/**
 * Harmony Voice manager with effects and smooth parameter transitions.
 */
export class HarmonyVoice {
  constructor(Tone, outputNode, { rootMidi = DEFAULT_ROOT_MIDI } = {}) {
    this.Tone = Tone || globalThis.Tone;
    if (!this.Tone) throw new Error('HarmonyVoice: Tone.js is required.');

    this.rootMidi = rootMidi;
    this.outputNode = outputNode;
    this.smoothedTension = 0;
    this._currentNotes = [];

    this._buildGraph();
  }

  _buildGraph() {
    const T = this.Tone;

    // Tension-driven lowpass filter: 800 Hz -> ~4000 Hz
    this.filter = new T.Filter({
      type: 'lowpass',
      frequency: 800,
      Q: 0.8,
    });

    // Tension-driven distortion: 0 -> ~0.4
    this.distortion = new T.Distortion({
      distortion: 0,
      oversample: '2x',
      wet: 1,
    });

    // Chain: synth -> distortion -> filter -> output channel
    this.distortion.connect(this.filter);
    this.filter.connect(this.outputNode);

    // Warm polyphonic synth with smooth envelope to enable natural crossfades
    this.synth = new T.PolySynth(T.Synth, {
      oscillator: { type: 'triangle8' },
      envelope: {
        attack: 0.15,
        decay: 0.3,
        sustain: 0.85,
        release: 0.5,
      },
    }).connect(this.distortion);

    // Conservative gain to prevent clipping when multiple dissonant notes + distortion play
    this.synth.volume.value = -14;
  }

  /**
   * Reset the low-pass / lerp smoother to an initial tension value (e.g. at playback start).
   */
  resetSmoothing(val = 0) {
    this.smoothedTension = clamp01(val);
  }

  /**
   * Called on every year beat to update tension, automate effects, and play root + intervals.
   *
   * @param {number} targetTension - Raw annual tension (0..1)
   * @param {number} beatDuration - Beat duration in seconds at current playback speed
   * @param {number} time - Audio context scheduling time
   * @returns {{ smoothedTension: number, intervals: number[], notes: string[] }}
   */
  tick(targetTension, beatDuration, time) {
    const T = this.Tone;
    const target = clamp01(targetTension);

    // Soften year-to-year jumps with lerp / low-pass smoothing
    const alpha = 0.55;
    this.smoothedTension = this.smoothedTension + alpha * (target - this.smoothedTension);
    const tension = this.smoothedTension;

    const rampTime = Math.max(0.05, beatDuration * 0.85);

    // 1. Detune on harmony voice: 0 -> ~50 cents
    const detuneCents = tension * 50;
    if (this.synth.detune && this.synth.detune.rampTo) {
      this.synth.detune.rampTo(detuneCents, rampTime, time);
    } else {
      this.synth.set({ detune: detuneCents });
    }

    // 2. Distortion: 0 -> ~0.4
    const distAmount = tension * 0.4;
    this.distortion.distortion = distAmount;

    // 3. Filter cutoff: 800 Hz -> ~4000 Hz
    const cutoff = 800 + tension * 3200;
    this.filter.frequency.rampTo(cutoff, rampTime, time);

    // 4. Intervals and notes: root + semitone offsets
    const intervals = getIntervals(tension);
    const midiNotes = [this.rootMidi, ...intervals.map((semitones) => this.rootMidi + semitones)];
    const freq = (midi) => T.Frequency(midi, 'midi').toFrequency();
    const noteNames = midiNotes.map((m) => T.Frequency(m, 'midi').toNote());
    const frequencies = midiNotes.map(freq);

    // Sustained pad with 15% overlap into next beat; envelope attack/release handles crossfade
    const duration = beatDuration * 1.15;
    const velocity = 0.55 + 0.25 * tension;

    this.synth.triggerAttackRelease(frequencies, duration, time, velocity);
    this._currentNotes = noteNames;

    return { smoothedTension: tension, intervals, notes: noteNames };
  }

  /**
   * Manually audition tension effects and chord (for UI testing).
   */
  audition(tensionVal, duration = 1.5) {
    const T = this.Tone;
    const t = clamp01(tensionVal);
    this.smoothedTension = t;

    const detuneCents = t * 50;
    if (this.synth.detune && this.synth.detune.rampTo) {
      this.synth.detune.rampTo(detuneCents, 0.1);
    } else {
      this.synth.set({ detune: detuneCents });
    }

    this.distortion.distortion = t * 0.4;
    this.filter.frequency.rampTo(800 + t * 3200, 0.1);

    const intervals = getIntervals(t);
    const midiNotes = [this.rootMidi, ...intervals.map((s) => this.rootMidi + s)];
    const freqs = midiNotes.map((m) => T.Frequency(m, 'midi').toFrequency());

    this.synth.releaseAll();
    this.synth.triggerAttackRelease(freqs, duration, undefined, 0.6 + 0.2 * t);
    return {
      tension: t,
      intervals,
      notes: midiNotes.map((m) => T.Frequency(m, 'midi').toNote()),
    };
  }

  releaseAll() {
    if (this.synth) this.synth.releaseAll();
  }

  dispose() {
    if (this.synth) this.synth.dispose();
    if (this.distortion) this.distortion.dispose();
    if (this.filter) this.filter.dispose();
  }
}

export function createHarmonyVoice(Tone, outputNode, options) {
  return new HarmonyVoice(Tone, outputNode, options);
}

export default {
  DEFAULT_ROOT_MIDI,
  RAW_TENSION_MIN,
  RAW_TENSION_MAX,
  computeTension,
  getIntervals,
  HarmonyVoice,
  createHarmonyVoice,
};
