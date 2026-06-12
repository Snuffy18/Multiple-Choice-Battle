import { useCallback } from 'react';
import { AnswerButton } from './AnswerButton';
import { CountdownTimer } from './CountdownTimer';
import { useTimer } from '../../hooks/useTimer';
import { timeScaledXP } from '../../lib/gameLogic';

const OPTIONS = ['A', 'B', 'C', 'D'];
const OPTION_KEY = { A: 'option_a', B: 'option_b', C: 'option_c', D: 'option_d' };
const GRACE = 3;

export function QuestionCard({
  question,
  turnStartedAt,
  timerSeconds,
  isMyTurn,
  selectedAnswer,
  revealed,
  onAnswer,
  onTimerExpire,
}) {
  const handleExpire = useCallback(() => {
    if (isMyTurn && !selectedAnswer) onTimerExpire?.();
  }, [isMyTurn, selectedAnswer, onTimerExpire]);

  // Always tick so both players see the countdown — expire only fires for the active player
  const { remaining, fraction } = useTimer(
    turnStartedAt,
    timerSeconds,
    !selectedAnswer && !revealed,
    handleExpire
  );

  function getButtonState(id) {
    if (!revealed && !selectedAnswer) return 'idle';
    if (selectedAnswer === id) {
      return id === question.correct_answer ? 'correct' : 'wrong';
    }
    if (revealed && id === question.correct_answer) return 'reveal-correct';
    return 'idle';
  }

  return (
    <div className="bg-slate-card border border-violet/20 rounded-2xl p-6 flex flex-col gap-5 animate-slide_in max-w-xl w-full mx-auto">
      {/* Question index / question text */}
      <div className="flex flex-col gap-3">
        <p className="text-offwhite font-body text-lg leading-snug">{question.text}</p>
      </div>

      {/* Answers */}
      <div className="flex flex-col gap-2">
        {OPTIONS.map((id) => (
          <AnswerButton
            key={id}
            id={id}
            text={question[OPTION_KEY[id]]}
            state={getButtonState(id)}
            disabled={!isMyTurn || !!selectedAnswer || revealed}
            onClick={() => onAnswer?.(id)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <XPIndicator
          base={question.xp_reward ?? 100}
          remaining={remaining}
          timerSeconds={timerSeconds}
          locked={!!selectedAnswer || revealed}
        />
        <CountdownTimer remaining={remaining} fraction={fraction} />
      </div>
    </div>
  );
}

function XPIndicator({ base, remaining, timerSeconds, locked }) {
  const elapsed = timerSeconds - remaining;
  const current = locked ? null : timeScaledXP(base, elapsed, timerSeconds);
  const decaying = !locked && elapsed > GRACE;

  return (
    <span className={`text-xs font-body font-semibold transition-colors ${
      locked   ? 'text-muted' :
      decaying ? 'text-crimson' :
                 'text-emerald'
    }`}>
      {locked ? `${base} XP` : `${current} XP`}
      {decaying && !locked && <span className="ml-0.5 opacity-70">↓</span>}
    </span>
  );
}
