import {
  Clock3, Globe2, Mail, MapPin, Phone, Send,
} from 'lucide-react'
import '../styles/contact.css'

const mapUrl = 'https://www.google.com/maps/place/27+Layards+Rd,+Colombo+00500/@6.8847401,79.8595332,17z/data=!3m1!4b1!4m6!3m5!1s0x3ae25bc598e03331:0xfacabfeab9eb183b!8m2!3d6.8847401!4d79.8621081!16s%2Fg%2F11q8fx0dmx?entry=ttu'

const contactDetails = [
  { icon: MapPin, title: 'Our Office', content: <>No. 27, Leyards Road,<br />Colombo 05, Sri Lanka</> },
  { icon: Phone, title: 'Phone Number', content: <a href="tel:+94715130130">+94 71 513 0130</a> },
  { icon: Mail, title: 'Email Address', content: <a href="mailto:info@trinityintl.lk">info@trinityintl.lk</a> },
  { icon: Globe2, title: 'Web Presence', content: <a href="https://trinityintl.lk" target="_blank" rel="noreferrer">www.trinityintl.lk</a> },
  { icon: Clock3, title: 'Office Hours', content: <>Mon–Fri: 9.00 AM–6.00 PM<br />Sat: 9.00 AM–1.00 PM</> },
]

function ContactUs() {
  return (
    <main className="contact-page" id="contact">
      <section className="contact-main-section">
        <div className="container contact-page-heading">
          <p>Get in touch</p>
          <h1>Contact <span>Trinity International</span></h1>
          <small>Our friendly team is ready to guide your international education journey.</small>
        </div>

        <div className="container contact-layout">
          <aside className="contact-info-card">
            <h2>Contact Information</h2>
            <div className="contact-detail-list">
              {contactDetails.map(({ icon: Icon, title, content }) => (
                <div className="contact-detail" key={title}>
                  <span><Icon size={23} /></span>
                  <div><h3>{title}</h3><p>{content}</p></div>
                </div>
              ))}
            </div>
          </aside>

          <form className="contact-form" onSubmit={(event) => event.preventDefault()}>
            <div className="form-heading">
              <h2>Send Us a Message</h2>
              <p>Fill in the details below, and a Trinity International representative will get back to you soon.</p>
            </div>
            <div className="form-grid">
              <label className="full-field">Your Name<input type="text" placeholder="John Doe" /></label>
              <label>Email Address<input type="email" placeholder="john@example.com" /></label>
              <label>Phone Number<input type="tel" placeholder="+94 77 123 4567" /></label>
              <label className="full-field">Subject<select defaultValue=""><option value="" disabled>Select a subject</option><option>Course counselling</option><option>Visa assistance</option><option>Scholarships</option><option>Other</option></select></label>
              <label className="full-field">Your Message<textarea placeholder="How can we help with your study journey?" /></label>
            </div>
            <button className="contact-submit" type="submit">Send Message <Send size={18} /></button>
          </form>
        </div>
      </section>

      <section className="contact-location-section" id="head-office">
        <div className="container location-heading">
          <p>Find us</p>
          <h2>Our <span>Location</span></h2>
          <a href={mapUrl} target="_blank" rel="noreferrer">No. 27, Leyards Road, Colombo 05, Sri Lanka</a>
        </div>
        <div className="container map-panel">
          <iframe
            title="Trinity International at No. 27 Leyards Road, Colombo 05"
            src="https://www.google.com/maps?q=6.8847401,79.8621081&z=17&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </section>
    </main>
  )
}

export default ContactUs
