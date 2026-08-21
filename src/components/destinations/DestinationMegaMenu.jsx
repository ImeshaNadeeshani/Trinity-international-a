import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { destinations } from '../../data/destinations'
import australiaFlag from '../../assets/flags/australia-flag.png'
import canadaFlag from '../../assets/flags/canada-flag.png'
import irelandFlag from '../../assets/flags/ireland-flag.png'
import malaysiaFlag from '../../assets/flags/malaysia-flag.png'
import newZealandFlag from '../../assets/flags/new-zealand-flag.png'
import singaporeFlag from '../../assets/flags/singapore-flag.png'
import unitedKingdomFlag from '../../assets/flags/united-kingdom-flag.png'
import usaFlag from '../../assets/flags/usa-flag.png'

const countryFlags = {
  australia: australiaFlag,
  canada: canadaFlag,
  ireland: irelandFlag,
  malaysia: malaysiaFlag,
  'new-zealand': newZealandFlag,
  singapore: singaporeFlag,
  'united-kingdom': unitedKingdomFlag,
  usa: usaFlag,
}

function DestinationMegaMenu({ onClose }) {
  return (
    <div className="destination-mega-menu">
      <div className="mega-country-grid">
        {destinations.map((country) => <Link key={country.slug} className="mega-country-link" to={`/destinations/${country.slug}`} onClick={onClose}><img className="country-flag" src={countryFlags[country.slug]} alt="" /><span><strong>{country.name}</strong></span><ChevronRight size={16} /></Link>)}
      </div>
    </div>
  )
}

export default DestinationMegaMenu
