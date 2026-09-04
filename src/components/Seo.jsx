import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { destinationMap } from '../data/destinations'

const siteUrl = 'https://tihsl.com'

const pages = {
  '/': {
    title: 'Study Abroad Consultants in Sri Lanka | Trinity International',
    description: 'Trusted study abroad consultants in Colombo, Sri Lanka. Get expert university, scholarship, student visa and application guidance from Trinity International.',
  },
  '/about': {
    title: 'About Trinity International | Education Consultants Sri Lanka',
    description: 'Meet Trinity International, a trusted Sri Lankan overseas education consultancy helping students choose universities, courses and study destinations.',
  },
  '/destinations': {
    title: 'Study Abroad Destinations for Sri Lankan Students | Trinity',
    description: 'Compare popular study destinations, universities, intakes, living costs and visa basics with guidance for students from Sri Lanka.',
  },
  '/services': {
    title: 'University Application & Student Visa Guidance Sri Lanka',
    description: 'Get university application guidance, course selection, scholarship support and student visa consultation in Sri Lanka.',
  },
  '/contact': {
    title: 'Contact Trinity International | Study Abroad Consultants Colombo',
    description: 'Contact Trinity International in Colombo for personalised study abroad, university application and student visa guidance.',
  },
  '/success-stories': {
    title: 'Sri Lankan Student Success Stories | Trinity International',
    description: 'Read study abroad success stories from Sri Lankan students supported by Trinity International.',
  },
  '/findmyuni': {
    title: 'Find the Right University Abroad | FindmyUni Sri Lanka',
    description: 'Find universities and courses that match your goals, qualifications and budget with personalised guidance from Trinity International.',
  },
  '/eligibility-check': {
    title: 'Canada Student Eligibility Check | Trinity International Sri Lanka',
    description: 'Complete a free preliminary Canada study eligibility check and receive guidance from an education counsellor in Sri Lanka.',
  },
  '/privacy-policy': {
    title: 'Privacy Policy | Trinity International',
    description: 'Read how Trinity International collects, uses and protects your personal information.',
    noindex: true,
  },
  '/terms-of-service': {
    title: 'Terms of Service | Trinity International',
    description: 'Read the terms that apply when using Trinity International services and website.',
    noindex: true,
  },
}

const upsertMeta = (selector, attributes) => {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    document.head.appendChild(element)
  }
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value))
}

function Seo() {
  const { pathname } = useLocation()

  useEffect(() => {
    const destinationSlug = pathname.startsWith('/destinations/') ? pathname.split('/')[2] : null
    const destination = destinationSlug ? destinationMap[destinationSlug] : null
    const page = destination ? {
      title: `Study in ${destination.name} from Sri Lanka | Trinity International`,
      description: `Explore universities, intakes, costs and visa basics for studying in ${destination.name}. Get application guidance in Sri Lanka from Trinity International.`,
    } : pages[pathname] || pages['/destinations']
    const canonicalPath = pathname === '/' ? '' : pathname.replace(/\/$/, '')
    const canonicalUrl = `${siteUrl}${canonicalPath}`

    document.title = page.title
    upsertMeta('meta[name="description"]', { name: 'description', content: page.description })
    upsertMeta('meta[name="robots"]', { name: 'robots', content: page.noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large' })
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: page.title })
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: page.description })
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' })
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl })
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' })

    let canonical = document.head.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = canonicalUrl

    let schema = document.head.querySelector('#trinity-organization-schema')
    if (!schema) {
      schema = document.createElement('script')
      schema.type = 'application/ld+json'
      schema.id = 'trinity-organization-schema'
      document.head.appendChild(schema)
    }
    schema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': ['EducationalOrganization', 'LocalBusiness'],
      '@id': `${siteUrl}/#organization`,
      name: 'Trinity International',
      url: `${siteUrl}/`,
      logo: `${siteUrl}/trinity-logo.jpeg`,
      image: `${siteUrl}/trinity-logo.jpeg`,
      telephone: '+94 70 767 0670',
      email: 'Admin@tihsl.com',
      priceRange: '$$',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'No. 27, Layards Road',
        addressLocality: 'Colombo 05',
        addressCountry: 'LK',
      },
      areaServed: { '@type': 'Country', name: 'Sri Lanka' },
      geo: { '@type': 'GeoCoordinates', latitude: 6.8847401, longitude: 79.8621081 },
      openingHoursSpecification: [
        { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '17:30' },
        { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Saturday', opens: '09:00', closes: '13:30' },
      ],
      sameAs: [
        'https://www.facebook.com/share/1DVF7HtbED/',
        'https://www.instagram.com/studyabroad_trinity/',
        'https://www.tiktok.com/@studyabroad_trinity',
      ],
    })
  }, [pathname])

  return null
}

export default Seo
