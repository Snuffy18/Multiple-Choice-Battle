/**
 * Pure game-logic functions.
 * All functions are side-effect free — they take current state and return the
 * next state. The Supabase write happens in the calling hook (useGame).
 */

// ─── Player helpers ───────────────────────────────────────────────────────────

export function otherPlayer(players, currentPlayerId) {
  return players.find((p) => p.id !== currentPlayerId) ?? null;
}

export function playerById(players, id) {
  return players.find((p) => p.id === id) ?? null;
}

// ─── Timer ────────────────────────────────────────────────────────────────────

/**
 * Returns seconds remaining for the active turn.
 * Negative means the timer already expired.
 */
export function secondsRemaining(turnStartedAt, timerSeconds) {
  if (!turnStartedAt) return timerSeconds;
  const elapsed = (Date.now() - new Date(turnStartedAt).getTime()) / 1000;
  return timerSeconds - elapsed;
}

export function isTimerExpired(turnStartedAt, timerSeconds) {
  return secondsRemaining(turnStartedAt, timerSeconds) <= 0;
}

// ─── Answer processing ────────────────────────────────────────────────────────

/**
 * Process one answered (or timed-out) turn.
 *
 * @param {Object} room       - current room row from DB
 * @param {string} playerId   - id of the player who answered
 * @param {string|null} chosen - chosen option id ("A"|"B"|"C"|"D") or null for timeout
 * @returns {{ roomPatch, event, result }}
 *   roomPatch - partial room update to write to DB
 *   event     - game_event row to insert
 *   result    - { correct, xpDelta, heartsDelta, battleOver, winnerId }
 */
export function processAnswer(room, playerId, chosen) {
  const players = structuredClone(room.players);
  const questions = room.questions_snapshot;
  const question = questions[room.current_question_index];

  const correct = chosen !== null && chosen === question.correct_answer;
  const xpDelta = correct ? (question.xp_reward ?? 100) : 0;
  const heartsDelta = correct ? 0 : -1;

  // Mutate the answering player's stats
  const playerIdx = players.findIndex((p) => p.id === playerId);
  players[playerIdx].xp += xpDelta;
  players[playerIdx].hearts = Math.max(0, players[playerIdx].hearts + heartsDelta);

  const updatedPlayer = players[playerIdx];

  // ── Determine if battle is over ──────────────────────────────────────────
  const isLastQuestion = room.current_question_index >= questions.length - 1;
  const playerDead = updatedPlayer.hearts === 0;

  let battleOver = false;
  let winnerId = null;

  if (playerDead) {
    battleOver = true;
    const opponent = players.find((p) => p.id !== playerId);
    winnerId = opponent?.id ?? null;
  } else if (isLastQuestion) {
    battleOver = true;
    const p0 = players[0];
    const p1 = players[1];
    if (p0.xp > p1.xp) winnerId = p0.id;
    else if (p1.xp > p0.xp) winnerId = p1.id;
    else winnerId = null; // draw
  }

  // ── Build the next turn ──────────────────────────────────────────────────
  const REVEAL_MS = 6000; // how long to show the correct answer on wrong answers
  const showReveal = !correct && !battleOver;

  const opponent = players.find((p) => p.id !== playerId);
  const nextTurn = battleOver ? null : opponent?.id;
  const nextIndex = battleOver ? room.current_question_index : room.current_question_index + 1;

  // Delay the next turn's timer start so it begins AFTER the reveal window
  const nextTurnStartedAt = battleOver
    ? null
    : new Date(Date.now() + (showReveal ? REVEAL_MS : 0)).toISOString();

  const roomPatch = {
    players,
    current_turn: nextTurn,
    current_question_index: nextIndex,
    turn_started_at: nextTurnStartedAt,
    status: battleOver ? 'finished' : 'battle',
    winner_id: winnerId,
    // Reveal phase fields — cleared on correct answers and battle end
    reveal_until: showReveal ? new Date(Date.now() + REVEAL_MS).toISOString() : null,
    last_question_index: showReveal ? room.current_question_index : null,
    last_chosen_answer: showReveal ? (chosen ?? null) : null,
  };

  const event = {
    room_id: room.id,
    player_id: playerId,
    question_id: question.id,
    chosen_answer: chosen,
    correct,
    xp_delta: xpDelta,
    hearts_delta: heartsDelta,
  };

  const result = { correct, xpDelta, heartsDelta, battleOver, winnerId };

  return { roomPatch, event, result };
}

// ─── Battle initialisation ────────────────────────────────────────────────────

/**
 * Build the initial room patch when admin clicks "Start Battle".
 * Questions are shuffled and snapshotted into the room row.
 */
export function buildBattleStart(room, questions) {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);

  const players = room.players.map((p) => ({
    ...p,
    hearts: room.starting_hearts,
    xp: 0,
  }));

  // First turn goes to the first player who joined (index 0)
  const firstPlayer = players[0];

  return {
    status: 'battle',
    questions_snapshot: shuffled,
    players,
    current_turn: firstPlayer.id,
    current_question_index: 0,
    turn_started_at: new Date().toISOString(),
    winner_id: null,
  };
}

// ─── Play-again reset ─────────────────────────────────────────────────────────

export function buildPlayAgain(room) {
  const questions = [...room.questions_snapshot].sort(() => Math.random() - 0.5);
  const players = room.players.map((p) => ({
    ...p,
    hearts: room.starting_hearts,
    xp: 0,
    isReady: true,
  }));

  return {
    status: 'battle',
    questions_snapshot: questions,
    players,
    current_turn: players[0].id,
    current_question_index: 0,
    turn_started_at: new Date().toISOString(),
    winner_id: null,
  };
}
