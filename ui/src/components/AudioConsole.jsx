import {
  AudioWaveform,
  Flame,
  Gauge,
  Headphones,
  Pause,
  Play,
  SlidersHorizontal,
  Snowflake,
  Square,
  ThermometerSun,
  Volume2,
} from 'lucide-react'

const layerMeta = {
  temperature: { label: 'Temperature', icon: ThermometerSun },
  sea_ice: { label: 'Sea ice', icon: Snowflake },
  wildfire: { label: 'Wildfire', icon: Flame },
  harmony: { label: 'Harmony', icon: AudioWaveform },
}

function formatLiveValue(value, unit, digits = 2) {
  if (value == null) return 'Waiting'
  return `${Number(value).toFixed(digits)} ${unit}`
}

export default function AudioConsole({ audio }) {
  const { payload } = audio
  const title = audio.currentHit?.title ?? 'Full climate record'
  const progress = Math.round((payload?.progress ?? 0) * 100)
  const isUnavailable = audio.isBusy || audio.state === 'error'

  return (
    <section className={`audio-console state-${audio.state}`} aria-label="EarthTunes listening console">
      <div className="audio-progress" role="progressbar" aria-label="Playback progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
        <span style={{ width: `${progress}%` }} />
      </div>

      {audio.error && <p className="audio-error" role="alert">{audio.error}</p>}

      <div className="audio-primary">
        <div className="now-playing">
          <span><Headphones size={14} aria-hidden="true" /> {audio.isBusy ? 'Preparing audio' : 'Now listening'}</span>
          <strong>{title}</strong>
          <small>{payload ? `${payload.window[0]} to ${payload.window[1]}` : 'Select a hit or play the complete record'}</small>
        </div>

        <div className="transport-controls">
          <button type="button" onClick={audio.stop} disabled={!audio.isActivated || audio.state === 'ready'} aria-label="Stop playback">
            <Square size={17} fill="currentColor" aria-hidden="true" />
          </button>
          <button className="transport-main" type="button" onClick={audio.toggle} disabled={isUnavailable} aria-label={audio.isPlaying ? 'Pause playback' : 'Start or resume playback'}>
            {audio.isPlaying ? <Pause size={21} fill="currentColor" aria-hidden="true" /> : <Play size={21} fill="currentColor" aria-hidden="true" />}
          </button>
        </div>

        <div className="live-year" aria-live="polite">
          <span>Live year</span>
          <strong>{payload?.year ?? '····'}</strong>
        </div>

        <div className="audio-metrics">
          <span><i className="temperature-dot" />Temp <b>{formatLiveValue(payload?.values.temperature.raw, '°C')}</b></span>
          <span><i className="ice-dot" />Ice <b>{formatLiveValue(payload?.values.sea_ice.raw, 'M km²')}</b></span>
          <span><i className="fire-dot" />Fire <b>{formatLiveValue(payload?.values.wildfire.raw, 'M acres', 3)}</b></span>
          <span><i className="tension-dot" />Tension <b>{payload ? `${Math.round(payload.tension * 100)}%` : 'Waiting'}</b></span>
        </div>

        <div className="quick-controls">
          <label>
            <Volume2 size={15} aria-hidden="true" />
            <span className="sr-only">Master volume</span>
            <input type="range" min="0" max="1" step="0.01" value={audio.masterVolume} onChange={(event) => audio.setMasterVolume(event.target.value)} />
          </label>
          <label>
            <Gauge size={15} aria-hidden="true" />
            <span className="sr-only">Playback speed</span>
            <select value={audio.speed} onChange={(event) => audio.setSpeed(event.target.value)} aria-label="Playback speed">
              <option value="0.5">0.5×</option>
              <option value="1">1×</option>
              <option value="1.5">1.5×</option>
              <option value="2">2×</option>
              <option value="3">3×</option>
            </select>
          </label>
        </div>

        <details className="mixer-panel">
          <summary><SlidersHorizontal size={16} aria-hidden="true" /> Mixer</summary>
          <div className="mixer-layers">
            {audio.layers.map((layer) => {
              const { label, icon: Icon } = layerMeta[layer.name]
              return (
                <div className={`mixer-layer mixer-${layer.name}`} key={layer.name}>
                  <label className="layer-toggle">
                    <input type="checkbox" checked={layer.on} onChange={(event) => audio.setLayerEnabled(layer.name, event.target.checked)} />
                    <Icon size={15} aria-hidden="true" />
                    <span>{label}</span>
                  </label>
                  <label className="layer-volume">
                    <span className="sr-only">{label} volume</span>
                    <input type="range" min="0" max="1" step="0.01" value={layer.volume} onChange={(event) => audio.setLayerVolume(layer.name, event.target.value)} />
                  </label>
                </div>
              )
            })}
          </div>
        </details>
      </div>
    </section>
  )
}
