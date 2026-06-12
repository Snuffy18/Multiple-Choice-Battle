import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export default function JoinRoom() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ code: '', username: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const code = form.code.trim().toUpperCase();
    const username = form.username.trim();

    try {
      const { data: room, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', code)
        .single();

      if (fetchError || !room) throw new Error('Room not found.');
      if (room.status !== 'waiting') throw new Error('This battle has already started or finished.');
      if (room.players.length >= 2) throw new Error('Room is full.');
      if (room.players.some((p) => p.id === username)) throw new Error('Username taken in this room.');

      const updatedPlayers = [
        ...room.players,
        { id: username, username, hearts: room.starting_hearts, xp: 0, isReady: false },
      ];

      const { error: updateError } = await supabase
        .from('rooms')
        .update({ players: updatedPlayers })
        .eq('id', code);

      if (updateError) throw new Error(updateError.message);

      sessionStorage.setItem(`player_id_${code}`, username);
      navigate(`/room/${code}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <h2 className="font-display font-bold text-2xl text-offwhite mb-6">Join a Battle</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Room code"
            placeholder="e.g. WOLF42"
            value={form.code}
            onChange={(e) => set('code', e.target.value.toUpperCase())}
            maxLength={6}
            required
          />
          <Input
            label="Your username"
            placeholder="e.g. Jordan"
            value={form.username}
            onChange={(e) => set('username', e.target.value)}
            required
          />

          {error && <p className="text-crimson text-sm">{error}</p>}

          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? 'Joining…' : 'Join Battle →'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
