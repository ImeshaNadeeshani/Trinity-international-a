import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileText, PenLine, ShieldCheck, LockKeyhole, Check, Clock3, Download, Upload, Send, ArrowLeft, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { invokePortal } from '../../lib/portalFunctions'
import { downloadPrivateFile } from '../../lib/privateFiles'

import ManagementApprovalMessage from './ManagementApprovalMessage'
import { agreementLabel } from '../../lib/portalLabels'

export default function AgreementWorkspace({ agreements, profile, onChanged, management = false, reviewAll = false, people = [], approvalLetters = [], onContinue }) {
  const [params,setParams]=useSearchParams()
  const requestedApplication=params.get('application')
  const requestedAgreement=params.get('agreement')
  const [selected, setSelected] = useState(null), [url, setUrl] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [signature, setSignature] = useState(''), [method, setMethod] = useState('drawn'), [consent, setConsent] = useState(false)
  const [reason, setReason] = useState(''), [drawing, setDrawing] = useState(false)
  const [submissionStatus,setSubmissionStatus]=useState('')
  const [signatureStage,setSignatureStage]=useState(false)
  const canvas = useRef(null), previous = useRef(null)
  const autoOpened = useRef(false)
  useEffect(() => {
    if(management)return
    const requested=agreements.find(a=>a.id===requestedAgreement)
    if(requested){if(autoOpened.current===requested.id)return;autoOpened.current=requested.id;review(requested);return}
    if(autoOpened.current)return
    const latest = agreements.find(a => a.status !== 'voided' && (a.completed_pdf_path || a.student_signed_pdf_path || a.private_pdf_path))
    if (!latest) return
    autoOpened.current = true
    review(latest)
  // Open once when the student's agreements arrive; manual selection remains available.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agreements, management, requestedAgreement])
  const eligible = management ? agreements.filter(a => a.workflow_version === 2 && (reviewAll ? a.status !== 'voided' : a.status === 'awaiting_head_signature')) : agreements
  const canSign = selected?.workflow_version === 2 && (management ? ['head','delegate','signatory'].includes(profile.role) && selected.status === 'awaiting_head_signature' : selected.student_id === profile.id && selected.status === 'awaiting_student_signature')
  async function generateSample(applicationId){
    setBusy(true);setError('')
    try{const result=await invokePortal('generate-sample-agreement',{application_id:applicationId});autoOpened.current=false;await onChanged();params.set('agreement',result.agreement_id);params.set('application',applicationId);setParams(params)}
    catch(e){setError(e.message||'Unable to generate the sample agreement.')}
    finally{setBusy(false)}
  }
  async function download(agreement) {
    setError(''); setBusy(true)
    try {
      const path = agreement.completed_pdf_path || agreement.student_signed_pdf_path || agreement.private_pdf_path
      if (!path) throw new Error('The agreement PDF is not available yet.')
      await downloadPrivateFile('student-private-agreements', path, `${agreement.reference_number || 'student-agreement'}.pdf`)
    } catch (error) { setError(error.message) }
    finally { setBusy(false) }
  }
  async function review(agreement) {
    setSignatureStage(false); setSubmissionStatus(''); setError(''); setBusy(true); setSelected(null); setSignature(''); setConsent(false); setReason(''); setUrl('')
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
    if (method === 'uploaded') clear()
    event.currentTarget.setPointerCapture(event.pointerId); previous.current = point(event); setDrawing(true); setMethod('drawn'); setConsent(false)
    const ctx = canvas.current.getContext('2d'), position = previous.current
    ctx.fillStyle = '#102949'; ctx.beginPath(); ctx.arc(position.x, position.y, 1.5, 0, Math.PI * 2); ctx.fill()
    setSignature(canvas.current.toDataURL('image/png'))
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
      const result = await invokePortal('submit-agreement-signature', { agreement_id: selected.id, document_hash: selected.document_sha256, signature, method, consent: true })
      setSubmissionStatus(result.status || 'submitted'); setSelected(null); setSignatureStage(false); setSignature(''); setUrl(''); setConsent(false); await onChanged()
    } catch (error) { setError(error.message) }
    finally { setBusy(false) }
  }
  async function correction() {
    setBusy(true); setError('')
    try { const { error } = await supabase.rpc('portal_request_agreement_correction', { agreement: selected.id, reason }); if (error) throw error; setSelected(null); setUrl(''); await onChanged() }
    catch (error) { setError(error.message) }
    finally { setBusy(false) }
  }
  return <div className={`portal-card portal-form-card agreement-workspace ${!management ? 'student-signing-workspace' : ''} ${selected ? 'has-open-agreement' : ''}`}><div className="portal-card-head"><div><h2>{management ? 'Management agreement review' : signatureStage ? 'Add Digital Signature' : selected ? 'Student Service Agreement' : 'Your agreements'}</h2><p>{management ? 'Review the student-signed PDF before applying your signature or requesting a corrected version.' : 'Read your complete agreement, sign and submit it, then follow Trinity approval here.'}</p></div><ShieldCheck/></div>
    {!management&&approvalLetters.filter(l=>!requestedApplication||l.application_id===requestedApplication).map(letter=>!agreements.some(a=>a.application_id===letter.application_id&&a.status!=='voided')&&<div key={letter.id} className="portal-notice"><strong>Your approval letter is ready.</strong><p>Generate our SAMPLE agreement, review it, add a test digital signature and send it to management. This sample does not create a contract or unlock payments.</p><button className="portal-primary" disabled={busy} onClick={()=>generateSample(letter.application_id)}>Generate sample agreement &amp; sign</button></div>)}
    {error && <p className="portal-error" role="alert">{error}</p>}
    {submissionStatus && <div className="student-agreement-submitted" role="status"><ShieldCheck size={45}/><h3>{submissionStatus==='completed'?'Agreement Approved!':'Agreement Submitted!'}</h3><p>{submissionStatus==='completed'?(management?'The agreement has been countersigned and completed. Open Agreements to download the approved PDF.':'The agreement has been countersigned and completed. The approved PDF is available below.'):'Your signature has been submitted to Trinity International for final review.'}</p><span>{submissionStatus==='completed'?'Completed':'Under Trinity review'}</span>{submissionStatus==='completed'&&onContinue&&<button className="portal-primary" onClick={onContinue}>Continue to application</button>}</div>}
    <div className="student-agreement-files">{eligible.map(a => <article className="student-agreement-file" key={a.id}><div className="student-agreement-file-heading"><span className="student-agreement-pdf-icon"><FileText size={29}/><small>PDF</small></span><div><h3>{a.is_sample?'SAMPLE Student Service Agreement':'Student Service Agreement'}</h3><p>{a.reference_number}</p><small>{a.created_at ? 'Issued '+new Date(a.created_at).toLocaleDateString('en-GB')+' � ' : ''}{agreementLabel(a.status)}</small>{a.correction_reason && <p className="portal-review-note">{a.correction_reason}</p>}</div></div><div className="portal-action-row"><button className="portal-outline" disabled={busy} onClick={() => review(a)}>View agreement</button>{!management && a.workflow_version===2 && a.student_id===profile.id && a.status==='awaiting_student_signature' ? <button className="portal-primary" disabled={busy} onClick={()=>review(a)}><PenLine size={16}/>Sign agreement</button> : <button className="portal-outline" disabled={busy} onClick={() => download(a)}><Download size={16}/>Download PDF</button>}</div></article>)}</div>
    {!eligible.length&&!busy&&<p className="portal-empty-note">{management?'No agreements are available in this review queue.':'No agreement has been issued yet.'}</p>}
    {selected?.is_sample&&<p className="portal-notice">SAMPLE ONLY: your test signature is saved and sent to management. This is not a binding contract and does not unlock payments.</p>}
    {selected && <section className={`portal-agreement-review ${management?'management-agreement-review':''}`}>
      {management&&<div className="management-agreement-details"><h3>{people.find(p=>p.id===selected.student_id)?.full_name||'Student Service Agreement'}</h3><dl><dt>Agreement ID</dt><dd>{selected.reference_number||selected.id}</dd><dt>Generated On</dt><dd>{selected.created_at?new Date(selected.created_at).toLocaleString():'Unavailable'}</dd><dt>Student Signed On</dt><dd>{selected.student_signed_at?new Date(selected.student_signed_at).toLocaleString():'Awaiting student signature'}</dd><dt>Signature Status</dt><dd>{selected.student_signed_at?'Student signature submitted':'Unsigned'}</dd><dt>Current Status</dt><dd>{agreementLabel(selected.status)}</dd></dl></div>}
      {!management && selected.student_signed_at && <div className="portal-agreement-journey">
        <ol aria-label="Agreement signing progress">
          <li className={selected.student_signed_at ? 'done' : 'current'}><span>{selected.student_signed_at ? <Check size={18}/> : <PenLine size={18}/>}</span><div><strong>{selected.student_signed_at ? 'Agreement signed by you' : 'Review and sign your agreement'}</strong><small>{selected.student_signed_at ? 'Your signature has been submitted.' : 'Read the complete PDF before submitting your signature.'}</small></div></li>
          <li className={selected.status === 'completed' ? 'done' : selected.status === 'awaiting_head_signature' ? 'current' : ''}><span>{selected.status === 'completed' ? <Check size={18}/> : <Clock3 size={18}/>}</span><div><strong>Trinity management review</strong><small>{selected.status === 'awaiting_head_signature' ? 'Your signed agreement is awaiting management review and countersignature.' : selected.status === 'completed' ? 'Management review and countersignature are complete.' : 'Starts after you submit your signature.'}</small></div></li>
          <li className={selected.status === 'completed' ? 'done' : ''}><span>{selected.status === 'completed' ? <Check size={18}/> : <Download size={18}/>}</span><div><strong>Completed agreement</strong><small>{selected.status === 'completed' ? 'Your final agreement is ready to download.' : 'The final PDF will be available after Trinity approval.'}</small></div></li>
        </ol>
        {selected.status === 'completed' && <div className="portal-agreement-approved"><ShieldCheck size={38}/><h3>Agreement approved!</h3><p>Your agreement has been completed with Trinity International.</p><button className="portal-primary" disabled={busy} onClick={() => download(selected)}><Download size={16}/> Download completed agreement</button>{onContinue && <button className="portal-outline" onClick={onContinue}>Continue application</button>}</div>}
      </div>}
      {!management&&<div className="agreement-step-heading" aria-label="Agreement steps"><span className={!signatureStage?'active':'complete'}><b>{signatureStage?<Check size={15}/>:1}</b>Open Agreement</span><ArrowRight size={17}/><span className={signatureStage?'active':''}><b>2</b>Add Digital Signature</span></div>}
      {(!signatureStage||management)&&<div className="portal-agreement-pdf"><iframe className="portal-pdf-viewer" title="Complete service agreement" src={url+'#toolbar=1&view=FitH'}/><div className="agreement-preview-actions"><button className="portal-outline" disabled={busy} onClick={()=>download(selected)}><Download size={17}/>Download PDF</button>{canSign&&!management&&<button className="portal-primary" onClick={()=>setSignatureStage(true)}>Add Digital Signature<ArrowRight size={17}/></button>}</div></div>}
      {canSign && (signatureStage||management) ? <div className="portal-signature-panel">{!management&&<button className="portal-text-button" onClick={()=>{clear();setSignatureStage(false)}}><ArrowLeft size={15}/>Back to agreement</button>}<h3><PenLine size={18}/> {management ? 'Authorized Trinity signature' : 'Add your digital signature'}</h3><p>Draw using your mouse or touch screen, or upload a PNG. Uploading does not sign the agreement.</p><canvas ref={canvas} width="800" height="240" className="portal-signature-canvas" aria-label="Draw your signature; a PNG upload is also available" onPointerDown={begin} onPointerMove={move} onPointerUp={() => { setDrawing(false); previous.current = null }} onPointerCancel={() => { setDrawing(false); previous.current = null }}/><div className="agreement-signature-tools"><button className="portal-outline compact" disabled={busy} onClick={clear}>Clear</button><label className="portal-outline compact agreement-upload-signature"><Upload size={16}/>Upload Signature<input type="file" accept="image/png" onChange={upload} disabled={busy}/></label></div>{signature && <img className="portal-signature-preview" src={signature} alt="Preview of your signature"/>}<label className="portal-check"><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)}/>{selected.is_sample?'I have reviewed this SAMPLE and consent to submitting my test signature to management.':'I confirm that I have reviewed the agreement and intend to apply this signature to this agreement.'}</label><button className="portal-primary" disabled={busy || !consent || !signature} onClick={submit}><Send size={17}/>{busy ? 'Submitting...' : management ? 'Approve & Complete' : 'Submit Signed Agreement'}</button>{management && <div className="portal-correction"><label>Reason for rejection / correction<textarea maxLength="2000" value={reason} onChange={e => setReason(e.target.value)}/></label><button className="portal-outline" disabled={busy || reason.trim().length < 5} onClick={correction}>Request a corrected agreement</button></div>}</div> : !canSign&&<p className="portal-muted"><LockKeyhole size={16}/> This version is locked. {agreementLabel(selected.status)}.</p>}
      {management&&selected.status==='awaiting_student_signature'&&<ManagementApprovalMessage key={selected.id} person={people.find(p=>p.id===selected.student_id)} agreement={selected}/>}
    </section>}
  </div>
}
