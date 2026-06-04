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

export type Phase = 'waiting' | 'face_off' | 'playing' | 'steal' | 'showcase' | 'finished'

export interface MatchSummary {
  id: number
  slot: 'L1' | 'L2' | 'Final'
  label: string
  order_index: number
  round_key: string
  threshold: number
  team_a_name: string
  team_b_name: string
  team_a_score: number
  team_b_score: number
  phase: Phase
  winner: 'A' | 'B' | null
}

export interface Match extends MatchSummary {
  current_question: Question | null
  turn_score: number
  controlling_team: 'A' | 'B' | null
  errors_count: number
  revealed_answers: number[]
  steal_active: boolean
  used_question_ids: number[]
  face_off_first_team: 'A' | 'B' | null
  face_off_a_answer_id: number | null
  face_off_b_answer_id: number | null
  face_off_a_missed: boolean
  face_off_b_missed: boolean
}

export interface GameSummary {
  id: number
  name: string
  created_at: string
  status: 'in_progress' | 'finished'
  team_1_name: string
  team_2_name: string
  team_3_name: string
  team_4_name: string
  matches: MatchSummary[]
}

export interface Game {
  id: number
  name: string
  created_at: string
  status: 'in_progress' | 'finished'
  team_1_name: string
  team_2_name: string
  team_3_name: string
  team_4_name: string
  matches: Match[]
}
