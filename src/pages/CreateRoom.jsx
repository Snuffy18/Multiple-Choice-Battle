import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { generateRoomCode } from '../lib/roomCode';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export default function CreateRoom() {
  const navigate = useNavigate();
  const [banks, setBanks] = useState([]);
  const [form, setForm] = useState({
    username: '',
    topic: '',
    bankId: '',
    hearts: 3,
    timer: 20,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase
      .from('question_banks')
      .select('id, topic')
      .order('created_at', { ascending: false })
      .then(({ data }) => setBanks(data ?? []));
  }, []);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.bankId) { setError('Please select a question bank.'); return; }

    setLoading(true);
    try {
      const code = generateRoomCode();
      const adminId = form.username.trim();

      const { error: insertError } = await supabase.from('rooms').insert({
        id: code,
        topic: form.topic.trim(),
        status: 'waiting',
        admin_id: adminId,
        starting_hearts: Number(form.hearts),
        timer_seconds: Number(form.timer),
        question_bank_id: form.bankId,
        players: [{ id: adminId, username: adminId, hearts: Number(form.hearts), xp: 0, isReady: false }],
        current_question_index: 0,
      });

      if (insertError) throw new Error(insertError.message);

      // Save local identity
      sessionStorage.setItem(`player_id_${code}`, adminId);
      navigate(`/room/${code}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <h2 className="font-display font-bold text-2xl text-offwhite mb-6">Create Battle Room</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Your username"
            placeholder="e.g. Alex"
            value={form.username}
            onChange={(e) => set('username', e.target.value)}
            required
          />
          <Input
            label="Topic name"
            placeholder="e.g. Biology Chapter 4"
            value={form.topic}
            onChange={(e) => set('topic', e.target.value)}
            required
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted font-body">Question Bank</label>
            <select
              className="w-full bg-slate-card border border-violet/20 rounded-xl px-4 py-3 text-offwhite font-body text-base focus:outline-none focus:border-violet transition-colors"
              value={form.bankId}
              onChange={(e) => set('bankId', e.target.value)}
            >
              <option value="">— Select a bank —</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>{b.topic}</option>
              ))}
            </select>
            <button
              type="button"
              className="text-xs text-violet hover:text-violet-dark text-left mt-1 font-body"
              onClick={() => navigate('/admin/questions')}
            >
              + Create a new question bank
            </button>
          </div>

          <div className="flex gap-4">
            <Input
              label="Starting hearts"
              type="number"
              min={1}
              max={10}
              value={form.hearts}
              onChange={(e) => set('hearts', e.target.value)}
            />
            <Input
              label="Timer (seconds)"
              type="number"
              min={5}
              max={120}
              value={form.timer}
              onChange={(e) => set('timer', e.target.value)}
            />
          </div>

          {error && <p className="text-crimson text-sm">{error}</p>}

          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? 'Creating…' : 'Create Room →'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
