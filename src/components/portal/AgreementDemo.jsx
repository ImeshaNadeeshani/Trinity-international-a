import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Download, FileText, PenLine, ShieldCheck } from 'lucide-react'
import { createAgreementDemoPdf } from '../../lib/agreementDemo.mjs'

export default function AgreementDemo() {
  const [stage,setStage]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const [pdf,setPdf]=useState(null),[url,setUrl]=useState(''),[signature,setSignature]=useState(''),[consent,setConsent]=useState(false)
  const canvas=useRef(null),drawing=useRef(false),previous=useRef(null)
  useEffect(()=>{if(!pdf){setUrl('');return}const value=URL.createObjectURL(new Blob([pdf],{type:'application/pdf'}));setUrl(value);return()=>URL.revokeObjectURL(value)},[pdf])
  async function advance(next) {
    setBusy(true);setError('')
    try {const bytes=await createAgreementDemoPdf({signature:next>=2?signature:'',completed:next===3});setPdf(bytes);setStage(next)}catch(error){setError(error.message||'Unable to generate the sample PDF.')}finally{setBusy(false)}
  }
  function point(event){const rect=canvas.current.getBoundingClientRect();return {x:(event.clientX-rect.left)*800/rect.width,y:(event.clientY-rect.top)*240/rect.height}}
  function begin(event){if(busy)return;event.currentTarget.setPointerCapture(event.pointerId);drawing.current=true;previous.current=point(event);const ctx=canvas.current.getContext('2d');ctx.fillStyle='#10243b';ctx.beginPath();ctx.arc(previous.current.x,previous.current.y,1.5,0,Math.PI*2);ctx.fill();setSignature(canvas.current.toDataURL('image/png'));setConsent(false)}
  function move(event){if(!drawing.current)return;const next=point(event),ctx=canvas.current.getContext('2d');ctx.strokeStyle='#10243b';ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(previous.current.x,previous.current.y);ctx.lineTo(next.x,next.y);ctx.stroke();previous.current=next;setSignature(canvas.current.toDataURL('image/png'))}
  function clear(){canvas.current?.getContext('2d').clearRect(0,0,800,240);setSignature('');setConsent(false);drawing.current=false;previous.current=null}
  function reset(){setStage(0);setPdf(null);setSignature('');setConsent(false);setError('')}
  return <section className="portal-card agreement-demo"><div className="portal-card-head"><div><h2>How your agreement is generated and signed</h2><p>Try the full process with a sample PDF.</p></div><span className="portal-tag">DEMO ONLY</span></div>
    <p className="agreement-demo-notice">This practice demo runs only in your browser. It does not sign a real agreement, save a signature to your account or send anything to management.</p>
    <ol className="agreement-demo-steps">{['Generate PDF','Student signs','Management review','Completed'].map((label,index)=><li className={index<stage?'done':index===stage?'current':''} key={label}><span>{index<stage?<Check size={15}/>:index+1}</span>{label}</li>)}</ol>
    {error&&<p role="alert" className="portal-error">{error}</p>}
    {stage===0 && <div className="agreement-demo-start"><FileText size={42}/><h3>1. Generate an agreement PDF</h3><p>In the real portal, Trinity first verifies your documents and approves your application. An authorized officer then generates your agreement using an approved template and your saved details.</p><button className="portal-primary" disabled={busy} onClick={()=>advance(1)}>{busy?'Generating PDF...':'Generate sample agreement PDF'}</button></div>}
    {stage>0&&<div className="agreement-demo-workspace"><div><h3>Sample student service agreement</h3>{url&&<><iframe title="Sample agreement PDF - demonstration only" className="portal-pdf-viewer" src={url}/><a className="portal-outline" href={url} download="sample-agreement-demo.pdf"><Download size={16}/>Download sample PDF</a></>}</div><div className="portal-signature-panel">
      {stage===1&&<><h3><PenLine size={20}/>2. Try a signature</h3><p>Read the sample PDF, then draw a practice signature below.</p><canvas ref={canvas} width="800" height="240" className="portal-signature-canvas" aria-label="Draw a practice signature" onPointerDown={begin} onPointerMove={move} onPointerUp={()=>{drawing.current=false;previous.current=null}} onPointerCancel={()=>{drawing.current=false;previous.current=null}}/><button className="portal-outline compact" disabled={busy} onClick={clear}>Clear signature</button><label className="portal-check"><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)}/>I understand this is a practice signature on a sample document.</label><button className="portal-primary" disabled={busy||!signature||!consent} onClick={()=>advance(2)}>{busy?'Preparing sample...':'Apply practice signature'}</button></>}
      {stage===2&&<><ShieldCheck size={38}/><h3>3. Awaiting management review</h3><p>The sample PDF now includes your practice signature. In the real system it appears in the authorized management signing queue for review and countersigning.</p><p>For this demo you can simulate the next step.</p><button className="portal-primary" disabled={busy} onClick={()=>advance(3)}>{busy?'Preparing sample...':'Simulate management approval'}</button></>}
      {stage===3&&<div className="portal-agreement-approved"><ShieldCheck size={44}/><h3>4. Demo completed</h3><p>You have seen generation, student signing and management review. Download the sample PDF or sign in to access your real agreement.</p><Link to="/student-portal/agreements" className="portal-primary">Open my real agreements</Link></div>}
      <button className="portal-text-button" disabled={busy} onClick={reset}>Restart demo and clear signature</button>
    </div></div>}
    <div className="portal-internal-note"><ShieldCheck size={19}/><span>Live generation is performed in the <Link to="/staff-portal">Staff Portal</Link>. Students sign released agreements under Agreements after signing in.</span></div>
  </section>
}
