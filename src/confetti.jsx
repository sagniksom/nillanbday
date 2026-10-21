import React, { useMemo } from 'react';

const COLORS = ['#ff4d6d', '#ffd23f', '#4cc9f0', '#80ed99', '#c77dff', '#ff9f1c'];

export function Confetti({ count = 120 }) {
  const pieces = useMemo(
    () => Array.from({ length: count }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      dur: 2.5 + Math.random() * 2.5,
      color: COLORS[i % COLORS.length],
    })),
    [count]
  );
  return pieces.map((p, i) => (
    <span key={i} className="confetti-piece"
      style={{ left: `${p.left}vw`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }} />
  ));
}

export function playSound(src, volume = 0.7) {
  try { const a = new Audio(src); a.volume = volume; a.play().catch(() => {}); return a; } catch { return null; }
}

export function beep(freq = 880, dur = 0.12, type = 'sine', vol = 0.15) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = vol;
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
    setTimeout(() => ctx.close(), dur * 1000 + 100);
  } catch { /* audio unavailable */ }
}

// Synthesized explosion (low-passed noise burst + sub thump), so no audio file is needed.
export function boom() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const len = ctx.sampleRate * 1.6;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
    const g = ctx.createGain(); g.gain.value = 0.9;
    src.connect(lp); lp.connect(g); g.connect(ctx.destination); src.start();
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.frequency.setValueAtTime(110, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.8);
    og.gain.setValueAtTime(0.8, ctx.currentTime); og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    o.connect(og); og.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 1);
    setTimeout(() => ctx.close(), 2000);
  } catch { /* audio unavailable */ }
}
