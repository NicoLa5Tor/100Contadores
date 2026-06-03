export interface Answer {
  id: number
  text: string
  points: number
  position: number
}

export interface Question {
  id: number
  round: string
  order_index: number
  text: string
  answers: Answer[]
}

export interface QuestionLite {
  id: number
  round: string
  order_index: number
  text: string
}

export interface GameState {
  phase: 'waiting' | 'playing' | 'steal' | 'finished'
  round_label: string
  team_a_name: string
  team_b_name: string
  team_a_score: number
  team_b_score: number
  turn_score: number
  controlling_team: 'A' | 'B' | null
  errors_count: number
  revealed_answers: number[]
  steal_active: boolean
  current_question: Question | null
}
