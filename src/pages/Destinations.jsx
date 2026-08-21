import { ArrowRight, Compass, Globe2, MapPinned, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import CountryCard from '../components/destinations/CountryCard'
import SectionTitle from '../components/SectionTitle'
import { destinations } from '../data/destinations'
import '../styles/destinations.css'

function Destinations() {
  return (
    <main className="destinations-page">
      <section className="destinations-hero">
        <div className="container destinations-hero-grid">
          <div className="destinations-hero-copy">
            <p className="eyebrow"><Globe2 size={15} /> Destination guide</p>
            <h1>Find the right place to build your future.</h1>
            <p>Explore the destinations Trinity International supports, compare the essentials, and find a study pathway that fits your goals.</p>
            <div className="destination-hero-actions"><a className="button button-primary" href="#top-countries">Explore countries <ArrowRight size={18} /></a><a className="destination-text-link" href="#destination-match">Help me choose <Compass size={17} /></a></div>
          </div>
          <div className="destination-globe-art" aria-hidden="true"><div className="globe-ring globe-ring-one" /><div className="globe-ring globe-ring-two" /><Globe2 size={245} strokeWidth={1.1} /><span className="globe-pin globe-pin-one"><MapPinned size={19} /></span><span className="globe-pin globe-pin-two"><MapPinned size={19} /></span><span className="globe-pin globe-pin-three"><MapPinned size={19} /></span><span className="globe-caption">Your next chapter is out there.</span></div>
        </div>
      </section>

      <section className="destination-intro-strip">
        <div className="container destination-intro-inner"><div className="intro-icon"><Sparkles size={24} /></div><div><p>Personalised destination planning</p><span>We help you compare more than a map: costs, visa basics, intakes, universities and the kind of life you want to build.</span></div><Link to="/contact" className="button button-outline">Talk to a counsellor <ArrowRight size={17} /></Link></div>
      </section>

      <section className="destination-country-section" id="top-countries">
        <div className="container"><SectionTitle eyebrow="Explore your options" title="Top countries for global study" subtitle="Start with the destinations our students ask about most, then open a country guide for the details." /><div className="country-card-grid">{destinations.map((country) => <CountryCard key={country.slug} country={country} />)}</div></div>
      </section>

      <section className="destination-match-section" id="destination-match">
        <div className="container destination-match-inner"><div><p className="eyebrow">Not sure where to start?</p><h2>Which country is right for me?</h2><p>Share your study level, budget and ambitions with our team. We will help you narrow down the places worth considering.</p></div><Link className="button button-primary" to="/contact">Book a free assessment <ArrowRight size={17} /></Link></div>
      </section>

      <section className="destination-process-section">
        <div className="container"><SectionTitle eyebrow="A clearer way forward" title="Compare the details that matter" subtitle="Every country guide is designed to help you have a more informed first conversation." /><div className="destination-process-grid"><article><span>01</span><h3>Understand the cost</h3><p>Review indicative living and accommodation costs before you shortlist.</p></article><article><span>02</span><h3>Plan around intakes</h3><p>See when your preferred programmes usually accept new students.</p></article><article><span>03</span><h3>Move with confidence</h3><p>Get visa basics, university context and counsellor support in one place.</p></article></div></div>
      </section>
    </main>
  )
}

export default Destinations
