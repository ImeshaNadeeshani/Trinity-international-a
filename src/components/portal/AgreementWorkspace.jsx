import { useRef, useState } from 'react'
import { FileText, PenLine, ShieldCheck, LockKeyhole } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { invokePortal } from '../../lib/portalFunctions'

import { agreementLabel } from '../../lib/portalLabels'

export default function AgreementWorkspace({ agreements, profile, onChanged, management = false }) {
  const [selected, setSelected] = useState(null), [url, setUrl] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [signature, setSignature] = useState(''), [method, setMethod] = useState('drawn'), [consent, setConsent] = useState(false)
  const [reason, setReason] = useState(''), [drawing, setDrawing] = useState(false)
  const canvas = useRef(null), previous = useRef(null)
  const eligible = management ? agreements.filter(a => a.workflow_version === 2 && a.status === 'awaiting_head_signature') : agreements
  const canSign = selected?.workflow_version === 2 && (management ? ['head','delegate','signatory'].includes(profile.role) && selected.status === 'awaiting_head_signature' : selected.student_id === profile.id && selected.status === 'awaiting_student_signature')
  async function download(agreement) {
    setError(''); setBusy(true)
    try {
      const path = agreement.completed_pdf_path || agreement.student_signed_pdf_path || agreement.private_pdf_path
      if (!path) throw new Error('The agreement PDF is not available yet.')
      const { data, error } = await supabase.storage.from('student-private-agreements').download(path)
      if (error) throw error
      const objectUrl = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `${(agreement.reference_number || 'student-agreement').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
      document.body.appendChild(link); link.click(); link.remove()
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)
    } catch (error) { setError(error.message) }
    finally { setBusy(false) }
  }
  async function review(agreement) {
    setError(''); setBusy(true); setSelected(null); setSignature(''); setConsent(false); setReason(''); setUrl('')
    try {
      const path = agreement.completed_pdf_path || agreement.student_signed_pdf_path || agreement.private_pdf_path
      if (!path) throw new Error('The agreement PDF is not available yet.')
      const { data, error } = await supabase.storage.from('student-private-agreements').createSignedUrl(path, 600)
      if (error) throw error
      setSelected(agreement); setUrl(data.signedUrl)
    } catch (error) { setError(error.message) }
    finally { setBusy(false) }
  }
  function point(event) {
    const rect = canvas.current.getBoundingClientRect()
    return { x: (event.clientX - rect.left) * 800 / rect.width, y: (event.clientY - rect.top) * 240 / rect.height }
  }
  function begin(event) {
    if (busy) return
    event.currentTarget.setPointerCapture(event.pointerId); previous.current = point(event); setDrawing(true); setMethod('drawn'); setConsent(false)
  }
  function move(event) {
    if (!drawing || !previous.current) return
    const next = point(event), ctx = canvas.current.getContext('2d')
    ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#102949'
    ctx.beginPath(); ctx.moveTo(previous.current.x, previous.current.y); ctx.lineTo(next.x, next.y); ctx.stroke(); previous.current = next
    setSignature(canvas.current.toDataURL('image/png'))
  }
  function clear() { canvas.current?.getContext('2d').clearRect(0, 0, 800, 240); setSignature(''); setConsent(false); previous.current = null; setDrawing(false) }
  async function upload(event) {
    const file = event.target.files[0]; if (!file) return
    setError(''); clear()
    if (file.type !== 'image/png' || file.size > 2 * 1024 * 1024) { setError('Choose a PNG signature under 2 MB.'); return }
    const reader = new FileReader(); reader.onload = () => { setSignature(String(reader.result)); setMethod('uploaded') }; reader.onerror = () => setError('Unable to read the signature image.'); reader.readAsDataURL(file)
  }
  async function submit() {
    if (!consent || !signature || !selected) return
    setBusy(true); setError('')
    try {
      await invokePortal('submit-agreement-signature', { agreement_id: selected.id, document_hash: selected.document_sha256, signature, method, consent: true })
      setSelected(null); setSignature(''); setUrl(''); setConsent(false); await onChanged()
    } catch (error) { setError(error.message) }
    finally { setBusy(false) }
  }
  async function correction() {
    setBusy(true); setError('')
    try { const { error } = await supabase.rpc('portal_request_agreement_correction', { agreement: selected.id, reason }); if (error) throw error; setSelected(null); setUrl(''); await onChanged() }
    catch (error) { setError(error.message) }
    finally { setBusy(false) }
  }
  return <div className="portal-card portal-form-card"><div className="portal-card-head"><div><h2>{management ? 'Management agreement review' : 'Your agreements'}</h2><p>{management ? 'Review the student-signed PDF before applying your signature or requesting a corrected version.' : 'Read your complete agreement, sign and submit it, then follow Trinity approval here.'}</p></div><ShieldCheck/></div>
    {error && <p className="portal-error" role="alert">{error}</p>}
    {!eligible.length && <p className="portal-empty-note">{management ? 'No student-signed agreements are awaiting approval.' : 'Your agreement will appear after Trinity approves your documents and profile.'}</p>}
    {eligible.map(a => <article className="portal-document" key={a.id}><FileText/><span className="portal-doc-info"><strong>{a.reference_number}</strong><small>{agreementLabel(a.status)}</small>{a.correction_reason && <small className="portal-review-note">{a.correction_reason}</small>}</span><button className="portal-outline" disabled={busy} onClick={() => review(a)}>View agreement</button><button className="portal-outline" disabled={busy} onClick={() => download(a)}>Download PDF</button></article>)}
    {selected && <section className="portal-agreement-review"><h3>{selected.reference_number}</h3><p className="portal-muted">This is the complete stored PDF. If the preview expires, open the agreement again.</p><a className="portal-outline" href={url} target="_blank" rel="noreferrer">Open / download PDF</a><iframe className="portal-pdf-viewer" title="Complete service agreement" src={url}/>
      {canSign ? <><h3><PenLine size={18}/> {management ? 'Authorized Trinity signature' : 'Your signature'}</h3><p>Draw using your mouse or touch screen, or upload a PNG. Uploading does not sign the agreement.</p><canvas ref={canvas} width="800" height="240" className="portal-signature-canvas" aria-label="Draw your signature; a PNG upload is also available" onPointerDown={begin} onPointerMove={move} onPointerUp={() => { setDrawing(false); previous.current = null }} onPointerCancel={() => { setDrawing(false); previous.current = null }}/><button className="portal-outline compact" disabled={busy} onClick={clear}>Clear signature</button><label>Upload signature PNG<input type="file" accept="image/png" onChange={upload} disabled={busy}/></label>{signature && <img className="portal-signature-preview" src={signature} alt="Preview of your signature"/>}<label className="portal-check"><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)}/>I confirm that I have reviewed the agreement and intend to apply this signature to this agreement.</label><button className="portal-primary" disabled={busy || !consent || !signature} onClick={submit}>{busy ? 'Submitting…' : management ? 'Approve & sign agreement' : 'Sign & submit agreement'}</button>{management && <div className="portal-correction"><label>Reason for rejection / correction<textarea maxLength="2000" value={reason} onChange={e => setReason(e.target.value)}/></label><button className="portal-outline" disabled={busy || reason.trim().length < 5} onClick={correction}>Request a corrected agreement</button></div>}</> : <p className="portal-muted"><LockKeyhole size={16}/> This version is locked. {agreementLabel(selected.status)}.</p>}
    </section>}
  </div>
}
