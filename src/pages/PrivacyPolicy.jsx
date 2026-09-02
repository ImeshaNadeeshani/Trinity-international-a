import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import '../styles/legal.css'

function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <main className="legal-page">
      <header className="legal-hero">
        <div className="container legal-hero-inner">
          <p className="legal-kicker">Your privacy matters</p>
          <h1>Privacy Policy</h1>
          <p>This policy explains how Trinity International collects, uses, stores and protects personal information received through this website.</p>
          <small>Last updated: 2 September 2026</small>
        </div>
      </header>

      <div className="container legal-layout">
        <aside className="legal-summary">
          <h2>At a glance</h2>
          <p>We collect only the information needed to respond to enquiries and provide education, migration, visa and related consultation services.</p>
          <a href="mailto:Admin@tihsl.com">Admin@tihsl.com</a>
          <a href="tel:+94707670670">+94 707670670</a>
        </aside>

        <article className="legal-content">
          <section>
            <h2>1. Who we are</h2>
            <p>Trinity International operates this website and is responsible for the personal information submitted through it. Our office is at No. 27, Layards Road, Colombo 05, Sri Lanka.</p>
          </section>

          <section>
            <h2>2. Information we collect</h2>
            <p>When you contact us, we may collect your name, email address, telephone number, enquiry subject and message.</p>
            <p>When you request a consultation, we may also collect your age, preferred destination and service, education history, IELTS information, field of interest, applicant profile and any additional details you choose to provide.</p>
            <p>Our hosting and security providers may process limited technical information such as IP address, browser type, device information, timestamps and error or security logs.</p>
          </section>

          <section>
            <h2>3. How we use your information</h2>
            <ul>
              <li>To respond to enquiries and arrange consultations.</li>
              <li>To assess study, migration, travel or visa service requirements.</li>
              <li>To communicate about services you have requested.</li>
              <li>To maintain service records, prevent misuse and protect the website.</li>
              <li>To comply with applicable legal and regulatory obligations.</li>
            </ul>
            <p>We do not sell your personal information.</p>
          </section>

          <section>
            <h2>4. Why we process information</h2>
            <p>Depending on the interaction, we process information because you asked us to take steps or provide a service, because you gave consent, because processing is reasonably necessary to operate and secure our services, or because the law requires it. You may withdraw consent for future processing where consent is the basis used.</p>
          </section>

          <section>
            <h2>5. Service providers and third parties</h2>
            <p>Website form information is stored using Supabase, our managed database provider. We may use communications, hosting and professional service providers where necessary to operate our services. Access is limited to the purpose for which the provider is engaged.</p>
            <p>This website also links to WhatsApp, Google Maps, Facebook, Instagram and TikTok. When you follow an external link, that provider processes information under its own privacy policy. Universities, education providers, government authorities or other parties receive your information only when required for a requested service and with an appropriate basis or authorization.</p>
          </section>

          <section>
            <h2>6. International processing</h2>
            <p>Some technology providers may store or process information outside Sri Lanka. Where applicable, we take reasonable steps to use reputable providers and safeguards appropriate to the information and the services being delivered.</p>
          </section>

          <section>
            <h2>7. Retention</h2>
            <p>Unconverted website enquiries are generally retained for no longer than 24 months after the last meaningful interaction. If you become a client, relevant records may be retained longer where needed for the service, dispute handling, professional requirements or applicable law. Information is deleted or anonymised when it is no longer reasonably required.</p>
          </section>

          <section>
            <h2>8. Your choices and rights</h2>
            <p>Subject to applicable law, you may ask whether we hold your information and request access, correction, deletion or restriction. You may also object to certain processing or withdraw consent. We may need to verify your identity and may retain information where the law or an ongoing contractual requirement permits or requires it.</p>
            <p>Send requests to <a href="mailto:Admin@tihsl.com">Admin@tihsl.com</a>. You may also contact the Data Protection Authority of Sri Lanka where a statutory complaint right applies.</p>
          </section>

          <section>
            <h2>9. Security</h2>
            <p>We use reasonable administrative and technical safeguards, including access controls and database security policies. No internet transmission or storage system can be guaranteed completely secure, so please avoid sending unnecessary sensitive information through free-text fields.</p>
          </section>

          <section>
            <h2>10. Young users</h2>
            <p>Our consultation form accepts applicants aged 15 and above. If you are under 18, please involve a parent or legal guardian before providing extensive personal information or entering into a paid service.</p>
          </section>

          <section>
            <h2>11. Updates and contact</h2>
            <p>We may update this policy when our services, providers or legal obligations change. The latest version and update date will appear on this page.</p>
            <p>Questions can be sent to <a href="mailto:Admin@tihsl.com">Admin@tihsl.com</a>, or by post to Trinity International, No. 27, Layards Road, Colombo 05, Sri Lanka.</p>
          </section>

          <div className="legal-related">Please also read our <Link to="/terms-of-service">Terms of Service</Link>.</div>
        </article>
      </div>
    </main>
  )
}

export default PrivacyPolicy
