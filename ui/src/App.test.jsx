import { fireEvent, render, screen, within } from '@testing-library/react'
import App from './App.jsx'

describe('EarthTunes foundation', () => {
  it('renders the primary story and interactive Earth', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /hear the planet changing/i })).toBeInTheDocument()
    expect(screen.getByTitle(/interactive 3d model of earth/i)).toHaveAttribute(
      'src',
      expect.stringContaining('sketchfab.com/models/41fc80d85dfd480281f21b74b2de2faa/embed'),
    )
    expect(screen.getByText(/earth model by akshat/i)).toBeInTheDocument()
  })

  it('exposes every primary narrative destination', () => {
    render(<App />)

    expect(screen.getByRole('navigation', { name: /primary navigation/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /three measurements become one planetary score/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /listen across four decades/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /years that changed the track/i })).toBeInTheDocument()
  })

  it('exposes the mobile navigation through an accessible control', () => {
    render(<App />)

    const menuButton = screen.getByRole('button', { name: /open navigation/i })
    fireEvent.click(menuButton)

    expect(menuButton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /close navigation/i })).toBeInTheDocument()
  })

  it('lets visitors inspect a year and select a climate hit', async () => {
    render(<App />)

    const yearSlider = await screen.findByLabelText(/navigate the record/i)
    fireEvent.change(yearSlider, { target: { value: '2012' } })
    expect(yearSlider).toHaveValue('2012')
    expect(screen.getByText('3.57 M km²')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /sea ice \(6\)/i }))
    const seaIceTracks = screen.getByRole('group', { name: /sea ice greatest hits/i })
    expect(within(seaIceTracks).getByText('The Great Melt')).toBeInTheDocument()
    expect(within(seaIceTracks).queryByText('Hottest Year on Record')).not.toBeInTheDocument()

    fireEvent.click(within(seaIceTracks).getByRole('button', { name: /the great melt/i }))
    expect(yearSlider).toHaveValue('2012')
  })
})
