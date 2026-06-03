from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, Boolean, DateTime
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
    position = Column(Integer, nullable=False)
    question = relationship("Question", back_populates="answers")


class Game(Base):
    """A full tournament with 4 teams and 3 matches (L1, L2, Final)."""
    __tablename__ = "games"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(120), nullable=False, default="Juego")
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    status = Column(String(20), nullable=False, default="in_progress")  # in_progress|finished
    team_1_name = Column(String(100), nullable=False, default="Equipo 1")
    team_2_name = Column(String(100), nullable=False, default="Equipo 2")
    team_3_name = Column(String(100), nullable=False, default="Equipo 3")
    team_4_name = Column(String(100), nullable=False, default="Equipo 4")
    matches = relationship(
        "Match",
        back_populates="game",
        cascade="all, delete-orphan",
        order_by="Match.order_index",
    )


class Match(Base):
    """A single round/match within a Game."""
    __tablename__ = "matches"
    id = Column(Integer, primary_key=True, autoincrement=True)
    game_id = Column(Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    slot = Column(String(20), nullable=False)  # 'L1' | 'L2' | 'Final'
    order_index = Column(Integer, nullable=False)  # 0,1,2
    label = Column(String(50), nullable=False)  # display label
    round_key = Column(String(20), nullable=False)  # ronda1|ronda2|final|otras
    threshold = Column(Integer, nullable=False, default=150)

    team_a_name = Column(String(100), nullable=False, default="—")
    team_b_name = Column(String(100), nullable=False, default="—")

    phase = Column(String(20), nullable=False, default="waiting")  # waiting|playing|steal|finished
    current_question_id = Column(Integer, ForeignKey("questions.id"), nullable=True)
    team_a_score = Column(Integer, nullable=False, default=0)
    team_b_score = Column(Integer, nullable=False, default=0)
    turn_score = Column(Integer, nullable=False, default=0)
    controlling_team = Column(String(1), nullable=True)
    errors_count = Column(Integer, nullable=False, default=0)
    revealed_answers = Column(ARRAY(Integer), nullable=False, default=list)
    steal_active = Column(Boolean, nullable=False, default=False)
    used_question_ids = Column(ARRAY(Integer), nullable=False, default=list)
    winner = Column(String(1), nullable=True)  # 'A'|'B'|null

    game = relationship("Game", back_populates="matches")
