import {
  ArrowRight, Clock3, Mail, MapPin, MessageCircle, Phone, Send, ShieldCheck,
} from 'lucide-react'
import contactStudentsHero from '../assets/images/contact-students-hero.png'
import '../styles/contact.css'

function ContactUs() {
  return (
    <main className="contact-page" id="contact">
      <section className="contact-hero">
        <img className="contact-hero-image" src={contactStudentsHero} alt="Sri Lankan students receiving friendly study guidance around a laptop" />
        <div className="container contact-hero-grid">
          <div className="contact-intro">
            <p className="contact-kicker">Get in touch</p>
            <h1>We’re Here to Help<br />You <span>Go Further</span></h1>
            <p className="contact-lede">Have questions about studying abroad, visas, or scholarships? Our team is ready to assist you at every step of your journey.</p>
          </div>
        </div>
      </section>

      <section className="container contact-form-section">
          <form className="contact-form" onSubmit={(event) => event.preventDefault()}>
            <div className="form-heading"><div><h2>Send us a message</h2><p>Fill in the form and our team will get back to you soon.</p></div><MessageCircle size={24} /></div>
            <div className="form-grid">
              <label>Full Name *<input type="text" placeholder="Enter your full name" /></label>
              <label>Email Address *<input type="email" placeholder="Enter your email" /></label>
              <label>Phone Number *<div className="phone-input"><span>🇱🇰&nbsp; +94</span><input type="tel" placeholder="Enter your phone number" /></div></label>
              <label>Subject *<select defaultValue=""><option value="" disabled>Select a subject</option><option>Course counselling</option><option>Visa assistance</option><option>Scholarships</option><option>Other</option></select></label>
              <label className="message-field">Your Message *<textarea placeholder="Write your message here..." /></label>
            </div>
            <button className="contact-submit" type="submit"><Send size={16} /> Send Message</button>
            <p className="privacy-note"><ShieldCheck size={15} /> Your information is safe with us. We respect your privacy.</p>
          </form>
      </section>

      <section className="container contact-strip">
        <div><span><Phone /></span><p><strong>Call Us</strong><b>+94 71 513 0130</b><small>Mon - Fri | 9.00 AM - 6.00 PM</small></p></div>
        <div><span><MessageCircle /></span><p><strong>WhatsApp</strong><b>Chat with us on WhatsApp</b><small>Quick replies &amp; updates</small></p></div>
        <div><span><Mail /></span><p><strong>Email Us</strong><b>info@trinityintl.lk</b><small>We’ll reply within 24hrs</small></p></div>
        <div><span><Clock3 /></span><p><strong>Office Hours</strong><b>Mon - Fri | 9.00 AM - 6.00 PM</b><small>Saturday | 9.00 AM - 1.00 PM</small></p></div>
      </section>

      <section className="container head-office" id="head-office">
        <div className="head-office-copy"><span><MapPin size={30} /></span><div><h2>Visit Our Head Office</h2><strong>Trinity International</strong><p>No. 321, Galle Road, Colombo 04,<br />Sri Lanka.</p><a href="https://maps.google.com">Get Directions <ArrowRight size={15} /></a></div></div>
        <div className="map-panel"><div className="map-roads"></div><MapPin size={39} /><p>Trinity International</p></div>
      </section>
    </main>
  )
}

export default ContactUs
