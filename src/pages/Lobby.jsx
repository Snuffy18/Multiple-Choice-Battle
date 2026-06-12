import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useRoom } from '../hooks/useRoom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function Lobby() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { room, loading, updateRoom } = useRoom(code);

  const localId = sessionStorage.getItem(`player_id_${code}`) ?? '';
  const [starting, setStarting] = useState(false);
  const [heartsEdit, setHeartsEdit] = useState('');
  const [timerEdit, setTimerEdit] = useState('');

  useEffect(() => {
    if (room) {
      setHeartsEdit(String(room.starting_hearts));
      setTimerEdit(String(room.timer_seconds));
    }
  }, [room?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect when battle starts
  useEffect(() => {
    if (room?.status === 'battle') navigate(`/room/${code}/battle`);
  }, [room?.status, code, navigate]);

  if (loading) return <Splash text="Loading room…" />;
  if (!room) return <Splash text="Room not found." />;

  const isAdmin = localId === room.admin_id;
  const players = room.players ?? [];
  const bothJoined = players.length === 2;

  async function handleStart() {
    if (!bothJoined) return;
    setStarting(true);

    try {
      // Fetch questions for the bank
      const { data: qs } = await supabase
        .from('questions')
        .select('*')
        .eq('bank_id', room.question_bank_id);

      if (!qs || qs.length === 0) {
        alert('This question bank has no questions!');
        setStarting(false);
        return;
      }

      const shuffled = [...qs].sort(() => Math.random() - 0.5);
      const updatedPlayers = players.map((p) => ({
        ...p,
        hearts: Number(heartsEdit) || room.starting_hearts,
        xp: 0,
      }));

      await updateRoom({
        status: 'battle',
        questions_snapshot: shuffled,
        players: updatedPlayers,
        current_turn: updatedPlayers[0].id,
        current_question_index: 0,
        turn_started_at: new Date().toISOString(),
        starting_hearts: Number(heartsEdit) || room.starting_hearts,
        timer_seconds: Number(timerEdit) || room.timer_seconds,
        winner_id: null,
      });
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-12">
      {/* Room code */}
      <div className="text-center">
        <p className="text-muted font-body text-sm mb-1">Share this code</p>
        <div className="font-display font-extrabold text-5xl text-violet tracking-widest bg-slate-card px-8 py-4 rounded-2xl border border-violet/30">
          {code}
        </div>
        <p className="text-muted font-body text-xs mt-2">{room.topic}</p>
      </div>

      {/* Players */}
      <div className="flex gap-4 w-full max-w-sm">
        {[0, 1].map((i) => {
          const player = players[i];
          return (
            <Card key={i} className="flex-1 flex flex-col items-center gap-2 text-center">
              <span className="text-2xl">{i === 0 ? '👑' : '🎮'}</span>
              <p className="font-display font-bold text-offwhite">
                {player ? player.username : <span className="text-muted">Waiting…</span>}
              </p>
              {player && (
                <span className="text-xs text-emerald font-body">● Joined</span>
              )}
            </Card>
          );
        })}
      </div>

      {/* Admin controls */}
      {isAdmin && (
        <Card className="w-full max-w-sm flex flex-col gap-4">
          <p className="text-sm font-display font-semibold text-offwhite">Battle settings</p>
          <div className="flex gap-3">
            <Input
              label="Starting hearts"
              type="number"
              min={1}
              max={10}
              value={heartsEdit}
              onChange={(e) => setHeartsEdit(e.target.value)}
            />
            <Input
              label="Timer (sec)"
              type="number"
              min={5}
              max={120}
              value={timerEdit}
              onChange={(e) => setTimerEdit(e.target.value)}
            />
          </div>

          <Button
            onClick={handleStart}
            disabled={!bothJoined || starting}
            className="w-full py-4 text-lg"
          >
            {starting ? 'Starting…' : bothJoined ? '⚔️ Start Battle' : 'Waiting for Player 2…'}
          </Button>
        </Card>
      )}

      {!isAdmin && (
        <p className="text-muted font-body text-sm">Waiting for the admin to start the battle…</p>
      )}
    </div>
  );
}

function Splash({ text }) {
  return (
    <div className="min-h-screen flex items-center justify-center text-muted font-body">{text}</div>
  );
}
