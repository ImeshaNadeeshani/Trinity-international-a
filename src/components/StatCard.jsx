import { useEffect, useRef, useState } from 'react'
import { TrendingUp } from 'lucide-react'

function StatCard({ value, label, icon: Icon }) {
  const cardRef = useRef(null)
  const hasCounted = useRef(false)
  const [displayValue, setDisplayValue] = useState('0')

  useEffect(() => {
    const target = Number(value.replace(/[^0-9.]/g, ''))
    const suffix = value.includes('%') ? '%' : value.includes('+') ? '+' : ''
    const useSeparator = value.includes(',')
    const decimalPlaces = value.includes('.') ? value.split('.')[1].replace(/[^0-9]/g, '').length : 0
    let animationFrame

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || hasCounted.current) return
      hasCounted.current = true

      const startTime = performance.now()
      const duration = 1700
      const animate = (time) => {
        const progress = Math.min((time - startTime) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        const current = target * eased
        const formatted = current.toLocaleString('en-US', {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
          useGrouping: useSeparator,
        })
        setDisplayValue(`${formatted}${suffix}`)
        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate)
        } else {
          setDisplayValue(value)
        }
      }

      animationFrame = requestAnimationFrame(animate)
      observer.disconnect()
    }, { threshold: 0.45 })

    if (cardRef.current) observer.observe(cardRef.current)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(animationFrame)
    }
  }, [value])

  return (
    <article className="stat-card" ref={cardRef} aria-label={`${value} ${label}`}>
      <span className="stat-icon"><Icon size={25} strokeWidth={2.2} /></span>
      <div className="stat-content">
        <span className="stat-value-row"><strong aria-hidden="true">{displayValue}</strong><span className="stat-trend" aria-hidden="true"><TrendingUp size={15} /></span></span>
        <p>{label}</p>
      </div>
    </article>
  )
}

export default StatCard
