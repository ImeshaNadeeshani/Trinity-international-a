import { useState } from 'react'
import { ArrowUpRight, ChevronDown, Menu, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import DestinationMegaMenu from './destinations/DestinationMegaMenu'
import ConsultationModal from './ConsultationModal'
import logoAsset from '../assets/logo/trinity-official-logo.jpeg'
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
  const [menuOpenPath, setMenuOpenPath] = useState(null)
  const [destinationsOpenPath, setDestinationsOpenPath] = useState(null)
  const [consultationOpen, setConsultationOpen] = useState(false)
  const location = useLocation()
  const menuOpen = menuOpenPath === location.pathname
  const destinationsOpen = destinationsOpenPath === location.pathname
  const closeNavigation = () => {
    setMenuOpenPath(null)
    setDestinationsOpenPath(null)
  }

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link className="brand brand-logo-only" to="/" aria-label="Trinity International home" onClick={closeNavigation}>
          <img src={logoAsset} alt="Trinity International" />
        </Link>

        <button type="button" className="nav-toggle" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} onClick={() => setMenuOpenPath(menuOpen ? null : location.pathname)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {navLinks.map((item) => item.menu ? (
            <div className="destination-menu-wrap" key={item.label}>
              <button type="button" className={`nav-menu-trigger ${location.pathname.startsWith('/destinations') ? 'active' : ''}`} aria-expanded={destinationsOpen} onClick={() => setDestinationsOpenPath(destinationsOpen ? null : location.pathname)}>
                {item.label}<ChevronDown className={destinationsOpen ? 'rotate' : ''} size={13} />
              </button>
              {destinationsOpen && <DestinationMegaMenu onClose={closeNavigation} />}
            </div>
          ) : item.route ? (
            <Link className={location.pathname === item.href ? 'active' : ''} key={item.label} to={item.href} onClick={closeNavigation}>{item.label}</Link>
          ) : (
            <a key={item.label} className={item.label === 'Home' ? 'active' : ''} href={item.href} onClick={closeNavigation}>
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
