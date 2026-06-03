import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import type { Question } from '../types'

interface Props {
  question: Question | null
  revealed: number[]
}

const SLOTS = 7

export default function AnswerBoard({ question, revealed }: Props) {
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])
  const prevRevealed = useRef<number[]>([])

  useEffect(() => {
    if (!question) {
      prevRevealed.current = []
      return
    }
    const newlyRevealed = revealed.filter((id) => !prevRevealed.current.includes(id))
    newlyRevealed.forEach((id) => {
      const idx = question.answers.findIndex((a) => a.id === id)
      if (idx < 0) return
      const el = rowRefs.current[idx]
      if (!el) return
      gsap.fromTo(
        el,
        { rotateX: -90, opacity: 0, scale: 0.85 },
        { rotateX: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.7)' }
      )
    })
    prevRevealed.current = revealed
  }, [revealed, question])

  if (!question) {
    return (
      <div className="h-full bg-black/40 rounded-3xl border-4 border-gold/30 panel-bevel flex items-center justify-center">
        <div className="text-center px-6">
          <div className="font-display text-2xl md:text-4xl text-gold/60 uppercase tracking-widest mb-2">
            Esperando pregunta
          </div>
          <div className="text-3xl md:text-5xl">🎤</div>
        </div>
      </div>
    )
  }

  const answers = question.answers
  const slots = Array.from({ length: SLOTS }, (_, i) => answers[i] || null)

  return (
    <div className="h-full bg-gradient-to-b from-[#0a1230] to-black/90 rounded-3xl p-2 md:p-3 border-4 border-gold panel-bevel flex flex-col">
      {/* Question banner — fixed compact */}
      <div className="shrink-0 mb-2 bg-black/50 border-2 border-gold/60 rounded-xl py-1.5 px-4 flex items-center justify-center" style={{ minHeight: '5vh' }}>
        <div
          className="font-display text-center text-gold uppercase leading-tight tracking-wide"
          style={{ fontSize: 'clamp(1rem, 2.6vh, 2rem)' }}
        >
          {question.text}
        </div>
      </div>

      {/* Answer slots — fill rest, equal rows */}
      <div
        className="flex-1 min-h-0 grid gap-1"
        style={{ gridTemplateRows: `repeat(${slots.length}, minmax(0, 1fr))` }}
      >
        {slots.map((ans, i) => {
          const isRevealed = ans && revealed.includes(ans.id)
          return (
            <div
              key={i}
              ref={(el) => (rowRefs.current[i] = el)}
              className={`flex items-center gap-2 md:gap-3 px-2 md:px-3 rounded-xl min-h-0 overflow-hidden ${
                isRevealed ? 'slot-revealed' : 'slot-hidden'
              }`}
              style={{ perspective: 800 }}
            >
              {/* Position disc — scales with row height */}
              <div
                className="pos-disc font-display rounded-full flex items-center justify-center shrink-0 aspect-square"
                style={{
                  height: '80%',
                  fontSize: 'clamp(1rem, 4vh, 2.8rem)',
                }}
              >
                {i + 1}
              </div>

              {/* Answer text */}
              <div
                className="font-display uppercase flex-1 truncate text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)] leading-none"
                style={{ fontSize: 'clamp(0.9rem, 3.4vh, 2.4rem)' }}
              >
                {isRevealed && ans ? ans.text : '— — — — — —'}
              </div>

              {/* Points badge — scales */}
              <div
                className="num-badge font-display rounded-lg text-center text-gold shrink-0 flex items-center justify-center"
                style={{
                  height: '80%',
                  minWidth: 'clamp(50px, 9vh, 130px)',
                  padding: '0 0.6em',
                  fontSize: 'clamp(0.9rem, 3.6vh, 2.6rem)',
                }}
              >
                {isRevealed && ans ? Math.round(ans.points) : '?'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
