import React, { useEffect } from 'react';
import { Confetti } from '../confetti';
import { playMusic } from '../music';

// left/top in %, rotation in deg, drift in px, duration in s
const PHOTOS = [
  { n: 1, x: 3,  y: 5,  r: -7, dx: 18, dy: 22, dur: 6.5 },
  { n: 2, x: 22, y: 2,  r: 5,  dx: -14, dy: 26, dur: 7.5 },
  { n: 3, x: 60, y: 3,  r: -4, dx: 16, dy: 20, dur: 8 },
  { n: 4, x: 80, y: 7,  r: 8,  dx: -20, dy: 18, dur: 6 },
  { n: 5, x: 1,  y: 38, r: 6,  dx: 22, dy: -16, dur: 7 },
  { n: 6, x: 85, y: 40, r: -6, dx: -18, dy: -22, dur: 8.5 },
  { n: 7, x: 3,  y: 68, r: -5, dx: 20, dy: -18, dur: 7.2 },
  { n: 8, x: 23, y: 74, r: 7,  dx: -16, dy: -24, dur: 6.8 },
  { n: 9, x: 67, y: 74, r: -8, dx: 14, dy: -20, dur: 7.8 },
  { n: 10, x: 84, y: 66, r: 5, dx: -22, dy: -14, dur: 6.3 },
];

// Windows XP "Bliss"-style scene: sky, soft clouds and a rolling green hill (drawn as SVG, no image file).
function XPBackground() {
  const clouds = [
    [180, 150, 1.1], [520, 90, 0.8], [900, 190, 1.3], [1300, 110, 0.9], [1480, 260, 0.7], [-20, 300, 0.8],
  ];
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="xp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f5fd0" /><stop offset=".45" stopColor="#4a8fe8" /><stop offset=".8" stopColor="#a9d0f7" />
        </linearGradient>
        <radialGradient id="xp-hill" cx=".4" cy=".25" r=".9">
          <stop offset="0" stopColor="#8fdc3c" /><stop offset=".45" stopColor="#4fae22" /><stop offset="1" stopColor="#1f6f12" />
        </radialGradient>
        <filter id="xp-blur"><feGaussianBlur stdDeviation="9" /></filter>
      </defs>
      <rect width="1600" height="900" fill="url(#xp-sky)" />
      {clouds.map(([x, y, k], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${k})`} filter="url(#xp-blur)" opacity=".92" fill="#fff">
          <ellipse cx="0" cy="0" rx="120" ry="34" /><ellipse cx="-60" cy="-22" rx="70" ry="36" /><ellipse cx="30" cy="-34" rx="82" ry="42" /><ellipse cx="95" cy="-8" rx="60" ry="28" />
        </g>
      ))}
      <path d="M-50 640 C 260 520, 760 470, 1100 540 C 1350 590, 1500 610, 1650 600 L1650 920 L-50 920 Z" fill="url(#xp-hill)" />
      <path d="M-50 640 C 260 520, 760 470, 1100 540 C 1350 590, 1500 610, 1650 600" fill="none" stroke="#c8f08a" strokeOpacity=".5" strokeWidth="4" filter="url(#xp-blur)" />
    </svg>
  );
}

// Real cake photo (cutout) with a few candles on top.
function Cake() {
  const candles = [{ x: 36, c: '#60a5fa' }, { x: 49, c: '#f87171' }, { x: 62, c: '#facc15' }];
  return (
    <div className="relative floaty w-[200px] md:w-[290px] mb-2">
      <img src="/sprites/cake.png" alt="" draggable={false} className="w-full block drop-shadow-2xl" />
      {candles.map((k, i) => (
        <div key={i} className="absolute" style={{ left: `${k.x}%`, top: '6%', width: '5%', height: '17%' }}>
          <div className="absolute bottom-0 inset-x-0 h-[70%] rounded-sm border border-white/70" style={{ background: k.c }} />
          <div className="flame absolute left-1/2 -translate-x-1/2 w-[70%] h-[38%]" style={{ top: '-4%', background: 'radial-gradient(ellipse at 50% 70%, #fde047, #fb923c 70%, transparent)', borderRadius: '50% 50% 50% 50% / 65% 65% 35% 35%' }} />
        </div>
      ))}
    </div>
  );
}

export default function HelloScreen({ onNext }) {
  useEffect(() => { playMusic('hbday'); }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center text-white overflow-hidden">
      <XPBackground />
      <Confetti count={80} />

      {PHOTOS.map((p, i) => (
        <div
          key={p.n}
          className="polaroid absolute"
          style={{
            left: `${p.x}%`, top: `${p.y}%`,
            '--r': `${p.r}deg`, '--dx': `${p.dx}px`, '--dy': `${p.dy}px`,
            animation: `drift ${p.dur}s ease-in-out ${-i * 0.9}s infinite alternate`,
          }}
        >
          <img src={`/photos/photo${p.n}.jpg`} alt="" draggable={false} />
        </div>
      ))}

      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-white/90 z-10">Cake photo: Horacio Cambeiro, CC BY-SA 3.0, via Wikimedia Commons</div>

      <div className="relative z-10 flex flex-col items-center">
        <Cake />
        <h1 className="pop text-5xl md:text-7xl font-extrabold px-4" style={{ textShadow: '0 4px 14px rgba(0,30,90,.7)' }}>Happy Birthday,</h1>
        <h1 className="pop text-6xl md:text-8xl font-extrabold text-yellow-300" style={{ animationDelay: '.3s', textShadow: '0 4px 14px rgba(0,30,90,.7)' }}>Nillan!</h1>
        <button
          onClick={onNext}
          className="pop mt-12 px-10 py-4 rounded-full bg-yellow-400 text-purple-950 text-2xl font-bold shadow-xl hover:scale-110 active:scale-95 transition"
          style={{ animationDelay: '.8s' }}
        >
          🍰 Go to the cake
        </button>
      </div>
    </div>
  );
}
