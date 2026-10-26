import { Database, Headphones, ThermometerSun, Waves } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import AudioConsole from './components/AudioConsole.jsx'
import GreatestHits from './components/GreatestHits.jsx'
import Navigation from './components/Navigation.jsx'
import Hero from './components/Hero.jsx'
import { greatestHits } from './data/climateData.js'
import useEarthTunesEngine from './hooks/useEarthTunesEngine.js'

const ClimateTimeline = lazy(() => import('./components/ClimateTimeline.jsx'))

const signals = [
  {
    name: 'Temperature',
    detail: 'Global annual anomaly',
    source: 'NASA GISTEMP',
    icon: ThermometerSun,
    className: 'signal-temperature',
  },
  {
    name: 'Sea ice',
    detail: 'September Arctic extent',
    source: 'NSIDC',
    icon: Waves,
    className: 'signal-ice',
  },
  {
    name: 'Wildfire',
    detail: 'Annual U.S. acres burned',
    source: 'NIFC',
    icon: Database,
    className: 'signal-fire',
  },
]

function App() {
  const initialHit = greatestHits.find((hit) => hit.year === 2024) ?? greatestHits[0]
  const [activeYear, setActiveYear] = useState(initialHit.year)
  const [selectedHit, setSelectedHit] = useState(initialHit)
  const audio = useEarthTunesEngine({ onYearChange: setActiveYear })

  const selectHit = (hit) => {
    setSelectedHit(hit)
    setActiveYear(hit.year)
  }

  const playHit = (hit) => {
    selectHit(hit)
    audio.playHit(hit)
  }

  return (
    <div className={`site-shell ${audio.state !== 'idle' ? 'has-audio-console' : ''}`}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Navigation onStartListening={audio.playAll} isAudioBusy={audio.isBusy} />
      <main id="main-content">
        <Hero onStartListening={audio.playAll} isAudioBusy={audio.isBusy} />

        <section className="signal-section" id="experience" aria-labelledby="signals-title">
          <div className="section-heading">
            <p className="section-index">Signal set 01</p>
            <h2 id="signals-title">Three measurements become one planetary score.</h2>
            <p>
              Each year is translated into pitch, rhythm, and harmony. The data stays visible while the sound reveals patterns that charts alone can hide.
            </p>
          </div>

          <div className="signal-list">
            {signals.map(({ name, detail, source, icon: Icon, className }, index) => (
              <article className={`signal-row ${className}`} key={name}>
                <span className="signal-number">0{index + 1}</span>
                <Icon aria-hidden="true" size={20} strokeWidth={1.7} />
                <div>
                  <h3>{name}</h3>
                  <p>{detail}</p>
                </div>
                <span className="signal-source">{source}</span>
              </article>
            ))}
          </div>
        </section>

        <Suspense fallback={<div className="timeline-loading" role="status">Preparing the climate timeline…</div>}>
          <ClimateTimeline
            activeYear={activeYear}
            onYearChange={setActiveYear}
            selectedHit={selectedHit}
          />
        </Suspense>

        <section className="method-section" id="how-it-works" aria-labelledby="method-title">
          <div className="method-orbit" aria-hidden="true">
            <span />
            <span />
            <Headphones size={32} strokeWidth={1.4} />
          </div>
          <div className="method-copy">
            <p className="section-index">Translation protocol</p>
            <h2 id="method-title">Listen across four decades of change.</h2>
            <p>
              EarthTunes aligns 43 years of environmental records, identifies their most dramatic moments, and gives every signal a distinct musical voice.
            </p>
            <ol className="method-steps">
              <li><span>01</span>Align the yearly records</li>
              <li><span>02</span>Normalize each climate signal</li>
              <li><span>03</span>Map values into sound</li>
            </ol>
          </div>
        </section>

        <GreatestHits
          selectedHit={selectedHit}
          onHitSelect={selectHit}
          onPlayHit={playHit}
          playingHitId={audio.isPlaying ? audio.currentHit?.id : null}
          isAudioBusy={audio.isBusy}
        />
      </main>

      <footer id="sources">
        <div className="wordmark"><span aria-hidden="true">◉</span> EarthTunes</div>
        <p>NASA GISTEMP · NSIDC · National Interagency Fire Center</p>
        <p>Data coverage 1983 to 2025</p>
      </footer>
      {audio.state !== 'idle' && <AudioConsole audio={audio} />}
    </div>
  )
}

export default App
