export function CountdownTimer({ remaining, fraction }) {
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.max(0, Math.min(1, fraction)));

  const color =
    fraction > 0.5
      ? 'rgb(var(--color-accent))'
      : fraction > 0.25
      ? 'rgb(var(--color-accent-dk))'
      : '#EF4444';

  return (
    <div className="relative flex items-center justify-center w-20 h-20">
      <svg className="-rotate-90" width="72" height="72" viewBox="0 0 72 72">
        {/* Track */}
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgb(var(--color-track))" strokeWidth="5" />
        {/* Progress */}
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.25s linear, stroke 0.5s' }}
        />
      </svg>
      <span
        className="absolute font-display font-bold text-xl"
        style={{ color }}
      >
        {remaining}
      </span>
    </div>
  );
}
