import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import type { Match } from '../types'

interface Props {
  active: boolean
  match: Match | null
}

export default function FaceOffOverlay({ active, match }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const aCardRef = useRef<HTMLDivElement>(null)
  const bCardRef = useRef<HTMLDivElement>(null)

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
    } else {
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.3 })
    }
  }, [active])

  // Animate revealing cards
  useEffect(() => {
    if (match?.face_off_a_answer_id && aCardRef.current) {
      gsap.fromTo(
        aCardRef.current,
        { rotateY: -90, opacity: 0, scale: 0.5 },
        { rotateY: 0, opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.7)' }
      )
    }
  }, [match?.face_off_a_answer_id])

  useEffect(() => {
    if (match?.face_off_b_answer_id && bCardRef.current) {
      gsap.fromTo(
        bCardRef.current,
        { rotateY: 90, opacity: 0, scale: 0.5 },
        { rotateY: 0, opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.7)' }
      )
    }
  }, [match?.face_off_b_answer_id])

  if (!active || !match) return null

  const q = match.current_question
  const aAns = q?.answers.find((a) => a.id === match.face_off_a_answer_id) || null
  const bAns = q?.answers.find((a) => a.id === match.face_off_b_answer_id) || null
  const first = match.face_off_first_team

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-40 flex flex-col items-center justify-center pointer-events-none p-6"
      style={{
        background:
          'radial-gradient(circle at center, rgba(10,18,48,0.96) 0%, rgba(0,0,0,0.97) 100%)',
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
        className="font-display title-glow leading-none mb-6"
        style={{ fontSize: 'clamp(2.5rem, 9vh, 8rem)' }}
      >
        🥊 CARA A CARA 🥊
      </div>

      {/* Question text */}
      {q && (
        <div
          className="bg-black/60 border-2 border-gold/60 rounded-2xl px-6 py-3 mb-6 max-w-5xl text-center"
        >
          <div
            className="font-display text-gold uppercase tracking-wide leading-tight"
            style={{ fontSize: 'clamp(1rem, 2.6vh, 2rem)' }}
          >
            {q.text}
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="flex items-stretch justify-center gap-4 md:gap-10 w-full max-w-6xl">
        <TeamCard
          refEl={aCardRef}
          name={match.team_a_name}
          side="A"
          isFirst={first === 'A'}
          answer={aAns}
          missed={match.face_off_a_missed}
          turn={isTurnFor('A', match)}
        />
        <div
          className="font-display title-glow self-center leading-none"
          style={{ fontSize: 'clamp(2rem, 7vh, 5rem)' }}
        >
          VS
        </div>
        <TeamCard
          refEl={bCardRef}
          name={match.team_b_name}
          side="B"
          isFirst={first === 'B'}
          answer={bAns}
          missed={match.face_off_b_missed}
          turn={isTurnFor('B', match)}
        />
      </div>

      {/* Hint */}
      <div
        className="mt-8 uppercase tracking-[0.4em] text-center text-gold/80 animate-pulse"
        style={{ fontSize: 'clamp(0.7rem, 1.5vh, 1.2rem)' }}
      >
        {hintText(match)}
      </div>
    </div>
  )
}

function isTurnFor(side: 'A' | 'B', m: Match): boolean {
  if (!m.face_off_first_team) return false
  const aActed = m.face_off_a_answer_id != null || m.face_off_a_missed
  const bActed = m.face_off_b_answer_id != null || m.face_off_b_missed
  if (!aActed && !bActed) return side === m.face_off_first_team
  if (aActed && !bActed) return side === 'B'
  if (bActed && !aActed) return side === 'A'
  return false
}

function hintText(m: Match): string {
  if (!m.face_off_first_team) return '◆ esperando buzzer ◆'
  const aActed = m.face_off_a_answer_id != null || m.face_off_a_missed
  const bActed = m.face_off_b_answer_id != null || m.face_off_b_missed
  if (!aActed && !bActed) return `◆ responde ${m.face_off_first_team === 'A' ? m.team_a_name : m.team_b_name} ◆`
  if ((aActed && !bActed) || (bActed && !aActed)) {
    const other = aActed ? m.team_b_name : m.team_a_name
    return `◆ turno de ${other} ◆`
  }
  return '◆ comparando ◆'
}

function TeamCard({
  refEl, name, side, isFirst, answer, missed, turn,
}: {
  refEl: React.Ref<HTMLDivElement>
  name: string
  side: 'A' | 'B'
  isFirst: boolean
  answer: { id: number; text: string; points: number; position: number } | null
  missed: boolean
  turn: boolean
}) {
  const gradient =
    side === 'A'
      ? 'from-blue-700 via-blue-900 to-blue-950 border-blue-400'
      : 'from-red-700 via-red-900 to-red-950 border-red-400'
  const glow =
    side === 'A'
      ? 'drop-shadow-[0_0_30px_rgba(96,165,250,0.6)]'
      : 'drop-shadow-[0_0_30px_rgba(248,113,113,0.6)]'

  return (
    <div className="flex-1 max-w-xl flex flex-col items-stretch" style={{ perspective: 1000 }}>
      <div
        ref={refEl}
        className={`flex-1 bg-gradient-to-b ${gradient} border-4 rounded-3xl p-4 md:p-6 panel-bevel ${glow} ${
          turn ? 'ring-4 ring-yellow-400 animate-pulse' : ''
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div
            className="font-display text-white uppercase tracking-wide truncate"
            style={{ fontSize: 'clamp(1rem, 3vh, 2.4rem)' }}
          >
            {name}
          </div>
          {isFirst && (
            <span
              className="bg-yellow-400 text-black px-2 py-1 rounded font-bold uppercase tracking-widest shrink-0"
              style={{ fontSize: 'clamp(0.5rem, 1.1vh, 0.85rem)' }}
            >
              🔔 Buzzer
            </span>
          )}
        </div>

        {answer ? (
          <div className="bg-black/50 border-2 border-gold rounded-2xl p-3 md:p-4 text-center">
            <div
              className="font-display text-gold uppercase mb-2"
              style={{ fontSize: 'clamp(0.8rem, 1.5vh, 1.2rem)' }}
            >
              posición #{answer.position}
            </div>
            <div
              className="font-display text-white uppercase leading-tight mb-2"
              style={{ fontSize: 'clamp(1rem, 3.5vh, 2.6rem)' }}
            >
              {answer.text}
            </div>
            <div
              className="font-display text-emerald-300 leading-none drop-shadow-[0_0_15px_rgba(34,197,94,0.7)]"
              style={{ fontSize: 'clamp(1.5rem, 5vh, 4rem)' }}
            >
              +{Math.round(answer.points)}
            </div>
          </div>
        ) : missed ? (
          <div className="bg-red-950/70 border-4 border-red-500 rounded-2xl p-3 md:p-5 text-center">
            <div
              className="font-display text-red-300 leading-none drop-shadow-[0_0_25px_rgba(239,68,68,0.9)]"
              style={{ fontSize: 'clamp(2rem, 7vh, 5rem)' }}
            >
              ❌ FALLÓ
            </div>
            <div
              className="font-display text-red-200/70 uppercase tracking-widest mt-2"
              style={{ fontSize: 'clamp(0.6rem, 1.3vh, 1rem)' }}
            >
              respuesta no estaba en el tablero
            </div>
          </div>
        ) : (
          <div
            className="font-display text-white/30 italic text-center py-6"
            style={{ fontSize: 'clamp(0.9rem, 2vh, 1.4rem)' }}
          >
            {turn ? '🎤 respondiendo…' : '— esperando —'}
          </div>
        )}
      </div>
    </div>
  )
}
