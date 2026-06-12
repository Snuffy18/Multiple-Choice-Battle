import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useRoom } from '../hooks/useRoom';
import { buildPlayAgain } from '../lib/gameLogic';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';

const OPTION_KEY = { A: 'option_a', B: 'option_b', C: 'option_c', D: 'option_d' };

export default function Result() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { room, loading, updateRoom } = useRoom(code);
  const firedRef = useRef(false);
  const [events, setEvents] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);

  const localId = sessionStorage.getItem(`player_id_${code}`) ?? '';

  useEffect(() => {
    if (room?.status === 'battle') navigate(`/room/${code}/battle`);
    if (room?.status === 'waiting') navigate(`/room/${code}`);
  }, [room?.status, code, navigate]);

  useEffect(() => {
    if (!room || firedRef.current) return;
    firedRef.current = true;
    if (room.winner_id === localId) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.4 } });
    }
  }, [room, localId]);

  useEffect(() => {
    if (!code) return;
    supabase
      .from('game_events')
      .select('*')
      .eq('room_id', code)
      .order('created_at')
      .then(({ data }) => setEvents(data ?? []));
  }, [code]);

  if (loading || !room) {
    return <div className="min-h-screen flex items-center justify-center text-muted font-body">Loading…</div>;
  }

  const players = room.players ?? [];
  const winner = players.find((p) => p.id === room.winner_id);
  const isDraw = !room.winner_id;
  const isAdmin = localId === room.admin_id;
  const questions = room.questions_snapshot ?? [];

  async function handlePlayAgain() {
    const patch = buildPlayAgain(room);
    await updateRoom(patch);
    navigate(`/room/${code}/battle`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center gap-8 px-4 py-12">
      {/* Winner announcement */}
      <div className="text-center flex flex-col gap-3">
        <span className="text-6xl">{isDraw ? '🤝' : '🏆'}</span>
        <h1 className="font-display font-extrabold text-5xl text-offwhite">
          {isDraw ? "It's a Draw!" : `${winner?.username} Wins!`}
        </h1>
        <p className="text-muted font-body">{room.topic}</p>
      </div>

      {/* Scoreboard */}
      <div className="flex gap-4 w-full max-w-sm">
        {players.map((p) => {
          const isWinner = p.id === room.winner_id;
          return (
            <Card
              key={p.id}
              className={`flex-1 flex flex-col items-center gap-2 text-center ${
                isWinner ? 'border-amber bg-amber/5' : ''
              }`}
            >
              {isWinner && <span className="text-xl">🏆</span>}
              <p className="font-display font-bold text-offwhite">{p.username}</p>
              <p className="text-amber font-display font-semibold">✨ {p.xp} XP</p>
              <p className="text-crimson font-body text-sm">
                {p.hearts} ❤️ remaining
              </p>
              {p.id === localId && (
                <span className="text-xs text-muted font-body">(you)</span>
              )}
            </Card>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {isAdmin && (
          <Button onClick={handlePlayAgain}>
            🔄 Play Again
          </Button>
        )}
        <Button variant="secondary" onClick={() => navigate('/')}>
          Back to Home
        </Button>
      </div>

      {/* Answer review */}
      <div className="w-full max-w-2xl">
        <button
          className="text-sm text-violet hover:text-offwhite font-body transition-colors mb-4"
          onClick={() => setReviewOpen((v) => !v)}
        >
          {reviewOpen ? '▲ Hide' : '▼ Show'} Answer Review ({questions.length} questions)
        </button>

        {reviewOpen && (
          <div className="flex flex-col gap-4">
            {questions.map((q, i) => {
              const qEvents = events.filter((e) => e.question_id === q.id);
              return (
                <Card key={q.id} className="flex flex-col gap-3">
                  <p className="text-sm text-muted font-body">Q{i + 1}</p>
                  <p className="text-offwhite font-body">{q.text}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['A', 'B', 'C', 'D'].map((id) => {
                      const isCorrect = id === q.correct_answer;
                      return (
                        <div
                          key={id}
                          className={`rounded-lg px-3 py-2 text-sm font-body border ${
                            isCorrect
                              ? 'bg-emerald/15 border-emerald text-emerald'
                              : 'bg-slate-card/50 border-violet/10 text-muted'
                          }`}
                        >
                          <span className="font-bold mr-1">{id}.</span>
                          {q[OPTION_KEY[id]]}
                        </div>
                      );
                    })}
                  </div>
                  {qEvents.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {qEvents.map((ev) => {
                        const p = players.find((pl) => pl.id === ev.player_id);
                        return (
                          <span
                            key={ev.id}
                            className={`text-xs px-2 py-1 rounded-full font-body border ${
                              ev.correct
                                ? 'bg-emerald/10 border-emerald/30 text-emerald'
                                : 'bg-crimson/10 border-crimson/30 text-crimson'
                            }`}
                          >
                            {p?.username ?? ev.player_id}: {ev.chosen_answer ?? '⏱'}{' '}
                            {ev.correct ? '✓' : '✗'}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
