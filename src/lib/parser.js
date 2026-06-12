// Pure text parser — no AI needed.
// Expected format (one blank line between questions):
//
// Q1. Question text here?
// A) Option A
// B) Option B
// C) Option C
// D) Option D
// Răspuns: B
//
// Tolerates: Q1. / 1. / 1)  •  A) / A. / a) / a.
// Answer keyword: Răspuns / Raspuns / Answer / Correct / Ans  (case-insensitive)

function parseBlock(block) {
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 6) return null;

  // Question text — strip leading numbering (Q1. / 1. / 1))
  const questionText = lines[0].replace(/^(Q\s*\d+[.)]\s*|\d+[.)]\s*)/, '').trim();
  if (!questionText) return null;

  // Options A–D
  const options = {};
  for (const line of lines) {
    const m = line.match(/^([A-Da-d])\s*[.)]\s*(.+)/);
    if (m) options[m[1].toUpperCase()] = m[2].trim();
  }
  if (!options.A || !options.B || !options.C || !options.D) return null;

  // Correct answer
  let correct = null;
  for (const line of lines) {
    const m = line.match(
      /^(?:r[aă]spuns|raspuns|answer|correct|ans)\s*:?\s*([A-Da-d])/i
    );
    if (m) { correct = m[1].toUpperCase(); break; }
  }
  if (!correct) return null;

  return {
    text: questionText,
    option_a: options.A,
    option_b: options.B,
    option_c: options.C,
    option_d: options.D,
    correct_answer: correct,
    xp_reward: 100,
  };
}

function parseText(text) {
  // Split on blank lines OR on a new question number at the start of a line
  const blocks = text
    .split(/\n\s*\n|(?=\n(?:Q\s*\d+[.)]\s*|\d+[.)]\s*))/g)
    .map((b) => b.trim())
    .filter(Boolean);

  return blocks.map(parseBlock).filter(Boolean);
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsText(file);
  });
}

export async function parseQuestionsFromFile(file) {
  const text = await readAsText(file);
  if (!text.trim()) return [];
  return parseText(text);
}
