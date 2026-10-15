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
