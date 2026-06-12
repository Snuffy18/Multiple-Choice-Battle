import { useEffect, useRef, useState } from 'react';

export function XPCounter({ xp }) {
  const [display, setDisplay] = useState(xp);
  const [popping, setPopping] = useState(false);
  const prevRef = useRef(xp);

  useEffect(() => {
    if (xp === prevRef.current) return;
    prevRef.current = xp;

    // Animate count up
    const start = display;
    const end = xp;
    const duration = 400;
    const startTime = performance.now();

    setPopping(true);
    setTimeout(() => setPopping(false), 400);

    function step(now) {
      const t = Math.min((now - startTime) / duration, 1);
      setDisplay(Math.round(start + (end - start) * t));
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [xp]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={`flex items-center gap-1 font-display font-bold text-amber text-xl ${
        popping ? 'animate-xp_pop' : ''
      }`}
    >
      <span>✨</span>
      <span>{display}</span>
      <span className="text-sm text-amber/70">XP</span>
    </div>
  );
}
