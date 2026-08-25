import {
  CheckCircle2,
  Eye,
  Gem,
  Globe2,
  GraduationCap,
  Landmark,
  Plane,
  Quote,
  Target,
  UsersRound,
} from 'lucide-react'
import SectionTitle from '../components/SectionTitle'
import aboutStudents from '../assets/images/about-student-collage-v2.png'
import stefanShanmugarajah from '../assets/images/stefan-shanmugarajah.jpeg'
import dehamiDirector from '../assets/images/dehami-director.png'
import pasterHeshan from '../assets/images/paster-heshan-rubera.png'
import ananthiVythilingam from '../assets/images/ananthi-vythilingam.jpeg'
import antoinetteMichelle from '../assets/images/antoinette-michelle.jpeg'
import imeshaNadeeshani from '../assets/images/imesha-nadeeshani.png'
import chathurikaSewwandi from '../assets/images/chathurika-sewwandi.png'
import richieWeerakoon from '../assets/images/richie-weerakoon.png'
import manishaRatnayake from '../assets/images/manisha-ratnayake.png'
import nishanRubera from '../assets/images/nishan-rubera.png'
import shenalJerusha from '../assets/images/shenal-jerusha.png'
import chamuthSenura from '../assets/images/chamuth-senura.png'
import sepalikaSewwandi from '../assets/images/sepalika-sewwandi.png'
import officeReception from '../assets/images/trinity-office-reception.png'
import '../styles/about.css'

const purposeCards = [
  { title: 'Our Mission', icon: Target, text: 'To empower students and professionals by providing honest advice, quality guidance, and end-to-end support to achieve academic and career success globally.' },
  { title: 'Our Vision', icon: Eye, text: 'To be the most trusted global education partner, inspiring and connecting people to a world of opportunities and limitless possibilities.' },
  { title: 'Our Values', icon: Gem, values: ['Integrity & Transparency', 'Student Success First', 'Excellence in Service', 'Global Perspective'] },
]

const metrics = [
  { value: '15+', label: 'Years of Experience', icon: GraduationCap },
  { value: '5,000+', label: 'Students Guided', icon: UsersRound },
  { value: '200+', label: 'University Partners', icon: Landmark },
  { value: '20+', label: 'Countries', icon: Globe2 },
  { value: '95%', label: 'Visa Success Rate', icon: CheckCircle2 },
]

const leaders = {
  board: [
    { name: 'Heshan Rubera', displayName: 'Heshan Rubera', role: 'CEO', image: pasterHeshan },
    { name: 'Manisha Ratnayake', displayName: 'Manisha Ratnayake', role: 'Director of HR & Legal', image: manishaRatnayake },
  ],
  team: [
    { name: 'Ananthi Vythilingam', displayName: 'Ananthi Vythilingam', role: 'Head of Projects', image: ananthiVythilingam },
    { name: 'Stefan Shanmugarajah', displayName: 'Stefan Shanmugarajah', role: 'Asst. Manager', image: stefanShanmugarajah },
    { name: 'Antoinette Yvonne Michelle', displayName: 'Antoinette Yvonne Michelle', role: 'Executive', image: antoinetteMichelle },
    { name: 'Chathurika Sewwandi', displayName: 'Chathurika Sewwandi', role: 'Senior Executive – Administration & Operations', image: chathurikaSewwandi },
    { name: 'Richie Weerakoon', displayName: 'Richie Weerakoon', role: 'Assistant Manager – Human Resources', image: richieWeerakoon },
    { name: 'Nishan Rubera', displayName: 'Nishan Rubera', role: 'Manager', image: nishanRubera },
    { name: 'Shenal Jerusha', displayName: 'Shenal Jerusha', role: 'Digital Marketing & Content Specialist', image: shenalJerusha },
    { name: 'Imesha Nadeeshani', displayName: 'Imesha Nadeeshani', role: 'Software Developer & Data Analyst', image: imeshaNadeeshani },
    { name: 'Chamuth Senura', displayName: 'Chamuth Senura', role: 'Software Developer', image: chamuthSenura },
    { name: 'Sepalika Sewwandi', displayName: 'Sepalika Sewwandi', role: 'HR Assistant', image: sepalikaSewwandi },
  ],
}

function LeaderCard({ person }) {
  return (
    <article className="about-leader-card">
      <div className="leader-photo"><img src={person.image} alt={person.displayName} /></div>
      <h3>{person.displayName}</h3>
      <p>{person.role}</p>
    </article>
  )
}

function LeadershipGroup({ title, icon: Icon, members }) {
  return (
    <div className="leadership-group">
      <h3 className="leadership-group-title"><Icon size={16} /> {title}</h3>
      <div className="leaders-grid">{members.map((member) => <LeaderCard key={member.name} person={member} />)}</div>
    </div>
  )
}

function About() {
  return (
    <main className="about-page">
      <section className="about-hero">
        <div className="about-hero-visual">
          <div className="about-orbit" aria-hidden="true"><Plane size={24} /></div>
          <img src={aboutStudents} alt="A diverse group of students preparing for their academic future" />
        </div>
        <div className="container about-hero-grid">
          <div className="about-hero-copy">
            <p className="about-eyebrow">About us</p>
            <h1>Guiding Dreams.<br /><span>Building Future.</span></h1>
          </div>
        </div>
      </section>

      <section className="purpose-section">
        <div className="container purpose-grid">
          {purposeCards.map(({ title, icon: Icon, text, values }) => (
            <article className="purpose-card" key={title}>
              <span className="purpose-icon"><Icon size={27} /></span>
              <div><h2>{title}</h2>{text && <p>{text}</p>}{values && <ul>{values.map((value) => <li key={value}><CheckCircle2 size={14} /> {value}</li>)}</ul>}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="about-metrics" aria-label="Trinity International achievements">
        <div className="container about-metrics-grid">
          {metrics.map(({ value, label, icon: Icon }) => <div className="about-metric" key={label}><Icon size={31} /><div><strong>{value}</strong><span>{label}</span></div></div>)}
        </div>
      </section>

      <section className="about-story-section">
        <div className="container story-grid">
          <article className="story-copy"><h2>Our Story</h2><span className="green-rule" /><p>Trinity International began over 15+ years ago with just three passionate team members and one simple purpose helping people achieve their dreams.</p><p>Today, we have grown beyond an education consultancy into a trusted education and career advisory team, guiding students and professionals towards opportunities around the world.</p><p>Through every milestone, one thing has never changed: our personal approach.<br />We listen, understand, guide and walk the journey with you.</p><strong>Your dream. Our goal.<br />Your journey, together.</strong></article>
          <div className="office-visual"><img src={officeReception} alt="Trinity International office reception" /></div>
          <article className="director-copy"><div className="director-heading"><h2>Director's Message</h2><Quote size={31} /></div><p>At Trinity International, we believe every student has a unique dream and the potential to achieve greatness. Our mission is to provide the right guidance, trustworthy support, and world-class opportunities to help you succeed globally. We are with you, every step of your journey.</p><strong>Dehami Rubera</strong><small>— Director<br />Trinity International</small><img src={dehamiDirector} alt="Dehami Rubera, Director of Trinity International" /></article>
        </div>
      </section>

      <section className="leadership-section">
        <div className="container"><SectionTitle eyebrow="Our people" title="Leadership Board" subtitle="Meet the people who make every student journey personal, informed and possible." /><div className="leadership-grid"><LeadershipGroup title="Board of Directors" icon={UsersRound} members={leaders.board} /><LeadershipGroup title="Leadership Team" icon={UsersRound} members={leaders.team} /></div></div>
      </section>

    </main>
  )
}

export default About
