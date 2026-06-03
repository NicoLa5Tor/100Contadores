from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_session
from models import Question, Game, Match
from schemas import (
    GameOut, GameSummary, MatchOut, MatchSummary,
    QuestionOut, AnswerOut, QuestionLite,
    StartQuestionIn, FaceOffIn, RevealIn, StealIn, CreateGameIn,
)

router = APIRouter(prefix="/api")

ROUND_THRESHOLD = 150
FINAL_THRESHOLD = 300


# ---------- helpers ----------

async def _get_game(session: AsyncSession, game_id: int) -> Game:
    res = await session.execute(
        select(Game).options(selectinload(Game.matches)).where(Game.id == game_id)
    )
    g = res.scalar_one_or_none()
    if not g:
        raise HTTPException(404, f"game {game_id} not found")
    return g


async def _get_match(session: AsyncSession, game_id: int, match_id: int) -> Match:
    res = await session.execute(
        select(Match).where(Match.id == match_id, Match.game_id == game_id)
    )
    m = res.scalar_one_or_none()
    if not m:
        raise HTTPException(404, f"match {match_id} not found in game {game_id}")
    return m


async def _get_question_with_answers(session: AsyncSession, qid: int):
    res = await session.execute(
        select(Question).options(selectinload(Question.answers)).where(Question.id == qid)
    )
    return res.scalar_one_or_none()


def _match_summary(m: Match) -> dict:
    return MatchSummary(
        id=m.id, slot=m.slot, label=m.label, order_index=m.order_index,
        round_key=m.round_key, threshold=m.threshold,
        team_a_name=m.team_a_name, team_b_name=m.team_b_name,
        team_a_score=m.team_a_score, team_b_score=m.team_b_score,
        phase=m.phase, winner=m.winner,
    ).model_dump(mode="json")


async def _match_full(session: AsyncSession, m: Match) -> dict:
    q_payload = None
    if m.current_question_id:
        q = await _get_question_with_answers(session, m.current_question_id)
        if q:
            q_payload = QuestionOut(
                id=q.id, round=q.round, order_index=q.order_index, text=q.text,
                answers=[AnswerOut.model_validate(a) for a in q.answers],
            ).model_dump()
    return MatchOut(
        id=m.id, slot=m.slot, label=m.label, order_index=m.order_index,
        round_key=m.round_key, threshold=m.threshold,
        team_a_name=m.team_a_name, team_b_name=m.team_b_name,
        team_a_score=m.team_a_score, team_b_score=m.team_b_score,
        phase=m.phase, winner=m.winner,
        current_question=q_payload,
        turn_score=m.turn_score,
        controlling_team=m.controlling_team,
        errors_count=m.errors_count,
        revealed_answers=list(m.revealed_answers or []),
        steal_active=m.steal_active,
        used_question_ids=list(m.used_question_ids or []),
    ).model_dump(mode="json")


async def build_game_payload(session: AsyncSession, g: Game) -> dict:
    matches_sorted = sorted(g.matches, key=lambda x: x.order_index)
    matches_full = [await _match_full(session, m) for m in matches_sorted]
    return GameOut(
        id=g.id, name=g.name, created_at=g.created_at, status=g.status,
        team_1_name=g.team_1_name, team_2_name=g.team_2_name,
        team_3_name=g.team_3_name, team_4_name=g.team_4_name,
        matches=matches_full,
    ).model_dump(mode="json")


async def build_game_summary(g: Game) -> dict:
    matches = sorted(g.matches, key=lambda x: x.order_index)
    return GameSummary(
        id=g.id, name=g.name, created_at=g.created_at, status=g.status,
        team_1_name=g.team_1_name, team_2_name=g.team_2_name,
        team_3_name=g.team_3_name, team_4_name=g.team_4_name,
        matches=[MatchSummary(
            id=m.id, slot=m.slot, label=m.label, order_index=m.order_index,
            round_key=m.round_key, threshold=m.threshold,
            team_a_name=m.team_a_name, team_b_name=m.team_b_name,
            team_a_score=m.team_a_score, team_b_score=m.team_b_score,
            phase=m.phase, winner=m.winner,
        ) for m in matches],
    ).model_dump(mode="json")


