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

// ─── XP calculation ───────────────────────────────────────────────────────────

const GRACE_SECONDS = 3;   // full XP window at the start of each turn
const MIN_XP_FRACTION = 0.2; // floor: never less than 20% of base XP

/**
 * Returns how much XP the player earns given how many seconds elapsed.
 * 0–3s  → full baseXP
 * 3s–end → linear decay down to 20% of baseXP
 */
export function timeScaledXP(baseXP, elapsedSeconds, timerSeconds) {
  if (elapsedSeconds <= GRACE_SECONDS) return baseXP;
  const decayRange = timerSeconds - GRACE_SECONDS;
  if (decayRange <= 0) return baseXP;
  const progress = Math.min(1, (elapsedSeconds - GRACE_SECONDS) / decayRange);
  const fraction = 1 - progress * (1 - MIN_XP_FRACTION);
  return Math.max(
    Math.round(baseXP * MIN_XP_FRACTION),
    Math.round(baseXP * fraction)
  );
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
  const elapsed = room.turn_started_at
    ? (Date.now() - new Date(room.turn_started_at).getTime()) / 1000
    : 0;
  const xpDelta = correct
    ? timeScaledXP(question.xp_reward ?? 100, elapsed, room.timer_seconds ?? 20)
    : 0;
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
  const REVEAL_MS = 5000; // how long both players see the answer before advancing
  const showReveal = !battleOver;

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

// ─── Simultaneous answer processing ──────────────────────────────────────────

/**
 * Simultaneous mode: both players answer independently.
 * freshRoom is re-fetched from DB so we see the opponent's answer if they've submitted.
 * Returns { roomPatch, event, result, bothAnswered }
 */
export function processSimultaneousAnswer(freshRoom, playerId, chosen) {
  const players = structuredClone(freshRoom.players);
  const questions = freshRoom.questions_snapshot;
  const question = questions[freshRoom.current_question_index];
  const elapsed = freshRoom.turn_started_at
    ? (Date.now() - new Date(freshRoom.turn_started_at).getTime()) / 1000
    : 0;

  const existing = freshRoom.answers_this_round ?? {};
  const allAnswers = { ...existing, [playerId]: { chosen: chosen ?? null, elapsed } };
  const bothAnswered = players.length === 2 && players.every((p) => allAnswers[p.id] !== undefined);

  const event = {
    room_id: freshRoom.id,
    player_id: playerId,
    question_id: question.id,
    chosen_answer: chosen,
    correct: chosen !== null && chosen === question.correct_answer,
    xp_delta: 0,
    hearts_delta: 0,
  };

  if (!bothAnswered) {
    return {
      roomPatch: { answers_this_round: allAnswers },
      event,
      result: null,
      bothAnswered: false,
    };
  }

  // Both answered — compute stats for each player
  const REVEAL_MS = 5000;
  const lastAnswersMap = {};

  for (const player of players) {
    const entry = allAnswers[player.id];
    const pChosen = entry?.chosen ?? null;
    const pElapsed = entry?.elapsed ?? 0;
    const correct = pChosen !== null && pChosen === question.correct_answer;
    const xp = correct ? timeScaledXP(question.xp_reward ?? 100, pElapsed, freshRoom.timer_seconds ?? 20) : 0;
    player.xp += xp;
    if (!correct) player.hearts = Math.max(0, player.hearts - 1);
    lastAnswersMap[player.id] = pChosen;
  }

  const isLastQuestion = freshRoom.current_question_index >= questions.length - 1;
  const anyDead = players.some((p) => p.hearts <= 0);
  let battleOver = anyDead || isLastQuestion;
  let winnerId = null;

  if (battleOver) {
    const [p0, p1] = players;
    if (p0.xp > p1.xp) winnerId = p0.id;
    else if (p1.xp > p0.xp) winnerId = p1.id;
  }

  const nextIndex = battleOver ? freshRoom.current_question_index : freshRoom.current_question_index + 1;
  const myChosen = allAnswers[playerId]?.chosen ?? null;
  const myCorrect = myChosen !== null && myChosen === question.correct_answer;
  const myXP = myCorrect ? timeScaledXP(question.xp_reward ?? 100, elapsed, freshRoom.timer_seconds ?? 20) : 0;

  // Update event with final xp/hearts
  event.correct = myCorrect;
  event.xp_delta = myXP;
  event.hearts_delta = myCorrect ? 0 : -1;

  return {
    roomPatch: {
      players,
      current_question_index: nextIndex,
      turn_started_at: battleOver ? null : new Date(Date.now() + REVEAL_MS).toISOString(),
      status: battleOver ? 'finished' : 'battle',
      winner_id: winnerId,
      answers_this_round: {},
      last_answers: lastAnswersMap,
      reveal_until: battleOver ? null : new Date(Date.now() + REVEAL_MS).toISOString(),
      last_question_index: freshRoom.current_question_index,
      last_chosen_answer: myChosen,
    },
    event,
    result: { correct: myCorrect, xpDelta: myXP, heartsDelta: myCorrect ? 0 : -1, battleOver, winnerId },
    bothAnswered: true,
  };
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

  const isSimultaneous = room.mode === 'simultaneous';
  const firstPlayer = players[0];

  return {
    status: 'battle',
    questions_snapshot: shuffled,
    players,
    current_turn: isSimultaneous ? null : firstPlayer.id,
    current_question_index: 0,
    turn_started_at: new Date().toISOString(),
    winner_id: null,
    answers_this_round: {},
    last_answers: {},
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
