import { useRef, useState } from 'react';
import { parseQuestionsFromFile } from '../../lib/aiParser';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

const ACCEPTED = '.txt,.md,.csv,.png,.jpg,.jpeg,.webp';
const OPTION_KEY = { A: 'option_a', B: 'option_b', C: 'option_c', D: 'option_d' };

export function AIImport({ bank, onImported, onClose }) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [questions, setQuestions] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
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
      for (let i = 0; i < files.length; i++) {
        const fileLabel = files.length > 1 ? ` (file ${i + 1}/${files.length})` : '';
        setProgress(`Parsing ${files[i].name}${fileLabel}…`);
        const qs = await parseQuestionsFromFile(files[i], (chunkMsg) =>
          setProgress(`${files[i].name}${fileLabel} — ${chunkMsg}`)
        );
        all.push(...qs);
      }
      setQuestions(all);
    } catch (e) {
      setError(e.message ?? 'Something went wrong — check your VITE_OPENAI_API_KEY.');
    } finally {
      setProcessing(false);
      setProgress('');
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Bank name */}
      <p className="text-sm font-body text-muted">
        Importing into: <span className="text-violet font-semibold">{bank.topic}</span>
      </p>

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
            <p className="text-4xl mb-2">📂</p>
            <p className="text-offwhite font-body text-sm font-semibold">Click to select files or drag & drop</p>
            <p className="text-muted font-body text-xs mt-1">Supported: .txt  .md  .csv  .png  .jpg  .jpeg  .webp</p>
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

      {/* Status / error */}
      {processing && (
        <p className="text-violet text-sm font-body animate-pulse">{progress}</p>
      )}
      {error && (
        <p className="text-crimson text-sm font-body bg-crimson/10 px-3 py-2 rounded-lg">
          ⚠ {error}
        </p>
      )}

      {/* Preview */}
      {questions !== null && (
        <div className="flex flex-col gap-2">
          {questions.length === 0 ? (
            <p className="text-muted text-sm font-body">No questions found in these files.</p>
          ) : (
            <>
              <p className="text-emerald font-body text-sm font-semibold">
                ✓ {questions.length} question{questions.length !== 1 ? 's' : ''} extracted
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
                {questions.length > 6 && (
                  <p className="text-muted text-xs font-body text-center py-1">
                    +{questions.length - 6} more questions…
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="ghost" onClick={onClose} disabled={processing}>
          Cancel
        </Button>
        {questions === null ? (
          <Button onClick={handleExtract} disabled={files.length === 0 || processing}>
            {processing ? '…' : '✨ Extract Questions'}
          </Button>
        ) : (
          <Button onClick={() => onImported(questions)} disabled={questions.length === 0}>
            Import {questions.length} →
          </Button>
        )}
      </div>
    </div>
  );
}
