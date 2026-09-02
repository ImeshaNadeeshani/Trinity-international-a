import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, X } from 'lucide-react'
import { insertSubmission } from '../lib/supabase'

function ConsultationModal({ onClose }) {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const submitForm = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setErrorMessage('')

    const data = new FormData(event.currentTarget)

    try {
      await insertSubmission('consultation_requests', {
        name: data.get('name').trim(),
        phone: data.get('phone').trim(),
        email: data.get('email').trim().toLowerCase(),
        age: Number(data.get('age')),
        destination: data.get('destination'),
        education: data.get('education').trim(),
        ielts: data.get('ielts').trim(),
        service: data.get('service'),
        interest: data.get('interest'),
        profile: data.get('profile'),
        message: data.get('message').trim() || null,
      })
      setSubmitted(true)
    } catch (error) {
      console.error('Consultation submission failed:', error)
      setErrorMessage('We could not save your request. Please try again or call us directly.')
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div className="consultation-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="consultation-modal" role="dialog" aria-modal="true" aria-labelledby="consultation-title">
        <button className="consultation-close" type="button" onClick={onClose} aria-label="Close consultation form"><X size={22} /></button>
        {submitted ? (
          <div className="consultation-success">
            <span>✓</span>
            <p className="eyebrow">Request received</p>
            <h2>Thank you for connecting with Trinity.</h2>
            <p>Our consultation team will contact you shortly.</p>
            <button className="button button-primary" type="button" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <p className="consultation-kicker">Let&apos;s Connect</p>
            <h2 id="consultation-title">Book a FREE Consultation</h2>
            <p className="consultation-intro">Complete the form below and our team will get back to you shortly.</p>
            <form className="consultation-form" onSubmit={submitForm}>
              <label className="form-field form-field-wide"><span>Your name</span><input name="name" type="text" placeholder="Your Name" autoFocus required /></label>
              <label className="form-field"><span>Phone number</span><input name="phone" type="tel" placeholder="Your Phone" required /></label>
              <label className="form-field"><span>Email address</span><input name="email" type="email" placeholder="Your Email" required /></label>
              <label className="form-field"><span>Age *</span><input name="age" type="number" min="15" max="100" placeholder="Enter your age" required /></label>
              <label className="form-field"><span>Destination *</span><select name="destination" defaultValue="" required><option value="" disabled>Select your destination</option><option>Australia</option><option>Canada</option><option>United Kingdom</option><option>USA</option><option>Ireland</option><option>New Zealand</option><option>Singapore</option><option>Malaysia</option></select></label>
              <label className="form-field"><span>Last Highest Education *</span><input name="education" type="text" placeholder="Enter your highest qualification" required /></label>
              <label className="form-field"><span>IELTS Score *</span><input name="ielts" type="text" placeholder="Enter your IELTS score" required /></label>
              <label className="form-field"><span>Preferred Service</span><select name="service" defaultValue="" required><option value="" disabled>Click and select</option><option>FindmyUni</option><option>Study Abroad Advisory</option><option>Migration Advisory</option><option>Travel &amp; Business Visa</option></select></label>
              <label className="form-field"><span>Field of Interest</span><select name="interest" defaultValue="" required><option value="" disabled>Click and select</option><option>Business &amp; Management</option><option>Computing &amp; IT</option><option>Engineering</option><option>Health Sciences</option><option>Hospitality &amp; Tourism</option><option>Other</option></select></label>
              <label className="form-field"><span>Which Best Describes You?</span><select name="profile" defaultValue="" required><option value="" disabled>Click and select</option><option>School Leaver</option><option>Foundation Level</option><option>HND</option><option>Bachelor&apos;s (3 Years)</option><option>Bachelor&apos;s Honours (4 Years)</option><option>Master&apos;s (1 Year)</option><option>Master&apos;s (2 Years)</option></select></label>
              <label className="form-field form-field-wide"><span>Message</span><textarea name="message" rows="4" placeholder="Tell us more" /></label>
              {errorMessage && <p className="consultation-error" role="alert">{errorMessage}</p>}
              <button className="consultation-submit" type="submit" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Book My Consultation'} <ArrowRight size={18} />
              </button>
            </form>
          </>
        )}
      </section>
    </div>,
    document.body,
  )
}

export default ConsultationModal
