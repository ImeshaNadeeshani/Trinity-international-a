import { ArrowRight, CalendarDays, FileUp, GraduationCap, ShieldCheck, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { insertSubmission, uploadEligibilityDocument } from '../lib/supabase'
import { assessEligibility } from '../lib/eligibilityAssessment'
import trinityLogo from '../assets/logo/trinity-logo.png.jpeg'
import '../styles/eligibility.css'

const CheckboxGroup = ({ legend, name, options, required = false }) => (
  <fieldset className="eligibility-choice-group">
    <legend>{legend}{required && <span aria-hidden="true"> *</span>}</legend>
    <div className="eligibility-choices">
      {options.map((option) => (
        <label className="eligibility-choice" key={option}>
          <input type="checkbox" name={name} value={option} /> <span>{option}</span>
        </label>
      ))}
    </div>
  </fieldset>
)

const RadioGroup = ({ legend, name, options, required = false, onChange }) => (
  <fieldset className="eligibility-choice-group">
    <legend>{legend}{required && <span aria-hidden="true"> *</span>}</legend>
    <div className="eligibility-choices">
      {options.map((option) => (
        <label className="eligibility-choice" key={option}>
          <input type="radio" name={name} value={option} required={required} onChange={onChange} /> <span>{option}</span>
        </label>
      ))}
    </div>
  </fieldset>
)

const Field = ({ label, name, type = 'text', required = false, ...props }) => (
  <label className="eligibility-field">
    <span>{label}{required && <b aria-hidden="true"> *</b>}</span>
    <input name={name} type={type} required={required} {...props} />
  </label>
)

const DateField = ({ label, name, required = false }) => {
  const textRef = useRef(null)
  const pickerRef = useRef(null)

  const openPicker = () => {
    if (pickerRef.current?.showPicker) pickerRef.current.showPicker()
    else pickerRef.current?.click()
  }

  return (
    <label className="eligibility-field">
      <span>{label}{required && <b aria-hidden="true"> *</b>}</span>
      <span className="eligibility-date-input">
        <input ref={textRef} name={name} type="text" required={required} inputMode="numeric" placeholder="yyyy/mm/dd" pattern="\d{4}/\d{2}/\d{2}" title="Enter the date in yyyy/mm/dd format." maxLength="10" />
        <button type="button" onClick={openPicker} aria-label={`Open ${label} calendar`}><CalendarDays size={19} /></button>
        <input ref={pickerRef} className="eligibility-native-date" type="date" tabIndex="-1" aria-hidden="true" onChange={(event) => { if (textRef.current) textRef.current.value = event.target.value.replaceAll('-', '/') }} />
      </span>
    </label>
  )
}

const getAll = (data, name) => data.getAll(name).filter(Boolean)

const getSubmissionErrorMessage = (error) => {
  const code = error?.code || ''
  const message = error?.message?.toLowerCase() || ''

  if (code === '42P01' || code === '42501' || code === 'PGRST205' || message.includes('row-level security')) {
    return 'The submission service is temporarily unavailable. Please contact us on +94 70 767 0670.'
  }

  if (message.includes('bucket') || message.includes('storage')) {
    return 'We could not upload your documents. Please check the file type and size, then try again.'
  }

  return 'We could not submit your profile. Please try again or contact us on +94 70 767 0670.'
}

function EligibilityCheck() {
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [assessment, setAssessment] = useState(null)
  const [cvName, setCvName] = useState('')
  const [familySituation, setFamilySituation] = useState('')
  const [hasWorkExperience, setHasWorkExperience] = useState('')
  const cvInputRef = useRef(null)

  const removeCv = () => {
    if (cvInputRef.current) cvInputRef.current.value = ''
    setCvName('')
  }

  const submitForm = async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setStatus('submitting')
    setErrorMessage('')
    setAssessment(null)

    try {
      const submissionId = crypto.randomUUID()
      const files = [...data.getAll('documents'), data.get('cv')].filter((file) => file instanceof File && file.size)
      const documents = await Promise.all(files.map((file) => uploadEligibilityDocument(file, submissionId)))
      const values = Object.fromEntries([...data.entries()].filter(([, value]) => !(value instanceof File)))

      const assessmentResult = assessEligibility(data)
      await insertSubmission('eligibility_submissions', {
        submission_id: submissionId,
        full_name: values.full_name,
        email: values.email.toLowerCase(),
        phone: values.phone.trim(),
        profile: {
          ...values,
          preferred_contact: getAll(data, 'preferred_contact'),
          destinations: getAll(data, 'destinations'),
          preferred_level: getAll(data, 'preferred_level'),
          funding_sources: getAll(data, 'funding_sources'),
          supporting_documents: getAll(data, 'supporting_documents'),
        },
        document_paths: documents,
        assessment: assessmentResult,
      })
      form.reset()
      setCvName('')
      setFamilySituation('')
      setHasWorkExperience('')
      setAssessment(assessmentResult)
      setStatus('success')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      console.error('Eligibility submission failed:', error)
      setErrorMessage(getSubmissionErrorMessage(error))
      setStatus('error')
    }
  }

  return (
    <main className="eligibility-page">
      <section className="eligibility-hero">
        <div className="container eligibility-hero-inner">
          <div>
            <p className="eyebrow">Free profile assessment</p>
            <h1>Start your study abroad journey</h1>
            <p>Complete the form below and our education counsellors will review your profile and guide you on suitable destinations, universities, courses and funding options.</p>
          </div>
          <div className="eligibility-hero-note"><GraduationCap size={27} /><span><strong>Student eligibility check</strong>Personalised guidance for your next step</span></div>
        </div>
      </section>

      <section className="eligibility-content">
        <div className="container eligibility-layout">
          <aside className="eligibility-aside">
            <p>What happens next?</p>
            <ol><li>We review your profile</li><li>A counsellor contacts you</li><li>You receive suitable study options</li></ol>
            <div><ShieldCheck size={20} /><span>Your information and documents are handled securely.</span></div>
          </aside>

          <form className="eligibility-form" onSubmit={submitForm}>
            {status === 'success' && assessment && (
              <div className="assessment-modal" role="presentation">
              <section className={`assessment-result assessment-${assessment.tone}`} role="dialog" aria-modal="true">
                <button className="assessment-close" type="button" onClick={() => { setStatus('idle'); setAssessment(null) }} aria-label="Close eligibility result"><X size={21} /></button>
                <div className="assessment-heading">
                  <img className="assessment-logo" src={trinityLogo} alt="Trinity International" />
                  <div><p>Preliminary Canada eligibility result</p><h2>{assessment.label}</h2><small>This is an internal agency screening result—not an admission or visa decision.</small></div>
                  <div className="assessment-rating" aria-label={`${Math.max(1, Math.min(5, Math.round(assessment.total / 20)))} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((star) => <span className={star <= Math.max(1, Math.min(5, Math.round(assessment.total / 20))) ? 'is-filled' : ''} key={star} aria-hidden="true">★</span>)}
                  </div>
                </div>
                <div className="assessment-findings">
                  <div><h3>Profile strengths</h3>{assessment.strengths.length ? <ul>{assessment.strengths.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No clear strengths identified yet.</p>}</div>
                  <div><h3>Points to review</h3>{assessment.concerns.length ? <ul>{assessment.concerns.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No major concerns identified in this preliminary check.</p>}</div>
                </div>
                <p className="assessment-next">Your profile has been submitted. A counsellor will verify your documents, current institution requirements and current IRCC financial requirements before advising you.</p>
                <p className="assessment-disclaimer"><strong>Important:</strong> This is a system-generated preliminary result based only on the information provided and initial eligibility requirements. Do not rely on this result alone. Final eligibility depends on a detailed review by a counsellor and the relevant institution or immigration authority.</p>
              </section>
              </div>
            )}

            <section className="eligibility-section">
              <header><span>01</span><div><h2>Personal Information</h2><p>Tell us how to reach you.</p></div></header>
              <div className="eligibility-grid">
                <Field label="Full Name" name="full_name" required maxLength="100" />
                <DateField label="Date of Birth" name="date_of_birth" required />
                <Field label="Nationality" name="nationality" required maxLength="80" />
                <Field label="Current Country of Residence" name="residence_country" required maxLength="80" />
                <Field label="Mobile / WhatsApp Number" name="phone" type="tel" required minLength="5" maxLength="30" pattern="[+0-9() -]+" title="Use only numbers, spaces, +, parentheses or hyphens." />
                <Field label="Email Address" name="email" type="email" maxLength="254" />
              </div>
              <CheckboxGroup legend="Preferred Method of Contact" name="preferred_contact" options={['Phone Call', 'WhatsApp', 'Email']} />
            </section>

            <section className="eligibility-section">
              <header><span>02</span><div><h2>Educational Background</h2><p>Share your most recent qualification.</p></div></header>
              <RadioGroup legend="Highest Level of Education Completed" name="education_level" required options={['O/L / GCSE', 'A/L / High School', 'Foundation', 'Diploma', 'Higher National Diploma / HND', 'Bachelor’s Degree', 'Postgraduate Diploma', 'Master’s Degree', 'Other']} />
              <div className="eligibility-grid">
                <Field label="Qualification / Course Name" name="qualification" required maxLength="150" />
                <Field label="Institution / University" name="institution" required maxLength="150" />
                <Field label="Country of Study" name="study_country" required maxLength="80" />
                <Field label="Year of Completion" name="completion_year" type="number" min="1950" max="2040" required />
                <Field label="GPA / 4.0" name="gpa" type="number" min="0" max="4" step="0.01" required />
              </div>
              <RadioGroup legend="Current Study Status" name="study_status" required options={['Completed', 'Currently Studying', 'Awaiting Results']} />
            </section>

            <section className="eligibility-section">
              <header><span>03</span><div><h2>English Language Qualification</h2><p>Let us know where you are in the testing process.</p></div></header>
              <RadioGroup legend="Have you completed an English language test?" name="english_test_status" required options={['Yes', 'No', 'Planning to Take One']} />
              <RadioGroup legend="Test Type" name="test_type" options={['IELTS', 'PTE', 'TOEFL', 'Duolingo', 'Other', 'Not Applicable']} />
              <div className="eligibility-grid"><Field label="Overall Score" name="test_score" maxLength="30" /><Field label="Test Date" name="test_date" type="date" /></div>
            </section>

            <section className="eligibility-section">
              <header><span>04</span><div><h2>Study Abroad Preference</h2><p>Tell us what your ideal study plan looks like.</p></div></header>
              <CheckboxGroup legend="Preferred Study Destination" name="destinations" options={['United Kingdom', 'Canada', 'Australia', 'New Zealand', 'Malaysia', 'Europe', 'Other', 'Open to Recommendations']} />
              <Field label="Preferred Course / Field of Study" name="preferred_course" required maxLength="150" />
              <CheckboxGroup legend="Preferred Study Level (select all that apply)" name="preferred_level" required options={['Foundation', 'Diploma', 'Bachelor’s Degree', 'Top-Up Degree', 'Postgraduate Diploma', 'Master’s Degree', 'PhD / Research', 'Not Sure – Need Guidance']} />
            </section>

            <section className="eligibility-section">
              <header><span>05</span><div><h2>Work Experience</h2><p>Add any relevant professional experience.</p></div></header>
              <RadioGroup legend="Do you have work experience?" name="has_work_experience" required options={['Yes', 'No']} onChange={(event) => setHasWorkExperience(event.target.value)} />
              {hasWorkExperience === 'Yes' && <div className="eligibility-grid"><Field label="Current / Most Recent Job Title" name="job_title" maxLength="100" /><Field label="Company" name="company" maxLength="120" /><Field label="Total Years of Work Experience" name="work_experience_years" type="number" min="0" max="70" step="0.5" /></div>}
            </section>

            <section className="eligibility-section">
              <header><span>06</span><div><h2>Funding &amp; Budget</h2><p>Help us recommend realistic options.</p></div></header>
              <CheckboxGroup legend="How do you plan to fund your studies?" name="funding_sources" options={['Self-Funded', 'Parents / Family Sponsor', 'Education Loan', 'Scholarship', 'Employer Sponsorship', 'Other']} />
              <div className="eligibility-grid eligibility-finance-grid">
                <Field label="Liquid Funds Currently Available (LKR)" name="liquid_funds_lkr" type="number" min="0" step="10000" required />
              </div>
              <RadioGroup legend="Family situation" name="family_situation" required options={['Student alone', 'Other dependants']} onChange={(event) => setFamilySituation(event.target.value)} />
              {familySituation === 'Other dependants' && <Field label="How many dependants?" name="dependants_count" type="number" min="1" max="20" required />}
            </section>

            <section className="eligibility-section">
              <header><span>07</span><div><h2>Previous Visa History</h2><p>Previous applications help us assess your options accurately.</p></div></header>
              <RadioGroup legend="Have you previously applied for a student or visitor visa?" name="previous_visa" required options={['Yes', 'No']} />
              <RadioGroup legend="Have you had any previous visa refusals?" name="visa_refusal" required options={['Yes', 'No']} />
              <label className="eligibility-field"><span>If yes, mention the country, visa type and year</span><textarea name="visa_details" maxLength="1000" rows="3" /></label>
            </section>

            <section className="eligibility-section">
              <header><span>08</span><div><h2>Upload Your Documents</h2><p>PDF, DOC or DOCX files, up to 10 MB each.</p></div></header>
              <div className="eligibility-upload-wrap">
                <label className="eligibility-upload"><FileUp size={27} /><span><strong>Upload your latest CV / Resume (Optional)</strong><small>{cvName || 'Accepted formats: PDF / DOC / DOCX'}</small></span><input ref={cvInputRef} name="cv" type="file" accept=".pdf,.doc,.docx" onChange={(event) => setCvName(event.target.files?.[0]?.name || '')} /></label>
                {cvName && <button className="eligibility-remove-file" type="button" onClick={removeCv}>Remove CV</button>}
              </div>
              <CheckboxGroup legend="Optional supporting documents" name="supporting_documents" options={['Passport Copy', 'Academic Certificates', 'Academic Transcripts', 'English Language Test Result', 'Previous Visa Refusal Letter', 'Other Relevant Documents']} />
              <label className="eligibility-upload eligibility-upload-small"><FileUp size={22} /><span><strong>Upload supporting documents</strong><small>You may select multiple files</small></span><input name="documents" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" multiple /></label>
            </section>

            <section className="eligibility-consent">
              <h2>Consent</h2>
              <label><input type="checkbox" name="accuracy_consent" required /> <span>I confirm that the information provided above is accurate to the best of my knowledge.</span></label>
              <label><input type="checkbox" name="contact_consent" required /> <span>I agree to be contacted by an education counsellor regarding my study abroad options.</span></label>
              {status === 'error' && <p className="eligibility-error" role="alert">{errorMessage}</p>}
              <button className="eligibility-submit" type="submit" disabled={status === 'submitting'}>{status === 'submitting' ? 'Submitting your profile…' : 'Submit eligibility check'} <ArrowRight size={18} /></button>
              <small>Fields marked with * are required.</small>
            </section>
          </form>
        </div>
      </section>
    </main>
  )
}

export default EligibilityCheck
