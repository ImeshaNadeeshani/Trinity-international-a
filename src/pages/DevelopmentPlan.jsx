import { ArrowRight, ClipboardList, FileCheck2, PenLine } from 'lucide-react'
import { Link } from 'react-router-dom'
import '../styles/development-plan.css'

const phases = [
  {
    number: '01',
    title: 'Student Management',
    description: 'Student registration, document upload, secure storage, board dashboard and application status tracking.',
    icon: ClipboardList,
    start: true,
  },
  {
    number: '02',
    title: 'Approval Automation',
    description: 'Automatic approval letters, agreement templates, PDF generation and Trinity Head approval workflow.',
    icon: FileCheck2,
  },
  {
    number: '03',
    title: 'Digital Signature & Delivery',
    description: 'Electronic signing, student acceptance, notifications, audit logs and completed agreement downloads.',
    icon: PenLine,
  },
]

function DevelopmentPlan() {
  return (
    <main className="development-plan-page">
      <section className="development-plan-hero">
        <div className="development-plan-container">
          <span className="development-plan-eyebrow">Trinity International · Platform roadmap</span>
          <h1>My Suggested Development Plan</h1>
          <p className="development-plan-lead">Build the system in three phases rather than implementing everything simultaneously.</p>

          <div className="development-phase-list">
            {phases.map(({ number, title, description, icon: Icon, start }) => (
              <article className="development-phase" key={number}>
                <div className="development-phase-heading">
                  <span className="development-phase-icon"><Icon size={20} /></span>
                  <h2>Phase {number} – {title}</h2>
                  {start && <span className="development-start-badge">Start here</span>}
                </div>
                <p>{description}</p>
              </article>
            ))}
          </div>

          <p className="development-plan-outcome">
            The final result would be a centralized platform where Trinity can manage student applications from initial document submission through internal approval and signed agreement delivery, without relying on manually preparing and sending each document.
          </p>
          <Link className="development-plan-portal-link" to="/document-verification">
            Open document verification <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </main>
  )
}

export default DevelopmentPlan
