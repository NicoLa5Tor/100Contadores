from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List


class AnswerOut(BaseModel):
    id: int
    text: str
    points: float
    position: int

    class Config:
        from_attributes = True


class QuestionOut(BaseModel):
    id: int
    round: str
    order_index: int
    text: str
    answers: List[AnswerOut]

    class Config:
        from_attributes = True


class QuestionLite(BaseModel):
    id: int
    round: str
    order_index: int
    text: str

    class Config:
        from_attributes = True


class MatchSummary(BaseModel):
    id: int
    slot: str
    label: str
    order_index: int
    round_key: str
    threshold: int
    team_a_name: str
    team_b_name: str
    team_a_score: int
    team_b_score: int
    phase: str
    winner: Optional[str]


class MatchOut(MatchSummary):
    current_question: Optional[QuestionOut]
    turn_score: int
    controlling_team: Optional[str]
    errors_count: int
    revealed_answers: List[int]
    steal_active: bool
    used_question_ids: List[int]


class GameSummary(BaseModel):
    id: int
    name: str
    created_at: datetime
    status: str
    team_1_name: str
    team_2_name: str
    team_3_name: str
    team_4_name: str
    matches: List[MatchSummary]


class GameOut(BaseModel):
    id: int
    name: str
    created_at: datetime
    status: str
    team_1_name: str
    team_2_name: str
    team_3_name: str
    team_4_name: str
    matches: List[MatchOut]


class CreateGameIn(BaseModel):
    name: Optional[str] = None
    team_1_name: str
    team_2_name: str
    team_3_name: str
    team_4_name: str


class StartQuestionIn(BaseModel):
    question_id: int


class FaceOffIn(BaseModel):
    winner: str  # 'A' | 'B'


class RevealIn(BaseModel):
    answer_id: int


class StealIn(BaseModel):
    success: bool
