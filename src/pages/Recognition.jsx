import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import SectionTitle from '../components/SectionTitle'

function Recognition() {
  return (
    <div id="recognition">
      <Navbar />
      <main className="page">
        <SectionTitle title="Recognition" subtitle="Trusted by students, families, and institutions." />
        <p>Our work is recognized through successful placements, long-term partnerships, and continuing referrals.</p>
      </main>
      <Footer />
    </div>
  )
}

export default Recognition