async def _broadcast(session: AsyncSession, g: Game):
    from routers.ws import manager
    payload = await build_game_payload(session, g)
    await manager.broadcast(g.id, {"type": "STATE_UPDATE", "data": payload})


async def _broadcast_lobby(session: AsyncSession):
    from routers.ws import manager
    res = await session.execute(
        select(Game).options(selectinload(Game.matches)).order_by(Game.created_at.desc())
    )
    games = res.scalars().all()
    summaries = [await build_game_summary(g) for g in games]
    await manager.broadcast_lobby({"type": "LOBBY_UPDATE", "data": summaries})


def _winner_name(m: Match) -> Optional[str]:
    if m.winner == "A":
        return m.team_a_name
    if m.winner == "B":
        return m.team_b_name
    return None


async def _maybe_create_final(session: AsyncSession, g: Game):
    """If L1 and L2 finished, create Final match with their winners if not yet present."""
    matches = {m.slot: m for m in g.matches}
    l1, l2 = matches.get("L1"), matches.get("L2")
    final = matches.get("Final")
    if final is not None:
        return
    if not l1 or not l2:
        return
    if l1.phase != "finished" or l2.phase != "finished":
        return
    w1 = _winner_name(l1) or "Ganador L1"
    w2 = _winner_name(l2) or "Ganador L2"
    final_match = Match(
        game_id=g.id, slot="Final", order_index=2, label="Final",
        round_key="final", threshold=FINAL_THRESHOLD,
        team_a_name=w1, team_b_name=w2,
        phase="waiting", revealed_answers=[], used_question_ids=[],
    )
    session.add(final_match)
    await session.flush()
    g.matches.append(final_match)


def _award_turn(m: Match, team: str):
    if team == "A":
        m.team_a_score += m.turn_score
    else:
        m.team_b_score += m.turn_score
    m.turn_score = 0
    m.steal_active = False
    m.controlling_team = None
    m.current_question_id = None
    m.errors_count = 0
    m.revealed_answers = []
    # Win check
    if m.team_a_score >= m.threshold:
        m.winner = "A"
        m.phase = "finished"
    elif m.team_b_score >= m.threshold:
        m.winner = "B"
        m.phase = "finished"
    else:
        m.phase = "waiting"


async def _finalize_if_needed(session: AsyncSession, g: Game, m: Match):
    """After a match action, possibly create Final or close the game."""
    if m.phase == "finished":
        # If this is the Final, mark game finished
        if m.slot == "Final":
            g.status = "finished"
        else:
            await _maybe_create_final(session, g)


# ---------- LOBBY / CRUD ----------

@router.get("/games")
async def list_games(session: AsyncSession = Depends(get_session)):
    res = await session.execute(
        select(Game).options(selectinload(Game.matches)).order_by(Game.created_at.desc())
    )
    games = res.scalars().all()
    return [await build_game_summary(g) for g in games]


@router.post("/games")
async def create_game(data: CreateGameIn, session: AsyncSession = Depends(get_session)):
    t1 = data.team_1_name.strip() or "Equipo 1"
    t2 = data.team_2_name.strip() or "Equipo 2"
    t3 = data.team_3_name.strip() or "Equipo 3"
    t4 = data.team_4_name.strip() or "Equipo 4"
    name = (data.name or f"Torneo {t1[:8]}/{t2[:8]}/{t3[:8]}/{t4[:8]}").strip()[:120]
    g = Game(
        name=name, status="in_progress",
        team_1_name=t1, team_2_name=t2, team_3_name=t3, team_4_name=t4,
    )
    g.matches = [
        Match(
            slot="L1", order_index=0, label="Llave 1 · Ronda 1",
            round_key="ronda1", threshold=ROUND_THRESHOLD,
            team_a_name=t1, team_b_name=t2,
            phase="waiting", revealed_answers=[], used_question_ids=[],
        ),
        Match(
            slot="L2", order_index=1, label="Llave 2 · Ronda 2",
            round_key="ronda2", threshold=ROUND_THRESHOLD,
            team_a_name=t3, team_b_name=t4,
            phase="waiting", revealed_answers=[], used_question_ids=[],
        ),
    ]
    session.add(g)
    await session.commit()
    await session.refresh(g)
    # eager-load matches
    res = await session.execute(
        select(Game).options(selectinload(Game.matches)).where(Game.id == g.id)
    )
    g = res.scalar_one()
    await _broadcast_lobby(session)
    return await build_game_payload(session, g)


