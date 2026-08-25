import { useEffect, useRef, useState } from 'react'
import {
  BadgeCheck, ExternalLink, Quote, Star,
} from 'lucide-react'
import sriLankanStudentsHero from '../assets/images/success-stories-sri-lankan-students.png'
import sangeethPhoto from '../assets/images/success-stories/sangeeth-amirthanathan.png'
import niroshaMaheshanPhoto from '../assets/images/success-stories/nirosha-maheshan.png'
import imanthiPhoto from '../assets/images/success-stories/imanthi-jayakody.png'
import danuraPhoto from '../assets/images/success-stories/danura-jayakody.png'
import antaneetaPhoto from '../assets/images/success-stories/antaneeta-fernando.png'
import supunPhoto from '../assets/images/success-stories/supun-jayawardana.png'
import silunaPhoto from '../assets/images/success-stories/siluna-nimhan.png'
import kanchanaPhoto from '../assets/images/success-stories/kanchana-weerasekara.png'
import roshanPhoto from '../assets/images/success-stories/roshan-bibi.png'
import vinothanPhoto from '../assets/images/success-stories/vinothan-sundaralingam.png'
import tharshikaPhoto from '../assets/images/success-stories/tharshika-vathanakumar.png'
import jansenideviPhoto from '../assets/images/success-stories/jansenidevi-kuhanesan.png'
import devniPhoto from '../assets/images/success-stories/devni-dissanayaka.png'
import ruwaisdeenPhoto from '../assets/images/success-stories/mohamed-ruwaisdeen.png'
import genericFemaleCartoon from '../assets/images/success-stories/generic-female-cartoon.png'
import genericMaleCartoon from '../assets/images/success-stories/generic-male-cartoon.png'
import '../styles/success-stories.css'

/* Previous manually entered stories removed in favour of sourced Google reviews.
const stories = [
  { name: 'Kavin Ranawella', country: 'Australia', flag: '🇦🇺', category: 'Visa Success', avatar: director, quote: 'Awesome team at Trinity. Ramesh, Annie and others were very supportive and it was a smooth journey with them. They went above and beyond to help me with my queries, even ones that were not relevant to the visa itself.', course: 'Masters in IT', university: 'Deakin University' },
  { name: 'Mithun Mano', country: 'Canada', flag: '🇨🇦', category: 'University Placements', initials: 'MM', quote: 'From day one and even after the visa, I’m really satisfied with the timely response to all of my questions. They are knowledgeable and know what they’re doing, so it helped me select the most suitable university and program.', course: 'Masters in CS', university: 'University of Toronto' },
  { name: 'Aamidh Mohamed Jaufar', country: 'United Kingdom', flag: '🇬🇧', category: 'Visa Success', initials: 'AJ', quote: 'I really recommend all students who want to study overseas to join Trinity International. It’s the best place to apply because their work is transparent, and the team took care of all my applications and documents.', course: 'MBA', university: 'University of Birmingham' },
  { name: 'Niran Gomes', country: 'Canada', flag: '🇨🇦', category: 'Visa Success', initials: 'NG', quote: 'From my consultation to an approved student visa to Canada, the wonderful team at Trinity did absolutely fantastic regardless of the ongoing health and financial crisis. Their service is fully professional and transparent.', course: 'Diploma in Hospitality', university: 'Humber College' },
  { name: 'Dr Sindhu Mathivanan', country: 'Canada', flag: '🇨🇦', category: 'University Placements', initials: 'SM', quote: 'Trinity International, through their knowledge and experience, made our dream come true. We are in Canada now as a family. They have a very strong team and are very well coordinated.', course: 'Permanent Resident', university: 'Canada PR' },
  { name: 'Akeshia Wanigarathne', country: 'Canada', flag: '🇨🇦', category: 'Scholarship Winners', initials: 'AW', quote: 'Initially I contacted two agencies for a study visa to Canada, but I was dissatisfied with their service. Trinity helped me a lot. For the visa process, Kiyuni provided enormous support and was very kind and patient throughout.', course: 'PG Diploma', university: 'Seneca College' },
  { name: 'Sarasi', country: 'Australia', flag: '🇦🇺', category: 'Scholarship Winners', initials: 'SA', quote: 'Highly recommended, and I truly appreciate their dedicated service and prompt response towards customers. Their staff is really friendly and very attentive to our concerns, always trying to give the best they can offer.', course: 'Master of Education', university: 'University of Melbourne' },
  { name: 'Tharindu Jayasuriya', country: 'Canada', flag: '🇨🇦', category: 'University Placements', initials: 'TJ', quote: 'I heard about Trinity International from a friend, and I’m so glad I reached out. They provided personalized advice and constant follow-ups. I’m now in Toronto, studying IT at Seneca College.', course: 'Information Technology', university: 'Seneca College' },
  { name: 'Sanduni Perera', country: 'United Kingdom', flag: '🇬🇧', category: 'University Placements', initials: 'SP', quote: 'Trinity International made what felt impossible feel completely achievable. From shortlisting universities to visa prep, every step was guided. I’m now doing my MSc in Marketing.', course: 'MSc Marketing', university: 'University of Southampton' },
  { name: 'Kasun Madushanka', country: 'Australia', flag: '🇦🇺', category: 'Scholarship Winners', initials: 'KM', quote: 'The team helped me secure a partial scholarship I didn’t even know I was eligible for. My GTE statement was polished professionally and my visa was approved on the first attempt.', course: 'BE Engineering', university: 'Monash University' },
]

*/

