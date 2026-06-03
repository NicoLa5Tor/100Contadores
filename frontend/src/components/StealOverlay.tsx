import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

interface Props {
  active: boolean
  stealingTeamName: string
}

export default function StealOverlay({ active, stealingTeamName }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!overlayRef.current) return
    if (active) {
      gsap.fromTo(
        overlayRef.current,
        { y: '-100%', opacity: 0 },
        { y: '0%', opacity: 1, duration: 0.6, ease: 'power3.out' }
      )
      if (titleRef.current) {
        gsap.fromTo(
          titleRef.current,
          { scale: 0.5, rotate: -8 },
          { scale: 1, rotate: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)', delay: 0.2 }
        )
      }
    } else {
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.3 })
    }
  }, [active])

  if (!active) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
      style={{
        background:
          'radial-gradient(circle at center, rgba(220,38,38,0.95) 0%, rgba(80,5,5,0.96) 70%, rgba(0,0,0,0.97) 100%)',
      }}
    >
      <div className="absolute inset-0 opacity-30"
           style={{
             background: 'repeating-linear-gradient(45deg, transparent 0 30px, rgba(255,255,255,0.05) 30px 60px)'
           }}
      />
      <div
        ref={titleRef}
        className="font-display text-8xl md:text-[12rem] title-glow drop-shadow-2xl"
        style={{ textShadow: '0 0 60px rgba(244,196,48,0.8)' }}
      >
        ⚠ ROBO ⚠
      </div>
      <div className="font-display text-4xl md:text-7xl mt-4 uppercase text-white drop-shadow-[0_0_20px_rgba(0,0,0,0.9)]">
        Turno: <span className="text-gold">{stealingTeamName}</span>
      </div>
    </div>
  )
}
