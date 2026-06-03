from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_session
from models import Question, Answer, GameState
from schemas import (
    GameStateOut, QuestionOut, AnswerOut, QuestionLite,
    SetupIn, StartQuestionIn, FaceOffIn, RevealIn, StealIn,
)

router = APIRouter(prefix="/api")

ROUND_LABEL_TO_KEY = {
    "Ronda 1": "ronda1",
    "Ronda 2": "ronda2",
    "Final": "final",
    "Otras": "otras",
}

WIN_THRESHOLD_ROUND = 150
WIN_THRESHOLD_FINAL = 300


async def _get_state(session: AsyncSession) -> GameState:
    res = await session.execute(select(GameState).where(GameState.id == 1))
    state = res.scalar_one_or_none()
    if state is None:
        state = GameState(
            id=1, phase="waiting", round_label="Ronda 1",
            team_a_name="Equipo A", team_b_name="Equipo B",
            revealed_answers=[],
        )
        session.add(state)
        await session.commit()
        await session.refresh(state)
    return state


async def _get_question_with_answers(session: AsyncSession, qid: int):
    res = await session.execute(
        select(Question).options(selectinload(Question.answers)).where(Question.id == qid)
    )
    return res.scalar_one_or_none()


async def build_state_payload(session: AsyncSession) -> dict:
    state = await _get_state(session)
    q_payload = None
    if state.current_question_id:
        q = await _get_question_with_answers(session, state.current_question_id)
        if q:
            q_payload = QuestionOut(
                id=q.id, round=q.round, order_index=q.order_index, text=q.text,
                answers=[AnswerOut.model_validate(a) for a in q.answers],
            ).model_dump()
    return GameStateOut(
        phase=state.phase,
        round_label=state.round_label,
        team_a_name=state.team_a_name,
        team_b_name=state.team_b_name,
        team_a_score=state.team_a_score,
        team_b_score=state.team_b_score,
        turn_score=state.turn_score,
        controlling_team=state.controlling_team,
        errors_count=state.errors_count,
        revealed_answers=list(state.revealed_answers or []),
        steal_active=state.steal_active,
        current_question=q_payload,
    ).model_dump()


async def _broadcast(session: AsyncSession):
    from routers.ws import manager
    payload = await build_state_payload(session)
    await manager.broadcast({"type": "STATE_UPDATE", "data": payload})


def _winning_team_total(round_label: str, score: int) -> bool:
    threshold = WIN_THRESHOLD_FINAL if round_label.lower().startswith("final") else WIN_THRESHOLD_ROUND
    return score >= threshold


@router.get("/game/state", response_model=GameStateOut)
async def get_state(session: AsyncSession = Depends(get_session)):
    return await build_state_payload(session)


@router.get("/questions")
async def list_questions(round: str | None = None, session: AsyncSession = Depends(get_session)):
    stmt = select(Question).order_by(Question.round, Question.order_index)
    if round:
        stmt = stmt.where(Question.round == round)
    res = await session.execute(stmt)
    qs = res.scalars().all()
    return [QuestionLite.model_validate(q).model_dump() for q in qs]


@router.post("/game/setup")
async def setup(data: SetupIn, session: AsyncSession = Depends(get_session)):
    state = await _get_state(session)
    state.team_a_name = data.team_a_name.strip() or "Equipo A"
    state.team_b_name = data.team_b_name.strip() or "Equipo B"
    state.round_label = data.round_label
    await session.commit()
    await _broadcast(session)
    return await build_state_payload(session)


@router.post("/game/start-question")
async def start_question(data: StartQuestionIn, session: AsyncSession = Depends(get_session)):
    state = await _get_state(session)
    q = await _get_question_with_answers(session, data.question_id)
    if not q:
        raise HTTPException(404, "question not found")
    state.current_question_id = q.id
    state.phase = "playing"
    state.turn_score = 0
    state.controlling_team = None
    state.errors_count = 0
    state.revealed_answers = []
    state.steal_active = False
    await session.commit()
    await _broadcast(session)
    return await build_state_payload(session)


