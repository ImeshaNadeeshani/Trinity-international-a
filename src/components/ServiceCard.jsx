import { ArrowRight, ChevronDown } from 'lucide-react'

function ServiceCard({ icon: Icon, image, label, title, description, features, action, href, expanded, onToggle }) {
  return (
    <article className={`service-card${expanded ? ' service-card-open' : ''}`}>
      <img className="service-card-image" src={image} alt="" loading="lazy" decoding="async" />
      <button className="service-card-trigger" type="button" onClick={onToggle} aria-expanded={expanded}>
        <span className="service-icon"><Icon size={25} /></span>
        <span className="service-title">{title}</span>
        <ChevronDown className="service-chevron" size={22} />
      </button>
      <div className="service-details" aria-hidden={!expanded}>
        <span className="service-label">{label}</span>
        <h3>{title}</h3>
        <p>{description}</p>
        <ul className="service-features">
          {features.map((feature) => <li key={feature}>{feature}</li>)}
        </ul>
        {action && href && <a className="service-link" href={href} tabIndex={expanded ? 0 : -1}>{action} <ArrowRight size={16} /></a>}
      </div>
    </article>
  )
}

export default ServiceCard
