import * as pdfLib from 'npm:pdf-lib@1.17.1'
import { authenticated, cors, json, sha256 } from '../_shared/portal.ts'
import { renderAgreementPdf } from '../_shared/agreement-text.mjs'
import { sampleAgreementText } from '../_shared/sample-agreement.mjs'
import { trinityLogoBase64 } from '../_shared/trinity-logo.ts'
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response('ok',{headers:cors})
 if(request.method!=='POST')return json({error:'Method not allowed'},405)
 try{
  const {user,profile,db}=await authenticated(request,'generate-sample-agreement',10)
  const {application_id}=await request.json()
  const {data:app}=await db.from('student_applications').select('*').eq('id',application_id).eq('student_id',user.id).single()
  if(profile.role!=='student'||!app)return json({error:'Open your own student application.'},403)
  const {data:letter,error:letterError}=await db.from('approval_letters').select('id').eq('application_id',app.id).maybeSingle()
  if(letterError)throw Error('Unable to read the approval letter. Please contact Trinity support.');
  if(!letter)return json({error:'Management must issue your approval letter before generating this sample.'},409)
  const {data:existing}=await db.from('student_agreements').select('id').eq('application_id',app.id).eq('is_sample',true).neq('status','voided').maybeSingle()
  if(existing)return json({agreement_id:existing.id})
  const {data:docs,error:docError}=await db.from('student_documents').select('status,scan_status').eq('application_id',app.id).neq('status','replaced')
  if(docError||!docs?.length||docs.some(d=>d.status!=='verified'||d.scan_status!=='clean'))return json({error:'All current documents must be approved and scanned.'},409)
  const reference='TRI-SAMPLE-'+crypto.randomUUID().slice(0,8).toUpperCase()
  const bytes=await renderAgreementPdf(pdfLib,sampleAgreementText(profile,app),reference+' | SAMPLE ONLY',trinityLogoBase64)
  const path=`${user.id}/${app.id}/${reference}.pdf`
  const {error:up}=await db.storage.from('student-private-agreements').upload(path,bytes,{contentType:'application/pdf',upsert:false});if(up)throw Error('Unable to store the sample PDF.')
  const {data:id,error}=await db.rpc('portal_register_sample_agreement',{app_id:app.id,actor:user.id,reference,pdf_path:path,document_hash:await sha256(bytes)})
  if(error){await db.storage.from('student-private-agreements').remove([path]);throw Error(error.message)}
  return json({agreement_id:id})
 }catch(e){return json({error:e instanceof Error?e.message:'Sample generation failed'},400)}
})
