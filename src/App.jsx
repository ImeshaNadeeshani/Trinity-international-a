import { useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ConsultationModal from './components/ConsultationModal'
import WhatsAppChat from './components/WhatsAppChat'
import Home from './pages/Home'
import About from './pages/About'
import Destinations from './pages/Destinations'
import DestinationCountry from './pages/DestinationCountry'
import ContactUs from './pages/ContactUs'
import SuccessStories from './pages/SuccessStories'
import FindMyUni from './pages/FindMyUni'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsAndConditions from './pages/TermsAndConditions'
import './styles/global.css'

function App() {
  const [consultationOpen, setConsultationOpen] = useState(false)

  return (
    <BrowserRouter>
      <div className="app">
        <Navbar onBookConsultation={() => setConsultationOpen(true)} />
        <Routes>
          <Route path="/" element={<Home onBookConsultation={() => setConsultationOpen(true)} />} />
          <Route path="/about" element={<About />} />
          <Route path="/destinations" element={<Destinations />} />
          <Route path="/destinations/:countrySlug" element={<DestinationCountry />} />
          <Route path="/services" element={<Home onBookConsultation={() => setConsultationOpen(true)} />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/contact-us" element={<ContactUs />} />
          <Route path="/success-stories" element={<SuccessStories />} />
          <Route path="/findmyuni" element={<FindMyUni />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsAndConditions />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="*" element={<Destinations />} />
        </Routes>
        <Footer onBookConsultation={() => setConsultationOpen(true)} />
        <WhatsAppChat />
        {consultationOpen && <ConsultationModal onClose={() => setConsultationOpen(false)} />}
      </div>
    </BrowserRouter>
  )
}

export default App
