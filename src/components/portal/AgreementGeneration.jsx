import { useState } from 'react'
import { agreementLabel } from '../../lib/portalLabels'

export default function AgreementGeneration({ applications, people, agreements, templates, busy, onGenerate, onOpen, onSetup }) {
  const [applicationId, setApplicationId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const app = applications.find(row => row.id === applicationId)
  const current = agreements.find(row => row.application_id === applicationId && row.status !== 'voided')
  const approved = templates.filter(row => row.active && row.approval_status === 'approved')
  const template = approved.find(row => row.id === templateId)
  return <div className="portal-card portal-form-card">
    <h2>Generate a student agreement</h2>
    <p>Select the student application and approved template. Student details and the saved payment schedule are filled automatically.</p>
    <label>Student application<select value={applicationId} onChange={event => setApplicationId(event.target.value)} disabled={busy}>
      <option value="">Choose an application</option>
      {applications.map(row => <option key={row.id} value={row.id}>{people.find(person => person.id === row.student_id)?.full_name || 'Student'} · {row.destination} · {row.id.slice(0, 8)}</option>)}
    </select></label>
    <label>Approved agreement template<select value={templateId} onChange={event => setTemplateId(event.target.value)} disabled={busy}>
      <option value="">Choose a template</option>
      {approved.map(row => <option key={row.id} value={row.id}>{row.name} · Version {row.version}</option>)}
    </select></label>
    {!approved.length && <p className="portal-pending">No approved active template is available. An administrator can create a draft from the reference document under Agreement templates, then a legal reviewer must approve it.</p>}
    {onSetup && <button className="portal-outline" onClick={onSetup}>Open agreement templates</button>}
    {app && <><p>Application status: <strong>{app.status.replaceAll('_', ' ')}</strong></p>
      <p>Generation requires an approved application, completed profile, confirmed identity details, verified documents, company details and a saved payment schedule. Any missing requirement will be shown here.</p>
      {current ? <p className="portal-notice">An agreement already exists: {current.reference_number}. {agreementLabel(current.status)}.</p> : <button className="portal-primary" disabled={busy || !template || app.status !== 'application_approved'} onClick={() => onGenerate(app, 'agreement', template.id)}>{busy ? 'Generating…' : 'Generate agreement PDF'}</button>}
    </>}
    <h3>Generated agreements</h3>
    {!agreements.length && <p>No agreements have been generated yet.</p>}
    {agreements.map(row => {
      const path = row.completed_pdf_path || row.student_signed_pdf_path || row.private_pdf_path
      return <article className="portal-document" key={row.id}><span className="portal-doc-info"><strong>{row.reference_number}</strong><small>{people.find(person => person.id === row.student_id)?.full_name || 'Student'} · {agreementLabel(row.status)}</small></span><button className="portal-outline" disabled={busy || !path} onClick={() => onOpen(path, 'student-private-agreements')}>Open PDF</button></article>
    })}
  </div>
}
