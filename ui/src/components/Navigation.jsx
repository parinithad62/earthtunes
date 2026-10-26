import { Menu, Radio, X } from 'lucide-react'
import { useState } from 'react'

const links = [
  ['Experience', '#experience'],
  ['Timeline', '#timeline'],
  ['Greatest Hits', '#hits'],
  ['Sources', '#sources'],
]

export default function Navigation({ onStartListening, isAudioBusy = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const closeMenu = () => setIsOpen(false)

  return (
    <header className="site-header">
      <nav className="navigation" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="EarthTunes home" onClick={closeMenu}>
          <span className="brand-mark" aria-hidden="true"><Radio size={18} strokeWidth={1.8} /></span>
          <span>EarthTunes</span>
        </a>

        <button
          className="menu-button"
          type="button"
          aria-expanded={isOpen}
          aria-controls="primary-menu"
          aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>

        <div className={`nav-links ${isOpen ? 'is-open' : ''}`} id="primary-menu">
          {links.map(([label, href]) => (
            <a href={href} key={href} onClick={closeMenu}>{label}</a>
          ))}
        </div>

        <button className="nav-action" type="button" onClick={onStartListening} disabled={isAudioBusy}>
          <span className="live-dot" aria-hidden="true" />
          {isAudioBusy ? 'Loading audio' : 'Start listening'}
        </button>
      </nav>
    </header>
  )
}
