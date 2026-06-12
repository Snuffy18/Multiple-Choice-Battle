import { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

const EMPTY = {
  text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: 'A',
  xp_reward: 100,
};

export function QuestionForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial ?? EMPTY);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="text-sm text-muted font-body block mb-1">Question</label>
        <textarea
          className="w-full bg-navy border border-violet/20 rounded-xl px-4 py-3 text-offwhite placeholder-muted font-body text-base focus:outline-none focus:border-violet transition-colors resize-none"
          rows={3}
          placeholder="Enter question text…"
          value={form.text}
          onChange={(e) => set('text', e.target.value)}
          required
        />
      </div>

      {['A', 'B', 'C', 'D'].map((id) => (
        <div key={id} className="flex items-center gap-3">
          <input
            type="radio"
            name="correct"
            value={id}
            checked={form.correct_answer === id}
            onChange={() => set('correct_answer', id)}
            className="accent-emerald w-4 h-4 cursor-pointer"
            title="Mark as correct"
          />
          <Input
            label={`Option ${id}`}
            placeholder={`Option ${id}…`}
            value={form[`option_${id.toLowerCase()}`]}
            onChange={(e) => set(`option_${id.toLowerCase()}`, e.target.value)}
            required
          />
        </div>
      ))}

      <Input
        label="XP Reward"
        type="number"
        min={10}
        max={1000}
        step={10}
        value={form.xp_reward}
        onChange={(e) => set('xp_reward', Number(e.target.value))}
      />

      <div className="flex gap-3 justify-end pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving…' : initial ? 'Save Changes' : 'Add Question'}
        </Button>
      </div>
    </form>
  );
}
