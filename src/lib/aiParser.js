import OpenAI from 'openai';

const SYSTEM_PROMPT = `You are an expert at extracting multiple-choice questions from educational materials.

Extract ALL multiple-choice questions from the provided content and return them as a JSON object.

Each question MUST have exactly these fields:
- text: the question text (string)
- option_a: option A text (string)
- option_b: option B text (string)
- option_c: option C text (string)
- option_d: option D text (string)
- correct_answer: exactly one of "A", "B", "C", or "D" (string)
- xp_reward: integer between 50 and 200 based on difficulty (easy=50, medium=100, hard=150, very hard=200)

Return ONLY valid JSON with a "questions" array. No markdown, no extra text.

Example output:
{"questions":[{"text":"What is the capital of France?","option_a":"London","option_b":"Paris","option_c":"Berlin","option_d":"Madrid","correct_answer":"B","xp_reward":100}]}

If no questions are found, return: {"questions":[]}`;

// Split large text into ~8 000-char chunks on blank-line boundaries so we never
// hit GPT-4o's output token limit (~16 384 tokens ≈ 80 questions per call).
const CHUNK_CHARS = 8000;

function splitIntoChunks(text) {
  if (text.length <= CHUNK_CHARS) return [text];
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = start + CHUNK_CHARS;
    if (end >= text.length) {
      chunks.push(text.slice(start));
      break;
    }
    // Prefer splitting on a blank line near the end of the window
    const boundary = text.lastIndexOf('\n\n', end);
    if (boundary > start + CHUNK_CHARS / 2) end = boundary;
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

function getClient() {
  const key = import.meta.env.VITE_OPENAI_API_KEY;
  if (!key) {
    throw new Error('VITE_OPENAI_API_KEY is not set. Add it to your .env.local file.');
  }
  return new OpenAI({ apiKey: key, dangerouslyAllowBrowser: true });
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsText(file);
  });
}

function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result.split(',')[1]);
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

const IMAGE_EXTS = /\.(png|jpg|jpeg|webp|gif)$/i;

function validate(q) {
  return (
    typeof q.text === 'string' && q.text.trim().length > 0 &&
    typeof q.option_a === 'string' && q.option_a.trim().length > 0 &&
    typeof q.option_b === 'string' && q.option_b.trim().length > 0 &&
    typeof q.option_c === 'string' && q.option_c.trim().length > 0 &&
    typeof q.option_d === 'string' && q.option_d.trim().length > 0 &&
    ['A', 'B', 'C', 'D'].includes(String(q.correct_answer).toUpperCase())
  );
}

function normalize(q) {
  const xp = Number(q.xp_reward);
  return {
    text: String(q.text).trim(),
    option_a: String(q.option_a).trim(),
    option_b: String(q.option_b).trim(),
    option_c: String(q.option_c).trim(),
    option_d: String(q.option_d).trim(),
    correct_answer: String(q.correct_answer).toUpperCase(),
    xp_reward: Number.isFinite(xp) && xp >= 50 && xp <= 200 ? xp : 100,
  };
}

async function extractFromContent(client, userContent) {
  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 16384,
    temperature: 0.1,
  });
  const raw = completion.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw);
  const list = Array.isArray(parsed.questions) ? parsed.questions : [];
  return list.filter(validate).map(normalize);
}

export async function parseQuestionsFromFile(file, onProgress) {
  const client = getClient();
  const isImage = IMAGE_EXTS.test(file.name) || (file.type ?? '').startsWith('image/');

  if (isImage) {
    const base64 = await readAsBase64(file);
    const mimeType = file.type || 'image/jpeg';
    const userContent = [
      {
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' },
      },
      { type: 'text', text: 'Extract all multiple-choice questions from this image.' },
    ];
    return extractFromContent(client, userContent);
  }

  const text = await readAsText(file);
  if (!text.trim()) return [];

  const chunks = splitIntoChunks(text);
  const all = [];

  for (let i = 0; i < chunks.length; i++) {
    onProgress?.(`Parsing chunk ${i + 1}/${chunks.length}…`);
    const userContent = `Extract all multiple-choice questions from the following content:\n\n${chunks[i]}`;
    const questions = await extractFromContent(client, userContent);
    all.push(...questions);
  }

  return all;
}
