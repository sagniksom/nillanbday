import React, { useEffect, useRef, useState } from 'react';
import { Confetti, playSound } from '../confetti';

const CANDLES = [0, 1, 2, 3, 4];
const BLOW_NEEDED = 0.6;  // seconds of sustained blowing to put out one candle
const CALIBRATE_S = 0.8;  // listen to room noise first
const MIN_THRESHOLD = 0.02;
const NOISE_FACTOR = 3;   // blow = this many times louder than the room

export default function CakeScreen({ onRestart }) {
  const [lit, setLit] = useState(CANDLES.map(() => true));
  const [mic, setMic] = useState('idle'); // idle | on | denied
  const [level, setLevel] = useState(0);
  const [threshold, setThreshold] = useState(0.05);
  const [calibrating, setCalibrating] = useState(false);
  const litRef = useRef(lit);
  const acc = useRef(0);
  const ctxRef = useRef(null);

  const out = litRef.current.every((l) => !l);

  const extinguishOne = () => {
    const i = litRef.current.findIndex((l) => l);
    if (i < 0) return;
    const next = litRef.current.slice();
    next[i] = false;
    litRef.current = next;
    setLit(next);
    if (next.every((l) => !l)) {
      playSound('/audio/birthday.mp3', 0.6);
    }
  };

  const enableMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } });
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      await ctx.resume();
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(an);
      ctxRef.current = { ctx, stream };
      const buf = new Float32Array(an.fftSize);
      let last = performance.now(), t = 0, noiseSum = 0, noiseN = 0, thr = 0.05;
      setCalibrating(true);
      const loop = (now) => {
        const dt = (now - last) / 1000;
        last = now;
        an.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        setLevel(rms);
        t += dt;
        if (t < CALIBRATE_S) {
          noiseSum += rms; noiseN++;
          thr = Math.max(MIN_THRESHOLD, (noiseSum / noiseN) * NOISE_FACTOR);
          if (t + dt >= CALIBRATE_S) { setCalibrating(false); setThreshold(thr); }
          ctxRef.current.raf = requestAnimationFrame(loop);
          return;
        }
        if (rms > thr) acc.current += dt; else acc.current = Math.max(0, acc.current - dt * 2);
        if (acc.current >= BLOW_NEEDED) { acc.current = 0; extinguishOne(); }
        ctxRef.current.raf = requestAnimationFrame(loop);
      };
      ctxRef.current.raf = requestAnimationFrame(loop);
      setMic('on');
    } catch {
      setMic('denied');
    }
  };

  useEffect(() => () => {
    const c = ctxRef.current;
    if (c) { cancelAnimationFrame(c.raf); c.stream.getTracks().forEach((t) => t.stop()); c.ctx.close(); }
  }, []);

  const blowing = !calibrating && level > threshold;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-indigo-950 to-purple-900 text-white overflow-hidden">
      {out && <Confetti />}
      {out && <div className="pop absolute top-10 text-5xl md:text-7xl font-extrabold text-yellow-300 text-center px-4">Happy Birthday Nillan! 🎉</div>}

      {/* cake */}
      <svg viewBox="0 0 300 260" className="w-[min(90vw,520px)]">
        <ellipse cx="150" cy="240" rx="130" ry="14" fill="#000" opacity=".3" />
        <rect x="40" y="150" width="220" height="80" rx="10" fill="#f9a8d4" />
        <rect x="40" y="150" width="220" height="80" rx="10" fill="none" stroke="#be185d" strokeWidth="3" />
        <rect x="60" y="100" width="180" height="55" rx="10" fill="#fde68a" stroke="#b45309" strokeWidth="3" />
        <path d="M 40 160 q 15 25 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0" fill="#fff" stroke="#fff" strokeWidth="6" />
        <path d="M 60 110 q 15 22 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0" fill="#fff" stroke="#fff" strokeWidth="6" />
        {CANDLES.map((i) => {
          const x = 90 + i * 30;
          return (
            <g key={i}>
              <rect x={x - 5} y="66" width="10" height="36" fill={['#60a5fa', '#f87171', '#4ade80', '#facc15', '#c084fc'][i]} stroke="#fff" strokeWidth="1" />
              {lit[i] ? (
                <g className="flame" style={{ transformOrigin: `${x}px 66px`, transform: blowing ? 'rotate(-25deg) scale(.8)' : undefined }}>
                  <ellipse cx={x} cy="54" rx="6" ry="12" fill="#fb923c" />
                  <ellipse cx={x} cy="57" rx="3" ry="7" fill="#fde047" />
                </g>
              ) : (
                <path d={`M ${x} 60 q -6 -14 2 -26 q 6 -10 -2 -22`} stroke="#cbd5e1" strokeWidth="3" fill="none" opacity=".7">
                  <animate attributeName="opacity" from=".8" to="0" dur="2.5s" repeatCount="1" fill="freeze" />
                </path>
              )}
            </g>
          );
        })}
      </svg>

      {!out && mic === 'idle' && (
        <button onClick={enableMic} className="mt-6 px-8 py-4 rounded-full bg-yellow-400 text-purple-950 text-xl font-bold shadow-xl hover:scale-110 transition">
          🎤 Enable mic &amp; blow out the candles
        </button>
      )}
      {!out && mic === 'on' && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="text-xl font-bold">{calibrating ? '🤫 Stay quiet for a sec…' : '💨 Blow into your mic!'}</div>
          <div className="relative w-64 h-4 rounded-full bg-white/20 overflow-hidden">
            <div className={`h-full ${blowing ? 'bg-emerald-400' : 'bg-sky-300'}`} style={{ width: `${Math.min(100, (level / (threshold * 2)) * 50)}%` }} />
            <div className="absolute inset-y-0 w-[2px] bg-yellow-300" style={{ left: '50%' }} />
          </div>
          <div className="text-xs text-white/60">Get the bar past the yellow line and keep going</div>
        </div>
      )}
      {!out && mic === 'denied' && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="text-red-300">Couldn't access the mic — allow it in your browser, or:</div>
          <div className="flex gap-3">
            <button onClick={enableMic} className="px-6 py-3 rounded-full bg-yellow-400 text-purple-950 font-bold">Try mic again</button>
            <button onClick={extinguishOne} className="px-6 py-3 rounded-full bg-white/20 font-bold">Tap to blow 💨</button>
          </div>
        </div>
      )}
      {out && (
        <button onClick={onRestart} className="absolute bottom-10 px-6 py-3 rounded-full bg-white/20 font-bold hover:bg-white/30">↺ Play again</button>
      )}
    </div>
  );
}
