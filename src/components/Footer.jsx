import { Camera, CirclePlay, Link as LinkIcon, Mail, MapPin, Phone } from 'lucide-react'
import logoAsset from '../assets/logo/trinity-official-logo.jpeg'
import '../styles/footer.css'

const officeMapUrl = 'https://www.google.com/maps/place/27+Layards+Rd,+Colombo+00500/@6.8847401,79.8595332,17z/data=!3m1!4b1!4m6!3m5!1s0x3ae25bc598e03331:0xfacabfeab9eb183b!8m2!3d6.8847401!4d79.8621081!16s%2Fg%2F11q8fx0dmx?entry=ttu'

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <a className="footer-logo" href="#home"><img src={logoAsset} alt="Trinity International" /></a>
          <p>Helping ambitious students from Sri Lanka find the right university, secure scholarships and arrive prepared for day one.</p>
          <div className="footer-contact"><a href="tel:+94707670670"><Phone size={15} /> +94 707670670</a><a href="mailto:Admin@tihsl.com"><Mail size={15} /> Admin@tihsl.com</a><a href={officeMapUrl} target="_blank" rel="noreferrer"><MapPin size={15} /> No. 27, Layards Road, Colombo 05, Sri Lanka</a></div>
        </div>
        <div className="footer-column"><h3>Explore</h3><a href="#services">Services</a><a href="#advisory">Destinations</a><a href="#why">Why Trinity</a><a href="#contact">Consultation</a></div>
        <div className="footer-column"><h3>Resources</h3><a href="#ai-guidance">AI Guidance</a><a href="#advisory">Study Assessment</a><a href="#contact">Contact Us</a><a href="#home">Success Stories</a></div>
        <div className="footer-column footer-social"><h3>Follow us</h3><a href="https://www.facebook.com/" target="_blank" rel="noreferrer"><span className="facebook-icon" aria-hidden="true">f</span> Facebook</a><a href="#contact"><Camera size={17} /> Instagram</a><a href="#contact"><CirclePlay size={17} /> YouTube</a><a href="#contact"><LinkIcon size={17} /> LinkedIn</a><a className="footer-button" href="mailto:Admin@tihsl.com">Book free counselling</a></div>
      </div>
      <div className="container footer-bottom"><span>&copy; 2026 Trinity International. All rights reserved.</span><span>Study abroad with confidence.</span></div>
    </footer>
  )
}

export default Footer
