import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

interface Props {
  count: number
}

export default function ErrorBombs({ count }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const xRefs = useRef<(HTMLDivElement | null)[]>([])
  const prev = useRef(count)

  useEffect(() => {
    if (count > prev.current && containerRef.current) {
      const newest = xRefs.current[count - 1]
      if (newest) {
        gsap.fromTo(
          newest,
          { scale: 3, opacity: 0, rotate: -25 },
          { scale: 1, opacity: 1, rotate: 0, duration: 0.5, ease: 'back.out(2)' }
        )
      }
      gsap.fromTo(
        containerRef.current,
        { x: -25 },
        { x: 0, duration: 0.45, ease: 'elastic.out(1, 0.3)' }
      )
      gsap.fromTo(
        containerRef.current,
        { backgroundColor: 'rgba(220,38,38,0.55)' },
        { backgroundColor: 'rgba(0,0,0,0)', duration: 0.7 }
      )
    }
    prev.current = count
  }, [count])

  return (
    <div
      ref={containerRef}
      className="h-full flex items-center justify-center gap-10 md:gap-16 rounded-2xl"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          ref={(el) => (xRefs.current[i] = el)}
          className={`font-display leading-none ${i < count ? 'x-active' : 'x-empty'}`}
          style={{ fontSize: 'clamp(2.5rem, 10vh, 8rem)' }}
        >
          ✗
        </div>
      ))}
    </div>
  )
}
