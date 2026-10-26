import { Crosshair, Disc3, ListMusic, Play } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatEventType, formatSignalValue, greatestHits, signalConfig } from '../data/climateData.js'

const filters = [
  ['all', 'All tracks'],
  ['temperature', 'Temperature'],
  ['sea_ice', 'Sea ice'],
  ['wildfire', 'Wildfire'],
]

export default function GreatestHits({ selectedHit, onHitSelect, onPlayHit, playingHitId, isAudioBusy }) {
  const [filter, setFilter] = useState('all')
  const filteredHits = useMemo(
    () => greatestHits.filter((hit) => filter === 'all' || hit.variable === filter),
    [filter],
  )

  return (
    <section className="hits-section" id="hits" aria-labelledby="hits-title">
      <div className="hits-heading">
        <div>
          <p className="section-index"><ListMusic size={15} aria-hidden="true" /> Climate record</p>
          <h2 id="hits-title">The years that changed the track.</h2>
        </div>
        <p>Records, anomalies, sudden shifts, and turning points form the Greatest Hits of a changing planet.</p>
      </div>

      <div className="hit-filters" aria-label="Filter Greatest Hits">
        {filters.map(([value, label]) => (
          <button
            type="button"
            key={value}
            aria-label={`${label} (${value === 'all' ? greatestHits.length : greatestHits.filter((hit) => hit.variable === value).length})`}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
            <span>{value === 'all' ? greatestHits.length : greatestHits.filter((hit) => hit.variable === value).length}</span>
          </button>
        ))}
      </div>

      <div className="hits-layout">
        <div className="track-list" role="group" aria-label={`${filters.find(([value]) => value === filter)[1]} Greatest Hits`}>
          {filteredHits.map((hit, index) => (
            <button
              type="button"
              className={`track-row track-${hit.variable} ${selectedHit?.id === hit.id ? 'is-selected' : ''}`}
              key={hit.id}
              aria-pressed={selectedHit?.id === hit.id}
              onClick={() => onHitSelect(hit)}
            >
              <span className="track-number">{String(index + 1).padStart(2, '0')}</span>
              <span className="track-year">{hit.year}</span>
              <span className="track-title"><strong>{hit.title}</strong><small>{formatEventType(hit.type)}</small></span>
              <span className="track-variable"><i />{signalConfig[hit.variable].label}</span>
              <Crosshair className="track-action" size={17} aria-hidden="true" />
            </button>
          ))}
        </div>

        <aside className={`hit-detail detail-${selectedHit.variable}`} aria-live="polite">
          <div className="detail-disc" aria-hidden="true"><Disc3 size={50} strokeWidth={1.1} /></div>
          <p className="detail-label">Selected climate track</p>
          <p className="detail-year">{selectedHit.year}</p>
          <h3>{selectedHit.title}</h3>
          <p className="detail-notes">{selectedHit.liner_notes}</p>
          <dl>
            <div><dt>Signal</dt><dd>{signalConfig[selectedHit.variable].label}</dd></div>
            <div><dt>Event</dt><dd>{formatEventType(selectedHit.type)}</dd></div>
            <div><dt>Value</dt><dd>{formatSignalValue(selectedHit.variable, selectedHit.value)}</dd></div>
            <div><dt>Drama score</dt><dd>{selectedHit.score.toFixed(2)}</dd></div>
            <div><dt>Listening window</dt><dd>{selectedHit.window[0]} to {selectedHit.window[1]}</dd></div>
          </dl>
          <button className="hit-play" type="button" onClick={() => onPlayHit(selectedHit)} disabled={isAudioBusy || playingHitId === selectedHit.id}>
            <Play size={16} fill="currentColor" aria-hidden="true" />
            {playingHitId === selectedHit.id ? 'Playing this window' : 'Play this climate window'}
          </button>
        </aside>
      </div>
    </section>
  )
}
