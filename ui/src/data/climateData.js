import data from '../../../data/processed/data.json'
import hits from '../../../data/processed/hits.json'
import tension from '../../../harmony/tension.json'

export const sourceData = data

export const signalConfig = {
  temperature: {
    label: 'Temperature',
    shortLabel: 'Temp',
    unit: data.variables.temperature.unit,
    dataKey: 'temperatureNorm',
    rawKey: 'temperatureRaw',
    color: 'var(--amber)',
  },
  sea_ice: {
    label: 'Sea ice',
    shortLabel: 'Ice',
    unit: data.variables.sea_ice.unit,
    dataKey: 'seaIceNorm',
    rawKey: 'seaIceRaw',
    color: 'var(--cyan)',
  },
  wildfire: {
    label: 'Wildfire',
    shortLabel: 'Fire',
    unit: data.variables.wildfire.unit,
    dataKey: 'wildfireNorm',
    rawKey: 'wildfireRaw',
    color: 'var(--coral)',
  },
  tension: {
    label: 'Tension',
    shortLabel: 'Tension',
    unit: 'score',
    dataKey: 'tension',
    rawKey: 'tension',
    color: 'var(--teal)',
  },
}

export const climateSeries = data.years.map((year, index) => ({
  year,
  temperatureRaw: data.variables.temperature.raw[index],
  temperatureNorm: data.variables.temperature.norm[index],
  seaIceRaw: data.variables.sea_ice.raw[index],
  seaIceNorm: data.variables.sea_ice.norm[index],
  wildfireRaw: data.variables.wildfire.raw[index],
  wildfireNorm: data.variables.wildfire.norm[index],
  tension: tension.tension[index],
}))

export const greatestHits = hits
export const years = data.years
export const firstYear = years[0]
export const lastYear = years.at(-1)

export function getYearRecord(year) {
  return climateSeries.find((record) => record.year === Number(year)) ?? climateSeries[0]
}

export function formatSignalValue(variable, value) {
  if (variable === 'temperature') return `${Number(value).toFixed(2)} °C`
  if (variable === 'sea_ice') return `${Number(value).toFixed(2)} M km²`
  if (variable === 'wildfire') return `${Number(value).toFixed(3)} M acres`
  return `${Math.round(Number(value) * 100)}%`
}

export function formatEventType(type) {
  return type.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}
