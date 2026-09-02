import { Camera, Mail, MapPin, Music2, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import logoAsset from '../assets/logo/trinity-official-logo.jpeg'
import '../styles/footer.css'

const officeMapUrl = 'https://www.google.com/maps/place/27+Layards+Rd,+Colombo+00500/@6.8847401,79.8595332,17z/data=!3m1!4b1!4m6!3m5!1s0x3ae25bc598e03331:0xfacabfeab9eb183b!8m2!3d6.8847401!4d79.8621081!16s%2Fg%2F11q8fx0dmx?entry=ttu'

function Footer({ onBookConsultation }) {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link className="footer-logo" to="/" aria-label="Trinity International home"><img src={logoAsset} alt="Trinity International" /></Link>
          <p>Helping ambitious students from Sri Lanka find the right university, secure scholarships and arrive prepared for day one.</p>
          <div className="footer-contact"><a href="tel:+94707670670"><Phone size={15} /> +94 707670670</a><a href="mailto:Admin@tihsl.com"><Mail size={15} /> Admin@tihsl.com</a><a href={officeMapUrl} target="_blank" rel="noreferrer"><MapPin size={15} /> No. 27, Layards Road, Colombo 05, Sri Lanka</a></div>
        </div>
        <div className="footer-column">
          <h3>Explore</h3>
          <Link to="/">Home</Link>
          <Link to="/about">About Trinity</Link>
          <Link to="/destinations">Study Destinations</Link>
          <Link to="/success-stories">Success Stories</Link>
        </div>
        <div className="footer-column">
          <h3>Student Support</h3>
          <Link to="/findmyuni">FindmyUni</Link>
          <Link to="/contact">Contact Us</Link>
          <button className="footer-link-button" type="button" onClick={onBookConsultation}>Free Consultation</button>
          <a href="https://wa.me/94707670670?text=Hello%20Trinity%20International%2C%20I%20would%20like%20to%20get%20more%20information." target="_blank" rel="noreferrer">WhatsApp Support</a>
        </div>
        <div className="footer-column footer-social"><h3>Follow us</h3><a href="https://www.facebook.com/share/1DVF7HtbED/?mibextid=wwXIfr" target="_blank" rel="noreferrer"><span className="facebook-icon" aria-hidden="true">f</span> Facebook</a><a href="https://www.instagram.com/studyabroad_trinity?igsi=dDI5Y3J4ODR0cWlt" target="_blank" rel="noreferrer"><Camera size={17} /> Instagram</a><a href="https://www.tiktok.com/@studyabroad_trinity?_r=1&_t=ZS-99Ah96gn8Fw" target="_blank" rel="noreferrer"><Music2 size={17} /> TikTok</a><button className="footer-button" type="button" onClick={onBookConsultation}>Book free counselling</button></div>
      </div>
      <div className="container footer-bottom">
        <span>&copy; 2026 Trinity International. All rights reserved.</span>
        <nav className="footer-legal" aria-label="Legal"><Link to="/privacy-policy">Privacy Policy</Link><Link to="/terms-of-service">Terms of Service</Link></nav>
      </div>
    </footer>
  )
}

export default Footer
