import { describe, expect, it } from 'vitest'
import {
  climateSeries,
  firstYear,
  formatEventType,
  formatSignalValue,
  getYearRecord,
  greatestHits,
  lastYear,
} from './climateData.js'

describe('climate data adapter', () => {
  it('aligns every signal across the complete record', () => {
    expect(climateSeries).toHaveLength(43)
    expect(firstYear).toBe(1983)
    expect(lastYear).toBe(2025)
    expect(climateSeries.every((row) => row.tension >= 0 && row.tension <= 1)).toBe(true)
  })

  it('returns the original measurements for a selected year', () => {
    const record = getYearRecord(2012)

    expect(record.seaIceRaw).toBe(3.57)
    expect(formatSignalValue('sea_ice', record.seaIceRaw)).toBe('3.57 M km²')
    expect(formatEventType('record_low')).toBe('Record Low')
  })

  it('exposes all curated hits to the interface', () => {
    expect(greatestHits).toHaveLength(20)
    expect(greatestHits.some((hit) => hit.title === 'Hottest Year on Record')).toBe(true)
  })
})