const googleReviewsUrl = 'https://www.google.com/search?kgmid=/g/11fkt7sg82&hl=en-LK&q=Trinity+International-Study+Abroad+Education+Consultant#lrd=0x3ae259892e733193:0x11b72fcb12356351,1,,,,'

const baseGoogleReviews = [
  { name: 'Sangeeth Amirthanathan', initials: 'SA', quote: 'I am incredibly grateful to Trinity International for their excellent guidance in securing my student visa for the University of Hertfordshire in the UK. Every step of the application process was explained carefully, making it smooth.', rating: 5, date: 'A year ago' },
  { name: 'Anosha Rangalla', initials: 'AR', quote: 'Trinity did an amazing job within a short period of time for my student visa in Canada. I would like to admire Michelle from Trinity, who carefully reviewed my profile and supported me even in selecting a programme.', rating: 5, date: '2 years ago' },
  { name: 'Sachi Rodrigo', initials: 'SR', quote: 'I am writing to express my heartfelt gratitude and complete satisfaction with Trinity International and its team.', rating: 5, date: '2 years ago' },
  { name: 'Nirosha Maheshan', initials: 'NM', quote: 'I want to express my deepest gratitude for the exceptional support and guidance provided throughout my journey to obtain a UK student visa.', rating: 5, date: '2 years ago' },
  { name: 'Imanthi Jayakody', initials: 'IJ', quote: 'I am truly grateful to Trinity International, especially Kuvini, for handling my study permit process so smoothly. I came to Canada for my MBA at New York Institute of Technology, Vancouver.', rating: 5, date: '11 months ago' },
  { name: 'Danura Jayakody', initials: 'DJ', quote: 'I am incredibly grateful to the entire Trinity International team for making my Canada dream a success. The process was seamless and stress-free. Asma helped me select the right university, while Ani supported the visa process.', rating: 5, date: 'A year ago' },
  { name: 'Antaneeta Fernando', initials: 'AF', quote: 'I would like to thank the Trinity staff for supporting and guiding me throughout my journey to move to Canada. It was a smooth process working with the team.', rating: 5, date: '11 months ago' },
  { name: 'Supun Jay', initials: 'SJ', quote: 'I had the pleasure of having Trinity as my agent for my journey to Canada. Their service was exceptional from the very beginning to the successful completion of the process. The staff were professional, knowledgeable and always available.', rating: 5, date: '2 years ago' },
  { name: 'Vinothan Sundaralingam', initials: 'VS', quote: 'I completed my student visa application through Trinity International. Their efficiency shone through in the seamless handling of my application, ensuring a hassle-free process with clear and responsive support.', rating: 5, date: '2 years ago' },
  { name: 'Tharshika Vathanakumar', initials: 'TV', quote: "Trinity helped me achieve my dream and guided me towards the correct and efficient path. The staff are very friendly and always think about their clients' benefit. I received all these services for a very reasonable fee and will always be grateful.", rating: 5, date: '2 years ago' },
  { name: 'Devni Dissanayke', initials: 'DD', quote: 'I had an excellent experience with Trinity International. The entire visa process was easy and stress-free thanks to their professionalism and attention to detail. They were always available to answer my questions and guide me.', rating: 5, date: 'A year ago' },
  { name: 'Janssi Devi', initials: 'JD', quote: 'I am proud and content that I chose the perfect institution when I considered studying overseas. Trinity managed my student visa from the beginning through to submission.', rating: 5, date: 'A year ago' },
  { name: 'Siluna Nimhan', initials: 'SN', quote: 'I got to know about Trinity through a friend who had experienced their quality service. My experience was the same—it was hassle-free, as Trinity International took care of everything.', rating: 5, date: 'A year ago' },
  { name: 'Stefan Nadarajah', initials: 'SN', quote: 'Most of the experts in the field are found at Trinity. The service is straightforward and everything is detailed to the dot. All you have to do is prepare your bags and get ready to fly while Trinity takes care of the process.', rating: 5, date: 'A year ago' },
  { name: 'Ruwais Anis', initials: 'RA', quote: 'I obtained my student visa to Australia through Trinity International. It was a great experience, as the team helped me so much and made every task convenient.', rating: 5, date: '3 years ago' },
  { name: 'Krishane Wickramasinghe', initials: 'KW', quote: 'I came to Trinity because my agents at the time did not seem to work professionally. The second I first spoke with a Trinity representative, I knew I was in good hands.', rating: 5, date: '3 years ago' },
  { name: 'Kanchana Weerasekara', initials: 'KW', quote: 'I had a fantastic experience with Trinity International. They were incredibly supportive and methodical throughout the entire process, making everything run smoothly and efficiently.', rating: 5, date: 'A year ago' },
  { name: 'Roshan', initials: 'RO', quote: 'I had a very good experience with this agency for my student visa process. I had very little time to apply, and I received my visa within one week through the standard application. Ani handled my case.', rating: 4, date: '10 months ago' },
]

