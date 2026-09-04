import { ArrowLeft, ArrowRight, Banknote, BookOpenCheck, BriefcaseBusiness, CheckCircle2, ChevronDown, Clock3, Globe2, GraduationCap, HeartHandshake, Lightbulb, MapPin, ShieldCheck, UsersRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DestinationStat from '../components/destinations/DestinationStat'
import { destinationMap } from '../data/destinations'
import australiaHeroImage from '../assets/images/country-hero-australia.png'
import ukHeroImage from '../assets/images/country-hero-united-kingdom.png'
import canadaHeroImage from '../assets/images/country-hero-canada.png'
import newZealandHeroImage from '../assets/images/country-hero-new-zealand.png'
import usaHeroImage from '../assets/images/country-hero-usa.png'
import irelandHeroImage from '../assets/images/country-hero-ireland.png'
import singaporeHeroImage from '../assets/images/country-hero-singapore.png'
import malaysiaHeroImage from '../assets/images/country-hero-malaysia.png'
import unswUniversityImage from '../assets/images/university-unsw-sydney.jpg'
import flindersUniversityImage from '../assets/images/university-flinders.jpg'
import jamesCookUniversityImage from '../assets/images/university-james-cook.jpg'
import canberraCollegeImage from '../assets/images/university-canberra-college.jpg'
import rmitUniversityImage from '../assets/images/university-rmit.jpg'
import deakinUniversityImage from '../assets/images/university-deakin.jpg'
import northumbriaUniversityImage from '../assets/images/university-northumbria.jpg'
import queensBelfastUniversityImage from '../assets/images/university-queens-belfast.jpg'
import cardiffUniversityImage from '../assets/images/university-cardiff.jpg'
import glasgowCaledonianUniversityImage from '../assets/images/university-glasgow-caledonian.jpg'
import ardenUniversityImage from '../assets/images/university-arden.jpg'
import kingstonUniversityImage from '../assets/images/university-kingston.jpg'
import londonMetropolitanUniversityImage from '../assets/images/university-london-metropolitan.jpg'
import senecaUniversityImage from '../assets/images/university-seneca.png'
import unbcUniversityImage from '../assets/images/university-unbc.jpg'
import newBrunswickUniversityImage from '../assets/images/university-new-brunswick.jpg'
import windsorUniversityImage from '../assets/images/university-windsor.jpg'
import saskatchewanUniversityImage from '../assets/images/university-saskatchewan.jpg'
import manitobaUniversityImage from '../assets/images/university-manitoba.jpg'
import victoriaWellingtonUniversityImage from '../assets/images/university-victoria-wellington.jpg'
import canterburyUniversityImage from '../assets/images/university-canterbury.jpg'
import otagoUniversityImage from '../assets/images/university-otago.jpg'
import autUniversityImage from '../assets/images/university-aut.jpg'
import waikatoUniversityImage from '../assets/images/university-waikato.webp'
import arizonaStateUniversityImage from '../assets/images/university-arizona-state.jpg'
import northFloridaUniversityImage from '../assets/images/university-north-florida.jpg'
import missouriUniversityImage from '../assets/images/university-missouri.png'
import californiaBerkeleyUniversityImage from '../assets/images/university-california-berkeley.jpg'
import newEnglandCollegeImage from '../assets/images/university-new-england-college-sign.png'
import pacificCrestUniversityImage from '../assets/images/university-pacific-crest.png'
import galwayUniversityImage from '../assets/images/university-galway.jpg'
import maynoothUniversityImage from '../assets/images/university-maynooth.jpg'
import limerickUniversityImage from '../assets/images/university-limerick.jpg'
import dublinBusinessSchoolImage from '../assets/images/dublin-business-school.webp'
import trinityCollegeDublinImage from '../assets/images/trinity-college-dublin.jpg'
import universityCollegeDublinImage from '../assets/images/university-college-dublin.jpg'
import tumAsiaUniversityImage from '../assets/images/university-tum-asia.jpg'
import jamesCookSingaporeImage from '../assets/images/university-james-cook-singapore.jpg'
import simGlobalEducationImage from '../assets/images/university-sim-global-education.webp'
import taylorsUniversityMalaysiaImage from '../assets/images/university-taylors-malaysia.webp'
import sunwayUniversityMalaysiaImage from '../assets/images/university-sunway-malaysia.jpg'
import monashUniversityMalaysiaImage from '../assets/images/university-monash-malaysia.jpg'
import '../styles/destinations.css'

const destinationHeroImages = {
  australia: australiaHeroImage,
  'united-kingdom': ukHeroImage,
  canada: canadaHeroImage,
  'new-zealand': newZealandHeroImage,
  usa: usaHeroImage,
  ireland: irelandHeroImage,
  singapore: singaporeHeroImage,
  malaysia: malaysiaHeroImage,
}

const destinationHeroDescriptions = {
  australia: 'World-class education. Boundless adventures.',
  'united-kingdom': 'World-class education. Limitless opportunities.',
  canada: 'Quality education. Welcoming communities. Bright futures.',
  'new-zealand': 'Inspired learning. Remarkable living.',
  usa: 'Innovation, ambition and endless possibilities.',
  ireland: 'Rich culture. Global education. European opportunity.',
  singapore: 'Future-ready education in a global city.',
  malaysia: 'Affordable excellence in a vibrant multicultural hub.',
}

const universityImages = {
  'Arden University': ardenUniversityImage,
  'Kingston University': kingstonUniversityImage,
  'London Metropolitan University': londonMetropolitanUniversityImage,
  'Seneca Polytechnic': senecaUniversityImage,
  'University of Northern British Columbia': unbcUniversityImage,
  'University of New Brunswick': newBrunswickUniversityImage,
  'University of Windsor': windsorUniversityImage,
  'University of Saskatchewan': saskatchewanUniversityImage,
  'University of Manitoba': manitobaUniversityImage,
  'Victoria University of Wellington': victoriaWellingtonUniversityImage,
  'University of Canterbury': canterburyUniversityImage,
  'University of Otago': otagoUniversityImage,
  'Auckland University of Technology': autUniversityImage,
  'University of Waikato': waikatoUniversityImage,
  'Arizona State University': arizonaStateUniversityImage,
  'University of North Florida': northFloridaUniversityImage,
  'University of Missouri': missouriUniversityImage,
  'University of California, Berkeley': californiaBerkeleyUniversityImage,
  'New England College': newEnglandCollegeImage,
  'Pacific Crest University': pacificCrestUniversityImage,
  'University of Galway': galwayUniversityImage,
  'Maynooth University': maynoothUniversityImage,
  'University of Limerick': limerickUniversityImage,
  'Dublin Business School': dublinBusinessSchoolImage,
  'Trinity College Dublin': trinityCollegeDublinImage,
  'University College Dublin': universityCollegeDublinImage,
  'Technical University of Munich, Singapore': tumAsiaUniversityImage,
  'James Cook University Singapore': jamesCookSingaporeImage,
  'SIM Global Education': simGlobalEducationImage,
  "Taylor's University": taylorsUniversityMalaysiaImage,
  'Sunway University Malaysia': sunwayUniversityMalaysiaImage,
  'Monash University Malaysia': monashUniversityMalaysiaImage,
  'RMIT University': rmitUniversityImage,
  'Deakin University': deakinUniversityImage,
  'UNSW Sydney': unswUniversityImage,
  'Flinders University': flindersUniversityImage,
  'James Cook University': jamesCookUniversityImage,
  'University of Canberra College': canberraCollegeImage,
  'Northumbria University': northumbriaUniversityImage,
  'Queen’s University Belfast': queensBelfastUniversityImage,
  'Cardiff University': cardiffUniversityImage,
  'Glasgow Caledonian University': glasgowCaledonianUniversityImage,
}

const reasonIcons = {
  'Post-study work opportunities': BriefcaseBusiness,
  'Globally recognised universities': GraduationCap,
  'Strong student support services': HeartHandshake,
  'Experiential learning': BookOpenCheck,
  'Part-time job opportunities': Clock3,
  'Graduate Visa — Up to 24 Months': GraduationCap,
  'Historic university towns': MapPin,
  'Strong graduate career routes': BriefcaseBusiness,
  'World-class education and academic facilities': GraduationCap,
  'Numerous options for specializations to study': BookOpenCheck,
  'Affordable and value for money as course duration are short': Clock3,
  'Master’s courses with placements or internships': BriefcaseBusiness,
  'Co-op and work-integrated learning': BriefcaseBusiness,
  'Multicultural communities': UsersRound,
  'Clearer career pathways': BriefcaseBusiness,
  'Globally valued qualifications and affordable education': GraduationCap,
  'Healthy and safe communities': ShieldCheck,
  'Post-study work permit after completing your studies': BriefcaseBusiness,
  'British-based education system': GraduationCap,
  'International reputation for quality education': BookOpenCheck,
  'Flexible admission requirements': CheckCircle2,
  'Warm and welcoming environment': HeartHandshake,
  'Post Study Work Visa for up to 3 years': BriefcaseBusiness,
  'Academic Excellence': GraduationCap,
  'Affordable Tuition': CheckCircle2,
  'Diverse Student Body': HeartHandshake,
  'Internship Opportunities': BriefcaseBusiness,
  'Research and innovation ecosystem': Lightbulb,
  'Broad choice of majors': BookOpenCheck,
  'Campus-based student experience': UsersRound,
  'A friendly, safe and English-speaking country': HeartHandshake,
  'Affordable tuition fees and accommodation': Banknote,
  'Internationally recognised qualifications and an extensive choice of courses': BookOpenCheck,
  'Post-study work visa: 2 years for Master’s graduates and 1 year for Bachelor’s (Honours) graduates': BriefcaseBusiness,
  'Globally recognised qualifications': GraduationCap,
  'Strategic global location': Globe2,
  'Safe and connected city': ShieldCheck,
  'Strong business ecosystem': BriefcaseBusiness,
  'Affordable study and living costs': Banknote,
  'Multicultural student communities': UsersRound,
}

function DestinationCountry() {
  const { countrySlug } = useParams()
  const country = destinationMap[countrySlug]
  const destinationHeroImage = destinationHeroImages[countrySlug]
  const universitySectionRef = useRef(null)
  const [visibleUniversitySlug, setVisibleUniversitySlug] = useState(null)
  const universitiesVisible = visibleUniversitySlug === countrySlug

  useEffect(() => {
    const section = universitySectionRef.current
    if (!section) return undefined

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisibleUniversitySlug(countrySlug)
        observer.disconnect()
      }
    }, { threshold: 0.16 })

    observer.observe(section)
    return () => observer.disconnect()
  }, [countrySlug])

  if (!country) {
    return <main className="destination-not-found"><div className="container"><h1>Destination not found</h1><p>Choose from our supported study destinations.</p><Link className="button button-primary" to="/destinations">Explore destinations <ArrowRight size={17} /></Link></div></main>
  }

  return (
    <main className="destination-country-page">
      {destinationHeroImage && (
        <section className={`country-collage-hero country-collage-hero--${countrySlug}`} aria-label={`Study in ${country.name}`}>
          <img src={destinationHeroImage} alt={`Study opportunities and student life in ${country.name}`} />
          <div className="country-collage-title">
            <div className="country-title-panel">
              <span className="country-title-icon"><GraduationCap size={30} /></span>
              <h1><small>Study in</small>{country.name}</h1>
              <p>{destinationHeroDescriptions[countrySlug]}</p>
            </div>
          </div>
        </section>
      )}
      <div className="container">
        <nav className="destination-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/destinations">Destinations</Link><span>/</span><strong>{country.name}</strong></nav>
        {!['australia', 'united-kingdom', 'canada', 'new-zealand', 'usa', 'ireland', 'singapore', 'malaysia'].includes(countrySlug) && (
          <section className="country-hero">
            <div className="country-hero-copy">{!destinationHeroImage && <><p className="eyebrow">Destination guide</p><h1>Study in {country.name}</h1></>}<p>{country.intro}</p><div className="country-hero-tags"><span><Globe2 size={15} /> {country.region}</span><span><ShieldCheck size={15} /> {country.highlight}</span></div></div>
            <div className="country-hero-card"><span className="country-hero-flag" aria-hidden="true">{country.flagEmoji}</span><p>Why students choose it</p><strong>{country.shortLabel}</strong><Link to="/contact">Talk through your options <ArrowRight size={16} /></Link></div>
          </section>
        )}

        <section className="country-cost-section"><div className="destination-stat-grid">{country.costs.map((cost) => <DestinationStat key={cost.label} {...cost} />)}</div></section>

        <section className="country-details-grid"><div><div className="destination-section-heading"><h2>Visa basics</h2><span><ShieldCheck size={18} /></span></div><div className="visa-basics-card"><ul>{country.visaBasics.map((item) => <li key={item}><CheckCircle2 size={15} />{item}</li>)}</ul></div></div><div><div className="destination-section-heading"><h2>Intakes calendar</h2><span><GraduationCap size={18} /></span></div><div className="intakes-list">{country.intakes.map((intake) => <article key={intake.month}><strong>{intake.month}</strong><p>{intake.description}</p></article>)}</div></div></section>

        <section ref={universitySectionRef} className={`country-universities-section${universitiesVisible ? ' universities-visible' : ''}`}><div className="destination-section-heading"><div><p className="eyebrow">University partners</p><h2>Top universities</h2></div><span className="partner-count">{country.universities.length} featured partners</span></div><div className="university-grid">{country.universities.map((university, index) => { const universityImage = universityImages[university.name]; return <article className={universityImage ? 'university-card-with-image' : undefined} style={{ '--university-index': index }} key={university.name}>{universityImage && <img src={universityImage} alt={`${university.name} campus`} loading="lazy" decoding="async" />}<div className={universityImage ? 'university-card-content' : undefined}><span className="university-icon"><MapPin size={17} /></span><div><h3>{university.name}</h3><p>{university.location}</p></div></div></article> })}</div></section>

        <section className="country-reasons-section"><div className="destination-section-heading"><div><p className="eyebrow">A closer look</p><h2>Why study in {country.name}?</h2></div></div><div className="reason-grid">{country.reasons.map((reason) => { const ReasonIcon = reasonIcons[reason] || CheckCircle2; return <article key={reason}><span className="reason-icon"><ReasonIcon size={20} /></span><h3>{reason}</h3></article> })}</div></section>

        <section className="country-faq-section"><div className="destination-section-heading"><h2>FAQs</h2><span><ChevronDown size={19} /></span></div><div className="faq-list">{country.faqs.map((faq) => <details key={faq.question}><summary>{faq.question}<ChevronDown size={17} /></summary><div className="faq-answer"><p>{faq.answer}</p>{faq.points && <ul>{faq.points.map((point) => <li key={point.label}><strong>{point.label}</strong><span>{point.text}</span></li>)}</ul>}</div></details>)}</div></section>

        <section className="country-cta"><Link to="/destinations" className="country-back-link"><ArrowLeft size={16} /> All destinations</Link><div><p className="eyebrow">Your next step</p><h2>Make your {country.name} plan feel clear.</h2><p>Bring us your questions and we will help you turn them into a practical pathway.</p></div><Link className="button button-primary" to="/contact">Book a free consultation <ArrowRight size={17} /></Link></section>
      </div>
    </main>
  )
}

export default DestinationCountry
