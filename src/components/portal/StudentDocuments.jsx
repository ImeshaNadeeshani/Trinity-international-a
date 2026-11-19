import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, FileText, Upload, Eye, IdCard, Globe, Info, ArrowUp } from 'lucide-react'

const checklist=[['nic_front','NIC','National Identity Card'],['passport','Passport',''],['cv','CV','Curriculum Vitae']]
export default function StudentDocuments({ applications, selectedApplication, onSelectApplication, documents, busy, error, notice, onUpload, onOpen, onCreateApplication, preview = false }) {
  const navigate=useNavigate()
  const [params]=useSearchParams()
  const replacement=documents.find(d=>d.id===params.get('replace'))
  useEffect(()=>{if(replacement&&replacement.application_id!==selectedApplication)onSelectApplication(replacement.application_id)},[replacement,selectedApplication,onSelectApplication])
  const forms=useRef({}),inputs=useRef({})
  const [dragging,setDragging]=useState(''),[localError,setLocalError]=useState('')
  const applicationId=selectedApplication||applications[0]?.id||''
  function validate(file){if(!file)return false;if(!['application/pdf','image/jpeg','image/png'].includes(file.type)||file.size>5*1024*1024){setLocalError('Choose a PDF, JPG or PNG file no larger than 5 MB.');return false}setLocalError('');return true}
  function submit(category){const file=inputs.current[category]?.files?.[0];if(validate(file))forms.current[category]?.requestSubmit()}
  function createApplication(){setLocalError('');if(onCreateApplication)onCreateApplication();else navigate('/student-portal/application')}
  function choose(category){if(busy)return;if(preview){navigate('/student-portal/documents');return}if(!applicationId){setLocalError('Create your application first, then return here to upload NIC, Passport and CV.');return}inputs.current[category]?.click()}
  function drop(event,category){event.preventDefault();setDragging('');if(busy)return;if(preview){setLocalError('This is a design preview. Sign in to upload your documents.');return}if(!applicationId){setLocalError('Create your application before uploading documents.');return;}const file=event.dataTransfer.files[0];if(!validate(file))return;const transfer=new DataTransfer();transfer.items.add(file);inputs.current[category].files=transfer.files;forms.current[category].requestSubmit()}
  return <section className="student-documents-page required-documents-page">
    <header className="required-documents-heading"><span className="required-documents-symbol" aria-hidden="true"><FileText size={66} strokeWidth={1.6}/><span><ArrowUp size={19}/></span></span><div><h2>Upload Required Documents</h2><p>Please upload the following documents to continue your application.</p></div></header>
    {applications.length>1&&<label className="student-document-application">Application<select value={applicationId} onChange={e=>onSelectApplication(e.target.value)}>{applications.map(app=><option key={app.id} value={app.id}>{app.destination} - {app.course_interest}</option>)}</select></label>}
    {!applicationId&&!preview&&<p className="portal-pending required-documents-prerequisite">Create your study application to upload your documents. <button type="button" className="required-create-application" onClick={createApplication}>Create application</button></p>}
    {preview&&<p className="portal-notice required-documents-prerequisite">Design preview: uploads are available after sign-in. <Link to="/student-portal/documents">Sign in to upload documents</Link></p>}
    <div className="required-documents-grid">{checklist.map(([category,label,subtitle])=>{
      const document=documents.filter(d=>d.application_id===applicationId&&d.category===category&&d.status!=='replaced').sort((a,b)=>new Date(b.uploaded_at||b.created_at||0)-new Date(a.uploaded_at||a.created_at||0))[0]
      const clean=document?.scan_status==='clean',needsCorrection=document&&['rejected','correction_requested'].includes(document.status)
      const status=needsCorrection?'Replacement requested':document?.status==='verified'?'Approved':clean?'Uploaded':'Uploaded - scanning'
      return <article className={`required-document-card ${needsCorrection?'requires-correction':''}`} key={category}>
        <div className={`required-document-illustration ${category}`} aria-hidden="true">{category==='nic_front'?<IdCard size={68} strokeWidth={1.6}/>:category==='passport'?<span className="required-passport"><small>PASSPORT</small><Globe size={34} strokeWidth={1.4}/></span>:<span className="required-cv"><FileText size={68} strokeWidth={1.5}/><b>CV</b></span>}</div>
        <h3>{label}</h3><p className="required-document-subtitle">{subtitle?`(${subtitle})`:'\u00a0'}</p>
        <form ref={element=>{forms.current[category]=element}} onSubmit={onUpload}>
          <input type="hidden" name="category" value={category}/>
          <input ref={element=>{inputs.current[category]=element}} id={`required-document-${category}`} className="required-document-input" name="file" type="file" accept="application/pdf,image/jpeg,image/png" disabled={busy||preview} onChange={()=>submit(category)} aria-label={`Upload ${label}`}/>
          <button type="button" disabled={busy} onClick={()=>choose(category)} aria-label={`Upload ${label}`} className={`required-document-drop ${dragging===category?'dragging':''} ${busy?'disabled':''}`} onDragOver={e=>{e.preventDefault();if(!busy&&applicationId)setDragging(category)}} onDragLeave={()=>setDragging('')} onDrop={e=>drop(e,category)}><Upload size={30} strokeWidth={1.8}/><span><strong>{needsCorrection?'Upload corrected file':document?'Click to replace':'Click to upload'}</strong> or drag &amp; drop</span><small>PDF, JPG, PNG (Max 5 MB)</small></button>
        </form>
        {needsCorrection&&<div className="required-correction-note"><strong>Not approved - upload a corrected copy</strong><p>{document.reviewer_comment||'Please upload a clearer, correct document for management review.'}</p></div>}
        {document&&<div className="required-document-saved"><span title={document.file_name}>{document.file_name}</span><small className={needsCorrection?'needs-correction':''}>{clean&&!needsCorrection&&<Check size={12}/>} {status}</small><button type="button" className="portal-outline compact" disabled={busy||!clean} onClick={()=>onOpen(document.storage_path)}><Eye size={13}/>View</button></div>}
      </article>
    })}</div>
    <div className="required-documents-important"><strong><Info size={18}/>Important</strong><p>Ensure your documents are clear and valid. Only NIC, Passport and CV are required at this stage.</p></div>
    {busy&&<p className="portal-notice" role="status">Uploading and checking your document. Please wait...</p>}{(localError||error)&&<p className="portal-error" role="alert">{localError||error}</p>}{notice&&<p className="portal-notice" role="status">{notice}</p>}
  </section>
}
