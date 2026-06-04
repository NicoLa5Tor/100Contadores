const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function req(path: string, init?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`${res.status}: ${txt}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  listGames: () => req('/api/games'),
  createGame: (data: {
    name?: string
    team_1_name: string
    team_2_name: string
    team_3_name: string
    team_4_name: string
  }) => req('/api/games', { method: 'POST', body: JSON.stringify(data) }),
  getGame: (id: number) => req(`/api/games/${id}`),
  deleteGame: (id: number) => req(`/api/games/${id}`, { method: 'DELETE' }),

  listQuestions: (round?: string) =>
    req(`/api/questions${round ? `?round=${round}` : ''}`),

  startQuestion: (gameId: number, matchId: number, question_id: number) =>
    req(`/api/games/${gameId}/matches/${matchId}/start-question`, {
      method: 'POST',
      body: JSON.stringify({ question_id }),
    }),
  faceOff: (gameId: number, matchId: number, winner: 'A' | 'B') =>
    req(`/api/games/${gameId}/matches/${matchId}/face-off`, {
      method: 'POST',
      body: JSON.stringify({ winner }),
    }),
  buzzer: (gameId: number, matchId: number, team: 'A' | 'B') =>
    req(`/api/games/${gameId}/matches/${matchId}/buzzer`, {
      method: 'POST',
      body: JSON.stringify({ team }),
    }),
  faceOffAnswer: (gameId: number, matchId: number, team: 'A' | 'B', answer_id: number) =>
    req(`/api/games/${gameId}/matches/${matchId}/face-off-answer`, {
      method: 'POST',
      body: JSON.stringify({ team, answer_id }),
    }),
  faceOffMiss: (gameId: number, matchId: number, team: 'A' | 'B') =>
    req(`/api/games/${gameId}/matches/${matchId}/face-off-miss`, {
      method: 'POST',
      body: JSON.stringify({ team }),
    }),
  faceOffReplay: (gameId: number, matchId: number) =>
    req(`/api/games/${gameId}/matches/${matchId}/face-off-replay`, { method: 'POST' }),
  reveal: (gameId: number, matchId: number, answer_id: number) =>
    req(`/api/games/${gameId}/matches/${matchId}/reveal`, {
      method: 'POST',
      body: JSON.stringify({ answer_id }),
    }),
  error: (gameId: number, matchId: number) =>
    req(`/api/games/${gameId}/matches/${matchId}/error`, { method: 'POST' }),
  steal: (gameId: number, matchId: number, success: boolean) =>
    req(`/api/games/${gameId}/matches/${matchId}/steal`, {
      method: 'POST',
      body: JSON.stringify({ success }),
    }),
  endQuestion: (gameId: number, matchId: number) =>
    req(`/api/games/${gameId}/matches/${matchId}/end-question`, { method: 'POST' }),
  finishMatch: (gameId: number, matchId: number) =>
    req(`/api/games/${gameId}/matches/${matchId}/finish`, { method: 'POST' }),
  resetMatch: (gameId: number, matchId: number) =>
    req(`/api/games/${gameId}/matches/${matchId}/reset`, { method: 'POST' }),
}