@router.get("/games/{game_id}")
async def get_game(game_id: int, session: AsyncSession = Depends(get_session)):
    g = await _get_game(session, game_id)
    return await build_game_payload(session, g)


@router.delete("/games/{game_id}")
async def delete_game(game_id: int, session: AsyncSession = Depends(get_session)):
    g = await _get_game(session, game_id)
    await session.execute(delete(Game).where(Game.id == g.id))
    await session.commit()
    await _broadcast_lobby(session)
    return {"deleted": game_id}


# ---------- QUESTIONS ----------

@router.get("/questions")
async def list_questions(round: str | None = None, session: AsyncSession = Depends(get_session)):
    stmt = select(Question).order_by(Question.round, Question.order_index)
    if round:
        stmt = stmt.where(Question.round == round)
    res = await session.execute(stmt)
    qs = res.scalars().all()
    return [QuestionLite.model_validate(q).model_dump() for q in qs]


# ---------- MATCH ACTIONS ----------

@router.post("/games/{game_id}/matches/{match_id}/start-question")
async def start_question(
    game_id: int, match_id: int, data: StartQuestionIn,
    session: AsyncSession = Depends(get_session),
):
    g = await _get_game(session, game_id)
    m = await _get_match(session, game_id, match_id)
    if m.phase == "finished":
        raise HTTPException(400, "match ya terminó")
    used = list(m.used_question_ids or [])
    if data.question_id in used:
        raise HTTPException(400, "pregunta ya fue usada en este match")
    q = await _get_question_with_answers(session, data.question_id)
    if not q:
        raise HTTPException(404, "question not found")
    m.current_question_id = q.id
    m.phase = "playing"
    m.turn_score = 0
    m.controlling_team = None
    m.errors_count = 0
    m.revealed_answers = []
    m.steal_active = False
    used.append(q.id)
    m.used_question_ids = used
    await session.commit()
    await session.refresh(g)
    res = await session.execute(
        select(Game).options(selectinload(Game.matches)).where(Game.id == g.id)
    )
    g = res.scalar_one()
    await _broadcast(session, g)
    await _broadcast_lobby(session)
    return await build_game_payload(session, g)


@router.post("/games/{game_id}/matches/{match_id}/face-off")
async def face_off(
    game_id: int, match_id: int, data: FaceOffIn,
    session: AsyncSession = Depends(get_session),
):
    if data.winner not in ("A", "B"):
        raise HTTPException(400, "winner must be 'A' or 'B'")
    g = await _get_game(session, game_id)
    m = await _get_match(session, game_id, match_id)
    m.controlling_team = data.winner
    await session.commit()
    res = await session.execute(
        select(Game).options(selectinload(Game.matches)).where(Game.id == g.id)
    )
    g = res.scalar_one()
    await _broadcast(session, g)
    return await build_game_payload(session, g)


@router.post("/games/{game_id}/matches/{match_id}/reveal")
async def reveal(
    game_id: int, match_id: int, data: RevealIn,
    session: AsyncSession = Depends(get_session),
):
    g = await _get_game(session, game_id)
    m = await _get_match(session, game_id, match_id)
    if not m.current_question_id:
        raise HTTPException(400, "no active question")
    if not m.controlling_team:
        raise HTTPException(400, "debes hacer el cara a cara antes de revelar")
    q = await _get_question_with_answers(session, m.current_question_id)
    target = next((a for a in q.answers if a.id == data.answer_id), None)
    if not target:
        raise HTTPException(404, "answer not found")
    revealed = list(m.revealed_answers or [])
    if target.id in revealed:
        return await build_game_payload(session, g)
    revealed.append(target.id)
    m.revealed_answers = revealed
    m.turn_score = int(m.turn_score + round(target.points))

    if m.steal_active:
        stealing = "B" if m.controlling_team == "A" else "A"
        _award_turn(m, stealing)
    elif len(revealed) >= len(q.answers):
        if m.controlling_team:
            _award_turn(m, m.controlling_team)

    await _finalize_if_needed(session, g, m)
    await session.commit()
    res = await session.execute(
        select(Game).options(selectinload(Game.matches)).where(Game.id == g.id)
    )
    g = res.scalar_one()
    await _broadcast(session, g)
    await _broadcast_lobby(session)
    return await build_game_payload(session, g)


