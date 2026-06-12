import { HeartRow } from './HeartRow';
import { XPCounter } from './XPCounter';

export function PlayerPanel({ player, startingHearts, isActive, isLocal, shaking }) {
  return (
    <div
      className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all duration-300 ${
        isActive
          ? 'border-violet bg-violet/10 shadow-[0_0_24px_rgba(124,58,237,0.25)]'
          : 'border-violet/10 bg-slate-card/50'
      }`}
    >
      {/* Name */}
      <div className="flex items-center gap-2">
        <span className="font-display font-bold text-xl text-offwhite">
          {player.username}
        </span>
        {isLocal && (
          <span className="text-xs bg-violet/30 text-violet px-2 py-0.5 rounded-full font-body">
            you
          </span>
        )}
      </div>

      {/* Active indicator */}
      {isActive && (
        <span className="text-xs text-violet font-body animate-pulse">⚔️ Their turn</span>
      )}

      {/* Hearts */}
      <HeartRow hearts={player.hearts} max={startingHearts} shaking={shaking} />

      {/* XP */}
      <XPCounter xp={player.xp} />
    </div>
  );
}
