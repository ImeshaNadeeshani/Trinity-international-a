import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronRight, CircleAlert, FileText, LogOut, ShieldCheck, Upload, UserRound, Bell, LockKeyhole, LayoutDashboard, ClipboardList, FolderOpen, CreditCard, MessageCircle, Settings, Plane } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import '../styles/portal.css'
import { ExtractedDetails } from '../components/DocumentAutomation'
import { invokePortal } from '../lib/portalFunctions'
import AgreementWorkspace from '../components/portal/AgreementWorkspace'
import ProfileForm from '../components/portal/ProfileForm'
import WorkflowProgress from '../components/portal/WorkflowProgress'
import StaffStudentReview from '../components/portal/StaffStudentReview'
import Payments from '../components/portal/Payments'

const categories = [['nic_front','NIC ? Front'],['nic_back','NIC ? Back'],['passport','Passport'],['photograph','Passport photograph'],['education','Educational certificates'],['transcript','Academic transcripts'],['english_qualification','English language certificates'],['cv','CV'],['financial','Financial documents'],['other','Other supporting documents']]
const staffRoles = ['board','admin','head','delegate','signatory','legal_reviewer']
const phoneCountryCodes = [['+94','Sri Lanka (+94)'],['+61','Australia (+61)'],['+1','Canada / United States (+1)'],['+86','China (+86)'],['+33','France (+33)'],['+49','Germany (+49)'],['+91','India (+91)'],['+353','Ireland (+353)'],['+81','Japan (+81)'],['+60','Malaysia (+60)'],['+64','New Zealand (+64)'],['+65','Singapore (+65)'],['+971','United Arab Emirates (+971)'],['+44','United Kingdom (+44)']]

