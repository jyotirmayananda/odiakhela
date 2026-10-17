// Tactile feedback: synthesized wood/shell clicks (Web Audio) and mobile vibration.
// Sounds are synthesized so the app ships with no audio assets. To use recorded
// samples instead, swap these functions for Howler.js sprites with the same names.

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** One short percussive "clack": a pitched sine blip over a band-passed noise burst. */
function clack(freq: number, gain: number, delay = 0, decay = 0.07) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + delay;

  const osc = ac.createOscillator();
  const og = ac.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq * (0.94 + Math.random() * 0.12), t);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.55, t + decay);
  og.gain.setValueAtTime(gain, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  osc.connect(og).connect(ac.destination);
  osc.start(t);
  osc.stop(t + decay + 0.02);

  const len = Math.floor(ac.sampleRate * 0.03);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  const noise = ac.createBufferSource();
  noise.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq * 3;
  bp.Q.value = 2.5;
  const ng = ac.createGain();
  ng.gain.value = gain * 0.9;
  noise.connect(bp).connect(ng).connect(ac.destination);
  noise.start(t);
}

export const sounds = {
  drop: () => clack(900, 0.18),
  scoop: (count: number) => {
    const n = Math.min(6, Math.max(2, count));
    for (let i = 0; i < n; i++) clack(520 + Math.random() * 200, 0.1, i * 0.022, 0.05);
  },
  capture: (count: number) => {
    const n = Math.min(10, Math.max(3, count));
    for (let i = 0; i < n; i++) clack(1100 - i * 45, 0.16, i * 0.035, 0.09);
  },
  turn: () => clack(420, 0.08, 0, 0.12),
  win: () => [0, 0.12, 0.24, 0.42].forEach((d, i) => clack(660 + i * 180, 0.2, d, 0.25)),
};

export function vibrate(pattern: number | number[]) {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  // Browsers reject (and log) vibration before the user has interacted with the page.
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  navigator.vibrate(pattern);
}
