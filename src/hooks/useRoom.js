import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Single source of truth for room state.
 * Subscribes to realtime updates on the rooms table row.
 */
export function useRoom(roomCode) {
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initial fetch
  useEffect(() => {
    if (!roomCode) return;

    let cancelled = false;

    async function fetchRoom() {
      setLoading(true);
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomCode)
        .single();

      if (cancelled) return;
      if (error) setError(error.message);
      else setRoom(data);
      setLoading(false);
    }

    fetchRoom();

    // Realtime subscription — re-fetch the full row on every update so we always
    // get all columns (payload.new omits JSONB columns unless REPLICA IDENTITY FULL
    // is set, which can cause questions_snapshot / players to arrive as null).
    const channel = supabase
      .channel(`room:${roomCode}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomCode}` },
        async () => {
          if (cancelled) return;
          const { data } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', roomCode)
            .single();
          if (!cancelled && data) setRoom(data);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomCode]);

  const updateRoom = useCallback(
    async (patch) => {
      const { error } = await supabase.from('rooms').update(patch).eq('id', roomCode);
      if (error) throw new Error(error.message);
    },
    [roomCode]
  );

  return { room, loading, error, updateRoom };
}
