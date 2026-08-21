import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import SectionTitle from '../components/SectionTitle'

function Destination() {
  return (
    <div id="destination">
      <Navbar />
      <main className="page">
        <SectionTitle title="Study Destinations" subtitle="Explore top destinations for your academic future." />
        <p>We support students aspiring to study in the UK, Australia, Canada, USA, and Europe.</p>
      </main>
      <Footer />
    </div>
  )
}

export default Destination
