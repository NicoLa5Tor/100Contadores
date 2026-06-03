import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

interface Props {
  active: boolean
  side: 'A' | 'B' | null
  teamName: string
}

export default function FaceOffWinnerOverlay({ active, side, teamName }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!overlayRef.current || !active) return
    gsap.fromTo(
      overlayRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.3, ease: 'power2.out' }
    )
    if (titleRef.current) {
      gsap.fromTo(
        titleRef.current,
        { scale: 0.3, y: -60, rotate: -15 },
        { scale: 1, y: 0, rotate: 0, duration: 0.6, ease: 'back.out(2.5)' }
      )
    }
    if (nameRef.current) {
      gsap.fromTo(
        nameRef.current,
        { scale: 0.5, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(2)', delay: 0.2 }
      )
    }
  }, [active])

  if (!active || !side) return null

  const colorBg =
    side === 'A'
      ? 'radial-gradient(circle at center, rgba(37,99,235,0.97) 0%, rgba(10,18,48,0.98) 70%)'
      : 'radial-gradient(circle at center, rgba(220,38,38,0.97) 0%, rgba(40,5,5,0.98) 70%)'
  const nameColor = side === 'A' ? 'text-blue-100' : 'text-red-100'
  const nameGlow =
    side === 'A'
      ? 'drop-shadow-[0_0_40px_rgba(96,165,250,0.9)]'
      : 'drop-shadow-[0_0_40px_rgba(248,113,113,0.9)]'

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
      style={{ background: colorBg }}
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            'repeating-linear-gradient(135deg, transparent 0 36px, rgba(255,255,255,0.05) 36px 72px)',
        }}
      />

      <div
        ref={titleRef}
        className="font-display title-glow leading-none"
        style={{ fontSize: 'clamp(2.5rem, 10vh, 9rem)' }}
      >
        🏆 GANA 🏆
      </div>

      <div
        ref={nameRef}
        className={`font-display ${nameColor} ${nameGlow} mt-6 uppercase tracking-wider leading-none text-center px-6`}
        style={{ fontSize: 'clamp(2.5rem, 11vh, 9rem)' }}
      >
        {teamName}
      </div>

      <div
        className="mt-10 text-gold/90 uppercase tracking-[0.4em]"
        style={{ fontSize: 'clamp(0.7rem, 1.5vh, 1.2rem)' }}
      >
        ◆ toma el control ◆
      </div>
    </div>
  )
}
