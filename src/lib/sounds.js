let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  // Resume if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, startDelay, duration, type = 'sine', vol = 0.28) {
  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = type;
  osc.frequency.value = freq;
  const t = ac.currentTime + startDelay;
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

export function playCorrect() {
  tone(523, 0,    0.10);  // C5
  tone(659, 0.09, 0.12);  // E5
  tone(784, 0.18, 0.22);  // G5
}

export function playWrong() {
  tone(220, 0,    0.09, 'sawtooth', 0.22);
  tone(185, 0.10, 0.14, 'sawtooth', 0.16);
}

export function playTick() {
  tone(1100, 0, 0.03, 'square', 0.08);
}

export function playUrgentTick() {
  tone(1300, 0,    0.04, 'square', 0.13);
  tone(1300, 0.08, 0.04, 'square', 0.10);
}

export function playBattleStart() {
  tone(392, 0,    0.10);
  tone(523, 0.12, 0.10);
  tone(659, 0.24, 0.12);
  tone(784, 0.36, 0.28);
}
