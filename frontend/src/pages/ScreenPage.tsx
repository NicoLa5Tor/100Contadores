import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { useGameSocket } from '../hooks/useGameSocket'
import { useSound } from '../hooks/useSound'
import Scoreboard from '../components/Scoreboard'
import AnswerBoard from '../components/AnswerBoard'
import ErrorBombs from '../components/ErrorBombs'
import StealOverlay from '../components/StealOverlay'
import FaceOffOverlay from '../components/FaceOffOverlay'
import FaceOffWinnerOverlay from '../components/FaceOffWinnerOverlay'
import Bracket from '../components/Bracket'
import type { Match } from '../types'

export default function ScreenPage() {
  const { gameId: gameIdStr } = useParams<{ gameId: string }>()
  const gameId = gameIdStr ? Number(gameIdStr) : null
  const { game, connected, error } = useGameSocket(gameId)
  const { play } = useSound()
  const turnRef = useRef<HTMLDivElement>(null)
  const prevTurn = useRef(0)
  const boardWrapRef = useRef<HTMLDivElement>(null)
  const [boardComplete, setBoardComplete] = useState(false)
  const prevAllRevealed = useRef(false)

  const activeMatch = pickActiveMatch(game?.matches || [])

  // ---- Sound triggers ----
  // 1. New question activated
  const prevQuestionId = useRef<number | null>(null)
  useEffect(() => {
    const qid = activeMatch?.current_question?.id || null
    if (qid && qid !== prevQuestionId.current) {
      play('question-start')
      // small delay so the face-off cue follows
      setTimeout(() => play('face-off'), 350)
    }
    prevQuestionId.current = qid
  }, [activeMatch?.current_question?.id])

  // 1b. Buzzer pressed (face-off first team set)
  const prevBuzzer = useRef<'A' | 'B' | null>(null)
  useEffect(() => {
    const cur = activeMatch?.face_off_first_team ?? null
    if (cur && prevBuzzer.current == null && activeMatch?.current_question) {
      play('buzz')
    }
    prevBuzzer.current = cur
  }, [activeMatch?.face_off_first_team])

  // 1c. Face-off miss
  const prevMissA = useRef(false)
  const prevMissB = useRef(false)
  useEffect(() => {
    const a = activeMatch?.face_off_a_missed ?? false
    const b = activeMatch?.face_off_b_missed ?? false
    if ((a && !prevMissA.current) || (b && !prevMissB.current)) {
      play('face-off-miss')
    }
    prevMissA.current = a
    prevMissB.current = b
  }, [activeMatch?.face_off_a_missed, activeMatch?.face_off_b_missed])

  // 2. Face-off winner picked
  const prevControlSound = useRef<'A' | 'B' | null>(null)
  useEffect(() => {
    const cur = activeMatch?.controlling_team ?? null
    if (cur && prevControlSound.current == null && activeMatch?.current_question) {
      play('winner-buzzer')
    }
    prevControlSound.current = cur
  }, [activeMatch?.controlling_team, activeMatch?.current_question?.id])

  // 3. Answer revealed
  const prevRevealedCount = useRef(0)
  useEffect(() => {
    const n = activeMatch?.revealed_answers.length ?? 0
    if (n > prevRevealedCount.current) {
      play('correct')
    }
    prevRevealedCount.current = n
  }, [activeMatch?.revealed_answers.length])

  // 3b. All answers revealed in showcase → flash board + banner
  useEffect(() => {
    if (!activeMatch?.current_question) {
      prevAllRevealed.current = false
      return
    }
    const total = activeMatch.current_question.answers.length
    const n = activeMatch.revealed_answers.length
    const isAll = n >= total && activeMatch.phase === 'showcase'
    if (isAll && !prevAllRevealed.current) {
      setBoardComplete(true)
      if (boardWrapRef.current) {
        gsap.fromTo(
          boardWrapRef.current,
          { scale: 1.03, filter: 'brightness(2)' },
          { scale: 1, filter: 'brightness(1)', duration: 1.2, ease: 'power3.out' }
        )
      }
      setTimeout(() => setBoardComplete(false), 3500)
    }
    prevAllRevealed.current = isAll
  }, [activeMatch?.revealed_answers.length, activeMatch?.current_question?.id, activeMatch?.phase])

  // 4. Error count up
  const prevErrors = useRef(0)
  useEffect(() => {
    const n = activeMatch?.errors_count ?? 0
    if (n > prevErrors.current) {
      play('wrong')
    }
    prevErrors.current = n
  }, [activeMatch?.errors_count])

  // 5. Steal activated
  const prevSteal = useRef(false)
  useEffect(() => {
    const s = activeMatch?.steal_active ?? false
    if (s && !prevSteal.current) {
      play('steal')
    }
    prevSteal.current = s
  }, [activeMatch?.steal_active])

  // 6. Match finished — sound + winner celebration overlay
  const prevMatchPhasesRef = useRef<Record<number, string>>({})
  const [matchWinner, setMatchWinner] = useState<{ name: string; label: string } | null>(null)
  const matchPhasesKey = game?.matches.map((mm) => `${mm.id}:${mm.phase}`).join(',') ?? ''
  useEffect(() => {
    if (!game) return
    game.matches.forEach((mm: Match) => {
      const prev = prevMatchPhasesRef.current[mm.id]
      if (mm.phase === 'finished' && prev && prev !== 'finished') {
        play(mm.slot === 'Final' ? 'champion' : 'match-win')
        if (mm.slot !== 'Final') {
          const winnerName = mm.winner === 'A' ? mm.team_a_name : mm.team_b_name
          setMatchWinner({ name: winnerName, label: mm.label })
          setTimeout(() => setMatchWinner(null), 4500)
        }
      }
      prevMatchPhasesRef.current[mm.id] = mm.phase
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchPhasesKey])

  // 7. Tournament finished
  const prevStatus = useRef<string | null>(null)
  useEffect(() => {
    const cur = game?.status ?? null
    if (cur === 'finished' && prevStatus.current && prevStatus.current !== 'finished') {
      play('champion')
    }
    prevStatus.current = cur
  }, [game?.status])

  // Face-off winner celebration (~2s) when controlling_team transitions null -> A|B
  const [celebrationSide, setCelebrationSide] = useState<'A' | 'B' | null>(null)
  const prevControl = useRef<'A' | 'B' | null>(null)
  const prevQid = useRef<number | null>(null)
  useEffect(() => {
    if (!activeMatch) return
    const cur = activeMatch.controlling_team
    const prev = prevControl.current
    const qid = activeMatch.current_question?.id || null
    const sameQuestion = qid === prevQid.current
    prevControl.current = cur
    prevQid.current = qid
    if (
      cur &&
      prev == null &&
      sameQuestion &&
      activeMatch.current_question &&
      !activeMatch.steal_active
    ) {
      setCelebrationSide(cur)
      const t = setTimeout(() => setCelebrationSide(null), 2000)
      return () => clearTimeout(t)
    }
  }, [activeMatch?.controlling_team, activeMatch?.current_question?.id, activeMatch?.steal_active])

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
      <ChampionScreen winnerName={winnerName} finalMatch={final || null} />
    )
  }

  // No match playing → show bracket / "intermission"
  if (!activeMatch || activeMatch.phase === 'waiting') {
    return (
      <div className="h-screen stage-bg flex flex-col p-4 overflow-hidden">
        <MatchWinnerOverlay winner={matchWinner} />
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
      <MatchWinnerOverlay winner={matchWinner} />
      <StealOverlay active={m.steal_active} stealingTeamName={stealingName} />
      <FaceOffOverlay
        active={m.phase === 'face_off' && !m.steal_active}
        match={m}
      />
      <FaceOffWinnerOverlay
        active={!!celebrationSide}
        side={celebrationSide}
        teamName={celebrationSide === 'A' ? m.team_a_name : m.team_b_name}
      />

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
          {m.phase === 'showcase' && (
            <span className="ml-3 inline-block bg-purple-700 text-white px-2 py-0.5 rounded text-[0.7em] animate-pulse">
              🎙 modo presentación
            </span>
          )}
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
          {m.phase === 'showcase' ? (
            <div className="bg-gradient-to-b from-purple-900/80 to-black/80 rounded-3xl px-3 py-2 w-full h-full flex flex-col items-center justify-center text-center">
              <div
                className="font-display text-purple-300 animate-pulse leading-none"
                style={{ fontSize: 'clamp(1.5rem, 5vh, 3.5rem)' }}
              >
                🎙
              </div>
              <div
                className="uppercase tracking-[0.2em] text-purple-300/90 font-bold leading-tight mt-1"
                style={{ fontSize: 'clamp(0.55rem, 1.3vh, 0.85rem)' }}
              >
                Solo presentación
              </div>
            </div>
          ) : (
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
          )}
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

      <div ref={boardWrapRef} className="flex-1 min-h-0 mb-2">
        <AnswerBoard
          question={m.current_question}
          revealed={m.revealed_answers}
          faceOffAAnswerId={m.face_off_a_answer_id}
          faceOffBAnswerId={m.face_off_b_answer_id}
          teamAName={m.team_a_name}
          teamBName={m.team_b_name}
        />
      </div>

      <div className="shrink-0 h-[8vh] relative">
        <ErrorBombs count={m.errors_count} />
        {boardComplete && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="font-display text-center px-8 py-2 rounded-2xl border-2 border-gold animate-bounce"
              style={{
                fontSize: 'clamp(1rem, 2.8vh, 2rem)',
                background: 'rgba(10,18,48,0.95)',
                textShadow: '0 0 20px rgba(244,196,48,1)',
                color: '#f4c430',
                boxShadow: '0 0 30px rgba(244,196,48,0.6)',
              }}
            >
              ¡Tablero completo!
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MatchWinnerOverlay({ winner }: { winner: { name: string; label: string } | null }) {
  if (!winner) return null
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
      style={{
        background: 'radial-gradient(circle at center, rgba(10,18,48,0.97) 0%, rgba(0,0,0,0.98) 100%)',
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
        className="font-display title-glow animate-bounce leading-none mb-4"
        style={{ fontSize: 'clamp(3rem, 12vh, 10rem)' }}
      >
        🏆
      </div>
      <div
        className="font-display text-white uppercase tracking-widest drop-shadow-[0_0_40px_rgba(244,196,48,0.9)] leading-none text-center px-6"
        style={{ fontSize: 'clamp(2rem, 8vh, 7rem)' }}
      >
        {winner.name}
      </div>
      <div
        className="font-display text-gold/80 uppercase tracking-[0.4em] mt-4"
        style={{ fontSize: 'clamp(0.9rem, 2.5vh, 2rem)' }}
      >
        gana · {winner.label}
      </div>
    </div>
  )
}

// Particle data — fixed so it doesn't re-randomize on re-render
const PARTICLES = Array.from({ length: 60 }, (_, i) => {
  const left = (i * 53 + 17) % 100
  const delay = (i * 0.19) % 4
  const dur = 3 + ((i * 0.23) % 3)
  const size = i % 4 === 0 ? '1.6rem' : i % 4 === 1 ? '1.1rem' : i % 4 === 2 ? '0.8rem' : '0.6rem'
  const palette = ['#f4c430', '#fff', '#fde68a', '#fbbf24', '#ef4444', '#3b82f6']
  const color = palette[i % palette.length]
  const shape = i % 4 === 0 ? '★' : i % 4 === 1 ? '✦' : i % 4 === 2 ? '◆' : '●'
  return { left: `${left}%`, delay: `${delay}s`, dur: `${dur}s`, size, color, shape }
})

function ChampionScreen({
  winnerName,
  finalMatch,
}: {
  winnerName: string
  finalMatch: Match | null
}) {
  const trophyRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLDivElement>(null)
  const scoreRef = useRef<HTMLDivElement>(null)
  const raysRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (raysRef.current) {
      gsap.to(raysRef.current, {
        rotation: 360,
        duration: 30,
        ease: 'none',
        repeat: -1,
      })
    }
    if (trophyRef.current) {
      gsap.fromTo(
        trophyRef.current,
        { scale: 0, rotation: -20 },
        { scale: 1, rotation: 0, duration: 1.1, ease: 'back.out(2.5)', delay: 0.1 }
      )
      gsap.to(trophyRef.current, {
        y: '-=15',
        duration: 1.4,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: 1.3,
      })
    }
    if (labelRef.current) {
      gsap.fromTo(
        labelRef.current,
        { y: -50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.7 }
      )
    }
    if (nameRef.current) {
      gsap.fromTo(
        nameRef.current,
        { scale: 0.2, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1, ease: 'back.out(1.7)', delay: 1.2 }
      )
    }
    if (scoreRef.current) {
      gsap.fromTo(
        scoreRef.current,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', delay: 1.9 }
      )
    }
  }, [])

  return (
    <div
      className="h-screen w-screen flex flex-col items-center justify-center overflow-hidden relative"
      style={{
        background:
          'radial-gradient(ellipse at 50% 45%, #1a2a6c 0%, #0a0f2e 55%, #000 100%)',
      }}
    >
      {/* Animated rays behind trophy */}
      <div
        ref={raysRef}
        className="absolute pointer-events-none"
        style={{
          top: '50%',
          left: '50%',
          width: '120vh',
          height: '120vh',
          marginTop: '-60vh',
          marginLeft: '-60vh',
          background:
            'conic-gradient(from 0deg, transparent 0deg, rgba(244,196,48,0.18) 8deg, transparent 16deg, transparent 30deg, rgba(244,196,48,0.12) 38deg, transparent 46deg, transparent 60deg, rgba(244,196,48,0.18) 68deg, transparent 76deg, transparent 90deg, rgba(244,196,48,0.12) 98deg, transparent 106deg, transparent 120deg, rgba(244,196,48,0.18) 128deg, transparent 136deg, transparent 150deg, rgba(244,196,48,0.12) 158deg, transparent 166deg, transparent 180deg, rgba(244,196,48,0.18) 188deg, transparent 196deg, transparent 210deg, rgba(244,196,48,0.12) 218deg, transparent 226deg, transparent 240deg, rgba(244,196,48,0.18) 248deg, transparent 256deg, transparent 270deg, rgba(244,196,48,0.12) 278deg, transparent 286deg, transparent 300deg, rgba(244,196,48,0.18) 308deg, transparent 316deg, transparent 330deg, rgba(244,196,48,0.12) 338deg, transparent 346deg, transparent 360deg)',
          filter: 'blur(2px)',
          zIndex: 0,
        }}
      />

      {/* Falling confetti */}
      <style>{`
        @keyframes champ-fall {
          0%   { transform: translateY(-12vh) rotate(0deg); opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: 0,
            left: p.left,
            fontSize: p.size,
            color: p.color,
            animation: `champ-fall ${p.dur} ${p.delay} infinite linear`,
            pointerEvents: 'none',
            zIndex: 1,
            textShadow: '0 0 10px currentColor',
          }}
        >
          {p.shape}
        </div>
      ))}

      {/* Content stack — centered */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-5xl">
        <div
          ref={labelRef}
          className="font-display text-gold uppercase tracking-[0.4em] mb-2"
          style={{
            fontSize: 'clamp(0.9rem, 2.5vh, 1.8rem)',
            textShadow: '0 0 20px rgba(244,196,48,0.9)',
          }}
        >
          ¡Campeón del torneo!
        </div>

        <div
          ref={trophyRef}
          style={{
            fontSize: 'clamp(5rem, 20vh, 14rem)',
            lineHeight: 1,
            filter: 'drop-shadow(0 0 80px rgba(244,196,48,1)) drop-shadow(0 0 30px rgba(244,196,48,0.8))',
          }}
        >
          🏆
        </div>

        <div
          ref={nameRef}
          className="font-display text-white uppercase mt-4 leading-none"
          style={{
            fontSize: 'clamp(2.5rem, 12vh, 10rem)',
            textShadow:
              '0 0 60px rgba(244,196,48,1), 0 0 120px rgba(244,196,48,0.6), 0 0 200px rgba(244,196,48,0.3)',
            letterSpacing: '0.05em',
          }}
        >
          {winnerName}
        </div>

        {finalMatch && (
          <div
            ref={scoreRef}
            className="mt-8 flex items-center gap-4 md:gap-8 bg-black/60 border-2 border-gold/60 rounded-2xl px-6 py-3 backdrop-blur-sm"
          >
            <div className="text-center">
              <div
                className={`font-display ${
                  finalMatch.winner === 'A' ? 'text-gold' : 'text-white/40'
                }`}
                style={{ fontSize: 'clamp(0.7rem, 1.6vh, 1rem)' }}
              >
                {finalMatch.team_a_name}
              </div>
              <div
                className={`font-display leading-none ${
                  finalMatch.winner === 'A' ? 'text-gold' : 'text-white/50'
                }`}
                style={{ fontSize: 'clamp(1.5rem, 5vh, 3.5rem)' }}
              >
                {finalMatch.team_a_score}
              </div>
            </div>
            <div className="font-display text-gold/60" style={{ fontSize: 'clamp(1rem, 3vh, 2rem)' }}>
              —
            </div>
            <div className="text-center">
              <div
                className={`font-display ${
                  finalMatch.winner === 'B' ? 'text-gold' : 'text-white/40'
                }`}
                style={{ fontSize: 'clamp(0.7rem, 1.6vh, 1rem)' }}
              >
                {finalMatch.team_b_name}
              </div>
              <div
                className={`font-display leading-none ${
                  finalMatch.winner === 'B' ? 'text-gold' : 'text-white/50'
                }`}
                style={{ fontSize: 'clamp(1.5rem, 5vh, 3.5rem)' }}
              >
                {finalMatch.team_b_score}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function pickActiveMatch(matches: Match[]): Match | null {
  if (!matches.length) return null
  const playing = matches.find(
    (m) => ['face_off', 'playing', 'steal', 'showcase'].includes(m.phase)
  )
  if (playing) return playing
  const pending = matches.find((m) => m.phase !== 'finished')
  if (pending) return pending
  return matches[matches.length - 1]
}