@router.post("/game/face-off")
async def face_off(data: FaceOffIn, session: AsyncSession = Depends(get_session)):
    if data.winner not in ("A", "B"):
        raise HTTPException(400, "winner must be 'A' or 'B'")
    state = await _get_state(session)
    state.controlling_team = data.winner
    await session.commit()
    await _broadcast(session)
    return await build_state_payload(session)


@router.post("/game/reveal")
async def reveal(data: RevealIn, session: AsyncSession = Depends(get_session)):
    state = await _get_state(session)
    if not state.current_question_id:
        raise HTTPException(400, "no active question")
    q = await _get_question_with_answers(session, state.current_question_id)
    target = next((a for a in q.answers if a.id == data.answer_id), None)
    if not target:
        raise HTTPException(404, "answer not found")
    revealed = list(state.revealed_answers or [])
    if target.id in revealed:
        return await build_state_payload(session)
    revealed.append(target.id)
    state.revealed_answers = revealed
    state.turn_score = int(state.turn_score + round(target.points))

    # If steal_active and reveal happens => stealing team got it
    if state.steal_active:
        stealing = "B" if state.controlling_team == "A" else "A"
        await _award_turn(session, state, stealing)
    elif len(revealed) >= len(q.answers):
        # all revealed -> controlling team wins points
        if state.controlling_team:
            await _award_turn(session, state, state.controlling_team)

    await session.commit()
    await _broadcast(session)
    return await build_state_payload(session)


@router.post("/game/error")
async def error(session: AsyncSession = Depends(get_session)):
    state = await _get_state(session)
    if state.steal_active:
        raise HTTPException(400, "robo activo, no más errores")
    state.errors_count = min(3, state.errors_count + 1)
    if state.errors_count >= 3:
        state.steal_active = True
        state.phase = "steal"
    await session.commit()
    await _broadcast(session)
    return await build_state_payload(session)


async def _award_turn(session: AsyncSession, state: GameState, team: str):
    if team == "A":
        state.team_a_score += state.turn_score
    else:
        state.team_b_score += state.turn_score
    state.turn_score = 0
    state.steal_active = False
    state.controlling_team = None
    state.current_question_id = None
    state.errors_count = 0
    state.revealed_answers = []
    # Check victory
    winning_a = _winning_team_total(state.round_label, state.team_a_score)
    winning_b = _winning_team_total(state.round_label, state.team_b_score)
    if winning_a or winning_b:
        state.phase = "finished"
    else:
        state.phase = "waiting"


@router.post("/game/steal")
async def steal(data: StealIn, session: AsyncSession = Depends(get_session)):
    state = await _get_state(session)
    if not state.steal_active:
        raise HTTPException(400, "no hay robo activo")
    if data.success:
        stealing = "B" if state.controlling_team == "A" else "A"
        await _award_turn(session, state, stealing)
    else:
        # Failed steal -> controlling team gets points
        if state.controlling_team:
            await _award_turn(session, state, state.controlling_team)
    await session.commit()
    await _broadcast(session)
    return await build_state_payload(session)


@router.post("/game/end-question")
async def end_question(session: AsyncSession = Depends(get_session)):
    state = await _get_state(session)
    if state.controlling_team and state.turn_score > 0:
        await _award_turn(session, state, state.controlling_team)
    else:
        state.turn_score = 0
        state.steal_active = False
        state.controlling_team = None
        state.current_question_id = None
        state.errors_count = 0
        state.revealed_answers = []
        state.phase = "waiting"
    await session.commit()
    await _broadcast(session)
    return await build_state_payload(session)


@router.post("/game/reset")
async def reset(session: AsyncSession = Depends(get_session)):
    state = await _get_state(session)
    state.phase = "waiting"
    state.current_question_id = None
    state.team_a_score = 0
    state.team_b_score = 0
    state.turn_score = 0
    state.controlling_team = None
    state.errors_count = 0
    state.revealed_answers = []
    state.steal_active = False
    await session.commit()
    await _broadcast(session)
    return await build_state_payload(session)
