import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import '../styles/legal.css'

function TermsAndConditions() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <main className="legal-page">
      <header className="legal-hero">
        <div className="container legal-hero-inner">
          <p className="legal-kicker">Using our website</p>
          <h1>Terms of Service</h1>
          <p>These terms apply when you access the Trinity International website or submit an enquiry through it.</p>
          <small>Last updated: 2 September 2026</small>
        </div>
      </header>

      <div className="container legal-layout">
        <aside className="legal-summary">
          <h2>Important</h2>
          <p>Website information is general guidance. Admission, scholarships, visas and migration outcomes are decided by the relevant institutions and authorities.</p>
          <Link to="/contact">Contact Trinity</Link>
        </aside>

        <article className="legal-content">
          <section>
            <h2>1. Acceptance of these terms</h2>
            <p>By using this website, you agree to these Terms of Service and our Privacy Policy. If you do not agree, please stop using the website. Additional written terms may apply if you purchase or formally engage us for a service; those specific terms will take priority where they conflict with these website terms.</p>
          </section>

          <section>
            <h2>2. About Trinity International</h2>
            <p>Trinity International provides information and support relating to international education, study destinations, applications, migration pathways, travel and business visas, and local university discovery through FindmyUni. Website availability and service scope may change.</p>
          </section>

          <section>
            <h2>3. General information, not a guarantee</h2>
            <p>Content on this website is provided for general information and initial guidance. Requirements, fees, course availability, immigration rules and decision criteria can change without notice. You should obtain advice based on your individual circumstances before acting.</p>
            <p>Trinity International does not control and cannot guarantee admission, scholarship, visa, migration, employment or other decisions made by universities, education providers, embassies, immigration departments or government authorities.</p>
          </section>

          <section>
            <h2>4. Your responsibilities</h2>
            <ul>
              <li>Provide information and documents that are accurate, complete and authentic.</li>
              <li>Review application details and meet relevant deadlines.</li>
              <li>Inform us promptly when your circumstances or contact details change.</li>
              <li>Obtain independent legal, financial, tax or immigration advice where appropriate.</li>
              <li>Do not misuse the website, attempt unauthorized access or submit harmful material.</li>
            </ul>
            <p>You remain responsible for final decisions and for verifying official requirements with the relevant institution or authority.</p>
          </section>

          <section>
            <h2>5. Enquiries and consultations</h2>
            <p>Submitting a contact or consultation form does not create a client relationship, reserve a place, guarantee eligibility or require Trinity International to accept an engagement. A service relationship begins only when its scope, fees and applicable terms are confirmed.</p>
          </section>

          <section>
            <h2>6. Fees and third-party costs</h2>
            <p>Any Trinity International service fees will be communicated separately before a paid engagement. University fees, application charges, government fees, medical examinations, translations, courier costs and other third-party expenses are separate unless expressly confirmed in writing. Third-party charges and refund rules are controlled by the relevant provider.</p>
          </section>

          <section>
            <h2>7. Website content and intellectual property</h2>
            <p>Unless stated otherwise, the website design, text, graphics, logos and original materials belong to Trinity International or are used with permission. You may view and print limited content for personal, non-commercial use. You must not reproduce, modify, publish or commercially exploit it without permission.</p>
          </section>

          <section>
            <h2>8. Third-party services and links</h2>
            <p>Links to universities, Google Maps, WhatsApp and social platforms are provided for convenience. Trinity International does not control third-party websites, availability, security, content or policies and is not responsible for transactions or interactions conducted directly with them.</p>
          </section>

          <section>
            <h2>9. Website availability and liability</h2>
            <p>We aim to keep information accurate and the website available, but do not promise uninterrupted, error-free or completely secure access. To the maximum extent permitted by applicable law, Trinity International is not responsible for indirect or consequential loss arising solely from reliance on general website content, third-party services or circumstances outside our reasonable control.</p>
            <p>Nothing in these terms excludes or limits liability that cannot lawfully be excluded or limits any mandatory consumer right.</p>
          </section>

          <section>
            <h2>10. Privacy</h2>
            <p>Our <Link to="/privacy-policy">Privacy Policy</Link> explains how information submitted through this website is handled. Do not submit another person&apos;s information unless you have authority to do so.</p>
          </section>

          <section>
            <h2>11. Changes, governing law and contact</h2>
            <p>We may update these terms by publishing a revised version on this page. These website terms are governed by the laws of Sri Lanka, and disputes are subject to the jurisdiction of the competent courts of Sri Lanka, unless mandatory law requires otherwise.</p>
            <p>Questions can be sent to <a href="mailto:Admin@tihsl.com">Admin@tihsl.com</a>, or by post to Trinity International, No. 27, Layards Road, Colombo 05, Sri Lanka.</p>
          </section>

          <div className="legal-related">Read how we handle information in our <Link to="/privacy-policy">Privacy Policy</Link>.</div>
        </article>
      </div>
    </main>
  )
}

export default TermsAndConditions