const studentDetails = {
  'Sangeeth Amirthanathan': { photo: sangeethPhoto, university: 'University of Hertfordshire', program: 'MSc Artificial Intelligence and Robotics', intake: 'January 2025' },
  'Anosha Rangalla': { photo: genericFemaleCartoon, generatedAvatar: true },
  'Sachi Rodrigo': { photo: genericFemaleCartoon, generatedAvatar: true },
  'Nirosha Maheshan': { photo: niroshaMaheshanPhoto, university: 'Aberystwyth University', program: 'Master of Business Administration in Project Management' },
  'Imanthi Jayakody': { displayName: 'Imanthi Chandramali Jayakody', photo: imanthiPhoto, university: 'New York Institute of Technology, Vancouver Campus', program: 'Master of Business Administration', intake: 'January 2025' },
  'Danura Jayakody': { displayName: 'Danura Ishara Jayakody', photo: danuraPhoto, university: 'University Canada West', program: 'Master of Business Administration', intake: 'September 2024' },
  'Antaneeta Fernando': { displayName: 'Antaneeta Gihani Fernando', photo: antaneetaPhoto, university: 'Seneca Polytechnic – Ontario (Seneca @York)', program: 'Sports, Entertainment and Event Marketing – Graduate Certificate' },
  'Supun Jay': { displayName: 'Supun Kaushalya Jayawardana Ovitigalage', photo: supunPhoto, university: 'Langara College', program: 'Post-Degree Diploma in Accounting', intake: 'May 2024' },
  'Siluna Nimhan': { displayName: 'Siluna Nimhan Kossinna', photo: silunaPhoto, university: 'Seneca Polytechnic College, Newnham', program: 'Postgraduate Bundle: Business Analytics and Supply Chain Management' },
  'Kanchana Weerasekara': { displayName: 'Kanchana Hemantha Weerasekara', photo: kanchanaPhoto, university: 'Unitec Institute of Technology, New Zealand', program: 'Master of Applied Business (Advanced Human Resources)', intake: 'July 2024' },
  Roshan: { displayName: 'Abdul Wahab Ayukhan Roshan Bibi', photo: roshanPhoto, university: 'University of the West of Scotland, London Campus', program: 'MSc Information Technology with Cloud Computing' },
  'Vinothan Sundaralingam': { photo: vinothanPhoto, university: 'Conestoga College', program: 'Construction Management (Postgraduate)', dli: 'O19376158572' },
  'Tharshika Vathanakumar': { photo: tharshikaPhoto },
  'Janssi Devi': { displayName: 'Jansenidevi Sundararajan Kuhanesan', photo: jansenideviPhoto, university: 'Kingston University', program: 'LLM in Law – General' },
  'Devni Dissanayke': { displayName: 'Devni Dissanayaka', photo: devniPhoto },
  'Stefan Nadarajah': { photo: genericMaleCartoon, generatedAvatar: true },
  'Krishane Wickramasinghe': { photo: genericMaleCartoon, generatedAvatar: true },
  'Ruwais Anis': { displayName: 'Mohamed Ruwaisdeen Mohamed Anisdeen', photo: ruwaisdeenPhoto, university: 'Stanley College, West Perth', program: 'Bachelor of Business – Accounting', intake: 'August 2023' },
}

