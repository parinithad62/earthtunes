import { ArrowDown, Headphones, Move3D, Play } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'

const facts = [
  ['43', 'years'],
  ['03', 'climate signals'],
  ['20', 'defining moments'],
]

export default function Hero({ onStartListening, isAudioBusy = false }) {
  const reduceMotion = useReducedMotion()
  const reveal = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 22 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
      }

  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="hero-grid" aria-hidden="true" />
      <motion.div className="hero-copy" {...reveal}>
        <div className="mission-label">
          <span>Earth data sonification</span>
          <span>1983 · 2025</span>
        </div>

        <p className="hero-kicker"><Headphones size={17} strokeWidth={1.8} aria-hidden="true" /> Climate has a sound</p>
        <h1 id="hero-title">Hear the planet changing.</h1>
        <p className="hero-summary">
          Four decades of temperature, Arctic sea ice, and wildfire data transformed into an interactive listening experience.
        </p>

        <div className="hero-actions">
          <button className="primary-action" type="button" onClick={onStartListening} disabled={isAudioBusy}>
            <Play size={17} fill="currentColor" aria-hidden="true" />
            {isAudioBusy ? 'Preparing audio' : 'Start listening'}
          </button>
          <a className="secondary-action" href="#timeline">
            Explore the data
            <ArrowDown size={17} aria-hidden="true" />
          </a>
        </div>

        <dl className="hero-facts">
          {facts.map(([value, label]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </motion.div>

      <motion.div
        className="earth-stage"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="orbit orbit-one" aria-hidden="true" />
        <div className="orbit orbit-two" aria-hidden="true" />
        <div className="earth-label"><span /> Live planetary view</div>
        <div className="earth-viewer">
          <iframe
            title="Interactive 3D model of Earth"
            allow="autoplay; fullscreen; xr-spatial-tracking"
            allowFullScreen
            src="https://sketchfab.com/models/41fc80d85dfd480281f21b74b2de2faa/embed"
          />
          <div className="viewer-hint"><Move3D size={15} aria-hidden="true" /> Drag to orbit</div>
        </div>
        <p className="model-credit">Earth model by Akshat · Sketchfab</p>
      </motion.div>
    </section>
  )
}
