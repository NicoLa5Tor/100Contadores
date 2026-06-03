import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

interface Props {
  name: string
  score: number
  side: 'A' | 'B'
  controlling: boolean
}

export default function Scoreboard({ name, score, side, controlling }: Props) {
  const scoreRef = useRef<HTMLDivElement>(null)
  const prev = useRef(score)

  useEffect(() => {
    if (!scoreRef.current) return
    if (score !== prev.current) {
      const obj = { v: prev.current }
      gsap.to(obj, {
        v: score,
        duration: 0.9,
        ease: 'power2.out',
        onUpdate: () => {
          if (scoreRef.current) scoreRef.current.textContent = String(Math.round(obj.v))
        },
      })
      gsap.fromTo(
        scoreRef.current,
        { scale: 1.5, color: '#f4c430' },
        { scale: 1, color: '#ffffff', duration: 0.9 }
      )
      prev.current = score
    }
  }, [score])

  const gradient =
    side === 'A'
      ? 'from-blue-500 via-blue-700 to-blue-950'
      : 'from-red-500 via-red-700 to-red-950'
  const glow = side === 'A' ? 'panel-glow-blue' : 'panel-glow-red'
  const ring = controlling ? 'ring-4 ring-gold' : ''

  return (
    <div
      className={`relative h-full bg-gradient-to-br ${gradient} rounded-3xl ${glow} ${ring} overflow-hidden flex flex-col`}
    >
      {/* Top stripe with team name */}
      <div className="bg-black/40 px-3 py-1 border-b-2 border-gold/40">
        <div className="font-display text-xl md:text-3xl truncate text-center leading-tight text-gold">
          {name}
        </div>
      </div>

      {/* Score */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div
          ref={scoreRef}
          className="font-display text-6xl md:text-8xl text-white leading-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
        >
          {score}
        </div>
      </div>

      {/* Controlling tag */}
      {controlling && (
        <div className="bg-gold text-black text-center font-bold uppercase tracking-widest text-[10px] md:text-xs py-1 animate-pulse">
          ► EN CONTROL ◄
        </div>
      )}
    </div>
  )
}
