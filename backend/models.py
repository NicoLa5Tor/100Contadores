from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from database import Base


class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True)
    round = Column(String(20), nullable=False, index=True)  # ronda1|ronda2|final|otras
    order_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    answers = relationship(
        "Answer",
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="Answer.position",
    )


class Answer(Base):
    __tablename__ = "answers"
    id = Column(Integer, primary_key=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    text = Column(Text, nullable=False)
    points = Column(Float, nullable=False)
    position = Column(Integer, nullable=False)  # 1..7
    question = relationship("Question", back_populates="answers")


class GameState(Base):
    __tablename__ = "game_state"
    id = Column(Integer, primary_key=True, default=1)
    phase = Column(String(20), nullable=False, default="waiting")  # waiting|playing|steal|finished
    current_question_id = Column(Integer, ForeignKey("questions.id"), nullable=True)
    round_label = Column(String(50), nullable=False, default="Ronda 1")
    team_a_name = Column(String(100), nullable=False, default="Equipo A")
    team_b_name = Column(String(100), nullable=False, default="Equipo B")
    team_a_score = Column(Integer, nullable=False, default=0)
    team_b_score = Column(Integer, nullable=False, default=0)
    turn_score = Column(Integer, nullable=False, default=0)
    controlling_team = Column(String(1), nullable=True)  # 'A'|'B'|null
    errors_count = Column(Integer, nullable=False, default=0)
    revealed_answers = Column(ARRAY(Integer), nullable=False, default=list)
    steal_active = Column(Boolean, nullable=False, default=False)
