import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

function CountryCard({ country }) {
  return (
    <Link className="country-card" to={`/destinations/${country.slug}`}>
      <span className="country-flag" aria-hidden="true">{country.flagEmoji}</span>
      <span className="country-card-copy"><strong>{country.name}</strong><small>{country.shortLabel}</small></span>
      <ArrowUpRight className="country-card-arrow" size={17} aria-hidden="true" />
    </Link>
  )
}

export default CountryCard
