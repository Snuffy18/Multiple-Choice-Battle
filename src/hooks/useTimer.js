import { useEffect, useState, useRef } from 'react';
import { secondsRemaining } from '../lib/gameLogic';

/**
 * Counts down from timerSeconds to 0.
 * Calls onExpire once when it hits 0 (only if active).
 */
export function useTimer(turnStartedAt, timerSeconds, active, onExpire) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.ceil(secondsRemaining(turnStartedAt, timerSeconds)))
  );
  const expiredRef = useRef(false);

  useEffect(() => {
    expiredRef.current = false;
    setRemaining(Math.max(0, Math.ceil(secondsRemaining(turnStartedAt, timerSeconds))));
  }, [turnStartedAt, timerSeconds]);

  useEffect(() => {
    if (!active) return;

    const id = setInterval(() => {
      const secs = secondsRemaining(turnStartedAt, timerSeconds);
      const rounded = Math.max(0, Math.ceil(secs));
      setRemaining(rounded);

      if (secs <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
        clearInterval(id);
      }
    }, 250);

    return () => clearInterval(id);
  }, [active, turnStartedAt, timerSeconds, onExpire]);

  const fraction = timerSeconds > 0 ? remaining / timerSeconds : 0;
  return { remaining, fraction };
}
