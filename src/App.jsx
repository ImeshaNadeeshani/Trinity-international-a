import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import WhatsAppChat from './components/WhatsAppChat'
import Home from './pages/Home'
import About from './pages/About'
import Destinations from './pages/Destinations'
import DestinationCountry from './pages/DestinationCountry'
import ContactUs from './pages/ContactUs'
import SuccessStories from './pages/SuccessStories'
import FindMyUni from './pages/FindMyUni'
import './styles/global.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/destinations" element={<Destinations />} />
          <Route path="/destinations/:countrySlug" element={<DestinationCountry />} />
          <Route path="/services" element={<Home />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/success-stories" element={<SuccessStories />} />
          <Route path="/findmyuni" element={<FindMyUni />} />
          <Route path="*" element={<Destinations />} />
        </Routes>
        <Footer />
        <WhatsAppChat />
      </div>
    </BrowserRouter>
  )
}

export default App
