import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  Globe2,
  GraduationCap,
  HeartHandshake,
  Landmark,
  Plane,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  UsersRound,
} from 'lucide-react'
import ServiceCard from '../components/ServiceCard'
import StatCard from '../components/StatCard'
import SectionTitle from '../components/SectionTitle'
import heroImage from '../assets/images/trinity-home-hero.png'
import findmyUniHero from '../assets/images/findmyuni-hero-v2.png'
import findmyUniLogo from '../assets/images/findmyuni-logo-cropped.png'
import awardWinningHero from '../assets/images/award-trophy-hero-v3.png'
import awardCeremonyImage from '../assets/images/trinity-award-ceremony.jpeg'
import awardNewspaperImage from '../assets/images/trinity-award-newspaper.jpeg'
import findmyUniServiceImage from '../assets/images/service-student-1.png'
import migrationServiceImage from '../assets/images/service-student-2.png'
import travelServiceImage from '../assets/images/service-student-3.png'
import studyAbroadServiceImage from '../assets/images/service-student-4.png'
import '../styles/home.css'

const stats = [
  { value: '15+', label: 'Years of Expertise', icon: BadgeCheck },
  { value: '5,000+', label: 'Students Placed Globally', icon: UsersRound },
  { value: '200+', label: 'Partner Campuses', icon: Landmark },
  { value: '95%', label: 'Visa Approval Rate', icon: ShieldCheck },
]

const services = [
  {
    icon: GraduationCap,
    image: findmyUniServiceImage,
    label: 'Your next chapter',
    title: 'Study Abroad Advisory',
    description: 'Complete support for choosing a destination, securing admission and preparing to go.',
    features: ['Destination planning', 'University applications', 'Student visa support'],
  },
  {
    icon: Globe2,
    image: studyAbroadServiceImage,
    label: 'Move with confidence',
    title: 'Migration Advisory',
    description: 'Expert migration services to help you move to your dream country with confidence.',
    features: ['Skilled migration', 'PR and citizenship', 'Documentation support'],
  },
  {
    icon: Plane,
    image: travelServiceImage,
    label: 'Travel made simple',
    title: 'Travel & Business Visa',
    description: 'Smooth and hassle-free visa services for your travel, meetings and business needs.',
    features: ['Tourism visas', 'Business visas', 'Interview preparation'],
  },
  {
    icon: Landmark,
    image: migrationServiceImage,
    label: 'Local study support',
    title: 'FindmyUni',
    description: 'Find the best local universities and programmes for your academic and career goals.',
    features: ['University search', 'Course guidance', 'Application assistance'],
    action: 'FindmyUni',
    href: '/findmyuni',
  },
]

const advisoryFeatures = [
  'Destination and University Consultation',
  'Personalised Education Consultation',
  'Student Visa Consultation',
  'SOP and Application Writing',
]

const assessmentFeatures = [
  'Financial Eligibility Assessment',
  'IELTS Preparation Support',
  'Academic Profile Assessment',
]

const reasons = [
  { title: 'Expert Guidance', text: 'Experienced counsellors providing honest and personalised advice.', icon: BadgeCheck },
  { title: 'Trusted University Network', text: 'Strong partnerships with top universities and institutions worldwide.', icon: GraduationCap },
  { title: 'Proven Student Success', text: 'Thousands of successful students placed in leading universities.', icon: UsersRound },
  { title: 'End-to-End Support', text: 'From shortlisting to visa approval and beyond, we are with you.', icon: FileCheck2 },
  { title: 'Transparent Process', text: 'Clear information, no hidden fees and complete transparency.', icon: ShieldCheck },
  { title: 'Student-First Approach', text: 'Your dreams are our priority. We care about your success.', icon: HeartHandshake },
]

