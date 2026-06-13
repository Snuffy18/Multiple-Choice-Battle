import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { timeScaledXP } from '../lib/gameLogic';
import { playCorrect, playWrong, playTick, playUrgentTick, playBattleStart } from '../lib/sounds';
import { QuestionCard } from '../components/battle/QuestionCard';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const REVEAL_MS = 3000;
const STARTING_HEARTS = 3;

export default function Solo() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('setup'); // 'setup' | 'playing' | 'finished'

  // Setup
  const [banks, setBanks] = useState([]);
  const [bankId, setBankId] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(20);

  // Game state
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [hearts, setHearts] = useState(STARTING_HEARTS);
  const [totalXP, setTotalXP] = useState(0);
  const [log, setLog] = useState([]); // [{ correct, xp }]

  // Per-question UI state
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [turnStartedAt, setTurnStartedAt] = useState(null);
  const [revealUntil, setRevealUntil] = useState(null);
  const [revealSecondsLeft, setRevealSecondsLeft] = useState(0);

  // Pending end-of-game flag set during handleAnswer, read when reveal expires
  const pendingFinish = useRef(false);

  useEffect(() => {
    supabase
      .from('question_banks')
      .select('id, topic')
      .order('created_at', { ascending: false })
      .then(({ data }) => setBanks(data ?? []));
  }, []);

  // Reveal countdown
  useEffect(() => {
    if (!revealUntil) { setRevealSecondsLeft(0); return; }
    function tick() {
      const ms = revealUntil - Date.now();
      setRevealSecondsLeft(Math.max(0, Math.ceil(ms / 1000)));
    }
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [revealUntil]);

  // Advance or finish when reveal expires
  useEffect(() => {
    if (revealSecondsLeft > 0 || !revealed || !revealUntil) return;
    if (pendingFinish.current) {
      pendingFinish.current = false;
      setPhase('finished');
    } else {
      setIndex((i) => i + 1);
      setSelectedAnswer(null);
      setRevealed(false);
      setRevealUntil(null);
      setTurnStartedAt(new Date().toISOString());
    }
  }, [revealSecondsLeft, revealed, revealUntil]);

  // Tick sounds while playing
  const prevSecs = useRef(null);
  useEffect(() => {
    if (phase !== 'playing' || revealed || !turnStartedAt) return;
    const ms = new Date(turnStartedAt).getTime() + timerSeconds * 1000 - Date.now();
    const secs = Math.ceil(ms / 1000);
    if (prevSecs.current !== secs) {
      prevSecs.current = secs;
      if (secs <= 3 && secs > 0) playUrgentTick();
      else if (secs <= 5 && secs > 3) playTick();
    }
  });

  async function startGame() {
    if (!bankId) return;
    const { data } = await supabase
      .from('questions').select('*').eq('bank_id', bankId);
    if (!data || data.length === 0) { alert('This bank has no questions!'); return; }
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
    setIndex(0);
    setHearts(STARTING_HEARTS);
    setTotalXP(0);
    setLog([]);
    setSelectedAnswer(null);
    setRevealed(false);
    setRevealUntil(null);
    setTurnStartedAt(new Date().toISOString());
    pendingFinish.current = false;
    setPhase('playing');
    playBattleStart();
  }

  const handleAnswer = useCallback((chosen) => {
    if (selectedAnswer !== null || revealed) return;
    const q = questions[index];
    const elapsed = turnStartedAt
      ? (Date.now() - new Date(turnStartedAt).getTime()) / 1000
      : 0;
    const correct = chosen !== null && chosen === q.correct_answer;
    const earned = correct ? timeScaledXP(q.xp_reward ?? 100, elapsed, timerSeconds) : 0;

    setSelectedAnswer(chosen);
    setRevealed(true);
    setTotalXP((x) => x + earned);
    setLog((l) => [...l, { correct, xp: earned }]);

    const newHearts = correct ? hearts : Math.max(0, hearts - 1);
    setHearts(newHearts);

    if (correct) playCorrect(); else playWrong();

    const isLast = index >= questions.length - 1;
    if (isLast || newHearts === 0) pendingFinish.current = true;

    setRevealUntil(Date.now() + REVEAL_MS);
  }, [selectedAnswer, revealed, questions, index, turnStartedAt, timerSeconds, hearts]);

  const handleTimerExpire = useCallback(() => {
    handleAnswer(null);
  }, [handleAnswer]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (phase === 'setup') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md flex flex-col gap-5">
          <div>
            <h2 className="font-display font-bold text-2xl text-offwhite">Solo Practice</h2>
            <p className="text-muted font-body text-sm mt-1">Practice on your own, at your own pace.</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted font-body">Question Bank</label>
            <select
              className="w-full bg-navy border border-violet/20 rounded-xl px-4 py-3 text-offwhite font-body text-base focus:outline-none focus:border-violet transition-colors"
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
            >
              <option value="">— Select a bank —</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>{b.topic}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted font-body">Timer per question (seconds)</label>
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={timerSeconds}
              onChange={(e) => setTimerSeconds(Number(e.target.value))}
              className="accent-violet"
            />
            <span className="text-xs text-muted font-body text-right">{timerSeconds}s</span>
          </div>

          <Button onClick={startGame} disabled={!bankId} className="mt-2">
            Start Practice →
          </Button>
          <Button variant="ghost" onClick={() => navigate('/')}>← Back</Button>
        </Card>
      </div>
    );
  }

  if (phase === 'playing') {
    const question = questions[index];
    const inReveal = revealSecondsLeft > 0;
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-violet/10">
          <div className="flex items-center gap-3">
            <span className="font-body text-sm text-muted">
              {index + 1} / {questions.length}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: STARTING_HEARTS }).map((_, i) => (
                <span key={i} className={`text-base ${i < hearts ? 'opacity-100' : 'opacity-20'}`}>
                  ❤️
                </span>
              ))}
            </div>
          </div>
          <span className="font-display font-bold text-violet text-sm">{totalXP} XP</span>
          <Button variant="ghost" className="text-xs" onClick={() => setPhase('finished')}>
            End
          </Button>
        </div>

        {/* Question */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-4">
          {inReveal && (
            <div className={`bg-slate-card border rounded-xl px-5 py-3 text-center animate-slide_in ${
              selectedAnswer === question.correct_answer ? 'border-emerald/30' : 'border-crimson/30'
            }`}>
              <p className={`font-display font-semibold text-sm ${
                selectedAnswer === question.correct_answer ? 'text-emerald' : 'text-crimson'
              }`}>
                {selectedAnswer === question.correct_answer ? 'Correct!' : 'Wrong answer'}
              </p>
              <p className="text-muted font-body text-xs mt-0.5">
                Next in <span className="text-offwhite font-semibold">{revealSecondsLeft}s</span>
              </p>
            </div>
          )}
          <QuestionCard
            question={question}
            turnStartedAt={turnStartedAt}
            timerSeconds={timerSeconds}
            isMyTurn={!revealed}
            selectedAnswer={selectedAnswer}
            revealed={revealed}
            onAnswer={handleAnswer}
            onTimerExpire={handleTimerExpire}
          />
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-card border-t border-violet/10 text-center">
          <span className="text-xs text-muted font-body">Solo Practice — answer within {timerSeconds}s for full XP</span>
        </div>
      </div>
    );
  }

  // phase === 'finished'
  const correct = log.filter((e) => e.correct).length;
  const accuracy = log.length > 0 ? Math.round((correct / log.length) * 100) : 0;
  const grade =
    accuracy >= 90 ? 'A' :
    accuracy >= 75 ? 'B' :
    accuracy >= 60 ? 'C' :
    accuracy >= 45 ? 'D' : 'F';
  const gradeColor =
    grade === 'A' ? 'text-emerald' :
    grade === 'B' ? 'text-violet' :
    grade === 'C' ? 'text-amber' :
    'text-crimson';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 py-12">
      <Card className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <div>
          <p className="text-muted font-body text-sm mb-1">Practice complete</p>
          <span className={`font-display font-extrabold text-8xl ${gradeColor}`}>{grade}</span>
        </div>

        <div className="grid grid-cols-3 gap-4 w-full">
          <Stat label="XP Earned" value={totalXP} />
          <Stat label="Correct" value={`${correct}/${log.length}`} />
          <Stat label="Accuracy" value={`${accuracy}%`} />
        </div>

        {hearts === 0 && (
          <p className="text-crimson font-body text-sm">You ran out of hearts!</p>
        )}

        <div className="flex flex-col gap-2 w-full">
          <Button onClick={() => { setPhase('setup'); }} className="w-full">
            Practice Again
          </Button>
          <Button variant="ghost" onClick={() => navigate('/')}>← Home</Button>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-display font-bold text-xl text-offwhite">{value}</span>
      <span className="text-xs text-muted font-body">{label}</span>
    </div>
  );
}
