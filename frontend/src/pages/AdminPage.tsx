import { useEffect, useState, type ReactNode } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useGameSocket } from '../hooks/useGameSocket'
import { api } from '../api'
import type { Match, QuestionLite } from '../types'
import Bracket from '../components/Bracket'

export default function AdminPage() {
  const { gameId: gameIdStr } = useParams<{ gameId: string }>()
  const gameId = gameIdStr ? Number(gameIdStr) : null
  const { game, connected, error: wsError } = useGameSocket(gameId)
  const navigate = useNavigate()

  const [activeMatchId, setActiveMatchId] = useState<number | null>(null)
  const [questions, setQuestions] = useState<QuestionLite[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-select first non-finished match if none chosen
  useEffect(() => {
    if (!game) return
    if (activeMatchId == null) {
      const playing = game.matches.find((m) => m.phase === 'playing' || m.phase === 'steal')
      const next = playing || game.matches.find((m) => m.phase !== 'finished') || game.matches[0]
      if (next) setActiveMatchId(next.id)
    }
  }, [game])

  const activeMatch: Match | undefined = game?.matches.find((m) => m.id === activeMatchId)

  // Load questions of the active match's round_key
  useEffect(() => {
    if (!activeMatch) return
    api
      .listQuestions(activeMatch.round_key)
      .then((qs) => setQuestions(qs))
      .catch((e) => setError(String(e)))
  }, [activeMatch?.round_key])

  const run = async (fn: () => Promise<any>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e: any) {
      setError(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  if (gameId == null || isNaN(gameId)) {
    return <ErrorScreen msg="ID de torneo inválido" />
  }
  if (wsError) return <ErrorScreen msg={`Error: ${wsError}`} />
  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy">
        <div className="font-display text-4xl text-gold">
          {connected ? 'Cargando…' : 'Conectando…'}
        </div>
      </div>
    )
  }

  const m = activeMatch
  const screenUrl = `/screen/${gameId}`

  return (
    <div className="min-h-screen bg-navy text-white font-body">
      <header className="sticky top-0 z-10 bg-black/70 backdrop-blur border-b border-gold/40 px-4 md:px-6 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-sm"
            title="Volver al lobby"
          >
            ← Lobby
          </Link>
          <div>
            <h1 className="font-display text-xl md:text-2xl text-gold">{game.name}</h1>
            <div className="text-[10px] text-white/60 uppercase tracking-widest">
              estado: <b className="text-gold">{game.status}</b>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <a
            href={screenUrl}
            target="_blank"
            rel="noreferrer"
            className="bg-blue-700 hover:bg-blue-600 px-3 py-1 rounded font-bold"
          >
            🖥 Pantalla
          </a>
          <span>
            WS:{' '}
            <span className={connected ? 'text-green-400' : 'text-red-400'}>
              {connected ? '●' : '○'}
            </span>
          </span>
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        {error && (
          <div className="bg-red-900/80 border border-red-500 p-3 mb-4 rounded">{error}</div>
        )}

        {/* Bracket */}
        <section className="bg-black/40 rounded-xl p-4 mb-6 border border-gold/30">
          <h2 className="font-display text-2xl text-gold mb-3">Bracket del torneo</h2>
          <Bracket
            matches={game.matches}
            activeMatchId={activeMatchId}
            onPick={(id) => setActiveMatchId(id)}
          />
          <p className="text-[11px] text-white/40 mt-3">
            Click en una llave para seleccionarla como activa.
          </p>
        </section>

        {!m && (
          <div className="text-center text-white/60 py-8">
            Selecciona una llave del bracket arriba.
          </div>
        )}

        {m && (
          <MatchPanel
            game={game}
            match={m}
            questions={questions}
            busy={busy}
            run={run}
            gameId={gameId}
          />
        )}

        <div className="mt-8 pt-4 border-t border-red-900/40 flex justify-end gap-3 flex-wrap">
          {m && (
            <button
              disabled={busy}
              onClick={() => {
                if (
                  confirm(
                    `¿Reiniciar la llave "${m.label}"? Borra marcadores, preguntas usadas y ganador.`
                  )
                ) {
                  run(() => api.resetMatch(gameId, m.id))
                }
              }}
              className="bg-red-800 hover:bg-red-700 px-4 py-2 rounded text-sm"
            >
              Reiniciar llave activa
            </button>
          )}
          <button
            disabled={busy}
            onClick={async () => {
              if (
                confirm(`¿Eliminar el torneo "${game.name}"? No se puede deshacer.`)
              ) {
                try {
                  await api.deleteGame(gameId)
                  navigate('/')
                } catch (e: any) {
                  setError(e.message || String(e))
                }
              }
            }}
            className="bg-red-900 hover:bg-red-800 px-4 py-2 rounded text-sm"
          >
            Eliminar torneo
          </button>
        </div>
      </main>
    </div>
  )
}

function ErrorScreen({ msg }: { msg: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-navy gap-4">
      <div className="text-red-400 font-display text-2xl">{msg}</div>
      <Link to="/" className="bg-gold text-black px-4 py-2 rounded">
        Volver al lobby
      </Link>
    </div>
  )
}

function MatchPanel({
  game, match, questions, busy, run, gameId,
}: {
  game: any
  match: Match
  questions: QuestionLite[]
  busy: boolean
  run: (fn: () => Promise<any>) => Promise<void>
  gameId: number
}) {
  const m = match
  const q = m.current_question
  const revealedSet = new Set<number>(m.revealed_answers)
  const usedSet = new Set<number>(m.used_question_ids)
  const errorsMax = m.errors_count >= 3
  const stealingName = m.controlling_team === 'A' ? m.team_b_name : m.team_a_name
  const visibleQuestions = questions.filter((qq) => !usedSet.has(qq.id))
  const isFinished = m.phase === 'finished'

  return (
    <>
      {/* Marcadores */}
      <section className="bg-black/40 rounded-xl p-4 mb-6 border border-gold/30">
        <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-display text-2xl text-gold">
            {m.label}{' '}
            <span className="text-white/40 text-base">
              · meta {m.threshold} pts
            </span>
          </h2>
          {isFinished && (
            <span className="bg-gold text-black text-xs uppercase tracking-widest px-2 py-1 rounded">
              🏆 ganador: {m.winner === 'A' ? m.team_a_name : m.winner === 'B' ? m.team_b_name : '—'}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div
            className={`bg-blue-900/60 p-3 rounded ${
              m.controlling_team === 'A' ? 'ring-2 ring-gold' : ''
            } ${m.winner === 'A' ? 'ring-2 ring-gold' : ''}`}
          >
            <div className="text-xs uppercase text-white/70 truncate">{m.team_a_name}</div>
            <div className="font-display text-5xl">{m.team_a_score}</div>
          </div>
          <div
            className={`bg-red-900/60 p-3 rounded ${
              m.controlling_team === 'B' ? 'ring-2 ring-gold' : ''
            } ${m.winner === 'B' ? 'ring-2 ring-gold' : ''}`}
          >
            <div className="text-xs uppercase text-white/70 truncate">{m.team_b_name}</div>
            <div className="font-display text-5xl">{m.team_b_score}</div>
          </div>
          <div className="bg-green-900/60 p-3 rounded">
            <div className="text-xs uppercase text-white/70">Puntos en juego</div>
            <div className="font-display text-5xl text-green-300">{m.turn_score}</div>
          </div>
          <div className="bg-red-950/70 p-3 rounded">
            <div className="text-xs uppercase text-white/70">Errores</div>
            <div className="font-display text-5xl">{m.errors_count}/3</div>
          </div>
        </div>
      </section>

      {isFinished && (
        <div className="bg-gold/10 border border-gold rounded p-4 mb-6 text-center">
          <div className="text-gold font-display text-xl">
            Llave finalizada. {m.slot !== 'Final' && 'Cuando ambas llaves terminen, se creará la Final automáticamente.'}
          </div>
        </div>
      )}

      {!isFinished && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Preguntas */}
          <section className="bg-black/40 rounded-xl p-4 border border-gold/30">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="font-display text-2xl text-gold">
                Preguntas · {m.round_key}
              </h2>
              <div className="text-xs text-white/60">
                {visibleQuestions.length} disponibles · {usedSet.size} usadas
              </div>
            </div>
            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              {visibleQuestions.map((q2) => (
                <div
                  key={q2.id}
                  className="flex items-center justify-between p-2 rounded border bg-blue-950/40 border-blue-900/60"
                >
                  <div className="text-sm flex-1 mr-3">
                    <span className="text-white/50 mr-2">#{q2.order_index}</span>
                    {q2.text}
                  </div>
                  <button
                    disabled={busy || ['face_off', 'playing', 'steal'].includes(m.phase)}
                    onClick={() => run(() => api.startQuestion(gameId, m.id, q2.id))}
                    className="bg-gold text-black px-3 py-1 rounded text-sm font-bold disabled:opacity-30"
                  >
                    Activar
                  </button>
                </div>
              ))}
              {visibleQuestions.length === 0 && (
                <div className="text-white/50 text-sm italic">
                  No quedan preguntas disponibles.
                </div>
              )}
            </div>

            {usedSet.size > 0 && (
              <details className="mt-4 text-white/60 text-xs">
                <summary className="cursor-pointer hover:text-white">
                  Preguntas ya usadas ({usedSet.size})
                </summary>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  {questions
                    .filter((qq) => usedSet.has(qq.id))
                    .map((qq) => (
                      <li key={qq.id} className="line-through opacity-70">
                        #{qq.order_index} {qq.text}
                      </li>
                    ))}
                </ul>
              </details>
            )}
          </section>

          {/* Pregunta activa */}
          <section className="bg-black/40 rounded-xl p-4 border border-gold/30">
            <h2 className="font-display text-2xl text-gold mb-3">Pregunta activa</h2>
            {!q && (
              <div className="text-white/50 italic">
                Ninguna pregunta activa. Selecciónala en la lista.
              </div>
            )}
            {q && (
              <>
                <div className="bg-blue-950/60 p-3 rounded mb-3">
                  <div className="text-xs uppercase text-white/60 mb-1">
                    #{q.order_index} · {q.round}
                  </div>
                  <div className="text-lg font-bold">{q.text}</div>
                </div>

                {m.phase === 'face_off' && (
                  <FaceOffPanel
                    match={m}
                    gameId={gameId}
                    busy={busy}
                    run={run}
                  />
                )}

                {m.phase !== 'face_off' && (
                  <div className="bg-black/30 rounded p-2 mb-3 text-xs text-white/70 text-center">
                    Control: <b className="text-gold">
                      {m.controlling_team === 'A'
                        ? m.team_a_name
                        : m.controlling_team === 'B'
                        ? m.team_b_name
                        : '—'}
                    </b>
                  </div>
                )}

                <div className="space-y-2 mb-3">
                  {q.answers.map((a) => {
                    const revealed = revealedSet.has(a.id)
                    return (
                      <div
                        key={a.id}
                        className={`flex items-center justify-between p-2 rounded border ${
                          revealed
                            ? 'bg-green-900/40 border-green-600 opacity-60'
                            : 'bg-blue-950/40 border-blue-900'
                        }`}
                      >
                        <div className="flex-1 mr-3">
                          <span className="text-gold mr-2">{a.position}.</span>
                          {a.text}{' '}
                          <span className="text-white/50 text-sm">
                            ({Math.round(a.points)} pts)
                          </span>
                        </div>
                        <button
                          disabled={busy || revealed || m.phase === 'face_off' || !m.controlling_team}
                          onClick={() => run(() => api.reveal(gameId, m.id, a.id))}
                          className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-sm font-bold disabled:opacity-30"
                          title={m.phase === 'face_off' ? 'En face-off, usa el panel superior' : !m.controlling_team ? 'Haz cara a cara primero' : ''}
                        >
                          {revealed ? '✓' : 'Revelar'}
                        </button>
                      </div>
                    )
                  })}
                </div>

                <div className="flex gap-3 mb-3">
                  <button
                    disabled={busy || errorsMax || m.steal_active || !m.controlling_team}
                    onClick={() => run(() => api.error(gameId, m.id))}
                    className="flex-1 bg-red-600 hover:bg-red-500 px-3 py-3 rounded font-bold text-lg disabled:opacity-30"
                    title={!m.controlling_team ? 'Haz cara a cara primero' : ''}
                  >
                    ✗ ERROR ({m.errors_count}/3)
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => run(() => api.endQuestion(gameId, m.id))}
                    className="flex-1 bg-gold text-black px-3 py-3 rounded font-bold text-lg disabled:opacity-30"
                  >
                    Cerrar pregunta
                  </button>
                </div>

                {m.steal_active && (
                  <div className="bg-yellow-900/40 border-2 border-gold rounded p-3">
                    <div className="font-bold mb-2 text-gold uppercase">
                      Robo activo · {stealingName}
                    </div>
                    <div className="flex gap-3">
                      <button
                        disabled={busy}
                        onClick={() => run(() => api.steal(gameId, m.id, true))}
                        className="flex-1 bg-green-600 hover:bg-green-500 px-3 py-2 rounded font-bold"
                      >
                        ✓ Robó
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => run(() => api.steal(gameId, m.id, false))}
                        className="flex-1 bg-red-600 hover:bg-red-500 px-3 py-2 rounded font-bold"
                      >
                        ✗ Falló
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </>
  )
}

interface FaceOffPanelProps {
  match: Match
  gameId: number
  busy: boolean
  run: (fn: () => Promise<any>) => Promise<void>
}

function FaceOffModal({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-yellow-900/30 border-4 border-yellow-500 rounded-2xl p-5 md:p-6 shadow-[0_0_50px_rgba(244,196,48,0.4)]">
        {children}
      </div>
    </div>
  )
}

function FaceOffPanel(props: FaceOffPanelProps) {
  const { match, gameId, busy, run } = props
  const m = match
  const q = m.current_question
  if (!q) return null

  // Step 1: pick buzzer winner
  if (!m.face_off_first_team) {
    return (
      <FaceOffModal>
        <div className="text-center mb-4">
          <div className="font-display text-3xl md:text-4xl text-yellow-300 uppercase tracking-widest">
            🥊 ¿Quién buzzeó primero?
          </div>
          <div className="text-xs text-yellow-100/70 mt-2">
            Marca el equipo cuyo representante presionó primero.
          </div>
        </div>
        <div className="flex gap-3">
          <button
            disabled={busy}
            onClick={() => run(() => api.buzzer(gameId, m.id, 'A'))}
            className="flex-1 bg-blue-700 hover:bg-blue-600 ring-2 ring-yellow-400/60 animate-pulse px-3 py-4 rounded-xl font-bold text-xl"
          >
            🔔 {m.team_a_name}
          </button>
          <button
            disabled={busy}
            onClick={() => run(() => api.buzzer(gameId, m.id, 'B'))}
            className="flex-1 bg-red-700 hover:bg-red-600 ring-2 ring-yellow-400/60 animate-pulse px-3 py-4 rounded-xl font-bold text-xl"
          >
            🔔 {m.team_b_name}
          </button>
        </div>
      </FaceOffModal>
    )
  }

  // Step 2: collect answer(s)
  const first = m.face_off_first_team
  const firstAnsId = first === 'A' ? m.face_off_a_answer_id : m.face_off_b_answer_id
  const firstMissed = first === 'A' ? m.face_off_a_missed : m.face_off_b_missed
  const otherTeam: 'A' | 'B' = first === 'A' ? 'B' : 'A'
  const otherAnsId = first === 'A' ? m.face_off_b_answer_id : m.face_off_a_answer_id
  const otherMissed = first === 'A' ? m.face_off_b_missed : m.face_off_a_missed
  const firstName = first === 'A' ? m.team_a_name : m.team_b_name
  const otherName = otherTeam === 'A' ? m.team_a_name : m.team_b_name

  const firstActed = firstAnsId != null || firstMissed
  const otherActed = otherAnsId != null || otherMissed
  // Determine which team must answer next
  const respondingTeam: 'A' | 'B' = firstActed ? otherTeam : first
  const respondingName = respondingTeam === first ? firstName : otherName

  const firstAns = firstAnsId ? q.answers.find((a) => a.id === firstAnsId) : null
  const otherAns = otherAnsId ? q.answers.find((a) => a.id === otherAnsId) : null

  return (
    <FaceOffModal>
      <div className="text-center mb-3">
        <div className="font-display text-xl md:text-2xl text-yellow-300 uppercase tracking-widest">
          🥊 Cara a cara · Buzzer: <span className="text-gold">{firstName}</span>
        </div>
        <div className="text-[11px] text-yellow-100/60 mt-1 truncate">
          {q.text}
        </div>
      </div>

      {/* Answers given so far */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <FaceOffAnswerCard
          team="A"
          teamName={m.team_a_name}
          ans={first === 'A' ? firstAns : otherAns}
          isFirst={first === 'A'}
          missed={m.face_off_a_missed}
        />
        <FaceOffAnswerCard
          team="B"
          teamName={m.team_b_name}
          ans={first === 'B' ? firstAns : otherAns}
          isFirst={first === 'B'}
          missed={m.face_off_b_missed}
        />
      </div>

      {otherActed && firstActed ? (
        <div className="bg-black/40 rounded p-2 mb-3 text-center">
          <div className="font-display text-yellow-300">Resolviendo…</div>
        </div>
      ) : (
        <>
          <div className="bg-black/40 rounded p-2 mb-3 text-center">
            <div className="text-xs text-yellow-200/80 uppercase tracking-widest">
              Turno de
            </div>
            <div className="font-display text-2xl text-yellow-300">
              {respondingName}
            </div>
            <div className="text-[10px] text-white/60 mt-1">
              Escoge la respuesta que dijo (lista abajo) o marca que falló
            </div>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(() => api.faceOffMiss(gameId, m.id, respondingTeam))
            }
            className="w-full mb-3 bg-red-700 hover:bg-red-600 px-3 py-3 rounded font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <span className="text-2xl">❌</span>
            Falló · {respondingName} no acertó
          </button>
        </>
      )}

      <div className="space-y-1 max-h-[35vh] overflow-y-auto pr-1">
        {q.answers.map((a) => {
          const alreadyUsed = a.id === firstAnsId || a.id === otherAnsId
          return (
            <button
              key={a.id}
              type="button"
              disabled={busy || alreadyUsed}
              onClick={() =>
                run(() => api.faceOffAnswer(gameId, m.id, respondingTeam, a.id))
              }
              className={`w-full flex items-center justify-between p-2 rounded border text-left text-sm ${
                alreadyUsed
                  ? 'bg-green-900/40 border-green-600 opacity-60'
                  : 'bg-blue-950/40 border-blue-900 hover:bg-blue-900/60'
              } disabled:cursor-not-allowed`}
            >
              <span className="flex-1 mr-3">
                <span className="text-gold mr-2">{a.position}.</span>
                {a.text}{' '}
                <span className="text-white/50">({Math.round(a.points)} pts)</span>
              </span>
              <span className="bg-yellow-500/20 text-yellow-200 px-2 py-0.5 rounded text-xs uppercase tracking-widest">
                Asignar a {respondingName}
              </span>
            </button>
          )
        })}
      </div>

      {/* Manual override */}
      <details className="mt-3 text-white/40 text-[10px]">
        <summary className="cursor-pointer hover:text-white">
          ¿Necesitas saltar el flujo? Forzar ganador del cara a cara
        </summary>
        <div className="flex gap-2 mt-2">
          <button
            disabled={busy}
            onClick={() => run(() => api.faceOff(gameId, m.id, 'A'))}
            className="flex-1 bg-blue-900 hover:bg-blue-800 px-2 py-1 rounded text-xs"
          >
            Forzar {m.team_a_name}
          </button>
          <button
            disabled={busy}
            onClick={() => run(() => api.faceOff(gameId, m.id, 'B'))}
            className="flex-1 bg-red-900 hover:bg-red-800 px-2 py-1 rounded text-xs"
          >
            Forzar {m.team_b_name}
          </button>
        </div>
      </details>
    </FaceOffModal>
  )
}

function FaceOffAnswerCard({
  team, teamName, ans, isFirst, missed,
}: {
  team: 'A' | 'B'
  teamName: string
  ans: any
  isFirst: boolean
  missed?: boolean
}) {
  const bg = team === 'A' ? 'bg-blue-900/60 border-blue-500' : 'bg-red-900/60 border-red-500'
  return (
    <div
      className={`relative rounded-lg p-2 border-2 ${bg} ${ans ? 'ring-1 ring-gold' : ''} ${
        missed ? 'ring-2 ring-red-500' : ''
      }`}
    >
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/70">
        <span className="truncate">{teamName}</span>
        {isFirst && <span className="text-yellow-300">🔔 buzzer</span>}
      </div>
      {missed ? (
        <div className="font-display text-2xl text-red-400 mt-1 text-center">
          ❌ falló
        </div>
      ) : ans ? (
        <>
          <div className="font-display text-base text-white truncate mt-1">
            {ans.text}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-white/60">posición #{ans.position}</span>
            <span className="font-display text-gold text-lg">{Math.round(ans.points)} pts</span>
          </div>
        </>
      ) : (
        <div className="font-display text-base text-white/30 mt-1 italic">
          esperando…
        </div>
      )}
    </div>
  )
}
