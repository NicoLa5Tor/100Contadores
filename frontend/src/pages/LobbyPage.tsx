import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLobbySocket } from '../hooks/useLobbySocket'
import { api } from '../api'
import type { GameSummary } from '../types'
import Bracket from '../components/Bracket'

export default function LobbyPage() {
  const { games, connected } = useLobbySocket()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="min-h-screen stage-bg text-white font-body">
      <header className="px-6 py-4 border-b border-gold/30 bg-black/40 flex items-center justify-between">
        <h1 className="font-display title-glow text-2xl md:text-4xl">
          🎙 100 CONTADORES DIJERON 🎙
        </h1>
        <span className="text-xs">
          WS:{' '}
          <span className={connected ? 'text-green-400' : 'text-red-400'}>
            {connected ? '●' : '○'}
          </span>
        </span>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {error && (
          <div className="bg-red-900/80 border border-red-500 p-3 mb-4 rounded">{error}</div>
        )}

        {!creating ? (
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h2 className="font-display text-3xl text-gold">Torneos</h2>
            <button
              onClick={() => setCreating(true)}
              className="bg-gold text-black font-bold px-5 py-3 rounded-lg uppercase tracking-widest hover:brightness-110"
            >
              + Crear torneo
            </button>
          </div>
        ) : (
          <CreateGameForm
            onCancel={() => setCreating(false)}
            onCreated={(g: any) => {
              setCreating(false)
              window.location.href = `/admin/${g.id}`
            }}
            onError={setError}
          />
        )}

        {!creating && <GameList games={games} onError={setError} />}
      </main>
    </div>
  )
}

function CreateGameForm({
  onCancel,
  onCreated,
  onError,
}: {
  onCancel: () => void
  onCreated: (g: any) => void
  onError: (msg: string) => void
}) {
  const [name, setName] = useState('')
  const [t1, setT1] = useState('')
  const [t2, setT2] = useState('')
  const [t3, setT3] = useState('')
  const [t4, setT4] = useState('')
  const [busy, setBusy] = useState(false)
  const valid = t1.trim() && t2.trim() && t3.trim() && t4.trim()

  const submit = async () => {
    setBusy(true)
    try {
      const g = await api.createGame({
        name: name.trim() || undefined,
        team_1_name: t1, team_2_name: t2,
        team_3_name: t3, team_4_name: t4,
      })
      onCreated(g)
    } catch (e: any) {
      onError(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto bg-gradient-to-br from-blue-950 to-black/60 rounded-3xl p-6 md:p-8 border-4 border-gold panel-bevel">
      <h2 className="font-display title-glow text-3xl mb-2 text-center">CREAR TORNEO</h2>
      <p className="text-center text-white/70 text-sm mb-6">
        4 equipos · Llave 1 (Eq.1 vs Eq.2 · Ronda 1) · Llave 2 (Eq.3 vs Eq.4 · Ronda 2) · Final (ganadores · 300 pts)
      </p>

      <div className="space-y-4">
        <label className="block">
          <span className="text-xs uppercase text-gold tracking-widest mb-1 block">
            Nombre del torneo (opcional)
          </span>
          <input
            className="w-full bg-black/60 px-4 py-3 rounded-lg border-2 border-gold/30 focus:border-gold outline-none"
            placeholder="Ej: Cierre de año 2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TeamInput label="Equipo 1 (Llave 1)" value={t1} onChange={setT1} color="blue" />
          <TeamInput label="Equipo 2 (Llave 1)" value={t2} onChange={setT2} color="red" />
          <TeamInput label="Equipo 3 (Llave 2)" value={t3} onChange={setT3} color="blue" />
          <TeamInput label="Equipo 4 (Llave 2)" value={t4} onChange={setT4} color="red" />
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 bg-white/10 hover:bg-white/20 px-4 py-3 rounded-lg uppercase tracking-widest text-sm"
          >
            Cancelar
          </button>
          <button
            disabled={busy || !valid}
            onClick={submit}
            className="flex-[2] bg-gold text-black font-bold px-4 py-3 rounded-lg uppercase tracking-widest disabled:opacity-40 hover:brightness-110"
          >
            {busy ? 'Creando…' : '▶ Crear torneo'}
          </button>
        </div>
        {!valid && (
          <p className="text-xs text-red-300 text-center">
            Ingresa los nombres de los 4 equipos.
          </p>
        )}
      </div>
    </div>
  )
}

function TeamInput({
  label, value, onChange, color,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  color: 'blue' | 'red'
}) {
  const bg = color === 'blue' ? 'bg-blue-950 border-blue-700' : 'bg-red-950 border-red-700'
  return (
    <label className="block">
      <span className="text-xs uppercase text-gold tracking-widest mb-1 block">{label}</span>
      <input
        className={`w-full ${bg} px-4 py-3 rounded-lg border-2 focus:border-gold outline-none`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function GameList({
  games,
  onError,
}: {
  games: GameSummary[] | null
  onError: (msg: string) => void
}) {
  if (games == null) {
    return <div className="text-white/60 text-center py-10">Conectando…</div>
  }
  if (games.length === 0) {
    return (
      <div className="text-center py-20 text-white/60">
        <div className="text-6xl mb-3">🎙</div>
        <div className="font-display text-3xl text-gold mb-2">Aún no hay torneos</div>
        <div className="text-sm">Crea uno con el botón de arriba.</div>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-4">
      {games.map((g) => (
        <GameCard key={g.id} game={g} onError={onError} />
      ))}
    </div>
  )
}

function GameCard({
  game,
  onError,
}: {
  game: GameSummary
  onError: (msg: string) => void
}) {
  const remove = async () => {
    if (!confirm(`¿Eliminar "${game.name}"? Esta acción no se puede deshacer.`)) return
    try {
      await api.deleteGame(game.id)
    } catch (e: any) {
      onError(e.message || String(e))
    }
  }
  const statusColor =
    game.status === 'finished' ? 'bg-gold text-black' : 'bg-green-700 text-white'
  return (
    <div className="bg-black/50 border border-gold/30 rounded-2xl p-4 panel-bevel">
      <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
        <div className="min-w-0">
          <div className="font-display text-2xl text-gold truncate">{game.name}</div>
          <div className="text-[10px] text-white/40">
            Creado: {new Date(game.created_at).toLocaleString()}
          </div>
        </div>
        <span
          className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded ${statusColor}`}
        >
          {game.status === 'finished' ? '🏆 finalizado' : 'en curso'}
        </span>
      </div>

      <Bracket matches={game.matches} compact />

      <div className="flex flex-wrap gap-2 mt-4">
        <Link
          to={`/admin/${game.id}`}
          className="flex-1 text-center bg-gold text-black font-bold px-3 py-2 rounded text-sm hover:brightness-110"
        >
          Moderar
        </Link>
        <Link
          to={`/screen/${game.id}`}
          className="flex-1 text-center bg-blue-700 hover:bg-blue-600 px-3 py-2 rounded text-sm font-bold"
        >
          Pantalla
        </Link>
        <button
          onClick={remove}
          className="bg-red-800 hover:bg-red-700 px-3 py-2 rounded text-sm"
          title="Eliminar"
        >
          🗑
        </button>
      </div>
    </div>
  )
}
