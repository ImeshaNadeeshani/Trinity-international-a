import { lazy, Suspense, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
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
const StudentPortal = lazy(() => import('./pages/StudentPortal'))
const StudentPortalPreview = lazy(() => import('./pages/StudentPortalPreview'))
const DevelopmentPlan = lazy(() => import('./pages/DevelopmentPlan'))

function App() {
  return <BrowserRouter><AppShell /></BrowserRouter>
}

function AppShell() {
  const [consultationOpen, setConsultationOpen] = useState(false)
  const location = useLocation()
  const isPortal = location.pathname.startsWith('/student-portal') || location.pathname === '/staff-portal' || location.pathname === '/document-verification'

  return (
      <div className="app">
        <Seo />
        {!isPortal && <Navbar onBookConsultation={() => setConsultationOpen(true)} />}
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
          <Route path="/student-portal" element={<StudentPortal />} />
          <Route path="/student-portal/preview" element={<StudentPortalPreview />} />
          <Route path="/document-verification" element={<StudentPortal defaultView="documents" />} />
          <Route path="/development-plan" element={<DevelopmentPlan />} />
          <Route path="/staff-portal" element={<StudentPortal staffMode />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsAndConditions />} />
          <Route path="/terms-and-conditions" element={<Navigate to="/terms-of-service" replace />} />
          <Route path="*" element={<Navigate to="/destinations" replace />} />
        </Routes></Suspense>
        {!isPortal && <Footer onBookConsultation={() => setConsultationOpen(true)} />}
        {!isPortal && <WhatsAppChat />}
        {!isPortal && consultationOpen && <ConsultationModal onClose={() => setConsultationOpen(false)} />}
      </div>
  )
}

export default App
