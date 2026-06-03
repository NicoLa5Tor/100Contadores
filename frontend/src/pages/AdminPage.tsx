import { useEffect, useState } from 'react'
import { useGameSocket } from '../hooks/useGameSocket'
import { api } from '../api'
import type { QuestionLite } from '../types'

const ROUND_OPTIONS: { label: string; key: string }[] = [
  { label: 'Ronda 1', key: 'ronda1' },
  { label: 'Ronda 2', key: 'ronda2' },
  { label: 'Final', key: 'final' },
  { label: 'Otras', key: 'otras' },
]

function labelToKey(label: string): string {
  const found = ROUND_OPTIONS.find((r) => r.label === label)
  return found ? found.key : 'ronda1'
}

export default function AdminPage() {
  const { state, connected } = useGameSocket()
  const [teamA, setTeamA] = useState('')
  const [teamB, setTeamB] = useState('')
  const [roundLabel, setRoundLabel] = useState('Ronda 1')
  const [questions, setQuestions] = useState<QuestionLite[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync local config inputs from server state once
  useEffect(() => {
    if (state && teamA === '' && teamB === '') {
      setTeamA(state.team_a_name)
      setTeamB(state.team_b_name)
      setRoundLabel(state.round_label)
    }
  }, [state])

  // Load questions for chosen round
  useEffect(() => {
    const key = labelToKey(roundLabel)
    api
      .listQuestions(key)
      .then((qs) => setQuestions(qs))
      .catch((e) => setError(String(e)))
  }, [roundLabel])

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

  if (!state) {
    return (
      <div className="h-screen flex items-center justify-center bg-navy">
        <div className="font-display text-4xl text-gold">
          {connected ? 'Cargando estado…' : 'Conectando…'}
        </div>
      </div>
    )
  }

  const q = state.current_question
  const revealedSet = new Set(state.revealed_answers)
  const errorsMax = state.errors_count >= 3
  const stealingName = state.controlling_team === 'A' ? state.team_b_name : state.team_a_name

  return (
    <div className="min-h-screen p-6 bg-navy text-white font-body">
      <header className="flex items-baseline justify-between mb-6">
        <h1 className="font-display text-4xl text-gold">PANEL DEL MODERADOR</h1>
        <div className="text-sm">
          WS:{' '}
          <span className={connected ? 'text-green-400' : 'text-red-400'}>
            {connected ? 'conectado' : 'desconectado'}
          </span>
        </div>
      </header>

      {error && (
        <div className="bg-red-900/80 border border-red-500 p-3 mb-4 rounded">
          {error}
        </div>
      )}

      <section className="bg-black/40 rounded-xl p-4 mb-6 border border-gold/30">
        <h2 className="font-display text-2xl text-gold mb-3">Configuración</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <label className="flex flex-col">
            <span className="text-xs uppercase text-white/70 mb-1">Equipo A</span>
            <input
              className="bg-blue-950 px-3 py-2 rounded border border-blue-800"
              value={teamA}
              onChange={(e) => setTeamA(e.target.value)}
            />
          </label>
          <label className="flex flex-col">
            <span className="text-xs uppercase text-white/70 mb-1">Equipo B</span>
            <input
              className="bg-red-950 px-3 py-2 rounded border border-red-800"
              value={teamB}
              onChange={(e) => setTeamB(e.target.value)}
            />
          </label>
          <label className="flex flex-col">
            <span className="text-xs uppercase text-white/70 mb-1">Ronda</span>
            <select
              className="bg-black/60 px-3 py-2 rounded border border-gold/40"
              value={roundLabel}
              onChange={(e) => setRoundLabel(e.target.value)}
            >
              {ROUND_OPTIONS.map((r) => (
                <option key={r.key} value={r.label}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={busy}
            onClick={() =>
              run(() =>
                api.setup({
                  team_a_name: teamA,
                  team_b_name: teamB,
                  round_label: roundLabel,
                })
              )
            }
            className="bg-gold text-black font-bold px-4 py-2 rounded hover:brightness-110 disabled:opacity-40"
          >
            Guardar configuración
          </button>
        </div>
      </section>

      <section className="bg-black/40 rounded-xl p-4 mb-6 border border-gold/30">
        <h2 className="font-display text-2xl text-gold mb-3">
          Marcadores ({state.round_label})
        </h2>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="bg-blue-900/60 p-3 rounded">
            <div className="text-xs uppercase text-white/70">{state.team_a_name}</div>
            <div className="font-display text-5xl">{state.team_a_score}</div>
          </div>
          <div className="bg-red-900/60 p-3 rounded">
            <div className="text-xs uppercase text-white/70">{state.team_b_name}</div>
            <div className="font-display text-5xl">{state.team_b_score}</div>
          </div>
          <div className="bg-green-900/60 p-3 rounded">
            <div className="text-xs uppercase text-white/70">Puntos en juego</div>
            <div className="font-display text-5xl text-green-300">{state.turn_score}</div>
          </div>
          <div className="bg-red-950/70 p-3 rounded">
            <div className="text-xs uppercase text-white/70">Errores</div>
            <div className="font-display text-5xl">{state.errors_count}/3</div>
          </div>
        </div>
        <div className="text-xs text-white/60 mt-2">
          Fase: <b>{state.phase}</b> · Control:{' '}
          <b>
            {state.controlling_team === 'A'
              ? state.team_a_name
              : state.controlling_team === 'B'
              ? state.team_b_name
              : '—'}
          </b>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-black/40 rounded-xl p-4 border border-gold/30">
          <h2 className="font-display text-2xl text-gold mb-3">
            Preguntas ({roundLabel})
          </h2>
          <div className="max-h-[60vh] overflow-y-auto space-y-2">
            {questions.map((q2) => {
              const active = state.current_question?.id === q2.id
              return (
                <div
                  key={q2.id}
                  className={`flex items-center justify-between p-2 rounded border ${
                    active
                      ? 'bg-gold/20 border-gold'
                      : 'bg-blue-950/40 border-blue-900/60'
                  }`}
                >
                  <div className="text-sm flex-1 mr-3">
                    <span className="text-white/50 mr-2">#{q2.order_index}</span>
                    {q2.text}
                  </div>
                  <button
                    disabled={busy}
                    onClick={() => run(() => api.startQuestion(q2.id))}
                    className="bg-gold text-black px-3 py-1 rounded text-sm font-bold disabled:opacity-40"
                  >
                    {active ? 'Activa' : 'Activar'}
                  </button>
                </div>
              )
            })}
            {questions.length === 0 && (
              <div className="text-white/50 text-sm">No hay preguntas cargadas.</div>
            )}
          </div>
        </section>

        <section className="bg-black/40 rounded-xl p-4 border border-gold/30">
          <h2 className="font-display text-2xl text-gold mb-3">Pregunta activa</h2>
          {!q && <div className="text-white/50">Ninguna activa. Selecciona arriba.</div>}
          {q && (
            <>
              <div className="bg-blue-950/60 p-3 rounded mb-3">
                <div className="text-xs uppercase text-white/60 mb-1">
                  #{q.order_index} · {q.round}
                </div>
                <div className="text-lg font-bold">{q.text}</div>
              </div>

              <div className="flex gap-3 mb-3">
                <button
                  disabled={busy}
                  onClick={() => run(() => api.faceOff('A'))}
                  className={`flex-1 px-3 py-2 rounded font-bold ${
                    state.controlling_team === 'A'
                      ? 'bg-blue-500'
                      : 'bg-blue-800 hover:bg-blue-700'
                  }`}
                >
                  Cara a cara → {state.team_a_name}
                </button>
                <button
                  disabled={busy}
                  onClick={() => run(() => api.faceOff('B'))}
                  className={`flex-1 px-3 py-2 rounded font-bold ${
                    state.controlling_team === 'B'
                      ? 'bg-red-500'
                      : 'bg-red-800 hover:bg-red-700'
                  }`}
                >
                  Cara a cara → {state.team_b_name}
                </button>
              </div>

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
                        disabled={busy || revealed}
                        onClick={() => run(() => api.reveal(a.id))}
                        className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-sm font-bold disabled:opacity-30"
                      >
                        {revealed ? 'Revelada' : 'Revelar'}
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-3 mb-3">
                <button
                  disabled={busy || errorsMax || state.steal_active}
                  onClick={() => run(() => api.error())}
                  className="flex-1 bg-red-600 hover:bg-red-500 px-3 py-3 rounded font-bold text-lg disabled:opacity-30"
                >
                  ✗ ERROR ({state.errors_count}/3)
                </button>
                <button
                  disabled={busy}
                  onClick={() => run(() => api.endQuestion())}
                  className="flex-1 bg-gold text-black px-3 py-3 rounded font-bold text-lg disabled:opacity-30"
                >
                  Cerrar pregunta
                </button>
              </div>

              {state.steal_active && (
                <div className="bg-yellow-900/40 border-2 border-gold rounded p-3">
                  <div className="font-bold mb-2 text-gold uppercase">
                    Robo activo · {stealingName}
                  </div>
                  <div className="flex gap-3">
                    <button
                      disabled={busy}
                      onClick={() => run(() => api.steal(true))}
                      className="flex-1 bg-green-600 hover:bg-green-500 px-3 py-2 rounded font-bold"
                    >
                      ✓ Robó
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => run(() => api.steal(false))}
                      className="flex-1 bg-red-600 hover:bg-red-500 px-3 py-2 rounded font-bold"
                    >
                      ✗ Falló el robo
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <div className="mt-6 text-right">
        <button
          disabled={busy}
          onClick={() => {
            if (confirm('¿Reiniciar todo el juego? Se borrarán los marcadores.')) {
              run(() => api.reset())
            }
          }}
          className="bg-red-800 hover:bg-red-700 px-4 py-2 rounded text-sm"
        >
          Reiniciar juego
        </button>
      </div>
    </div>
  )
}
