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


class GameStateOut(BaseModel):
    phase: str
    round_label: str
    team_a_name: str
    team_b_name: str
    team_a_score: int
    team_b_score: int
    turn_score: int
    controlling_team: Optional[str]
    errors_count: int
    revealed_answers: List[int]
    steal_active: bool
    current_question: Optional[QuestionOut]


class SetupIn(BaseModel):
    team_a_name: str
    team_b_name: str
    round_label: str


class StartQuestionIn(BaseModel):
    question_id: int


class FaceOffIn(BaseModel):
    winner: str  # 'A' | 'B'


class RevealIn(BaseModel):
    answer_id: int


class StealIn(BaseModel):
    success: bool
