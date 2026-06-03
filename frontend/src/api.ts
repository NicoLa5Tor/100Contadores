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
  return res.json()
}

export const api = {
  getState: () => req('/api/game/state'),
  listQuestions: (round?: string) => req(`/api/questions${round ? `?round=${round}` : ''}`),
  setup: (data: { team_a_name: string; team_b_name: string; round_label: string }) =>
    req('/api/game/setup', { method: 'POST', body: JSON.stringify(data) }),
  startQuestion: (question_id: number) =>
    req('/api/game/start-question', { method: 'POST', body: JSON.stringify({ question_id }) }),
  faceOff: (winner: 'A' | 'B') =>
    req('/api/game/face-off', { method: 'POST', body: JSON.stringify({ winner }) }),
  reveal: (answer_id: number) =>
    req('/api/game/reveal', { method: 'POST', body: JSON.stringify({ answer_id }) }),
  error: () => req('/api/game/error', { method: 'POST' }),
  steal: (success: boolean) =>
    req('/api/game/steal', { method: 'POST', body: JSON.stringify({ success }) }),
  endQuestion: () => req('/api/game/end-question', { method: 'POST' }),
  reset: () => req('/api/game/reset', { method: 'POST' }),
}