function StudentPortal({ staffMode = false, defaultView = 'overview' }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [applications, setApplications] = useState([])
  const [documents, setDocuments] = useState([])
  const [uploadedDocument, setUploadedDocument] = useState(null)
  const [approvalLetters, setApprovalLetters] = useState([])
  const [agreements, setAgreements] = useState([])
  const [notifications, setNotifications] = useState([])
  const [staffProfiles, setStaffProfiles] = useState([])
  const [configuration, setConfiguration] = useState(null)
  const [templates, setTemplates] = useState([])
  const [paymentSchedules, setPaymentSchedules] = useState([])
  const [payments,setPayments]=useState([])
  const [receipts,setReceipts]=useState([])
  const [staffAgreements, setStaffAgreements] = useState([])
  const [staffLetters, setStaffLetters] = useState([])
  const [activityEvents, setActivityEvents] = useState([])
  const [auditEvents, setAuditEvents] = useState([])
  const [approvalOfficers, setApprovalOfficers] = useState([])
  const [officerDraft, setOfficerDraft] = useState({user_id:'',designation:'',can_approve_applications:false,active:false})
  const [canApproveApplications,setCanApproveApplications] = useState(false)
  const [paymentSchedule, setPaymentSchedule] = useState({ application_id:'', total_fee:'', initial_payment:'', balance:'', installments:'', included_services:'', excluded_expenses:'' })
  const [templateDraft, setTemplateDraft] = useState({ name:'', body:'' })
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [phoneCountryCode, setPhoneCountryCode] = useState('+94')
  const [recoveryMode, setRecoveryMode] = useState(() => window.location.hash.includes('type=recovery'))
  const [view, setView] = useState(defaultView)
  useEffect(() => setView(defaultView), [defaultView])
  const [selectedApplication, setSelectedApplication] = useState('')
  const [authFields, setAuthFields] = useState({ firstName: '', secondName: '', email: '', password: '' })
  const [form, setForm] = useState({ destination: '', education_level: '', course_interest: '', intake:'', institution:'' })

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, value) => setSession(value))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    setProfile(null); setApplications([]); setDocuments([]); setAgreements([]);setApprovalLetters([]);setStaffProfiles([]);setStaffAgreements([]);setPaymentSchedules([]);setPayments([]);setReceipts([]);setNotifications([])
    if (session) loadPortal()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  useEffect(() => {
    if(!session)return
    let timer
    const reset=()=>{clearTimeout(timer);timer=setTimeout(()=>supabase.auth.signOut(),30*60*1000)}
    const events=['pointerdown','keydown','touchstart']
    events.forEach(event=>window.addEventListener(event,reset));reset()
    return()=>{clearTimeout(timer);events.forEach(event=>window.removeEventListener(event,reset))}
  },[session])

  async function loadPortal() {
    setBusy(true); setError('')
    try {
      const [{ data: p, error: pe }, { data: a, error: ae }] = await Promise.all([
        supabase.from('portal_profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('student_applications').select('*').order('submitted_at', { ascending: false }),
      ])
      if (pe) throw pe
      if (ae) throw ae
      const signupName = session.user.user_metadata?.full_name
      if (!p.full_name && signupName) {
        const { error: nameError } = await supabase.from('portal_profiles').update({ full_name: signupName }).eq('id', session.user.id)
        if (!nameError) p.full_name = signupName
      }
      const phoneMatch = (p.phone || '').match(/^(\+\d{1,4})\s*(.*)$/)
      if (phoneMatch) {
        if (phoneCountryCodes.some(([code]) => code === phoneMatch[1])) setPhoneCountryCode(phoneMatch[1])
        p.phone = phoneMatch[2]
      }
      setProfile(p); setApplications(a || [])
      if(p.role==='legal_reviewer')setView('management')
      if ((staffMode && !staffRoles.includes(p.role)) || (!staffMode && staffRoles.includes(p.role))) return
      if (p.role === 'student') {
        const [{ data: docs, error: de }, { data: notices, error: ne },{data:letters,error:le},{data:agreementsData,error:age}] = await Promise.all([
          supabase.from('student_documents').select('*').eq('student_id', session.user.id).order('uploaded_at', { ascending: false }),
          supabase.from('student_notifications').select('*').order('created_at', { ascending: false }),
          supabase.from('approval_letters').select('*').order('created_at',{ascending:false}),
          supabase.from('student_agreements').select('*').eq('student_id',session.user.id).order('created_at',{ascending:false}),
        ])
        if (de) throw de
        if (ne) throw ne
        if (le) throw le
        if (age) throw age
        const { data: fees, error: feeError } = await supabase.from('student_payment_schedules').select('*,payment_installments(*)').eq('student_id', session.user.id)
        if (feeError) throw feeError
        setPaymentSchedules(fees || [])
        setDocuments(docs || []); setNotifications(notices || []);setApprovalLetters(letters||[]);setAgreements(agreementsData||[])
      } else {
        setCanApproveApplications(p.role==='admin')
        if(p.role==='board'){
          const {data:officer}=await supabase.from('authorized_approval_officers').select('active,can_approve_applications').eq('user_id',session.user.id).maybeSingle()
          setCanApproveApplications(Boolean(officer?.active&&officer.can_approve_applications))
        }
        const { data: people, error: staffError } = await supabase.from('portal_profiles').select('*')
        if (staffError) throw staffError
        setStaffProfiles(people || [])
        const { data: docs, error: de } = await supabase.from('student_documents').select('*').order('uploaded_at', { ascending: false })
        if (de) throw de
        setDocuments(docs || [])
        const {data:agreementRows,error:agreementError}=await supabase.from('student_agreements').select('*').order('created_at',{ascending:false})
        if(agreementError)throw agreementError
        setStaffAgreements(agreementRows||[])
        const {data:letterRows,error:letterError}=await supabase.from('approval_letters').select('id,application_id,reference_number').order('created_at',{ascending:false})
        if(letterError)throw letterError
        setStaffLetters(letterRows||[])
        const {data:activityRows,error:activityError}=await supabase.from('application_activity').select('*').order('created_at',{ascending:false}).limit(200)
        if(activityError)throw activityError
        setActivityEvents(activityRows||[])
        if(p.role==='admin'){
          const {data:auditRows,error:auditError}=await supabase.from('portal_audit_log').select('*').order('created_at',{ascending:false}).limit(200)
          if(auditError)throw auditError
          setAuditEvents(auditRows||[])
        }
        if (p.role === 'admin' || p.role === 'legal_reviewer') {
          const { data: templateRows, error: te } = await supabase.from('agreement_templates').select('*').order('created_at', { ascending: false })
          if (te) throw te
          setTemplates(templateRows || [])
        }
        if (p.role === 'admin' || p.role==='legal_reviewer') {
          const { data: cfg, error: ce } = await supabase.from('trinity_configuration').select('*').eq('id',true).single()
          if (ce) throw ce
          setConfiguration(cfg)
        }
        if (p.role === 'admin') {
          const {data:officers,error:oe}=await supabase.from('authorized_approval_officers').select('*')
          if(oe)throw oe
          setApprovalOfficers(officers||[])
          const { data: schedules, error: se } = await supabase.from('student_payment_schedules').select('*,payment_installments(*)')
          if (se) throw se
          setPaymentSchedules(schedules||[])
          if (schedules?.length) setPaymentSchedule({ application_id:schedules[0].application_id,total_fee:String(schedules[0].total_fee),initial_payment:String(schedules[0].initial_payment),balance:String(schedules[0].balance),installments:(schedules[0].payment_installments||[]).map(i=>`${i.label}|${i.amount}|${i.due_at}`).join('\n'),included_services:(schedules[0].included_services||[]).join(', '),excluded_expenses:(schedules[0].excluded_expenses||[]).join(', ') })
        }
      }
      if(p.role!=='legal_reviewer'){
        const [paymentResult,receiptResult,noticeResult]=await Promise.all([supabase.from('portal_payments').select('*').order('created_at',{ascending:false}),supabase.from('payment_receipts').select('*'),supabase.from('student_notifications').select('*').eq('student_id',session.user.id).order('created_at',{ascending:false})])
        if(paymentResult.error||receiptResult.error||noticeResult.error)throw paymentResult.error||receiptResult.error||noticeResult.error
        setPayments(paymentResult.data||[]);setReceipts(receiptResult.data||[]);setNotifications(noticeResult.data||[])
      }
    } catch (e) { setError(e.message || 'Unable to load your portal right now.') }
    finally { setBusy(false) }
  }

  async function signIn(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      if (authMode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(authFields.email, { redirectTo: `${window.location.origin}${staffMode ? '/staff-portal' : '/student-portal'}` })
        if (resetError) throw resetError
        setNotice('If an account exists for that email, a password reset link will be sent.')
        return
      }
      if (authMode === 'update-password' || recoveryMode) {
        const { error: updateError } = await supabase.auth.updateUser({ password: authFields.password })
        if (updateError) throw updateError
        setRecoveryMode(false); setAuthMode('login'); setAuthFields({...authFields,password:''}); setNotice('Password updated. You can now sign in with your new password.')
        window.history.replaceState({}, document.title, window.location.pathname)
        return
      }
      const fullName = [authFields.firstName, authFields.secondName].map(part=>part.trim()).filter(Boolean).join(' ')
      const result = authMode === 'signup'
        ? await supabase.auth.signUp({ email: authFields.email, password: authFields.password, options: { data: { first_name: authFields.firstName.trim(), second_name: authFields.secondName.trim(), full_name: fullName } } })
        : await supabase.auth.signInWithPassword({ email: authFields.email, password: authFields.password })
      if (result.error) throw result.error
      if (authMode === 'signup') {
        if (result.data.user && result.data.session) await supabase.from('portal_profiles').update({ full_name: fullName }).eq('id', result.data.user.id)
        setNotice(result.data.session ? 'Your account is ready. Complete your profile to begin.' : 'Check your email to confirm your account, then sign in.')
      }
    } catch (e) { setError(authErrorMessage(e)) }
    finally { setBusy(false) }
  }

  async function saveApplication(event) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const { data, error: e } = await supabase.from('student_applications').insert({ ...form, student_id: session.user.id }).select().single()
      if (e) throw e
      setApplications([data, ...applications]); setSelectedApplication(data.id); setView('documents')
      setNotice('Application created. Upload your documents when ready.')
    } catch (e) { setError(e.message || 'Could not save your application.') }
    finally { setBusy(false) }
  }

  async function saveConfiguration(event) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      if(configuration.refund_policy_draft) throw new Error('Refund policy JSON is invalid; correct it before saving.')
      const configurationValues={...configuration}
      delete configurationValues.refund_policy_draft
      const { data, error:e } = await supabase.from('trinity_configuration').update({ ...configurationValues, updated_by:session.user.id, updated_at:new Date().toISOString() }).eq('id',true).select().single()
      if(e) throw e
      setConfiguration(data); setNotice('Management configuration saved. Pending fields remain marked pending.')
    } catch(e) { setError(e.message||'Could not save configuration.') }
    finally { setBusy(false) }
  }

  async function reviewTemplate(template, approval_status) {
    const legal_review_note=window.prompt(approval_status==='approved'?'Optional legal review reference or note:':'Reason for rejecting this template:')
    if(legal_review_note===null) return
    setBusy(true);setError('')
    try {
      const {error:e}=await supabase.from('agreement_templates').update({approval_status,approved_by:approval_status==='approved'?session.user.id:null,approved_at:approval_status==='approved'?new Date().toISOString():null,legal_review_note,active:approval_status==='approved'}).eq('id',template.id)
      if(e)throw e
      await loadPortal();setNotice(`Template marked ${approval_status}.`)
    }catch(e){setError(e.message||'Could not update template approval.')}
    finally{setBusy(false)}
  }

  async function savePaymentSchedule(event) {
    event.preventDefault();setBusy(true);setError('')
    try {
      const app=applications.find(a=>a.id===paymentSchedule.application_id)
      if(!app)throw new Error('Select an application first.')
      const total=Number(paymentSchedule.total_fee),initial=Number(paymentSchedule.initial_payment),balance=Number(paymentSchedule.balance)
      if(!Number.isFinite(total)||!Number.isFinite(initial)||!Number.isFinite(balance)||Math.round((initial+balance)*100)!==Math.round(total*100))throw new Error('Total fee must equal initial payment plus remaining balance.')
      const installments=(paymentSchedule.installments||'').split(/\r?\n/).filter(Boolean).map((line)=>{const [label,amount,date]=line.split('|').map(x=>x.trim());if(!label||!amount||!date||!Number.isFinite(Number(amount)))throw new Error('Enter instalments as label | amount | YYYY-MM-DD, one per line.');return{label,amount:Number(amount),due_at:date}})
      if(Math.round(installments.reduce((sum,item)=>sum+item.amount,0)*100)!==Math.round(balance*100))throw new Error('Instalment amounts must add up to the remaining balance.')
      const {error:e}=await supabase.rpc('portal_save_payment_schedule',{app_id:app.id,values_json:{currency:configuration?.payment_currency||'LKR',total_fee:total,initial_payment:initial,balance,included_services:paymentSchedule.included_services.split(',').map(v=>v.trim()).filter(Boolean),excluded_expenses:paymentSchedule.excluded_expenses.split(',').map(v=>v.trim()).filter(Boolean),payment_methods:configuration?.payment_methods||[]},installments_json:installments})
      if(e)throw e
      await loadPortal()
      setNotice('Payment schedule saved. No fee amount was prefilled.')
    }catch(e){setError(e.message||'Could not save payment schedule.')}
    finally{setBusy(false)}
  }

  async function changeRole(person,role) {
    setBusy(true);setError('')
    try{const {error:e}=await supabase.from('portal_profiles').update({role}).eq('id',person.id);if(e)throw e;await loadPortal();setNotice(`${person.full_name||'Account'} access role updated.`)}
    catch(e){setError(e.message||'Could not update account role.')}
    finally{setBusy(false)}
  }

  async function saveApprovalOfficer(event){
    event.preventDefault();setBusy(true);setError('')
    try{if(!officerDraft.user_id)throw new Error('Select a staff account.');const {error:e}=await supabase.from('authorized_approval_officers').upsert({...officerDraft,designation:officerDraft.designation||'Pending management confirmation',approved_by:session.user.id,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(e)throw e;const {data,error:refreshError}=await supabase.from('authorized_approval_officers').select('*');if(refreshError)throw refreshError;setApprovalOfficers(data||[]);setNotice('Application approval permissions updated.')}
    catch(e){setError(e.message||'Could not update approval permissions.')}
    finally{setBusy(false)}
  }

  async function approveRefundPolicy(stage){
    setBusy(true);setError('')
    try{const {error:e}=await supabase.rpc(stage==='management'?'portal_management_approve_refund_policy':'portal_legal_approve_refund_policy');if(e)throw e;await loadPortal();setNotice(stage==='management'?'Management approval recorded. Refund terms remain disabled until the separate legal review.':'Legal approval recorded. Refund terms can now be included in approved agreement templates.')}
    catch(e){setError(e.message||'Could not record refund policy approval.')}
    finally{setBusy(false)}
  }

  function selectPaymentApplication(applicationId){
    const saved=paymentSchedules.find(s=>s.application_id===applicationId)
    setPaymentSchedule(saved?{application_id:applicationId,total_fee:String(saved.total_fee),initial_payment:String(saved.initial_payment),balance:String(saved.balance),installments:(saved.payment_installments||[]).map(i=>`${i.label}|${i.amount}|${i.due_at}`).join('\n'),included_services:(saved.included_services||[]).join(', '),excluded_expenses:(saved.excluded_expenses||[]).join(', ')}:{application_id:applicationId,total_fee:'',initial_payment:'',balance:'',installments:'',included_services:'',excluded_expenses:''})
  }

  async function uploadDocument(event) {
    const formElement=event.currentTarget
    event.preventDefault(); const file = formElement.elements.file.files[0]
    const applicationId = selectedApplication || applications[0]?.id || ''
    const category = formElement.elements.category.value
    if (!file || !applicationId) return
    if (!['application/pdf','image/jpeg','image/png'].includes(file.type) || file.size > 10 * 1024 * 1024) { setError('Choose a PDF, JPG or PNG no larger than 10 MB.'); return }
    setBusy(true); setError('')
    try {
      const path = `${session.user.id}/${applicationId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
      const { error: uploadError } = await supabase.storage.from('student-private-documents').upload(path, file, { contentType: file.type, upsert: false })
      if (uploadError) throw uploadError
      const { data, error: insertError } = await supabase.from('student_documents').insert({ application_id: applicationId, student_id: session.user.id, category, file_name: file.name, storage_path: path, mime_type: file.type, size_bytes: file.size }).select().single()
      if (insertError) { await supabase.storage.from('student-private-documents').remove([path]); throw insertError }
      const replaced=documents.filter(d=>d.application_id===applicationId&&d.category===category&&['rejected','correction_requested'].includes(d.status))
      for(const old of replaced){const {error:replaceError}=await supabase.from('student_documents').update({status:'replaced'}).eq('id',old.id);if(replaceError)throw replaceError}
      setDocuments([data, ...documents]); setNotice('Document uploaded securely for review.')
      const {data:scanResult,error:scanError}=await supabase.functions.invoke('scan-student-document',{body:{document_id:data.id}})
      if(scanError||scanResult?.scan_status==='pending')setNotice('Document uploaded securely. It will be available to Trinity reviewers after the approved malware scanner marks it clean.')
      else setNotice(scanResult?.scan_status==='clean'?'Document uploaded and scanned. It is now waiting for Trinity review.':'The scanner flagged this upload. Please replace it with a clean file.')
      if (scanResult?.scan_status === 'clean') setUploadedDocument({ ...data, scan_status: 'clean' })
      const target = applications.find((a) => a.id === applicationId)
      if (target?.status === 'application_submitted') await supabase.from('student_applications').update({ status: 'documents_uploaded' }).eq('id', applicationId)
      await loadPortal()
    } catch (e) { setError(e.message || 'The document could not be uploaded.') }
    finally { setBusy(false); formElement.reset() }
  }

  async function reviewDocument(doc, status) {
    const reviewer_comment = status === 'rejected' || status === 'correction_requested' ? window.prompt('Add a correction note for the student:') : ''
    if ((status === 'rejected' || status === 'correction_requested') && reviewer_comment === null) return
    setBusy(true); setError('')
    try {
      if(doc.scan_status!=='clean')throw new Error('A clean malware scan is required before document review.')
      const { error: e } = await supabase.from('student_documents').update({ status, reviewer_comment, reviewed_at: new Date().toISOString() }).eq('id', doc.id)
      if (e) throw e
      const messages={verified:'A document in your Trinity application has been verified.',rejected:'A document in your application needs to be replaced.',correction_requested:'Trinity has requested a correction to one of your application documents.'}
      const {error:notificationError}=await supabase.functions.invoke('notify-student',{body:{student_id:doc.student_id,title:'Document review update',message:messages[status]||'There is an update to your application documents.'}})
      if(notificationError)setNotice('Review saved. Student email notification is pending provider setup.')
      await loadPortal()
    } catch (e) { setError(e.message || 'Could not update the review.') }
    finally { setBusy(false) }
  }

  async function setApplicationStatus(app, status) {
    setBusy(true); setError('')
    try {
      const { error: e } = await supabase.from('student_applications').update({ status, updated_at: new Date().toISOString() }).eq('id', app.id)
      if (e) throw e
      const appMessages={under_board_review:'Your application is now under Trinity Board review.',documents_verified:'Your uploaded documents have been verified by Trinity.',application_approved:'Your application received internal Trinity approval. This is not a university offer or visa approval.',application_rejected:'Trinity has updated the decision on your application. Please sign in to view the status.'}
      const {error:notificationError}=await supabase.functions.invoke('notify-student',{body:{student_id:app.student_id,title:'Application status update',message:appMessages[status]||`Your application status changed to ${status.replaceAll('_',' ')}.`}})
      if(notificationError)setNotice('Application update saved. Student email notification is pending provider setup.')
      if(status==='application_approved') {
        const {error:letterError}=await supabase.functions.invoke('generate-approval-letter',{body:{application_id:app.id}})
        if(letterError) setNotice(`Application approved. Approval letter generation needs setup: ${letterError.message}`)
        else {
          const {data:generatedAgreement,error:agreementError}=await supabase.functions.invoke('generate-agreement',{body:{application_id:app.id}})
          if(agreementError) setNotice(`Application approved and internal letter generated. Agreement generation is waiting: ${agreementError.message}`)
          else setNotice(generatedAgreement?.status==='awaiting_student_signature'?'Application approved. The agreement is ready for the student to review and sign.':'Application approved. The agreement is ready for student signature.')
        }
      }
      await loadPortal()
    } catch (e) { setError(e.message || 'Could not update the application.') }
    finally { setBusy(false) }
  }

  async function openPrivateFile(path, bucket = 'student-private-documents') {
    const { data, error: e } = await supabase.storage.from(bucket).createSignedUrl(path, 60)
    if (e) { setError(e.message); return }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function generateOfficialDocument(app,kind){
    setBusy(true);setError('');setNotice('')
    try{const functionName=kind==='letter'?'generate-approval-letter':'generate-agreement';const data=await invokePortal(functionName,{application_id:app.id});setNotice(`${kind==='letter'?'Internal approval letter':data.status==='awaiting_student_signature'?'Agreement ready for student signature':'Draft agreement'}: ${data.reference_number||''}`);await loadPortal()}
    catch(e){setError(e.message||`Could not generate the ${kind}. Check that management setup and approval prerequisites are complete.`)}
    finally{setBusy(false)}
  }

  const staffUser = profile && staffRoles.includes(profile.role)
  const isCorrectPortal = profile && (staffMode ? staffUser : !staffUser)
  const staffNavigation=profile?.role==='legal_reviewer'?[['management','Business and refund review',LockKeyhole],['templates','Agreement templates',FileText]]:[['overview','Dashboard',LayoutDashboard],['notifications','Notifications',Bell],['documents','Document review',ShieldCheck],['history','Approval history',Bell],...(profile?.role==='admin'?[['management','Management settings',Settings],['templates','Agreement templates',FileText],['payments','Payment schedules',CreditCard],['team','Team accounts',UserRound],['audit','Activity logs',ShieldCheck]]:[]),...(['head','delegate','signatory'].includes(profile?.role)?[['signing','Agreement signing',LockKeyhole]]:[])]
  const navigation=staffUser?staffNavigation:[['overview','Dashboard',LayoutDashboard],['profile','My Profile',UserRound],['application','My Application',ClipboardList],['documents','Upload Documents',FolderOpen],['status','Application Status',ShieldCheck],['letters','Approval Letters',FileText],['agreements','Agreements',FileText],['payments','Payments',CreditCard],['notifications','Notifications',Bell],['support','Support',MessageCircle]]

  return <main className="portal-page">
    {(session || !isSupabaseConfigured) && <header className="portal-topbar"><Link to="/" className="portal-brand"><img src="/trinity-logo.jpeg" alt="Trinity International"/><span>Student Services Portal</span></Link><Link to="/" className="portal-back"><ArrowLeft size={16}/> Main website</Link></header>}
    {!isSupabaseConfigured ? <section className="portal-card portal-config"><CircleAlert/><h1>Portal setup needed</h1><p>Add the Supabase project URL and publishable key to <code>.env.local</code>, apply <code>student_portal.sql</code> followed by <code>workflow_extensions.sql</code>, and deploy the Edge Functions described in <code>supabase/functions/README.md</code>.</p></section>
      : recoveryMode ? <section className="portal-auth"><div className="portal-auth-visual"><Link to="/" className="portal-auth-logo"><img src="/trinity-logo.jpeg" alt="Trinity International"/><span>TRINITY<small>INTERNATIONAL</small></span></Link><div className="portal-auth-message"><span className="portal-auth-kicker">SECURE ACCOUNT ACCESS</span><h1>Choose a new password.</h1><p>Update your password to return to the Trinity student portal.</p></div></div><div className="portal-auth-panel"><form className="portal-card portal-auth-card" onSubmit={signIn}><span className="portal-eyebrow">PASSWORD RESET</span><h2>Set a new password</h2><p className="portal-muted">Choose a password with at least 8 characters.</p><label>New password<input required type="password" minLength="8" autoComplete="new-password" placeholder="Enter a new password" value={authFields.password} onChange={e=>setAuthFields({...authFields,password:e.target.value})}/></label>{error&&<p className="portal-error">{error}</p>}{notice&&<p className="portal-notice">{notice}</p>}<button className="portal-primary" disabled={busy||!session}>{!session?'Checking reset link…':'Save new password'}</button></form></div></section>
      : !session ? <section className="portal-auth">
        <div className="portal-auth-visual">
          <Link to="/" className="portal-auth-logo"><img src="/trinity-logo.jpeg" alt="Trinity International"/><span>TRINITY<small>INTERNATIONAL</small></span></Link>
          <div className="portal-auth-message"><span className="portal-auth-kicker">YOUR GLOBAL EDUCATION JOURNEY STARTS HERE</span><h1>Start your study abroad journey with confidence.</h1><p>Stay connected to your application, documents and Trinity support in one secure place.</p></div>
          <div className="portal-auth-points"><span><ShieldCheck size={16}/> Secure document review</span><span><Plane size={16}/> Guided application journey</span></div>
        </div>
        <div className="portal-auth-panel"><Link to="/" className="portal-auth-home"><ArrowLeft size={15}/> Main website</Link>
          <form className="portal-card portal-auth-card" onSubmit={signIn}><span className="portal-eyebrow">{staffMode ? 'TRINITY STAFF ACCESS' : 'STUDENT SERVICES PORTAL'}</span><h2>{authMode === 'signup' ? 'Create your account' : authMode==='forgot' ? 'Reset your password' : 'Student Login'}</h2><p className="portal-muted">{authMode === 'signup' ? 'Create an account to start your study application.' : authMode==='forgot' ? 'Enter your account email and we will send a reset link.' : 'Welcome back. Sign in to continue.'}</p>
            {authMode === 'signup' && <><label>First name<input required autoComplete="given-name" value={authFields.firstName} onChange={e => setAuthFields({...authFields,firstName:e.target.value})}/></label><label>Second name<input required autoComplete="family-name" value={authFields.secondName} onChange={e => setAuthFields({...authFields,secondName:e.target.value})}/></label></>}
            <label>Email address<input required type="email" autoComplete="email" placeholder="you@example.com" value={authFields.email} onChange={e => setAuthFields({...authFields,email:e.target.value})}/></label>
            {authMode !== 'forgot' && <label>Password<input required type="password" minLength="8" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} placeholder="Enter your password" value={authFields.password} onChange={e => setAuthFields({...authFields,password:e.target.value})}/></label>}
            {error && <p className="portal-error">{error}</p>}{notice && <p className="portal-notice">{notice}</p>}
            <button className="portal-primary" disabled={busy}>{busy ? 'Please wait…' : authMode === 'signup' ? 'Create student account' : authMode==='forgot' ? 'Send reset link' : 'Sign in securely'}</button>
            {!staffMode && authMode==='login' && <button type="button" className="portal-text-button portal-forgot-button" onClick={()=>{setAuthMode('forgot');setError('');setNotice('')}}>Forgot password?</button>}
            {!staffMode && authMode!=='update-password' && <button type="button" className="portal-text-button" onClick={() => {setAuthMode(authMode==='signup'?'login':authMode==='login'?'signup':'login');setError('');setNotice('')}}>{authMode === 'signup' ? 'Already registered? Sign in' : authMode==='forgot' ? 'Back to Student Login' : 'New to Trinity? Create an account'}</button>}
            <div className="portal-encryption"><LockKeyhole size={14}/> Your information is protected by account access controls.</div>
          </form><p className="portal-auth-footer">By continuing, you access the secure Trinity International student platform.</p><Link className="portal-preview-link" to="/student-portal/preview">Preview the portal without signing in</Link>
        </div>
      </section>
      : !profile ? <section className="portal-card portal-config"><CircleAlert/><h1>{busy?'Loading your secure account':'Portal data setup needed'}</h1><p>{error||'Your portal account profile could not be loaded. Confirm that the database migrations and profile trigger are installed.'}</p><button className="portal-outline" onClick={() => supabase.auth.signOut()}>Sign out</button></section>
      : !isCorrectPortal ? <section className="portal-card portal-config"><CircleAlert/><h1>{staffMode ? 'Staff access required' : 'Student account required'}</h1><p>This account does not have access to this portal. Ask a Trinity administrator to assign the correct access role if you are a staff member.</p><button className="portal-outline" onClick={() => supabase.auth.signOut()}>Sign out and switch account</button></section>
      : <div className="portal-layout"><aside className="portal-sidebar"><div className="portal-user"><div className="portal-avatar"><UserRound/></div><strong>{profile.full_name || session.user.email}</strong><span>{staffUser ? `${profile.role} workspace` : `Student ID ${profile.student_number}`}</span></div><nav>{navigation.map(([key,label,Icon])=><button className={view===key?'active':''} key={key} onClick={()=>setView(key)}><Icon size={17}/>{label}<ChevronRight size={15}/></button>)}</nav><button className="portal-signout" onClick={()=>supabase.auth.signOut()}><LogOut size={16}/> Sign out</button></aside>
        <section className="portal-content"><div className="portal-page-heading"><div><span className="portal-eyebrow">{staffUser ? 'TRINITY INTERNATIONAL · STAFF' : 'TRINITY INTERNATIONAL · STUDENT'}</span><h1>{staffUser ? profile.role==='legal_reviewer'?'Legal review workspace':'Application workspace' : `Hello${profile.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}`}</h1><p>{staffUser ? profile.role==='legal_reviewer'?'Review draft agreement templates and proposed refund policy.':'Review student applications and document verification.' : 'Your application journey, documents and updates in one place.'}</p></div><span className="portal-secure"><ShieldCheck size={16}/> Secure portal</span></div>
          {error && <div className="portal-flash error">{error}</div>}{notice && <div className="portal-flash success">{notice}<button onClick={()=>setNotice('')}>Dismiss</button></div>}{busy && <div className="portal-loading">Updating your secure workspace…</div>}
          {!staffUser && view==='overview' && <><div className="portal-stat-grid"><article><span>Application</span><strong>{applications[0]?.status.replaceAll('_',' ')||'Not started'}</strong></article><article><span>Documents</span><strong>{documents.filter(d=>d.status==='verified').length} approved</strong></article><article><span>Agreement</span><strong>{agreements.find(a=>a.status!=='voided')?.status.replaceAll('_',' ')||'Not generated'}</strong></article><article><span>Payments</span><strong>{payments.filter(p=>p.status==='successful').length} successful</strong></article><article><span>Messages</span><strong>{notifications.filter(n=>!n.read_at).length} unread</strong></article></div><WorkflowProgress profile={profile} application={applications[0]} documents={documents} agreements={agreements} payments={payments}/><div className="portal-card"><h2>Your next steps</h2><div className="portal-action-row"><button className="portal-primary" onClick={()=>setView('profile')}>Complete profile</button><button className="portal-outline" onClick={()=>setView('application')}>My application</button><button className="portal-outline" onClick={()=>setView('documents')}>Upload documents</button><button className="portal-outline" onClick={()=>setView('agreements')}>Review agreement</button></div></div></>}
          {!staffUser && view==='application' && <div className="portal-card portal-form-card"><h2>{applications.length?'Add a study application':'Your study application'}</h2><p>Share your study preferences to create your application record.</p><form onSubmit={saveApplication}><label>Preferred destination<select required value={form.destination} onChange={e=>setForm({...form,destination:e.target.value})}><option value="">Choose a destination</option>{['Australia','Canada','Ireland','Malaysia','New Zealand','Singapore','United Kingdom','United States'].map(x=><option key={x}>{x}</option>)}</select></label><label>Highest education completed<input required value={form.education_level} onChange={e=>setForm({...form,education_level:e.target.value})} placeholder="For example, Advanced Level"/></label><label>Course or subject of interest<input required value={form.course_interest} onChange={e=>setForm({...form,course_interest:e.target.value})} placeholder="For example, Business Management"/></label><label>Intake<input required value={form.intake} onChange={e=>setForm({...form,intake:e.target.value})} placeholder="For example, September 2027"/></label><label>University / institution<input value={form.institution} onChange={e=>setForm({...form,institution:e.target.value})}/></label><button className="portal-primary" disabled={busy}>Save application <ChevronRight size={16}/></button></form></div>}
          {!staffUser && view==='documents' && <><div className="portal-card portal-form-card"><h2>Upload a document</h2><label>Application<select value={selectedApplication||applications[0]?.id||''} onChange={e=>setSelectedApplication(e.target.value)}>{applications.map(a=><option value={a.id} key={a.id}>{a.destination} ? {a.course_interest}</option>)}</select></label><div className="portal-document-checklist">{categories.map(([key,label])=>{const doc=documents.find(d=>d.application_id===(selectedApplication||applications[0]?.id)&&d.category===key&&d.status!=='replaced');return <span className="portal-tag" key={key}>{label}: {doc?({pending:'Uploaded',verified:'Approved',rejected:'Rejected',correction_requested:'Resubmission required'}[doc.status]||doc.status):'Not uploaded'}</span>})}</div><p>Accepted formats: PDF, JPG, PNG. Maximum 10 MB per document.</p><form onSubmit={uploadDocument}><label>Document type<select name="category">{categories.map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label><label className="portal-file"><Upload size={18}/><span>Choose a file<input name="file" required type="file" accept="application/pdf,image/jpeg,image/png"/></span></label><button className="portal-primary" disabled={busy||!applications.length}>Upload securely <Upload size={16}/></button></form></div><ExtractedDetails documents={documents} uploadedDocument={uploadedDocument} profile={profile} onSaved={loadPortal}/><div className="portal-card"><h2>Your documents</h2>{documents.length?documents.map(doc=><DocumentRow key={doc.id} doc={doc} onOpen={()=>openPrivateFile(doc.storage_path)}/>):<p className="portal-muted">Your uploaded documents will appear here.</p>}</div><div className="portal-card"><h2>Agreements and letters</h2><button className="portal-outline" onClick={()=>setView('agreements')}>Review agreements</button><button className="portal-outline" onClick={()=>setView('letters')}>Approval letters</button></div></>}
          {!staffUser && view==='profile' && <ProfileForm key={profile.id} profile={{...profile,phone:`${phoneCountryCode} ${profile.phone||''}`}} email={session.user.email} onSaved={loadPortal}/>}
          {!staffUser && view==='status' && <WorkflowProgress profile={profile} application={applications.find(a=>a.id===selectedApplication)||applications[0]} documents={documents} agreements={agreements} payments={payments}/>}
          {!staffUser && view==='letters' && <div className="portal-card"><h2>Approval letters</h2><p className="portal-muted">Internal Trinity approval letters are made available here after authorized review.</p>{approvalLetters.length?approvalLetters.map(letter=><article className="portal-document" key={letter.id}><FileText/><span className="portal-doc-info"><strong>Internal approval letter</strong><small>{letter.reference_number} · {new Date(letter.approved_at).toLocaleDateString()}</small></span><button className="portal-outline compact" onClick={()=>openPrivateFile(letter.storage_path,'student-private-letters')}>Download PDF</button></article>):<p className="portal-empty-note">No approval letters have been released yet.</p>}</div>}
          {!staffUser && view==='agreements' && <AgreementWorkspace agreements={agreements} profile={profile} onChanged={loadPortal}/>}
          {!staffUser && view==='payments' && <Payments schedules={paymentSchedules} agreements={agreements} payments={payments} receipts={receipts} profile={profile}/>}
          {!staffUser && view==='support' && <div className="portal-card portal-empty"><MessageCircle/><h2>Need support?</h2><p>Contact Trinity about your application, documents, or portal access.</p><Link className="portal-primary portal-link-button" to="/contact">Contact Trinity <ChevronRight size={16}/></Link></div>}
          {view==='notifications' && <div className="portal-card"><h2>Notifications</h2>{notifications.length?notifications.map(n=><p className="portal-notification" key={n.id}><Bell size={15}/><span><strong>{n.title}</strong>{n.message}<small>{new Date(n.created_at).toLocaleString()}</small></span></p>):<p className="portal-muted">No notifications yet.</p>}</div>}
          {staffUser && view==='overview' && <><StaffStudentReview applications={applications} people={staffProfiles} documents={documents} agreements={staffAgreements} payments={payments} onSelect={id=>{setSelectedApplication(id);setView('documents')}}/><div className="portal-stat-grid"><article><span>Applications</span><strong>{applications.length}</strong><small>Across all student accounts</small></article><article><span>Pending review</span><strong>{applications.filter(a=>['application_submitted','documents_uploaded','under_board_review'].includes(a.status)).length}</strong><small>Applications needing attention</small></article><article><span>Documents</span><strong>{documents.filter(d=>d.status==='pending').length}</strong><small>Awaiting document review</small></article></div><div className="portal-card"><h2>Student applications</h2>{applications.length?applications.map(app=><ApplicationRow key={app.id} app={app} people={staffProfiles} documents={documents} letters={staffLetters} agreements={staffAgreements} canApprove={canApproveApplications} onStatus={setApplicationStatus} onGenerateLetter={()=>generateOfficialDocument(app,'letter')} onGenerateAgreement={()=>generateOfficialDocument(app,'agreement')} onView={()=>{setSelectedApplication(app.id);setView('documents')}}/>):<p className="portal-muted">No applications have been submitted yet.</p>}</div></>}
          {staffUser && view==='documents' && <div className="portal-card"><h2>Document review queue</h2>{selectedApplication&&<button className="portal-outline" onClick={()=>setSelectedApplication('')}>Show all applications</button>}{documents.length?documents.filter(doc=>!selectedApplication||doc.application_id===selectedApplication).map(doc=><DocumentRow key={doc.id} doc={doc} people={staffProfiles} onOpen={()=>openPrivateFile(doc.storage_path)} onReview={reviewDocument}/>):<p className="portal-muted">No student documents have been uploaded.</p>}</div>}
          {staffUser && view==='signing' && <AgreementWorkspace management agreements={staffAgreements} profile={profile} onChanged={loadPortal}/>}
          {staffUser && view==='history' && <div className="portal-card"><h2>Application approval and review history</h2>{activityEvents.map(event=><article className="portal-team-row" key={event.id}><span className="portal-avatar small"><Bell/></span><span><b>{event.event_type.replaceAll('_',' ')}</b><small>Application {event.application_id} · {new Date(event.created_at).toLocaleString()} · {staffProfiles.find(p=>p.id===event.actor_id)?.full_name||'System'}</small></span></article>)}{!activityEvents.length&&<p className="portal-muted">No review activity has been recorded.</p>}</div>}
          {staffUser && view==='audit' && profile.role==='admin' && <div className="portal-card"><h2>Administrative activity log</h2>{auditEvents.map(event=><article className="portal-team-row" key={event.id}><span className="portal-avatar small"><ShieldCheck/></span><span><b>{event.entity_type.replaceAll('_',' ')} · {event.action}</b><small>{event.entity_id} · {new Date(event.created_at).toLocaleString()} · {staffProfiles.find(p=>p.id===event.actor_id)?.full_name||'System'}</small></span></article>)}{!auditEvents.length&&<p className="portal-muted">No administrative activity has been recorded.</p>}</div>}
          {staffUser && view==='management' && profile.role==='admin' && configuration && <><div className="portal-card portal-form-card"><h2>Management configuration</h2><p>Unconfirmed details remain visibly pending. Provider credentials belong in server secrets, never here.</p><form onSubmit={saveConfiguration}>{[['registered_business_name','Registered business name'],['registration_number','Business registration number'],['registered_address','Registered address'],['official_email','Official company email'],['approval_officer_name','Authorized approval officer'],['approval_officer_designation','Officer designation'],['payment_currency','Payment currency'],['payment_methods','Accepted payment methods (comma separated)']].map(([key,label])=><label key={key}>{label}<input value={Array.isArray(configuration[key])?configuration[key].join(', '):configuration[key]||''} onChange={e=>setConfiguration({...configuration,[key]:key==='payment_methods'?e.target.value.split(',').map(v=>v.trim()).filter(Boolean):e.target.value})}/></label>)}<label>Refund policy configuration (JSON)<textarea rows="7" value={configuration.refund_policy_draft??JSON.stringify(configuration.refund_policy,null,2)} onChange={e=>{try{setConfiguration({...configuration,refund_policy:JSON.parse(e.target.value),refund_policy_draft:''})}catch{setConfiguration({...configuration,refund_policy_draft:e.target.value})}}}/></label><p className="portal-pending">Refund status: {configuration.refund_policy_status.replaceAll('_',' ')}. Refund rules remain unenforced until approved separately by Trinity management and legal counsel.</p>{configuration.refund_policy_status==='pending_management_and_legal_approval'&&<button type="button" className="portal-outline" onClick={()=>approveRefundPolicy('management')}>Record management approval for refund policy</button>}<label>Signature provider<input value={configuration.signature_provider} onChange={e=>setConfiguration({...configuration,signature_provider:e.target.value})} placeholder="unconfigured"/></label><label>Email provider<input value={configuration.email_provider} onChange={e=>setConfiguration({...configuration,email_provider:e.target.value})} placeholder="unconfigured"/></label><label>Malware scanner provider<input value={configuration.document_scanner_provider} onChange={e=>setConfiguration({...configuration,document_scanner_provider:e.target.value})} placeholder="unconfigured"/></label><button className="portal-primary" disabled={busy}>Save management settings</button></form></div><div className="portal-card portal-form-card"><h2>Authorized application approval officers</h2><p>Only assigned board accounts can approve applications.</p><form onSubmit={saveApprovalOfficer}><label>Board account<select required value={officerDraft.user_id} onChange={e=>setOfficerDraft({...officerDraft,user_id:e.target.value})}><option value="">Select a board member</option>{staffProfiles.filter(p=>p.role==='board').map(p=><option value={p.id} key={p.id}>{p.full_name||p.student_number}</option>)}</select></label><label>Designation<input value={officerDraft.designation} onChange={e=>setOfficerDraft({...officerDraft,designation:e.target.value})} placeholder="Pending management confirmation"/></label><label className="portal-check"><input type="checkbox" checked={officerDraft.can_approve_applications} onChange={e=>setOfficerDraft({...officerDraft,can_approve_applications:e.target.checked})}/> May approve applications</label><label className="portal-check"><input type="checkbox" checked={officerDraft.active} onChange={e=>setOfficerDraft({...officerDraft,active:e.target.checked})}/> Active authorization</label><button className="portal-primary" disabled={busy}>Save officer permissions</button></form>{approvalOfficers.map(o=><p className="portal-muted" key={o.user_id}>{staffProfiles.find(p=>p.id===o.user_id)?.full_name||o.user_id} · {o.designation} · {o.active&&o.can_approve_applications?'approval enabled':'inactive'}</p>)}</div></>}
          {staffUser && view==='management' && profile.role==='legal_reviewer' && configuration && <div className="portal-card portal-form-card"><h2>Refund policy legal review</h2><p>Review the management supplied policy. This review does not change other business settings.</p><label>Proposed refund policy<textarea rows="9" readOnly value={JSON.stringify(configuration.refund_policy,null,2)}/></label><p className="portal-pending">Approval state: {configuration.refund_policy_status.replaceAll('_',' ')}.</p>{configuration.refund_management_approved_at&&<p className="portal-muted">Management approval recorded {new Date(configuration.refund_management_approved_at).toLocaleString()}.</p>}{configuration.refund_policy_status==='pending_legal_approval'&&<button className="portal-primary" onClick={()=>approveRefundPolicy('legal')} disabled={busy}>Approve refund policy after legal review</button>}{configuration.refund_policy_status!=='pending_legal_approval'&&<p className="portal-muted">A management approval is required before legal approval is available.</p>}</div>}
          {staffUser && view==='templates' && <><div className="portal-card"><h2>Agreement template approvals</h2><p className="portal-muted">Only approved, active templates can generate agreements. Drafts cannot be signed or sent to students.</p>{templates.map(t=><article className="portal-application-row" key={t.id}><div><strong>{t.name}</strong><small>Version {t.version} · {t.approval_status.replaceAll('_',' ')}</small></div>{profile.role==='legal_reviewer'&&t.approval_status!=='approved'&&<button className="portal-primary compact" onClick={()=>reviewTemplate(t,'approved')}>Approve after legal review</button>}{profile.role==='legal_reviewer'&&t.approval_status!=='rejected'&&<button className="portal-outline compact" onClick={()=>reviewTemplate(t,'rejected')}>Reject</button>}{profile.role==='admin'&&<button className="portal-outline compact" onClick={()=>{setSelectedTemplate(t.id);setTemplateDraft({name:t.name,body:t.body})}}>Edit draft</button>}</article>)}</div>{profile.role==='admin'&&<div className="portal-card portal-form-card"><h2>{selectedTemplate?'Edit draft template':'Create draft template'}</h2><p>Changes remain in draft until an assigned legal reviewer approves the exact version.</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);try{const result=selectedTemplate?await supabase.from('agreement_templates').update({name:templateDraft.name,body:templateDraft.body,version:(templates.find(t=>t.id===selectedTemplate)?.version||0)+1,approval_status:'draft',active:false,approved_by:null,approved_at:null}).eq('id',selectedTemplate):await supabase.from('agreement_templates').insert({name:templateDraft.name,body:templateDraft.body,version:1,active:false,approval_status:'draft',created_by:session.user.id});if(result.error)throw result.error;setTemplateDraft({name:'',body:''});setSelectedTemplate('');await loadPortal();setNotice('Template saved as a draft; signing remains disabled until legal approval.')}catch(err){setError(err.message)}finally{setBusy(false)}}}><label>Template name<input required value={templateDraft.name} onChange={e=>setTemplateDraft({...templateDraft,name:e.target.value})}/></label><label>Agreement text<textarea required rows="18" value={templateDraft.body} onChange={e=>setTemplateDraft({...templateDraft,body:e.target.value})}/></label><button className="portal-primary" disabled={busy}>Save draft version</button></form></div>}</>}
          {staffUser && view==='payments' && profile.role==='admin' && <div className="portal-card portal-form-card"><h2>Configure student payment schedule</h2><p>No payment figures are prefilled. The total must equal the initial payment plus balance.</p><form onSubmit={savePaymentSchedule}><label>Student application<select required value={paymentSchedule.application_id} onChange={e=>selectPaymentApplication(e.target.value)}><option value="">Choose an application</option>{applications.map(a=><option key={a.id} value={a.id}>{staffProfiles.find(p=>p.id===a.student_id)?.full_name||'Student'} · {a.destination}</option>)}</select></label><label>Total consultancy fee<input required type="number" min="0" step="0.01" value={paymentSchedule.total_fee} onChange={e=>setPaymentSchedule({...paymentSchedule,total_fee:e.target.value})}/></label><label>Initial payment<input required type="number" min="0" step="0.01" value={paymentSchedule.initial_payment} onChange={e=>setPaymentSchedule({...paymentSchedule,initial_payment:e.target.value})}/></label><label>Remaining balance<input required type="number" min="0" step="0.01" value={paymentSchedule.balance} onChange={e=>setPaymentSchedule({...paymentSchedule,balance:e.target.value})}/></label><label>Instalments (one per line: Label | Amount | YYYY-MM-DD)<textarea rows="5" value={paymentSchedule.installments} onChange={e=>setPaymentSchedule({...paymentSchedule,installments:e.target.value})}/></label><label>Included consultancy services (comma separated)<textarea rows="3" value={paymentSchedule.included_services} onChange={e=>setPaymentSchedule({...paymentSchedule,included_services:e.target.value})}/></label><label>Excluded third-party expenses (comma separated)<textarea rows="3" value={paymentSchedule.excluded_expenses} onChange={e=>setPaymentSchedule({...paymentSchedule,excluded_expenses:e.target.value})}/></label><button className="portal-primary" disabled={busy}>Save payment schedule</button></form></div>}
          {staffUser && view==='team' && <div className="portal-card"><h2>Portal accounts and permissions</h2><p className="portal-muted">Assign staff roles to verified accounts. Student sign-up never grants staff permissions.</p>{staffProfiles.map(person=><div className="portal-team-row" key={person.id}><span className="portal-avatar small"><UserRound/></span><span><b>{person.full_name||'Student'}</b><small>{person.student_number} · {person.role}</small></span>{profile.role==='admin'?<select aria-label={`Role for ${person.full_name||'account'}`} value={person.role} onChange={e=>changeRole(person,e.target.value)}>{['student','board','admin','head','delegate','signatory','legal_reviewer'].map(role=><option key={role} value={role}>{role.replace('_',' ')}</option>)}</select>:<span className="portal-tag">{person.role}</span>}</div>)}</div>}
          <footer className="portal-footnote">Private student information · Access and activity are controlled by your account role.</footer>
        </section>
      </div>}
  </main>
}

function authErrorMessage(error) {
  const message = (error?.message || '').toLowerCase()
  if (message.includes('email rate limit exceeded') || message.includes('email rate limit') || message.includes('over_email_send_rate_limit')) return 'Supabase has temporarily stopped sending account emails because this project reached its email limit. Don’t submit sign-up again right now. Ask the project administrator to configure an approved SMTP email provider in Supabase, then check Authentication → Users to see whether this account was created.'
  if (message.includes('invalid login credentials')) return 'Email or password is incorrect. If you are new to Trinity, create an account first. New accounts may need email confirmation before signing in.'
  if (message.includes('email not confirmed')) return 'Please confirm your email using the link we sent, then return here to sign in.'
  if (message.includes('user already registered')) return 'An account already exists for this email. Return to Student Login and sign in.'
  if (message.includes('fetch') || message.includes('network')) return 'Unable to reach the sign-in service. Check your connection and try again.'
  if (message.includes('signups not allowed') || message.includes('signup is disabled')) return 'New account registration is disabled for this portal. Contact Trinity to enable your account.'
  return error?.message || 'Could not authenticate. Please try again or contact Trinity support.'
}

function DocumentRow({doc,people=[],onOpen,onReview}) {
  const person=people.find(p=>p.id===doc.student_id)
  return <article className="portal-document"><span className="portal-doc-icon"><FileText size={20}/></span><span className="portal-doc-info"><strong>{doc.file_name}</strong><small>{person?.full_name?`${person.full_name} · `:''}{categories.find(c=>c[0]===doc.category)?.[1]||doc.category} · {new Date(doc.uploaded_at).toLocaleDateString()}</small>{onReview&&<small className={doc.scan_status==='clean'?'portal-scan-clean':'portal-review-note'}>Malware scan: {(doc.scan_status||'pending').replaceAll('_',' ')}</small>}{doc.reviewer_comment&&<small className="portal-review-note">Review note: {doc.reviewer_comment}</small>}</span><span className={`portal-tag ${doc.status}`}>{({pending:doc.scan_status==='clean'?'Under review':'Uploaded',verified:'Approved',rejected:'Rejected',correction_requested:'Resubmission required',replaced:'Replaced'})[doc.status]||doc.status}</span><button className="portal-outline compact" disabled={onReview&&doc.scan_status!=='clean'} onClick={onOpen}>Open</button>{onReview&&doc.status==='pending'&&doc.scan_status==='clean'&&<><button className="portal-outline compact" onClick={()=>onReview(doc,'verified')}>Verify</button><button className="portal-outline compact" onClick={()=>onReview(doc,'correction_requested')}>Request correction</button><button className="portal-outline compact" onClick={()=>onReview(doc,'rejected')}>Reject</button></>}</article>
}
function ApplicationRow({app,people,documents,letters=[],agreements=[],canApprove=false,onStatus,onGenerateLetter,onGenerateAgreement,onView}) {
  const person=people.find(p=>p.id===app.student_id), docs=documents.filter(d=>d.application_id===app.id),activeDocs=docs.filter(d=>d.status!=='replaced')
  const hasLetter=letters.some(letter=>letter.application_id===app.id),hasAgreement=agreements.some(agreement=>agreement.application_id===app.id&&agreement.status!=='voided')
  return <article className="portal-application-row"><div><strong>{person?.full_name||'Student application'}</strong><small>{person?.student_number} · {app.destination} · {app.course_interest}</small></div><span className="portal-tag">{app.status.replaceAll('_',' ')}</span><span className="portal-tag">{activeDocs.length} documents</span><button className="portal-outline compact" onClick={onView}>Review documents</button>{app.status==='documents_uploaded'&&<button className="portal-outline compact" onClick={()=>onStatus(app,'under_board_review')}>Start review</button>}{app.status==='under_board_review'&&activeDocs.length>0&&activeDocs.every(d=>d.status==='verified')&&<button className="portal-primary compact" onClick={()=>onStatus(app,'documents_verified')}>Mark verified</button>}{app.status==='documents_verified'&&canApprove&&<><button className="portal-primary compact" onClick={()=>onStatus(app,'application_approved')}>Approve application</button><button className="portal-outline compact" onClick={()=>onStatus(app,'application_rejected')}>Reject application</button></>}{app.status==='application_approved'&&!hasLetter&&canApprove&&<button className="portal-outline compact" onClick={onGenerateLetter}>Generate internal letter</button>}{app.status==='application_approved'&&hasLetter&&!hasAgreement&&canApprove&&<button className="portal-outline compact" onClick={onGenerateAgreement}>Generate service agreement</button>}</article>
}

export default StudentPortal
