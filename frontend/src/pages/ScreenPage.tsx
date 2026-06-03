import { useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { useGameSocket } from '../hooks/useGameSocket'
import Scoreboard from '../components/Scoreboard'
import AnswerBoard from '../components/AnswerBoard'
import ErrorBombs from '../components/ErrorBombs'
import StealOverlay from '../components/StealOverlay'
import Bracket from '../components/Bracket'
import type { Match } from '../types'

export default function ScreenPage() {
  const { gameId: gameIdStr } = useParams<{ gameId: string }>()
  const gameId = gameIdStr ? Number(gameIdStr) : null
  const { game, connected, error } = useGameSocket(gameId)
  const turnRef = useRef<HTMLDivElement>(null)
  const prevTurn = useRef(0)

  const activeMatch = pickActiveMatch(game?.matches || [])

  useEffect(() => {
    if (!activeMatch || !turnRef.current) return
    if (activeMatch.turn_score !== prevTurn.current) {
      gsap.fromTo(
        turnRef.current,
        { scale: 1.5, color: '#fde047' },
        { scale: 1, color: '#22c55e', duration: 0.6, ease: 'back.out(2)' }
      )
      prevTurn.current = activeMatch.turn_score
    }
  }, [activeMatch?.turn_score])

  if (gameId == null || isNaN(gameId)) {
    return (
      <div className="h-screen stage-bg flex flex-col items-center justify-center gap-4">
        <div className="text-red-300 font-display text-3xl">ID inválido</div>
        <Link to="/" className="bg-gold text-black px-4 py-2 rounded">Lobby</Link>
      </div>
    )
  }
  if (error) {
    return (
      <div className="h-screen stage-bg flex flex-col items-center justify-center gap-4">
        <div className="text-red-300 font-display text-3xl">Error: {error}</div>
        <Link to="/" className="bg-gold text-black px-4 py-2 rounded">Lobby</Link>
      </div>
    )
  }
  if (!game) {
    return (
      <div className="h-screen stage-bg flex items-center justify-center">
        <div className="font-display text-6xl title-glow animate-pulse">
          {connected ? 'Cargando…' : 'Conectando…'}
        </div>
      </div>
    )
  }

  // Tournament finished → big winner screen
  if (game.status === 'finished') {
    const final = game.matches.find((mm) => mm.slot === 'Final')
    const winnerName =
      final?.winner === 'A'
        ? final.team_a_name
        : final?.winner === 'B'
        ? final.team_b_name
        : '—'
    return (
      <div className="h-screen stage-bg flex flex-col items-center justify-center p-6">
        <h1
          className="font-display title-glow animate-bounce leading-none"
          style={{ fontSize: 'clamp(3rem, 14vh, 12rem)' }}
        >
          🏆 CAMPEÓN 🏆
        </h1>
        <div
          className="font-display text-white mt-6 drop-shadow-[0_0_30px_rgba(244,196,48,0.9)] uppercase tracking-widest"
          style={{ fontSize: 'clamp(2rem, 8vh, 6rem)' }}
        >
          {winnerName}
        </div>
        <div className="mt-10 w-full max-w-5xl">
          <Bracket matches={game.matches} />
        </div>
      </div>
    )
  }

  // No match playing → show bracket / "intermission"
  if (!activeMatch || activeMatch.phase === 'waiting') {
    return (
      <div className="h-screen stage-bg flex flex-col p-4 overflow-hidden">
        <header className="text-center shrink-0 mb-4">
          <h1
            className="font-display title-glow leading-none"
            style={{ fontSize: 'clamp(2rem, 6vh, 5rem)' }}
          >
            🎙 {game.name} 🎙
          </h1>
          <div
            className="text-gold/80 uppercase tracking-[0.4em]"
            style={{ fontSize: 'clamp(0.7rem, 1.5vh, 1rem)' }}
          >
            {activeMatch ? activeMatch.label : 'Próximamente'}
          </div>
        </header>

        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className="w-full max-w-6xl">
            <h2 className="font-display text-gold text-center uppercase tracking-widest mb-4"
                style={{ fontSize: 'clamp(1rem, 2.5vh, 1.6rem)' }}>
              Bracket del torneo
            </h2>
            <Bracket matches={game.matches} activeMatchId={activeMatch?.id || null} />
          </div>
        </div>
      </div>
    )
  }

  // Active match in playing/steal → full TV view
  const m = activeMatch
  const stealingName = m.controlling_team === 'A' ? m.team_b_name : m.team_a_name

  return (
    <div className="h-screen w-screen flex flex-col stage-bg p-2 md:p-3 overflow-hidden">
      <StealOverlay active={m.steal_active} stealingTeamName={stealingName} />

      <header className="text-center shrink-0 mb-2 h-[8vh] flex flex-col justify-center">
        <h1
          className="font-display title-glow leading-none"
          style={{ fontSize: 'clamp(1.4rem, 4vh, 3.5rem)' }}
        >
          🎙 {game.name} 🎙
        </h1>
        <div
          className="text-gold/80 uppercase tracking-[0.4em]"
          style={{ fontSize: 'clamp(0.6rem, 1.2vh, 0.95rem)' }}
        >
          {m.label}
        </div>
      </header>

      <div className="grid grid-cols-12 gap-3 shrink-0 mb-2 h-[18vh]">
        <div className="col-span-4">
          <Scoreboard
            name={m.team_a_name}
            score={m.team_a_score}
            side="A"
            controlling={m.controlling_team === 'A'}
          />
        </div>

        <div className="col-span-4 flex flex-col items-center justify-center">
          <div className="bg-gradient-to-b from-emerald-900/80 to-black/80 rounded-3xl px-3 py-2 w-full h-full flex flex-col items-center justify-center text-center turn-glow">
            <div
              className="uppercase tracking-[0.3em] text-emerald-300/90 font-bold leading-tight"
              style={{ fontSize: 'clamp(0.55rem, 1.3vh, 0.85rem)' }}
            >
              Puntos en juego
            </div>
            <div
              ref={turnRef}
              className="font-display text-emerald-400 leading-none drop-shadow-[0_0_20px_rgba(34,197,94,0.7)]"
              style={{ fontSize: 'clamp(2.5rem, 11vh, 7rem)' }}
            >
              {m.turn_score}
            </div>
            <div
              className="uppercase tracking-widest text-emerald-200/60 leading-none"
              style={{ fontSize: 'clamp(0.5rem, 1vh, 0.75rem)' }}
            >
              ◆ meta {m.threshold} ◆
            </div>
          </div>
        </div>

        <div className="col-span-4">
          <Scoreboard
            name={m.team_b_name}
            score={m.team_b_score}
            side="B"
            controlling={m.controlling_team === 'B'}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 mb-2">
        <AnswerBoard
          question={m.current_question}
          revealed={m.revealed_answers}
        />
      </div>

      <div className="shrink-0 h-[8vh]">
        <ErrorBombs count={m.errors_count} />
      </div>
    </div>
  )
}

function pickActiveMatch(matches: Match[]): Match | null {
  if (!matches.length) return null
  const playing = matches.find((m) => m.phase === 'playing' || m.phase === 'steal')
  if (playing) return playing
  const pending = matches.find((m) => m.phase !== 'finished')
  if (pending) return pending
  return matches[matches.length - 1]
}
