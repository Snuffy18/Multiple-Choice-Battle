const LABELS = { A: 'A', B: 'B', C: 'C', D: 'D' };

export function AnswerButton({ id, text, state = 'idle', disabled, onClick }) {
  // state: 'idle' | 'correct' | 'wrong' | 'reveal-correct'
  const base =
    'w-full flex items-start gap-3 rounded-xl px-4 py-3 text-left font-body text-base transition-all duration-200 border focus:outline-none';

  const styles = {
    idle: `bg-slate-card border-violet/20 hover:border-violet hover:bg-violet/10 text-offwhite ${
      disabled ? 'opacity-50 cursor-not-allowed hover:border-violet/20 hover:bg-slate-card' : 'cursor-pointer'
    }`,
    correct:
      'bg-emerald/20 border-emerald text-emerald shadow-[0_0_16px_rgba(16,185,129,0.3)] scale-[1.01]',
    wrong: 'bg-crimson/20 border-crimson text-crimson shadow-[0_0_16px_rgba(239,68,68,0.3)]',
    'reveal-correct':
      'bg-emerald/10 border-emerald/50 text-emerald/80',
  };

  return (
    <button
      className={`${base} ${styles[state]}`}
      disabled={disabled || state !== 'idle'}
      onClick={onClick}
    >
      <span className="font-display font-bold text-sm mt-0.5 min-w-[1.5rem] text-center opacity-70">
        {LABELS[id]}
      </span>
      <span className="flex-1">{text}</span>
    </button>
  );
}
