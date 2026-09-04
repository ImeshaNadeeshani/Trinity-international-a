import { lazy, Suspense, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ConsultationModal from './components/ConsultationModal'
import WhatsAppChat from './components/WhatsAppChat'
import Seo from './components/Seo'
import './styles/global.css'

const Home = lazy(() => import('./pages/Home'))
const About = lazy(() => import('./pages/About'))
const Destinations = lazy(() => import('./pages/Destinations'))
const DestinationCountry = lazy(() => import('./pages/DestinationCountry'))
const ContactUs = lazy(() => import('./pages/ContactUs'))
const SuccessStories = lazy(() => import('./pages/SuccessStories'))
const FindMyUni = lazy(() => import('./pages/FindMyUni'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const TermsAndConditions = lazy(() => import('./pages/TermsAndConditions'))
const EligibilityCheck = lazy(() => import('./pages/EligibilityCheck'))

function App() {
  const [consultationOpen, setConsultationOpen] = useState(false)

  return (
    <BrowserRouter>
      <div className="app">
        <Seo />
        <Navbar onBookConsultation={() => setConsultationOpen(true)} />
        <Suspense fallback={<main className="route-loading" aria-label="Loading page" />}><Routes>
          <Route path="/" element={<Home onBookConsultation={() => setConsultationOpen(true)} />} />
          <Route path="/about" element={<About />} />
          <Route path="/destinations" element={<Destinations />} />
          <Route path="/destinations/:countrySlug" element={<DestinationCountry />} />
          <Route path="/services" element={<Home onBookConsultation={() => setConsultationOpen(true)} />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/contact-us" element={<Navigate to="/contact" replace />} />
          <Route path="/success-stories" element={<SuccessStories />} />
          <Route path="/findmyuni" element={<FindMyUni />} />
          <Route path="/eligibility-check" element={<EligibilityCheck />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsAndConditions />} />
          <Route path="/terms-and-conditions" element={<Navigate to="/terms-of-service" replace />} />
          <Route path="*" element={<Navigate to="/destinations" replace />} />
        </Routes></Suspense>
        <Footer onBookConsultation={() => setConsultationOpen(true)} />
        <WhatsAppChat />
        {consultationOpen && <ConsultationModal onClose={() => setConsultationOpen(false)} />}
      </div>
    </BrowserRouter>
  )
}

export default App