const googleReviews = baseGoogleReviews
  .map((review) => ({ ...review, ...studentDetails[review.name] }))
  .sort((first, second) => (first.generatedAvatar ? 1 : 0) - (second.generatedAvatar ? 1 : 0))

function SuccessStories() {
  const [storiesVisible, setStoriesVisible] = useState(false)
  const storiesRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setStoriesVisible(true)
      observer.disconnect()
    }, { threshold: 0.08 })

    if (storiesRef.current) observer.observe(storiesRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <main className="stories-page">
      <section className="stories-hero">
        <img className="stories-hero-video" src={sriLankanStudentsHero} alt="Sri Lankan students celebrating their education success" />
        <div className="container stories-hero-inner">
          <div className="stories-copy">
            <p className="stories-breadcrumb">Home <span>›</span> Success Stories</p>
            <h1>Success Stories</h1>
            <p>From visa approvals in record time to scholarships worth thousands, our students are thriving around the world. Explore a few recent journeys below.</p>
          </div>
        </div>
      </section>

      <section ref={storiesRef} className={`container stories-content${storiesVisible ? ' stories-visible' : ''}`}>
        <div className="stories-grid">
          {/* Previous manually entered cards removed.
          {stories.map((story) => (
            <article className="story-card" key={story.name}>
              <header>
                {story.avatar ? <img src={story.avatar} alt={story.name} /> : <span className="story-initials">{story.initials}</span>}
                <div><h2>{story.name}</h2><p><img className="story-country-flag" src={storyFlags[story.country]} alt="" />{story.country}</p></div>
              </header>
              <div className="story-quote"><Quote size={19} /><p>{story.quote}</p></div>
              <footer><span><BadgeCheck size={14} /> Visa Approved</span><p><strong>{story.course}</strong><small>{story.university}</small></p></footer>
            </article>
          ))}
          */}
          {googleReviews.map((review) => (
            <article className="story-card google-review-card" key={`google-${review.name}`}>
              <header>
                {review.photo ? <img src={review.photo} alt={review.generatedAvatar ? `Cartoon profile illustration for ${review.displayName || review.name}` : `${review.displayName || review.name} success story`} /> : <span className="story-initials">{review.initials}</span>}
                <div><h2>{review.displayName || review.name}</h2><p className="google-review-source">{review.source || 'Google Review'}{review.date ? ` · ${review.date}` : ''}</p></div>
              </header>
              {review.rating && <div className="google-review-stars" aria-label={`${review.rating} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map((star) => <Star key={star} size={18} fill={star <= review.rating ? 'currentColor' : 'none'} />)}
              </div>}
              {review.quote && <div className="story-quote"><Quote size={19} /><p>{review.quote}</p></div>}
              {(review.university || review.program || review.intake || review.dli) && <dl className="story-study-details">
                {review.university && <div><dt>University</dt><dd>{review.university}</dd></div>}
                {review.program && <div><dt>Programme</dt><dd>{review.program}</dd></div>}
                {review.intake && <div><dt>Intake</dt><dd>{review.intake}</dd></div>}
                {review.dli && <div><dt>DLI</dt><dd>{review.dli}</dd></div>}
              </dl>}
              <footer>
                <span><BadgeCheck size={14} /> {review.source || 'Google Review'}</span>
                {!review.source && <a href={googleReviewsUrl} target="_blank" rel="noreferrer">View on Google <ExternalLink size={14} /></a>}
              </footer>
            </article>
          ))}
        </div>
      </section>

    </main>
  )
}

export default SuccessStories
