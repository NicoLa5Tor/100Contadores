import type { MatchSummary } from '../types'

interface Props {
  matches: MatchSummary[]
  activeMatchId?: number | null
  onPick?: (matchId: number) => void
  compact?: boolean
}

export default function Bracket({ matches, activeMatchId, onPick, compact }: Props) {
  const l1 = matches.find((m) => m.slot === 'L1') || null
  const l2 = matches.find((m) => m.slot === 'L2') || null
  const fn = matches.find((m) => m.slot === 'Final') || null

  return (
    <div className="w-full">
      {/* Title bar */}
      <div className="flex items-center justify-between text-[10px] md:text-xs uppercase tracking-[0.3em] text-gold/70 mb-2 px-1">
        <span>🥊 Llaves clasificatorias</span>
        <span>🏆 Final</span>
      </div>

      {/* Bracket grid: left column (L1+L2), middle connectors, right column (Final) */}
      <div
        className="grid items-stretch"
        style={{ gridTemplateColumns: 'minmax(0,1fr) clamp(40px, 8vw, 90px) minmax(0,1fr)' }}
      >
        {/* LEFT COLUMN — stacked matches */}
        <div className="flex flex-col justify-between gap-4 md:gap-8">
          <MatchCard m={l1} activeMatchId={activeMatchId} onPick={onPick} compact={compact} slot="L1" />
          <MatchCard m={l2} activeMatchId={activeMatchId} onPick={onPick} compact={compact} slot="L2" />
        </div>

        {/* MIDDLE — SVG connectors */}
        <BracketConnectors />

        {/* RIGHT COLUMN — Final centered */}
        <div className="flex items-center">
          <MatchCard
            m={fn}
            activeMatchId={activeMatchId}
            onPick={onPick}
            compact={compact}
            isFinal
            slot="Final"
          />
        </div>
      </div>
    </div>
  )
}

function BracketConnectors() {
  // SVG drawn with preserveAspectRatio=none so it stretches with column.
  // viewBox 100x100. Lines: from top-left & bottom-left to mid-vertical, then horizontal to right edge.
  return (
    <div className="relative h-full w-full">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <linearGradient id="connStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f4c430" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f4c430" stopOpacity="1" />
          </linearGradient>
        </defs>
        {/* L1 → mid top */}
        <line x1="0" y1="22" x2="55" y2="22" stroke="url(#connStroke)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {/* L2 → mid bottom */}
        <line x1="0" y1="78" x2="55" y2="78" stroke="url(#connStroke)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {/* vertical connector */}
        <line x1="55" y1="22" x2="55" y2="78" stroke="#f4c430" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {/* middle → Final */}
        <line x1="55" y1="50" x2="100" y2="50" stroke="url(#connStroke)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {/* dots at joints */}
        <circle cx="55" cy="22" r="2.5" fill="#f4c430" vectorEffect="non-scaling-stroke" />
        <circle cx="55" cy="78" r="2.5" fill="#f4c430" vectorEffect="non-scaling-stroke" />
        <circle cx="55" cy="50" r="3" fill="#f4c430" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  )
}

function MatchCard({
  m, activeMatchId, onPick, compact, isFinal, slot,
}: {
  m: MatchSummary | null
  activeMatchId?: number | null
  onPick?: (matchId: number) => void
  compact?: boolean
  isFinal?: boolean
  slot: string
}) {
  if (!m) {
    return (
      <div
        className={`rounded-xl border-2 border-dashed border-gold/30 bg-black/30 p-3 text-center text-white/40 ${
          compact ? 'text-xs' : 'text-sm'
        } ${isFinal ? 'ring-2 ring-gold/20' : ''}`}
      >
        <div className="font-display text-gold/40">{slot}</div>
        <div>(esperando)</div>
      </div>
    )
  }
  const isActive = activeMatchId === m.id
  const finished = m.phase === 'finished'
  const winnerSide = m.winner
  const clickable = !!onPick
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => onPick && onPick(m.id)}
      className={`text-left rounded-xl p-2 md:p-3 border-2 transition w-full ${
        isActive
          ? 'border-gold ring-2 ring-gold/50 bg-blue-950/60'
          : finished
          ? 'border-gold/60 bg-black/40'
          : 'border-blue-900 bg-black/40'
      } ${clickable ? 'hover:bg-blue-900/40 cursor-pointer' : 'cursor-default'} ${
        isFinal ? 'shadow-[0_0_25px_rgba(244,196,48,0.3)]' : ''
      }`}
    >
      <div className="flex items-baseline justify-between mb-2 gap-2">
        <div className={`font-display text-gold leading-none truncate ${compact ? 'text-base' : 'text-lg'}`}>
          {m.label}
        </div>
        <PhaseBadge phase={m.phase} winner={m.winner} />
      </div>
      <TeamRow
        name={m.team_a_name}
        score={m.team_a_score}
        win={finished && winnerSide === 'A'}
        side="A"
        compact={compact}
      />
      <div className="text-center text-[9px] text-white/30 my-0.5 uppercase tracking-widest">vs</div>
      <TeamRow
        name={m.team_b_name}
        score={m.team_b_score}
        win={finished && winnerSide === 'B'}
        side="B"
        compact={compact}
      />
      <div className="text-[9px] md:text-[10px] text-white/40 mt-1 text-right">
        meta {m.threshold} pts
      </div>
    </button>
  )
}

function TeamRow({
  name, score, win, side, compact,
}: {
  name: string
  score: number
  win: boolean
  side: 'A' | 'B'
  compact?: boolean
}) {
  const colorBar = side === 'A' ? 'bg-blue-500' : 'bg-red-500'
  return (
    <div
      className={`flex items-center justify-between gap-2 px-2 py-1 rounded ${
        win ? 'bg-gold/20 ring-1 ring-gold' : 'bg-white/5'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className={`w-1.5 h-5 rounded ${colorBar}`} />
        <div
          className={`truncate ${win ? 'text-gold font-bold' : 'text-white'} ${
            compact ? 'text-xs md:text-sm' : 'text-sm md:text-base'
          }`}
        >
          {name}
          {win && ' ✓'}
        </div>
      </div>
      <div
        className={`font-display ${compact ? 'text-lg md:text-xl' : 'text-2xl md:text-3xl'} ${
          win ? 'text-gold' : 'text-white'
        }`}
      >
        {score}
      </div>
    </div>
  )
}

function PhaseBadge({ phase, winner }: { phase: string; winner: 'A' | 'B' | null }) {
  const labelMap: Record<string, string> = {
    waiting: 'pendiente',
    playing: '● en juego',
    steal: '⚠ robo',
    finished: winner ? '✓ cerrada' : 'cerrada',
  }
  const colorMap: Record<string, string> = {
    waiting: 'bg-white/10 text-white/70',
    playing: 'bg-green-700 text-white animate-pulse',
    steal: 'bg-yellow-600 text-black',
    finished: 'bg-gold text-black',
  }
  return (
    <span
      className={`text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0 ${
        colorMap[phase] || 'bg-white/10'
      }`}
    >
      {labelMap[phase] || phase}
    </span>
  )
}
