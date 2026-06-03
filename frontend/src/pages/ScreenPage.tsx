import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { useGameSocket } from '../hooks/useGameSocket'
import Scoreboard from '../components/Scoreboard'
import AnswerBoard from '../components/AnswerBoard'
import ErrorBombs from '../components/ErrorBombs'
import StealOverlay from '../components/StealOverlay'

export default function ScreenPage() {
  const { state, connected } = useGameSocket()
  const turnRef = useRef<HTMLDivElement>(null)
  const prevTurn = useRef(0)

  useEffect(() => {
    if (!state || !turnRef.current) return
    if (state.turn_score !== prevTurn.current) {
      gsap.fromTo(
        turnRef.current,
        { scale: 1.5, color: '#fde047' },
        { scale: 1, color: '#22c55e', duration: 0.6, ease: 'back.out(2)' }
      )
      prevTurn.current = state.turn_score
    }
  }, [state?.turn_score])

  if (!state) {
    return (
      <div className="h-screen stage-bg flex items-center justify-center">
        <div className="font-display text-6xl title-glow animate-pulse">
          {connected ? 'Cargando…' : 'Conectando…'}
        </div>
      </div>
    )
  }

  const stealingName = state.controlling_team === 'A' ? state.team_b_name : state.team_a_name

  return (
    <div className="h-screen w-screen flex flex-col stage-bg p-2 md:p-3 overflow-hidden">
      <StealOverlay active={state.steal_active} stealingTeamName={stealingName} />

      {/* HEADER */}
      <header className="text-center shrink-0 mb-2 h-[8vh] flex flex-col justify-center">
        <h1 className="font-display title-glow leading-none" style={{ fontSize: 'clamp(1.6rem, 4.5vh, 4rem)' }}>
          🎙 100 CONTADORES DIJERON 🎙
        </h1>
        <div className="text-gold/80 uppercase tracking-[0.4em]" style={{ fontSize: 'clamp(0.6rem, 1.2vh, 0.95rem)' }}>
          {state.round_label}
        </div>
      </header>

      {/* SCORES ROW */}
      <div className="grid grid-cols-12 gap-3 shrink-0 mb-2 h-[18vh]">
        <div className="col-span-4">
          <Scoreboard
            name={state.team_a_name}
            score={state.team_a_score}
            side="A"
            controlling={state.controlling_team === 'A'}
          />
        </div>

        <div className="col-span-4 flex flex-col items-center justify-center">
          <div className="bg-gradient-to-b from-emerald-900/80 to-black/80 rounded-3xl px-3 py-2 w-full h-full flex flex-col items-center justify-center text-center turn-glow">
            <div className="uppercase tracking-[0.3em] text-emerald-300/90 font-bold leading-tight" style={{ fontSize: 'clamp(0.55rem, 1.3vh, 0.85rem)' }}>
              Puntos en juego
            </div>
            <div
              ref={turnRef}
              className="font-display text-emerald-400 leading-none drop-shadow-[0_0_20px_rgba(34,197,94,0.7)]"
              style={{ fontSize: 'clamp(2.5rem, 11vh, 7rem)' }}
            >
              {state.turn_score}
            </div>
            <div className="uppercase tracking-widest text-emerald-200/60 leading-none" style={{ fontSize: 'clamp(0.5rem, 1vh, 0.75rem)' }}>
              ◆ robables ◆
            </div>
          </div>
        </div>

        <div className="col-span-4">
          <Scoreboard
            name={state.team_b_name}
            score={state.team_b_score}
            side="B"
            controlling={state.controlling_team === 'B'}
          />
        </div>
      </div>

      {/* ANSWER BOARD — fills rest */}
      <div className="flex-1 min-h-0 mb-2">
        <AnswerBoard
          question={state.current_question}
          revealed={state.revealed_answers}
        />
      </div>

      {/* ERRORS */}
      <div className="shrink-0 h-[8vh]">
        <ErrorBombs count={state.errors_count} />
      </div>

      {state.phase === 'finished' && (
        <div className="fixed inset-0 z-40 bg-black/85 flex items-center justify-center">
          <div className="text-center">
            <div className="font-display text-7xl md:text-9xl title-glow animate-bounce">
              🏆 GANADOR 🏆
            </div>
            <div className="font-display text-5xl md:text-7xl mt-6 text-white drop-shadow-[0_0_20px_rgba(244,196,48,0.7)]">
              {state.team_a_score > state.team_b_score ? state.team_a_name : state.team_b_name}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
