import { useRef, useState } from 'react';
import { parseQuestionsFromFile } from '../../lib/parser';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

const ACCEPTED = '.txt,.md';
const OPTION_KEY = { A: 'option_a', B: 'option_b', C: 'option_c', D: 'option_d' };

export function AIImport({ bank, onImported, onClose }) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [questions, setQuestions] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  function pickFiles(fileList) {
    setFiles(Array.from(fileList));
    setQuestions(null);
    setError(null);
  }

  async function handleExtract() {
    setProcessing(true);
    setError(null);
    setQuestions(null);

    const all = [];
    try {
      for (const file of files) {
        const qs = await parseQuestionsFromFile(file);
        all.push(...qs);
      }
      setQuestions(all);
      if (all.length === 0) {
        setError('No questions found. Make sure your file follows the required format.');
      }
    } catch (e) {
      setError(e.message ?? 'Something went wrong reading the file.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Bank name */}
      <p className="text-sm font-body text-muted">
        Importing into: <span className="text-violet font-semibold">{bank.topic}</span>
      </p>

      {/* Format hint */}
      <div className="bg-navy border border-violet/10 rounded-xl px-4 py-3 font-body text-xs text-muted leading-relaxed">
        <p className="text-offwhite font-semibold mb-1">Expected format:</p>
        <pre className="whitespace-pre-wrap">{`Q1. Question text?
A) Option A
B) Option B
C) Option C
D) Option D
Răspuns: B`}</pre>
        <p className="mt-2">Separate each question with a blank line.</p>
      </div>

      {/* Drop zone */}
      <div
        className="border-2 border-dashed border-violet/30 rounded-xl p-8 text-center cursor-pointer hover:border-violet/60 transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); pickFiles(e.dataTransfer.files); }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => pickFiles(e.target.files)}
        />
        {files.length === 0 ? (
          <>
            <p className="text-offwhite font-body text-sm font-semibold">Click to select files or drag & drop</p>
            <p className="text-muted font-body text-xs mt-1">Supported: .txt  .md</p>
          </>
        ) : (
          <div className="flex flex-col gap-1">
            {files.map((f, i) => (
              <p key={i} className="text-offwhite font-body text-sm">📄 {f.name}</p>
            ))}
            <button
              className="text-xs text-muted hover:text-crimson font-body mt-2 transition-colors"
              onClick={(e) => { e.stopPropagation(); setFiles([]); setQuestions(null); }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-crimson text-sm font-body bg-crimson/10 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      {/* Preview */}
      {questions !== null && questions.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-emerald font-body text-sm font-semibold">
            {questions.length} question{questions.length !== 1 ? 's' : ''} found
          </p>
          <div className="max-h-52 overflow-y-auto flex flex-col gap-2 pr-1">
            {questions.slice(0, 6).map((q, i) => (
              <Card key={i} className="flex flex-col gap-1 py-2">
                <p className="text-offwhite font-body text-xs line-clamp-2">
                  <span className="text-muted mr-1">Q{i + 1}.</span>{q.text}
                </p>
                <div className="grid grid-cols-2 gap-1 mt-1">
                  {['A', 'B', 'C', 'D'].map((id) => (
                    <span
                      key={id}
                      className={`text-xs font-body px-1.5 py-0.5 rounded ${
                        id === q.correct_answer ? 'bg-emerald/15 text-emerald' : 'text-muted'
                      }`}
                    >
                      {id}. {q[OPTION_KEY[id]]}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
            {questions.length > 6 && (
              <p className="text-muted text-xs font-body text-center py-1">
                +{questions.length - 6} more…
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="ghost" onClick={onClose} disabled={processing}>
          Cancel
        </Button>
        {questions === null || questions.length === 0 ? (
          <Button onClick={handleExtract} disabled={files.length === 0 || processing}>
            {processing ? 'Reading…' : 'Extract Questions'}
          </Button>
        ) : (
          <Button onClick={() => onImported(questions)}>
            Import {questions.length} →
          </Button>
        )}
      </div>
    </div>
  );
}
