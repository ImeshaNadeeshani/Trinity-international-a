import { BriefcaseBusiness, CheckCircle2, Compass, Sparkles, Target, UsersRound } from 'lucide-react'
import { useEffect, useRef } from 'react'
import findmyUniImage from '../assets/images/findmyuni-hero-v2.png'
import '../styles/findmyuni.css'

const whyChooseFmu = [
  { icon: Compass, title: 'Personalised Guidance', text: 'We invest our time to understand your goals, interests, and future plans.' },
  { icon: BriefcaseBusiness, title: 'Career-Focused Advice', text: 'We look beyond the course and help you think about where it can take you.' },
  { icon: CheckCircle2, title: 'End-to-End Support', text: 'From exploring options to enrolment, we support you throughout the journey.' },
  { icon: UsersRound, title: 'Experienced & Supportive Team', text: 'Friendly, approachable support whenever you need clarity.' },
  { icon: Target, title: 'Student-First Approach', text: 'Your future is our priority, before simply choosing a course.' },
]

function FindMyUni() {
  const whySectionRef = useRef(null)

  useEffect(() => {
    const section = whySectionRef.current
    if (!section) return undefined

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        section.classList.add('findmyuni-why-visible')
        observer.disconnect()
      }
    }, { threshold: 0.18 })

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    <main className="findmyuni-page">
      <section className="findmyuni-hero">
        <video autoPlay muted loop playsInline poster={findmyUniImage} aria-hidden="true"><source src="/videos/findmyuni-hero.mp4" type="video/mp4" /></video>
        <div className="findmyuni-hero-shade" />
        <div className="container findmyuni-hero-inner">
          <div className="findmyuni-hero-copy">
            <p><Sparkles size={16} /> Local study support</p>
            <h1>Find the right future with <span>FindmyUni</span></h1>
            <strong>Local choices. Clear guidance. Confident decisions.</strong>
          </div>
        </div>
      </section>

      <section className="container findmyuni-about" id="about-fmu">
        <div className="findmyuni-about-lead">
          <p>About FMU</p>
          <h2>Different dreams deserve <span>personal pathways.</span></h2>
          <small>Established in Sri Lanka · 2023</small>
        </div>
        <div className="findmyuni-about-copy">
          <p>Established in 2023, Find My Uni (FMU) is a Sri Lanka-based higher education support service created to help students make the right choices for their future.</p>
          <p>We understand that every student has a different dream, which is why our team takes the time to understand your goals and guide you towards the right study and career pathway.</p>
          <p>From exploring your options to taking your next step, FMU provides personalised, end-to-end support throughout your journey.</p>
        </div>

        <div className="findmyuni-why" ref={whySectionRef}>
          <div className="findmyuni-why-heading">
            <p>Why Choose FindmyUni?</p>
            <h3>Guidance designed around <span>you.</span></h3>
          </div>
          <div className="findmyuni-why-grid">
            {whyChooseFmu.map(({ icon: Icon, title, text }, index) => (
              <article key={title}>
                <span className="findmyuni-why-number">0{index + 1}</span>
                <span className="findmyuni-why-icon"><Icon size={24} /></span>
                <h4>{title}</h4>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

export default FindMyUni
