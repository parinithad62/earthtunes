import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import AudioConsole from './AudioConsole.jsx'

function createAudio(overrides = {}) {
  return {
    state: 'playing',
    error: '',
    payload: {
      year: 2012,
      progress: 0.55,
      window: [2008, 2016],
      tension: 0.567,
      values: {
        temperature: { raw: 0.65 },
        sea_ice: { raw: 3.57 },
        wildfire: { raw: 9.326 },
      },
    },
    currentHit: { id: 8, title: 'The Great Melt' },
    speed: 1,
    masterVolume: 0.8,
    layers: [
      { name: 'temperature', on: true, volume: 0.8 },
      { name: 'sea_ice', on: true, volume: 0.7 },
      { name: 'wildfire', on: true, volume: 0.6 },
      { name: 'harmony', on: true, volume: 0.7 },
    ],
    isActivated: true,
    isPlaying: true,
    isBusy: false,
    stop: vi.fn(),
    toggle: vi.fn(),
    setSpeed: vi.fn(),
    setMasterVolume: vi.fn(),
    setLayerEnabled: vi.fn(),
    setLayerVolume: vi.fn(),
    ...overrides,
  }
}

describe('AudioConsole', () => {
  it('shows synchronized playback data and transport controls', () => {
    const audio = createAudio()
    render(<AudioConsole audio={audio} />)

    expect(screen.getByText('The Great Melt')).toBeInTheDocument()
    expect(screen.getByText('2012')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '55')

    fireEvent.click(screen.getByRole('button', { name: /pause playback/i }))
    fireEvent.click(screen.getByRole('button', { name: /stop playback/i }))
    expect(audio.toggle).toHaveBeenCalledOnce()
    expect(audio.stop).toHaveBeenCalledOnce()
  })

  it('updates master, speed, and layer controls', () => {
    const audio = createAudio()
    render(<AudioConsole audio={audio} />)

    fireEvent.change(screen.getByLabelText(/master volume/i), { target: { value: '0.4' } })
    fireEvent.change(screen.getByLabelText(/playback speed/i), { target: { value: '2' } })
    fireEvent.change(screen.getByRole('checkbox', { name: /sea ice/i }), { target: { checked: false } })
    fireEvent.change(screen.getByLabelText(/harmony volume/i), { target: { value: '0.25' } })

    expect(audio.setMasterVolume).toHaveBeenCalledWith('0.4')
    expect(audio.setSpeed).toHaveBeenCalledWith('2')
    expect(audio.setLayerEnabled).toHaveBeenCalledWith('sea_ice', false)
    expect(audio.setLayerVolume).toHaveBeenCalledWith('harmony', '0.25')
  })
})
