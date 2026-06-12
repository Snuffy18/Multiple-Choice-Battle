import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { QuestionBankList } from '../components/admin/QuestionBankList';
import { QuestionForm } from '../components/admin/QuestionForm';
import { AIImport } from '../components/admin/AIImport';

export default function AdminQuestions() {
  const navigate = useNavigate();
  const [banks, setBanks] = useState([]);
  const [selectedBank, setSelectedBank] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [newBankTopic, setNewBankTopic] = useState('');
  const [creatingBank, setCreatingBank] = useState(false);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [aiImporting, setAiImporting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBanks();
  }, []);

  useEffect(() => {
    if (selectedBank) loadQuestions(selectedBank.id);
    else setQuestions([]);
  }, [selectedBank?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadBanks() {
    const { data } = await supabase
      .from('question_banks')
      .select('id, topic, created_at')
      .order('created_at', { ascending: false });

    if (!data) return;

    // Annotate with question counts
    const counts = await Promise.all(
      data.map((b) =>
        supabase.from('questions').select('id', { count: 'exact', head: true }).eq('bank_id', b.id)
      )
    );

    setBanks(data.map((b, i) => ({ ...b, question_count: counts[i].count ?? 0 })));
  }

  async function loadQuestions(bankId) {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('bank_id', bankId)
      .order('created_at');
    setQuestions(data ?? []);
  }

  async function handleCreateBank(e) {
    e.preventDefault();
    if (!newBankTopic.trim()) return;
    setCreatingBank(true);
    await supabase.from('question_banks').insert({ topic: newBankTopic.trim(), created_by: 'admin' });
    setNewBankTopic('');
    await loadBanks();
    setCreatingBank(false);
  }

  async function handleDeleteBank(id) {
    if (!confirm('Delete this question bank and all its questions?')) return;
    await supabase.from('question_banks').delete().eq('id', id);
    if (selectedBank?.id === id) setSelectedBank(null);
    await loadBanks();
  }

  async function handleSaveQuestion(form) {
    setSaving(true);
    if (editingQuestion) {
      await supabase.from('questions').update(form).eq('id', editingQuestion.id);
      setEditingQuestion(null);
    } else {
      await supabase.from('questions').insert({ ...form, bank_id: selectedBank.id });
      setAddingQuestion(false);
    }
    await loadQuestions(selectedBank.id);
    await loadBanks();
    setSaving(false);
  }

  async function handleDeleteQuestion(id) {
    await supabase.from('questions').delete().eq('id', id);
    await loadQuestions(selectedBank.id);
    await loadBanks();
  }

  async function handleAIImport(questions) {
    if (!selectedBank || questions.length === 0) return;
    setSaving(true);
    const rows = questions.map((q) => ({ ...q, bank_id: selectedBank.id }));
    await supabase.from('questions').insert(rows);
    setAiImporting(false);
    await loadQuestions(selectedBank.id);
    await loadBanks();
    setSaving(false);
  }

  const OPTION_KEY = { A: 'option_a', B: 'option_b', C: 'option_c', D: 'option_d' };

  return (
    <div className="min-h-screen px-4 py-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl text-offwhite">Question Banks</h1>
          <p className="text-muted font-body text-sm mt-1">Manage your question banks for ExamBattle</p>
        </div>
        <Button variant="ghost" onClick={() => navigate('/')}>← Home</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: bank list + create */}
        <div className="flex flex-col gap-4">
          <form onSubmit={handleCreateBank} className="flex gap-2">
            <Input
              placeholder="New bank topic…"
              value={newBankTopic}
              onChange={(e) => setNewBankTopic(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="sm" disabled={creatingBank}>
              {creatingBank ? '…' : '+ Create'}
            </Button>
          </form>

          <QuestionBankList
            banks={banks}
            selectedId={selectedBank?.id}
            onSelect={setSelectedBank}
            onDelete={handleDeleteBank}
          />
        </div>

        {/* Right: question list */}
        <div className="flex flex-col gap-4">
          {selectedBank ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-display font-semibold text-offwhite">
                  {selectedBank.topic}
                </h2>
                <div className="flex gap-2">
                  <Button variant="sm" onClick={() => setAiImporting(true)}>
                    Import
                  </Button>
                  <Button variant="sm" onClick={() => setAddingQuestion(true)}>
                    + Add
                  </Button>
                </div>
              </div>

              {questions.length === 0 ? (
                <p className="text-muted text-sm font-body">No questions yet.</p>
              ) : (
                <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
                  {questions.map((q, i) => (
                    <Card key={q.id} className="flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-offwhite font-body text-sm flex-1">
                          <span className="text-muted mr-2">Q{i + 1}.</span>{q.text}
                        </p>
                        <div className="flex gap-1 shrink-0">
                          <button
                            className="text-xs text-violet hover:text-offwhite font-body px-2 py-1"
                            onClick={() => setEditingQuestion(q)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-xs text-crimson hover:text-offwhite font-body px-2 py-1"
                            onClick={() => handleDeleteQuestion(q.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {['A', 'B', 'C', 'D'].map((id) => (
                          <span
                            key={id}
                            className={`text-xs font-body px-2 py-1 rounded ${
                              id === q.correct_answer
                                ? 'bg-emerald/15 text-emerald'
                                : 'text-muted'
                            }`}
                          >
                            {id}. {q[OPTION_KEY[id]]}
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-amber font-body">✨ {q.xp_reward} XP</span>
                    </Card>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-muted font-body text-sm">
              Select a bank to manage its questions
            </div>
          )}
        </div>
      </div>

      {/* Add question modal */}
      <Modal open={addingQuestion} onClose={() => setAddingQuestion(false)}>
        <h3 className="font-display font-bold text-xl text-offwhite mb-5">Add Question</h3>
        <QuestionForm
          onSave={handleSaveQuestion}
          onCancel={() => setAddingQuestion(false)}
          loading={saving}
        />
      </Modal>

      {/* Edit question modal */}
      <Modal open={!!editingQuestion} onClose={() => setEditingQuestion(null)}>
        <h3 className="font-display font-bold text-xl text-offwhite mb-5">Edit Question</h3>
        {editingQuestion && (
          <QuestionForm
            initial={editingQuestion}
            onSave={handleSaveQuestion}
            onCancel={() => setEditingQuestion(null)}
            loading={saving}
          />
        )}
      </Modal>

      {/* AI import modal */}
      <Modal open={aiImporting} onClose={() => setAiImporting(false)}>
        <h3 className="font-display font-bold text-xl text-offwhite mb-5">Import Questions</h3>
        {aiImporting && selectedBank && (
          <AIImport
            bank={selectedBank}
            onImported={handleAIImport}
            onClose={() => setAiImporting(false)}
          />
        )}
      </Modal>
    </div>
  );
}