function FeatureList({ items }) {
  return (
    <ul className="feature-list">
      {items.map((item) => (
        <li key={item}>
          <Check size={15} strokeWidth={3} aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function Home() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [activeService, setActiveService] = useState(null)
  const [advisoryVisible, setAdvisoryVisible] = useState(false)
  const [whyVisible, setWhyVisible] = useState(false)
  const advisoryRef = useRef(null)
  const whyRef = useRef(null)

  useEffect(() => {
    const duration = activeSlide === 3 ? 15000 : activeSlide === 2 ? 13000 : 6500
    const timer = window.setTimeout(() => setActiveSlide((slide) => (slide + 1) % 4), duration)
    return () => window.clearTimeout(timer)
  }, [activeSlide])

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setAdvisoryVisible(true)
      observer.disconnect()
    }, { threshold: 0.25 })

    if (advisoryRef.current) observer.observe(advisoryRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setWhyVisible(true)
      observer.disconnect()
    }, { threshold: 0.2 })

    if (whyRef.current) observer.observe(whyRef.current)
    return () => observer.disconnect()
  }, [])

  const changeSlide = (slide) => setActiveSlide((slide + 4) % 4)

  return (
    <main className="home-page">
      <section className={`hero-section hero-slide-${activeSlide + 1}`} id="home" aria-roledescription="carousel" aria-label="Featured services">
        <div className="container hero-layout">
          <div className="hero-copy" key={`copy-${activeSlide}`}>
            {activeSlide === 0 ? (
              <>
                <p className="eyebrow"><Sparkles size={15} /> Study, migrate, thrive</p>
                <h1>Your Global Future <span>Starts with Trinity</span></h1>
                <p className="hero-intro">Trinity International helps students and professionals achieve their global ambitions through trusted education guidance, migration support and visa services.</p>
                <div className="hero-actions">
                  <a className="button button-light" href="#services">Explore Services <ArrowRight size={18} /></a>
                </div>
              </>
            ) : activeSlide === 1 ? (
              <>
                <span className="findmyuni-brand"><img src={findmyUniLogo} alt="FindmyUni" /></span>
                <p className="eyebrow"><GraduationCap size={15} /> Local study support</p>
                <h1><span>FindmyUni</span></h1>
                <p className="hero-intro">Find the best local universities and programmes for your academic and career goals.</p>
                <div className="hero-actions">
                  <a className="button button-light" href="/findmyuni">More Details <ArrowRight size={18} /></a>
                </div>
              </>
            ) : activeSlide === 2 ? (
              <>
                <p className="eyebrow"><BadgeCheck size={15} /> Trusted student success</p>
                <h1><span>Award-Winning</span> Student Visa Consultants in Sri Lanka</h1>
                <p className="hero-intro">Recognised guidance, proven expertise and dedicated support for every step of your international education journey.</p>
                <div className="hero-actions">
                  <a className="button button-light" href="#services">Explore Our Services <ArrowRight size={18} /></a>
                </div>
              </>
            ) : (
              <>
                <p className="eyebrow"><Sparkles size={15} /> Shape your future</p>
                <h1 className="future-career-title">
                  <span>Dream Today,</span>
                  <span>Lead Tomorrow,</span>
                  <span>Explore Your Future Career</span>
                </h1>
              </>
            )}
          </div>

          <div className="hero-visual" key={`visual-${activeSlide}`}>
            <div className="hero-image-wrap">
              {activeSlide === 0 ? (
                <img src={heroImage} alt="Student ready to begin her international journey" />
              ) : activeSlide === 1 ? (
                <video className="findmyuni-hero-video" autoPlay muted loop playsInline poster={findmyUniHero} aria-label="Students exploring local university opportunities with FindmyUni">
                  <source src="/videos/findmyuni-hero.mp4" type="video/mp4" />
                </video>
              ) : activeSlide === 2 ? (
                <img className="award-winning-hero-image" src={awardWinningHero} alt="Golden award trophy representing Trinity International's award-winning student visa consultancy" />
              ) : (
                <>
                  <video className="future-career-video-backdrop" autoPlay muted loop playsInline aria-hidden="true">
                    <source src="/videos/future-career-video-3.mp4" type="video/mp4" />
                  </video>
                  <video className="future-career-hero-video" autoPlay muted loop playsInline aria-label="Student exploring future career opportunities">
                    <source src="/videos/future-career-video-3.mp4" type="video/mp4" />
                  </video>
                </>
              )}
            </div>
          </div>
          {activeSlide === 2 && (
            <div className="award-proof-gallery" aria-label="Trinity International award highlights">
              <figure className="award-proof-card award-proof-card--ceremony">
                <img src={awardCeremonyImage} alt="Trinity International receiving an ApplyBoard award" />
                <figcaption>Award recognition</figcaption>
              </figure>
              <figure className="award-proof-card award-proof-card--press">
                <img src={awardNewspaperImage} alt="Newspaper coverage of Trinity International's award achievement" />
                <figcaption>Featured in the press</figcaption>
              </figure>
            </div>
          )}
        </div>
        <div className="hero-carousel-controls">
          <button type="button" onClick={() => changeSlide(activeSlide - 1)} aria-label="Previous slide"><ChevronLeft size={19} /></button>
          <div className="hero-dots" role="tablist" aria-label="Choose hero slide">
            {[0, 1, 2, 3].map((slide) => <button key={slide} type="button" className={slide === activeSlide ? 'active' : ''} onClick={() => changeSlide(slide)} aria-label={`Show slide ${slide + 1}`} aria-selected={slide === activeSlide} role="tab" />)}
          </div>
          <button type="button" onClick={() => changeSlide(activeSlide + 1)} aria-label="Next slide"><ChevronRight size={19} /></button>
        </div>
      </section>

      <section className="stats-section" aria-label="Trinity International in numbers">
        <div className="container stats-grid">
          {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
        </div>
      </section>

      <section className="section services-section" id="services">
        <div className="container">
          <SectionTitle eyebrow="Our services" title="Your ambition. Our expertise. One clear path forward." subtitle="From finding the right university to studying abroad, migrating and securing your visa, Trinity brings every step together." />
          <div className="services-grid">
            {services.map((service, index) => (
              <ServiceCard
                key={service.title}
                {...service}
                expanded={activeService === index}
                onToggle={() => setActiveService(activeService === index ? null : index)}
              />
            ))}
          </div>
        </div>
      </section>

      <section ref={advisoryRef} className={`section advisory-section${advisoryVisible ? ' advisory-visible' : ''}`} id="advisory">
        <div className="container">
          <SectionTitle eyebrow="Study abroad" title="A clear path to the right opportunity" subtitle="Choose the level of support that fits where you are today. Every conversation starts with understanding your goals." />
          <div className="advisory-columns">
            <article className="advisory-panel advisory-panel-premium">
              <div className="panel-heading">
                <span className="panel-icon"><GraduationCap size={24} /></span>
                <div><p className="panel-kicker">Premium support</p><h3>Premium Study Abroad Advisory</h3></div>
              </div>
              <FeatureList items={advisoryFeatures} />
              <a className="text-link" href="#contact">Explore premium advisory <ArrowRight size={17} /></a>
            </article>
            <article className="advisory-panel advisory-panel-assessment">
              <div className="panel-heading">
                <span className="panel-icon"><BookOpenCheck size={24} /></span>
                <div><p className="panel-kicker">Start here</p><h3>Free Initial Study Assessment</h3></div>
              </div>
              <p className="panel-description">Get an honest first look at your options, profile and next best steps.</p>
              <FeatureList items={assessmentFeatures} />
              <a className="text-link" href="#contact">Book your free assessment <ArrowRight size={17} /></a>
            </article>
          </div>
        </div>
      </section>

      <section ref={whyRef} className={`section why-section${whyVisible ? ' why-visible' : ''}`} id="why">
        <div className="container">
          <SectionTitle eyebrow="Why Trinity" title="Guidance you can build a future on" subtitle="A dependable team, a connected network and a process designed around your ambitions." />
          <div className="why-grid">
            {reasons.map(({ title, text, icon: Icon }) => (
              <article className="why-card" key={title}>
                <span className="why-icon"><Icon size={25} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section" id="contact">
        <div className="container cta-inner">
          <div><p className="eyebrow">Your future is closer than it feels</p><h2>Ready to Start Your Global Journey?</h2><p>Let's find the right next step for you.</p></div>
          <a className="button button-primary" href="mailto:Admin@tihsl.com">Book a Free Consultation <ArrowUpRight size={18} /></a>
        </div>
      </section>
    </main>
  )
}

export default Home
