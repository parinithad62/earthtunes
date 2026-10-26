import { ChevronLeft, ChevronRight, Crosshair } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  climateSeries,
  firstYear,
  formatSignalValue,
  getYearRecord,
  lastYear,
  signalConfig,
} from '../data/climateData.js'

const chartSignals = ['temperature', 'sea_ice', 'wildfire', 'tension']

function ClimateTooltip({ active, label }) {
  if (!active || label == null) return null
  const record = getYearRecord(label)

  return (
    <div className="chart-tooltip">
      <strong>{record.year}</strong>
      <span>{formatSignalValue('temperature', record.temperatureRaw)}</span>
      <span>{formatSignalValue('sea_ice', record.seaIceRaw)}</span>
      <span>{formatSignalValue('wildfire', record.wildfireRaw)}</span>
      <span>Tension {formatSignalValue('tension', record.tension)}</span>
    </div>
  )
}

export default function ClimateTimeline({ activeYear, onYearChange, selectedHit }) {
  const activeRecord = getYearRecord(activeYear)
  const changeYear = (difference) => {
    onYearChange(Math.min(lastYear, Math.max(firstYear, activeYear + difference)))
  }

  const handleChartClick = (state) => {
    if (state?.activeLabel != null) onYearChange(Number(state.activeLabel))
  }

  return (
    <section className="timeline-section" id="timeline" aria-labelledby="timeline-title">
      <div className="timeline-heading">
        <div>
          <p className="section-index">Orbital timeline</p>
          <h2 id="timeline-title">Forty-three years on one listening line.</h2>
        </div>
        <p>
          Every signal is normalized from zero to one so unlike measurements can move together. Select any year to inspect the original values.
        </p>
      </div>

      <div className="timeline-console">
        <div className="year-readout" aria-live="polite">
          <div>
            <span className="console-label"><Crosshair size={14} aria-hidden="true" /> Active year</span>
            <strong>{activeYear}</strong>
          </div>
          <div className="year-values">
            <span><i className="temperature-dot" />Temperature <b>{formatSignalValue('temperature', activeRecord.temperatureRaw)}</b></span>
            <span><i className="ice-dot" />Sea ice <b>{formatSignalValue('sea_ice', activeRecord.seaIceRaw)}</b></span>
            <span><i className="fire-dot" />Wildfire <b>{formatSignalValue('wildfire', activeRecord.wildfireRaw)}</b></span>
            <span><i className="tension-dot" />Tension <b>{formatSignalValue('tension', activeRecord.tension)}</b></span>
          </div>
        </div>

        <div className="series-legend" aria-label="Timeline series">
          {chartSignals.map((signal) => (
            <span key={signal}><i className={`${signal.replace('_', '-')}-dot`} />{signalConfig[signal].label}</span>
          ))}
        </div>

        <div className="chart-wrap" aria-label="Normalized climate signals from 1983 to 2025">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={climateSeries}
              margin={{ top: 12, right: 12, bottom: 8, left: -18 }}
              onClick={handleChartClick}
              accessibilityLayer
            >
              <CartesianGrid vertical={false} stroke="rgba(146, 197, 219, 0.12)" />
              <XAxis
                dataKey="year"
                ticks={[1983, 1990, 2000, 2010, 2020, 2025]}
                tick={{ fill: '#7ca9bd', fontFamily: 'IBM Plex Mono', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(146, 197, 219, 0.22)' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 1]}
                ticks={[0, 0.25, 0.5, 0.75, 1]}
                tickFormatter={(value) => value.toFixed(2)}
                tick={{ fill: '#7ca9bd', fontFamily: 'IBM Plex Mono', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ClimateTooltip />} cursor={{ stroke: 'rgba(232, 247, 255, 0.28)' }} />
              {selectedHit && (
                <ReferenceArea
                  x1={selectedHit.window[0]}
                  x2={selectedHit.window[1]}
                  fill="rgba(255, 180, 84, 0.09)"
                  stroke="rgba(255, 180, 84, 0.25)"
                />
              )}
              <ReferenceLine x={activeYear} stroke="#e8f7ff" strokeWidth={1} />
              <Line type="monotone" dataKey="temperatureNorm" stroke="#ffb454" strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="seaIceNorm" stroke="#38bdf8" strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="wildfireNorm" stroke="#ff6b5f" strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="tension" stroke="#22d3a6" strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="year-scrubber">
          <button type="button" onClick={() => changeYear(-1)} disabled={activeYear === firstYear} aria-label="Previous year">
            <ChevronLeft aria-hidden="true" />
          </button>
          <label htmlFor="year-slider">
            <span>Navigate the record</span>
            <input
              id="year-slider"
              type="range"
              min={firstYear}
              max={lastYear}
              step="1"
              value={activeYear}
              onChange={(event) => onYearChange(Number(event.target.value))}
            />
          </label>
          <button type="button" onClick={() => changeYear(1)} disabled={activeYear === lastYear} aria-label="Next year">
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  )
}
