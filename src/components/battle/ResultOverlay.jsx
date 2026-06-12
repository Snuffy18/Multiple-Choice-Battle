import { useEffect } from 'react';

export function ResultOverlay({ result, onDone }) {
  useEffect(() => {
    if (!result) return;
    const t = setTimeout(onDone, 1500);
    return () => clearTimeout(t);
  }, [result, onDone]);

  if (!result) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none">
      <div className="flex flex-col items-center gap-3 animate-slide_in">
        <span className="text-6xl">{result.correct ? '✅' : '❌'}</span>
        <span
          className={`font-display font-bold text-3xl ${
            result.correct ? 'text-emerald' : 'text-crimson'
          }`}
        >
          {result.correct ? 'Correct!' : 'Wrong!'}
        </span>
        {result.xpDelta > 0 && (
          <span className="text-amber font-display font-bold text-xl animate-xp_pop">
            +{result.xpDelta} XP ✨
          </span>
        )}
        {result.heartsDelta < 0 && (
          <span className="text-crimson font-body text-base">−1 ❤️</span>
        )}
      </div>
    </div>
  );
}
