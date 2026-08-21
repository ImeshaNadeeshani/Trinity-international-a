import { useEffect, useState } from 'react'
import { ArrowUpRight, ChevronDown, Menu, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import DestinationMegaMenu from './destinations/DestinationMegaMenu'
import ConsultationModal from './ConsultationModal'
import logoAsset from '../assets/logo/trinity-navbar-logo.jpeg'
import '../styles/navbar.css'

const navLinks = [
  { label: 'Home', href: '/', route: true },
  { label: 'About Us', href: '/about', route: true },
  { label: 'Destinations', href: '/destinations', menu: true },
  { label: 'Success Stories', href: '/success-stories', route: true },
  { label: 'FindmyUni', href: '/findmyuni', route: true },
  { label: 'Contact Us', href: '/contact', route: true },
]

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [destinationsOpen, setDestinationsOpen] = useState(false)
  const [consultationOpen, setConsultationOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setDestinationsOpen(false)
    setMenuOpen(false)
  }, [location.pathname])

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link className="brand brand-logo-only" to="/" aria-label="Trinity International home">
          <img src={logoAsset} alt="Trinity International" />
        </Link>

        <button type="button" className="nav-toggle" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((state) => !state)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {navLinks.map((item) => item.menu ? (
            <div className="destination-menu-wrap" key={item.label}>
              <button type="button" className={`nav-menu-trigger ${location.pathname.startsWith('/destinations') ? 'active' : ''}`} aria-expanded={destinationsOpen} onClick={() => setDestinationsOpen((state) => !state)}>
                {item.label}<ChevronDown className={destinationsOpen ? 'rotate' : ''} size={13} />
              </button>
              {destinationsOpen && <DestinationMegaMenu onClose={() => setDestinationsOpen(false)} />}
            </div>
          ) : item.route ? (
            <Link className={location.pathname === item.href ? 'active' : ''} key={item.label} to={item.href} onClick={() => setMenuOpen(false)}>{item.label}</Link>
          ) : (
            <a key={item.label} className={item.label === 'Home' ? 'active' : ''} href={item.href} onClick={() => setMenuOpen(false)}>
              {item.label}{item.dropdown && <ChevronDown size={13} />}
            </a>
          ))}
        </nav>

        <button className="nav-cta" type="button" onClick={() => setConsultationOpen(true)}>Book a Consultation <ArrowUpRight size={15} /></button>
      </div>
      {consultationOpen && <ConsultationModal onClose={() => setConsultationOpen(false)} />}
    </header>
  )
}

export default Navbar
