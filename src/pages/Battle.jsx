import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import { PlayerPanel } from '../components/battle/PlayerPanel';
import { QuestionCard } from '../components/battle/QuestionCard';
import { TurnBanner } from '../components/battle/TurnBanner';
import { ResultOverlay } from '../components/battle/ResultOverlay';

export default function Battle() {
  const { code } = useParams();
  const navigate = useNavigate();
  const localId = sessionStorage.getItem(`player_id_${code}`) ?? '';

  const { room, loading, error, submitting, lastResult, clearLastResult, submitAnswer, endBattle } =
    useGame(code, localId);

  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const prevQuestionIndex = useRef(null);
  const [revealSecondsLeft, setRevealSecondsLeft] = useState(0);

  // Reset per-question state when question changes
  useEffect(() => {
    if (!room) return;
    if (room.current_question_index !== prevQuestionIndex.current) {
      prevQuestionIndex.current = room.current_question_index;
      setSelectedAnswer(null);
      setRevealed(false);
    }
  }, [room?.current_question_index]); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown timer for reveal phase
  useEffect(() => {
    if (!room?.reveal_until) {
      setRevealSecondsLeft(0);
      return;
    }
    function tick() {
      const ms = new Date(room.reveal_until).getTime() - Date.now();
      setRevealSecondsLeft(Math.max(0, Math.ceil(ms / 1000)));
    }
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [room?.reveal_until]); // eslint-disable-line react-hooks/exhaustive-deps

  const inRevealPhase = revealSecondsLeft > 0;

  // Redirect when finished
  useEffect(() => {
    if (room?.status === 'finished') navigate(`/room/${code}/result`);
  }, [room?.status, code, navigate]);

  const handleAnswer = useCallback(
    async (id) => {
      if (selectedAnswer || submitting) return;
      setSelectedAnswer(id);
      setRevealed(true);
      await submitAnswer(id);
    },
    [selectedAnswer, submitting, submitAnswer]
  );

  const handleTimerExpire = useCallback(async () => {
    if (selectedAnswer || submitting) return;
    setSelectedAnswer(null);
    setRevealed(true);
    await submitAnswer(null);
  }, [selectedAnswer, submitting, submitAnswer]);

  if (loading) return <Splash text="Loading battle…" />;
  if (error) return <Splash text={`Error: ${error}`} />;
  if (!room || room.status !== 'battle') return <Splash text="Battle not active." />;

  const players = room.players ?? [];
  const localPlayer = players.find((p) => p.id === localId);
  const opponent = players.find((p) => p.id !== localId);
  const isMyTurn = room.current_turn === localId;
  const isAdmin = localId === room.admin_id;
  const activePlayer = players.find((p) => p.id === room.current_turn);

  const questions = room.questions_snapshot ?? [];
  const question = questions[room.current_question_index];

  // During reveal phase show the just-answered question, not the next one
  const displayQuestion = inRevealPhase
    ? questions[room.last_question_index ?? room.current_question_index]
    : question;
  const displaySelectedAnswer = inRevealPhase ? (room.last_chosen_answer ?? null) : selectedAnswer;
  const displayRevealed = inRevealPhase || revealed;

  if (!displayQuestion) return <Splash text="No questions found." />;

  // Who shakes when a heart is lost — checked via lastResult
  const localShaking = lastResult && !lastResult.correct && isMyTurn;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Arena header */}
      <div className="flex items-center justify-between gap-4 px-4 py-4 border-b border-violet/10">
        {/* Left player */}
        <div className="flex-1 max-w-[200px]">
          {localPlayer ? (
            <PlayerPanel
              player={localPlayer}
              startingHearts={room.starting_hearts}
              isActive={isMyTurn}
              isLocal
              shaking={localShaking}
            />
          ) : (
            <div />
          )}
        </div>

        {/* VS badge */}
        <div className="flex flex-col items-center gap-1">
          <span className="font-display font-extrabold text-2xl text-violet">⚔️</span>
          <span className="text-xs text-muted font-body">
            {room.current_question_index + 1}/{questions.length}
          </span>
          {isAdmin && (
            <button
              className="text-xs text-crimson hover:text-offwhite font-body mt-1 px-2 py-0.5 border border-crimson/30 hover:border-crimson rounded-lg transition-colors"
              onClick={() => {
                if (confirm('End the battle now? Winner is decided by current scores.')) {
                  endBattle();
                }
              }}
            >
              End
            </button>
          )}
        </div>

        {/* Right player */}
        <div className="flex-1 max-w-[200px]">
          {opponent ? (
            <PlayerPanel
              player={opponent}
              startingHearts={room.starting_hearts}
              isActive={!isMyTurn}
              isLocal={false}
              shaking={lastResult && !lastResult.correct && !isMyTurn}
            />
          ) : (
            <div className="text-center text-muted text-sm">Waiting for opponent…</div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-4">
        {inRevealPhase && (() => {
          const revealQ = questions[room.last_question_index];
          const wasCorrect = revealQ && room.last_chosen_answer !== null &&
            room.last_chosen_answer === revealQ.correct_answer;
          return (
            <div className={`bg-slate-card border rounded-xl px-5 py-3 text-center animate-slide_in ${wasCorrect ? 'border-emerald/30' : 'border-crimson/30'}`}>
              <p className={`font-display font-semibold text-sm ${wasCorrect ? 'text-emerald' : 'text-crimson'}`}>
                {wasCorrect ? 'Correct!' : 'Wrong answer'}
              </p>
              <p className="text-muted font-body text-xs mt-0.5">
                Next question in <span className="text-offwhite font-semibold">{revealSecondsLeft}s</span>
              </p>
            </div>
          );
        })()}
        <QuestionCard
          question={displayQuestion}
          turnStartedAt={room.turn_started_at}
          timerSeconds={room.timer_seconds}
          isMyTurn={isMyTurn && !inRevealPhase}
          selectedAnswer={displaySelectedAnswer}
          revealed={displayRevealed}
          onAnswer={handleAnswer}
          onTimerExpire={handleTimerExpire}
        />
      </div>

      {/* Turn banner */}
      <TurnBanner
        isMyTurn={isMyTurn}
        activePlayerName={activePlayer?.username ?? ''}
        questionIndex={room.current_question_index}
        totalQuestions={questions.length}
      />

      {/* Result overlay (1.5s flash) */}
      <ResultOverlay result={lastResult} onDone={clearLastResult} />
    </div>
  );
}

function Splash({ text }) {
  return (
    <div className="min-h-screen flex items-center justify-center text-muted font-body">{text}</div>
  );
}
