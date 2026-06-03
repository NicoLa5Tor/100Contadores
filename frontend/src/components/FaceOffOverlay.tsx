import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

interface Props {
  active: boolean
  teamAName: string
  teamBName: string
}

export default function FaceOffOverlay({ active, teamAName, teamBName }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const vsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!overlayRef.current) return
    if (active) {
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: 'power2.out' }
      )
      if (titleRef.current) {
        gsap.fromTo(
          titleRef.current,
          { scale: 0.4, y: -40 },
          { scale: 1, y: 0, duration: 0.7, ease: 'back.out(2)' }
        )
      }
      if (vsRef.current) {
        gsap.fromTo(
          vsRef.current,
          { scale: 0, rotate: -180 },
          { scale: 1, rotate: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)', delay: 0.3 }
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
      className="fixed inset-0 z-40 flex flex-col items-center justify-center pointer-events-none"
      style={{
        background:
          'radial-gradient(circle at center, rgba(10,18,48,0.97) 0%, rgba(0,0,0,0.97) 100%)',
      }}
    >
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background:
            'repeating-linear-gradient(45deg, transparent 0 40px, rgba(244,196,48,0.08) 40px 80px)',
        }}
      />

      <div
        ref={titleRef}
        className="font-display title-glow leading-none"
        style={{ fontSize: 'clamp(3rem, 12vh, 11rem)' }}
      >
        🥊 CARA A CARA 🥊
      </div>

      <div className="flex items-center justify-center gap-8 md:gap-16 mt-10 w-full max-w-5xl px-6">
        <div className="flex-1 text-right">
          <div
            className="font-display text-blue-300 leading-none uppercase tracking-wider drop-shadow-[0_0_30px_rgba(59,130,246,0.7)]"
            style={{ fontSize: 'clamp(1.5rem, 6vh, 5rem)' }}
          >
            {teamAName}
          </div>
        </div>
        <div
          ref={vsRef}
          className="font-display title-glow shrink-0 leading-none"
          style={{ fontSize: 'clamp(3rem, 10vh, 8rem)' }}
        >
          VS
        </div>
        <div className="flex-1 text-left">
          <div
            className="font-display text-red-300 leading-none uppercase tracking-wider drop-shadow-[0_0_30px_rgba(220,38,38,0.7)]"
            style={{ fontSize: 'clamp(1.5rem, 6vh, 5rem)' }}
          >
            {teamBName}
          </div>
        </div>
      </div>

      <div
        className="mt-12 text-gold/80 uppercase tracking-[0.4em] animate-pulse"
        style={{ fontSize: 'clamp(0.8rem, 1.8vh, 1.4rem)' }}
      >
        ◆ pulsa el botón ◆
      </div>
    </div>
  )
}