@router.post("/games/{game_id}/matches/{match_id}/error")
async def error(
    game_id: int, match_id: int,
    session: AsyncSession = Depends(get_session),
):
    g = await _get_game(session, game_id)
    m = await _get_match(session, game_id, match_id)
    if not m.current_question_id:
        raise HTTPException(400, "no active question")
    if not m.controlling_team:
        raise HTTPException(400, "debes hacer el cara a cara antes de marcar errores")
    if m.steal_active:
        raise HTTPException(400, "robo activo, no más errores")
    m.errors_count = min(3, m.errors_count + 1)
    if m.errors_count >= 3:
        m.steal_active = True
        m.phase = "steal"
    await session.commit()
    res = await session.execute(
        select(Game).options(selectinload(Game.matches)).where(Game.id == g.id)
    )
    g = res.scalar_one()
    await _broadcast(session, g)
    return await build_game_payload(session, g)


@router.post("/games/{game_id}/matches/{match_id}/steal")
async def steal(
    game_id: int, match_id: int, data: StealIn,
    session: AsyncSession = Depends(get_session),
):
    g = await _get_game(session, game_id)
    m = await _get_match(session, game_id, match_id)
    if not m.steal_active:
        raise HTTPException(400, "no hay robo activo")
    if data.success:
        stealing = "B" if m.controlling_team == "A" else "A"
        _award_turn(m, stealing)
    else:
        if m.controlling_team:
            _award_turn(m, m.controlling_team)
    await _finalize_if_needed(session, g, m)
    await session.commit()
    res = await session.execute(
        select(Game).options(selectinload(Game.matches)).where(Game.id == g.id)
    )
    g = res.scalar_one()
    await _broadcast(session, g)
    await _broadcast_lobby(session)
    return await build_game_payload(session, g)


@router.post("/games/{game_id}/matches/{match_id}/end-question")
async def end_question(
    game_id: int, match_id: int,
    session: AsyncSession = Depends(get_session),
):
    g = await _get_game(session, game_id)
    m = await _get_match(session, game_id, match_id)
    if m.controlling_team and m.turn_score > 0:
        _award_turn(m, m.controlling_team)
    else:
        m.turn_score = 0
        m.steal_active = False
        m.controlling_team = None
        m.current_question_id = None
        m.errors_count = 0
        m.revealed_answers = []
        m.phase = "waiting"
    await _finalize_if_needed(session, g, m)
    await session.commit()
    res = await session.execute(
        select(Game).options(selectinload(Game.matches)).where(Game.id == g.id)
    )
    g = res.scalar_one()
    await _broadcast(session, g)
    await _broadcast_lobby(session)
    return await build_game_payload(session, g)


@router.post("/games/{game_id}/matches/{match_id}/reset")
async def reset_match(
    game_id: int, match_id: int,
    session: AsyncSession = Depends(get_session),
):
    g = await _get_game(session, game_id)
    m = await _get_match(session, game_id, match_id)
    m.phase = "waiting"
    m.current_question_id = None
    m.team_a_score = 0
    m.team_b_score = 0
    m.turn_score = 0
    m.controlling_team = None
    m.errors_count = 0
    m.revealed_answers = []
    m.steal_active = False
    m.used_question_ids = []
    m.winner = None
    # If Final was reset, game goes back to in_progress
    if m.slot == "Final" and g.status == "finished":
        g.status = "in_progress"
    await session.commit()
    res = await session.execute(
        select(Game).options(selectinload(Game.matches)).where(Game.id == g.id)
    )
    g = res.scalar_one()
    await _broadcast(session, g)
    await _broadcast_lobby(session)
    return await build_game_payload(session, g)
