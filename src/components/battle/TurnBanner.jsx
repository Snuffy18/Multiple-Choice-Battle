export function TurnBanner({ isMyTurn, activePlayerName, questionIndex, totalQuestions, simultaneous }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-slate-card border-t border-violet/10 rounded-b-2xl">
      <span className="text-sm font-body text-muted">
        Question {questionIndex + 1} / {totalQuestions}
      </span>
      <span className={`font-display font-semibold text-sm ${simultaneous ? 'text-violet' : isMyTurn ? 'text-violet' : 'text-muted'}`}>
        {simultaneous ? 'Answer simultaneously!' : isMyTurn ? "It's your turn!" : `Waiting for ${activePlayerName}…`}
      </span>
    </div>
  );
}
