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

export async function parseQuestionsFromFile(file) {
  const client = getClient();
  const isImage = IMAGE_EXTS.test(file.name) || (file.type ?? '').startsWith('image/');

  let userContent;

  if (isImage) {
    const base64 = await readAsBase64(file);
    const mimeType = file.type || 'image/jpeg';
    userContent = [
      {
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' },
      },
      { type: 'text', text: 'Extract all multiple-choice questions from this image.' },
    ];
  } else {
    const text = await readAsText(file);
    if (!text.trim()) return [];
    userContent = `Extract all multiple-choice questions from the following content:\n\n${text}`;
  }

  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw);
  const list = Array.isArray(parsed.questions) ? parsed.questions : [];

  return list.filter(validate).map(normalize);
}
