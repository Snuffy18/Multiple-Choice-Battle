import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { processAnswer, buildBattleStart, buildPlayAgain } from '../lib/gameLogic';
import { useRoom } from './useRoom';

/**
 * Wraps useRoom with game-action functions.
 * Components call submitAnswer / startBattle / playAgain — never write to DB directly.
 */
export function useGame(roomCode, localPlayerId) {
  const { room, loading, error, updateRoom } = useRoom(roomCode);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState(null); // { correct, xpDelta, heartsDelta }

  const submitAnswer = useCallback(
    async (chosen) => {
      if (!room || submitting) return;
      setSubmitting(true);
      try {
        const { roomPatch, event, result } = processAnswer(room, localPlayerId, chosen);
        setLastResult(result);

        // Write event and room update in parallel
        await Promise.all([
          updateRoom(roomPatch),
          supabase.from('game_events').insert(event),
        ]);
      } finally {
        setSubmitting(false);
      }
    },
    [room, localPlayerId, submitting, updateRoom]
  );

  const startBattle = useCallback(
    async (questions) => {
      if (!room) return;
      const patch = buildBattleStart(room, questions);
      await updateRoom(patch);
    },
    [room, updateRoom]
  );

  const playAgain = useCallback(async () => {
    if (!room) return;
    const patch = buildPlayAgain(room);
    await updateRoom(patch);
  }, [room, updateRoom]);

  const endBattle = useCallback(async () => {
    if (!room) return;
    const players = room.players ?? [];
    const [p0, p1] = players;
    let winnerId = null;
    if (p0 && p1) {
      if (p0.xp > p1.xp) winnerId = p0.id;
      else if (p1.xp > p0.xp) winnerId = p1.id;
      else if (p0.hearts > p1.hearts) winnerId = p0.id;
      else if (p1.hearts > p0.hearts) winnerId = p1.id;
    }
    await updateRoom({ status: 'finished', winner_id: winnerId, current_turn: null });
  }, [room, updateRoom]);

  const clearLastResult = useCallback(() => setLastResult(null), []);

  return {
    room,
    loading,
    error,
    submitting,
    lastResult,
    clearLastResult,
    submitAnswer,
    startBattle,
    playAgain,
    endBattle,
    updateRoom,
  };
}
