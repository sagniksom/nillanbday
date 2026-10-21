import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Confetti, beep, boom } from '../confetti';

// ---- stage geometry (design space is 1280x720, scaled to fit the window) ----
const W = 1280, H = 720;
const SPOT_X = 540, CAR_Y = 384, PARK_TOL = 50, CAR_START = 20;
const READER = { x: 395, y: 432 };
const HOSE_PORT = { x: 492, y: 470 };
const NOZZLE_HOME = { x: 500, y: 385 };
const DOOR = { x: 40, y: 54, w: 38, h: 30 };          // relative to the car
const INLET = (carX) => ({ x: carX + DOOR.x + 16, y: CAR_Y + DOOR.y + 13 });

// ---- filling game: stop the oscillating meter inside the green zone ----
const BASE = { width: 0.09, speed: 0.9 };   // first attempt: zone width / sweeps per second (as fraction of the bar)
const EASE = { width: 0.03, speed: 0.12 };  // every retry: wider zone, slower meter
const LIMIT = { width: 0.24, speed: 0.4 };
const newZone = (fails) => ({
  c: 0.2 + Math.random() * 0.65,
  width: Math.min(LIMIT.width, BASE.width + EASE.width * fails),
  speed: Math.max(LIMIT.speed, BASE.speed - EASE.speed * fails),
});

const STEPS = [
  ['park', '🚗', 'Park'], ['card', '💳', 'Pay'], ['fuel', '⛽', 'Fuel'],
  ['cap', '🔓', 'Gas cap'], ['nozzle', '🔫', 'Nozzle'], ['fill', '🛢️', 'Fill'],
];
const PROMPTS = {
  park: ['PULL UP', 'BESIDE THE PUMP'], card: ['TAP YOUR', 'CARD HERE'], fuel: ['SELECT', 'FUEL GRADE'],
  cap: ['OPEN YOUR', 'GAS CAP'], nozzle: ['LIFT THE', 'NOZZLE'],
};
const GRADES = [
  { id: 'regular', label: 'REGULAR 87', bg: '#16a34a' },
  { id: 'premium', label: 'PREMIUM 91', bg: '#dc2626' },
  { id: 'diesel', label: 'DIESEL', bg: '#1f2937' },
];

function Car({ x, capStage, onDoor, onCap, step }) {
  return (
    <div className="absolute" style={{ left: x, top: CAR_Y, width: 400, height: 171 }}>
      <img src="/sprites/forester.png" width="400" height="171" alt="" draggable={false} className="pointer-events-none select-none" />
      {/* fuel door */}
      <div className="absolute" style={{ left: DOOR.x, top: DOOR.y, width: DOOR.w, height: DOOR.h }}>
        <div className={`absolute inset-0 rounded flex items-center justify-center ${capStage >= 1 ? 'bg-neutral-900 border border-gray-700' : ''}`}>
          {capStage === 1 && (
            <button onClick={onCap} className="w-7 h-7 rounded-full bg-gray-300 border-2 border-gray-500 hint" title="gas cap">
              <span className="block w-full h-[2px] bg-gray-500 mt-[11px]" />
            </button>
          )}
          {capStage === 2 && <div className="w-4 h-4 rounded-full bg-black border border-gray-600" />}
        </div>
        <button
          onClick={onDoor}
          disabled={capStage !== 0}
          className={`absolute inset-0 rounded ${capStage >= 1 ? 'bg-gray-400 border border-gray-700' : 'bg-transparent'} ${capStage === 0 && step === 'cap' ? 'hint cursor-pointer' : ''}`}
          style={{ transformOrigin: 'left center', transition: 'transform .5s', transform: capStage >= 1 ? 'perspective(120px) rotateY(-110deg)' : 'none' }}
          title="fuel door"
        />
        {capStage === 2 && (
          <div className="absolute -left-4 top-5 w-4 h-4 rounded-full bg-gray-300 border-2 border-gray-500" style={{ animation: 'capfly .6s ease-in forwards' }} />
        )}
      </div>
    </div>
  );
}

export default function PumpScreen({ onDone }) {
  const [step, setStep] = useState('park');
  const [carX, setCarX] = useState(CAR_START);
  const [capStage, setCapStage] = useState(0);
  const [msg, setMsg] = useState(null);       // temporary pump-screen message
  const [wrong, setWrong] = useState(false);
  const [drag, setDrag] = useState(null);     // { id, x, y }
  const [nozzleOn, setNozzleOn] = useState(false);
  const [zone, setZone] = useState(() => newZone(0));
  const [fails, setFails] = useState(0);
  const [fillPhase, setFillPhase] = useState('ready'); // ready | running | stopped
  const [marker, setMarker] = useState(0);
  const [gifOk, setGifOk] = useState(true);
  const [boomKey, setBoomKey] = useState(0);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  const stepRef = useRef('park');
  const fillRef = useRef({ phase: 'ready', t0: 0, m: 0, zone, hit: false });
  const carRef = useRef({ x: CAR_START, v: 0, still: 0 });
  const keys = useRef({});
  const dragRef = useRef(null);
  const go = useCallback((s) => { stepRef.current = s; setStep(s); }, []);

  const scale = Math.min(size.w / W, size.h / H);
  const ox = (size.w - W * scale) / 2, oy = (size.h - H * scale) / 2;
  const scaleRef = useRef({ scale, ox, oy });
  scaleRef.current = { scale, ox, oy };

  useEffect(() => {
    const r = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);

  // ---- parking: arrow keys move the car along the lane ----
  useEffect(() => {
    const kd = (e) => { if (e.key.startsWith('Arrow')) { e.preventDefault(); keys.current[e.key] = true; } if (e.code === 'Space') { e.preventDefault(); if (!e.repeat && stepRef.current === 'fill') triggerFill(); } };
    const ku = (e) => { if (e.key.startsWith('Arrow')) keys.current[e.key] = false; };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    let raf, last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const c = carRef.current;
      if (stepRef.current === 'park') {
        if (keys.current.ArrowRight) c.v += 260 * dt;
        else if (keys.current.ArrowLeft) c.v -= 260 * dt;
        else c.v -= Math.sign(c.v) * Math.min(Math.abs(c.v), 200 * dt);
        if (keys.current.ArrowDown) c.v -= Math.sign(c.v) * Math.min(Math.abs(c.v), 420 * dt); // brake
        c.v = Math.max(-140, Math.min(260, c.v));
        c.x = Math.max(0, Math.min(880, c.x + c.v * dt));
        setCarX(c.x);
        const inSpot = Math.abs(c.x - SPOT_X) <= PARK_TOL && Math.abs(c.v) < 25;
        c.still = inSpot ? c.still + dt : 0;
        if (c.still > 0.7) { c.x = Math.round(c.x); c.v = 0; beep(660, 0.1); beep(990, 0.18); go('card'); }
      }
      const f = fillRef.current;
      if (stepRef.current === 'fill' && f.phase === 'running') {
        const p = (((now - f.t0) / 1000) * f.zone.speed) % 2;
        f.m = p < 1 ? p : 2 - p;
        setMarker(f.m);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startFill() {
    const f = fillRef.current;
    if (stepRef.current !== 'fill' || f.phase !== 'ready') return;
    f.phase = 'running'; f.t0 = performance.now(); setFillPhase('running');
    beep(520, 0.08);
  }

  function stopFill() {
    const f = fillRef.current;
    if (stepRef.current !== 'fill' || f.phase !== 'running') return;
    f.phase = 'stopped'; setFillPhase('stopped');
    f.hit = Math.abs(f.m - f.zone.c) <= f.zone.width / 2;
    if (f.hit) {
      beep(880, 0.12); setTimeout(() => beep(1320, 0.2), 130);
      setTimeout(() => go('success'), 900);
    } else {
      beep(160, 0.4, 'sawtooth');
      setTimeout(() => {
        go('drip');
        setTimeout(() => { setBoomKey(Date.now()); boom(); go('boom'); }, 1600);
        setTimeout(() => go('laugh'), 5200);
      }, 900);
    }
  }

  function triggerFill() {
    if (fillRef.current.phase === 'ready') startFill();
    else stopFill();
  }

  // ---- generic drag (card, nozzle) ----
  const startDrag = (id) => (e) => {
    e.preventDefault();
    const { scale: s, ox: a, oy: b } = scaleRef.current;
    const d = { id, x: (e.clientX - a) / s, y: (e.clientY - b) / s };
    dragRef.current = d; setDrag(d);
  };
  useEffect(() => {
    const move = (e) => {
      if (!dragRef.current) return;
      const { scale: s, ox: a, oy: b } = scaleRef.current;
      const d = { ...dragRef.current, x: (e.clientX - a) / s, y: (e.clientY - b) / s };
      dragRef.current = d; setDrag(d);
    };
    const up = () => {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null; setDrag(null);
      if (d.id === 'card' && Math.hypot(d.x - READER.x, d.y - READER.y) < 80) {
        beep(1100, 0.15); setMsg(['CARD', 'APPROVED ✓']);
        setTimeout(() => { setMsg(null); go('fuel'); }, 900);
      } else if (d.id === 'nozzle') {
        const i = INLET(carRef.current.x);
        if (Math.hypot(d.x - i.x, d.y - i.y) < 70) { beep(500, 0.1); setNozzleOn(true); go('fill'); }
      }
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [go]);

  const pickFuel = (id) => {
    if (step !== 'fuel') return;
    if (id === 'regular') {
      beep(900, 0.12); setMsg(['REGULAR 87', 'SELECTED ✓']);
      setTimeout(() => { setMsg(null); go('cap'); }, 800);
    } else {
      beep(160, 0.4, 'sawtooth'); setWrong(true); setMsg(['WRONG FUEL', 'NOT FOR YOUR CAR ✗']);
      setTimeout(() => { setWrong(false); setMsg(null); }, 1300);
    }
  };

  const openDoor = () => { beep(400, 0.08); setCapStage(1); };
  const removeCap = () => { beep(300, 0.08); setCapStage(2); setTimeout(() => go('nozzle'), 900); };

  const retry = () => {
    const n = fails + 1;
    const z = newZone(n);
    fillRef.current = { phase: 'ready', t0: 0, m: 0, zone: z, hit: false };
    setFails(n); setZone(z); setMarker(0); setFillPhase('ready');
    go('fill');
  };

  const running = fillPhase === 'running';
  const exploded = step === 'boom' || step === 'laugh';
  const car = carX;
  const inlet = INLET(car);
  const nozzlePos = drag?.id === 'nozzle' ? drag : nozzleOn ? { x: inlet.x + 6, y: inlet.y + 10 } : NOZZLE_HOME;
  const hoseEnd = nozzlePos;
  const hosePath = `M ${HOSE_PORT.x} ${HOSE_PORT.y} Q ${(HOSE_PORT.x + hoseEnd.x) / 2} ${Math.max(HOSE_PORT.y, hoseEnd.y) + 110} ${hoseEnd.x} ${hoseEnd.y}`;
  const fillPrompt = fillPhase === 'ready' ? ['READY', 'SQUEEZE TRIGGER'] : running ? ['PUMPING…', 'STOP IN GREEN'] : fillRef.current.hit ? ['FULL ✓', 'NICE!'] : ['OVERFLOW!', '✗✗✗'];
  const prompt = msg || PROMPTS[step] || (['fill', 'drip', 'boom'].includes(step) ? fillPrompt : ['', '']);
  const stepIdx = STEPS.findIndex(([k]) => k === (['drip', 'boom', 'laugh', 'success'].includes(step) ? 'fill' : step));

  const padBtn = 'w-16 h-16 rounded-xl bg-white/85 text-3xl font-bold shadow-lg active:bg-yellow-300 touch-none select-none';
  const hold = (key) => ({
    onPointerDown: (e) => { e.currentTarget.setPointerCapture(e.pointerId); keys.current[key] = true; },
    onPointerUp: () => { keys.current[key] = false; }, onPointerCancel: () => { keys.current[key] = false; },
  });

  return (
    <div className="relative w-full h-full overflow-hidden select-none" style={{ background: 'linear-gradient(#7dd3fc 0, #e0f2fe 60%, #4b5563 60%)' }}>
      <div className={step === 'boom' ? 'shake' : ''} style={{ position: 'absolute', left: ox, top: oy, width: W, height: H, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
        {/* ---------- backdrop: warehouse, ground ---------- */}
        <div className="absolute" style={{ left: -1200, width: W + 2400, top: 150, height: 300, background: '#d1d5db' }} />
        <div className="absolute" style={{ left: -1200, width: W + 2400, top: 150, height: 26, background: '#9ca3af' }} />
        <div className="absolute flex flex-col items-center justify-center bg-white rounded-md border-4 border-gray-300" style={{ left: 560, top: 205, width: 400, height: 110 }}>
          <div className="font-black text-6xl leading-none tracking-tight" style={{ color: '#e31837' }}>COSTCO</div>
          <div className="font-extrabold text-xl tracking-[0.35em]" style={{ color: '#005daa' }}>WHOLESALE</div>
        </div>
        {[40, 140, 240, 340, 440].map((x) => <div key={x} className="absolute bg-gray-500/70 rounded-sm" style={{ left: x, top: 350, width: 70, height: 100 }} />)}
        <div className="absolute" style={{ left: -1200, width: W + 2400, top: 450, height: 400, background: '#4b5563' }} />
        <div className="absolute" style={{ left: -1200, width: W + 2400, top: 445, height: 10, background: '#9ca3af' }} />
        <div className="absolute border-t-4 border-dashed border-yellow-300/70" style={{ left: -1200, width: W + 2400, top: 600 }} />

        {/* ---------- price tower ---------- */}
        <div className="absolute" style={{ left: 1090, top: 330, width: 14, height: 300, background: '#9ca3af' }} />
        <div className="absolute rounded-lg border-4 border-white overflow-hidden shadow-xl" style={{ left: 1010, top: 300, width: 170, height: 150, background: '#005daa' }}>
          <div className="text-center font-black text-white text-xl py-1" style={{ background: '#e31837' }}>COSTCO GAS</div>
          {[['REG', '1.39'], ['PREM', '1.59'], ['DSL', '1.55']].map(([n, p]) => (
            <div key={n} className="flex justify-between px-3 text-yellow-300 font-mono font-bold text-xl"><span>{n}</span><span>{p}</span></div>
          ))}
        </div>

        {/* ---------- car, parking spot ---------- */}
        {step === 'park' && (
          <div className="absolute border-4 border-dashed border-green-300 rounded-lg flex items-end justify-center text-green-200 font-extrabold pb-1" style={{ left: SPOT_X - PARK_TOL, top: CAR_Y - 10, width: 400 + PARK_TOL * 2, height: 175 }}>
            PARK HERE
          </div>
        )}
        <Car x={car} capStage={capStage} step={step} onDoor={openDoor} onCap={removeCap} />
        {step === 'fuel' && (
          <div className="pop absolute bg-yellow-300 text-yellow-950 font-extrabold rounded-lg px-4 py-2 shadow-xl border-2 border-yellow-600" style={{ left: car + 130, top: CAR_Y - 70 }}>
            ⛽ His Forester: UNLEADED REGULAR 87 only
          </div>
        )}

        {/* ---------- canopy ---------- */}
        <div className="absolute bg-white border-b-8" style={{ left: -1200, width: W + 2400, top: 0, height: 78, borderColor: '#d1d5db' }}>
          <div className="absolute inset-x-0" style={{ top: 44, height: 14, background: '#e31837' }} />
          <div className="absolute inset-x-0" style={{ top: 58, height: 8, background: '#005daa' }} />
        </div>
        {[120, 1000].map((x) => <div key={x} className="absolute" style={{ left: x, top: 78, width: 36, height: 380, background: 'linear-gradient(90deg,#e5e7eb,#fff,#d1d5db)' }} />)}
        {/* light bar */}
        <div className="absolute bg-white/70 rounded-b-xl" style={{ left: 280, top: 78, width: 700, height: 8 }} />

        {/* ---------- hose + pump (foreground) ---------- */}
        {!exploded && (
          <>
            <div className="absolute rounded-t-2xl border-4 border-gray-300 shadow-2xl bg-white" style={{ left: 300, top: 300, width: 190, height: 360 }}>
              <div className="absolute inset-x-0 top-0 h-6 rounded-t-xl" style={{ background: '#e31837' }} />
              <div className="absolute inset-x-0 bottom-0 h-8" style={{ background: '#005daa' }} />
              {/* screen */}
              <div className={`absolute rounded-md border-4 border-gray-400 bg-emerald-950 text-center font-mono font-bold leading-tight pt-1 ${wrong ? 'shake' : ''}`} style={{ left: 18, top: 34, width: 146, height: 62, color: wrong ? '#fca5a5' : '#6ee7b7', fontSize: 15 }}>
                <div className="text-lg">{prompt[0]}</div><div className="text-[12px]">{prompt[1]}</div>
              </div>
              {/* card reader */}
              <div className={`absolute rounded-lg bg-sky-600 border-4 border-sky-900 flex items-center justify-center text-3xl ${step === 'card' ? 'hint' : ''}`} style={{ left: 38, top: 108, width: 100, height: 54 }}>📶</div>
              {/* fuel buttons */}
              {GRADES.map((g, i) => (
                <button key={g.id} onClick={() => pickFuel(g.id)}
                  className={`absolute rounded text-white font-extrabold text-xs ${step === 'fuel' ? 'hint cursor-pointer hover:brightness-125' : 'opacity-60'}`}
                  style={{ left: 22, top: 178 + i * 42, width: 140, height: 34, background: g.bg }}>{g.label}</button>
              ))}
              <div className="absolute text-xs font-bold text-gray-500" style={{ left: 22, top: 308 }}>COSTCO · MEMBERS ONLY</div>
              {/* holster */}
              <div className="absolute bg-gray-700 rounded-r-lg" style={{ left: 186, top: 80, width: 22, height: 90 }} />
            </div>
            <svg className="absolute pointer-events-none" style={{ left: 0, top: 0 }} width={W} height={H}>
              <path d={hosePath} stroke="#111" strokeWidth="9" fill="none" strokeLinecap="round" />
              {running && <path d={hosePath} stroke="#facc15" strokeWidth="3" fill="none" strokeDasharray="2 10"><animate attributeName="stroke-dashoffset" from="0" to="-24" dur=".4s" repeatCount="indefinite" /></path>}
            </svg>
            {/* nozzle */}
            {(step === 'nozzle' || drag?.id === 'nozzle' || nozzleOn || step === 'fill') && (
              <div
                onPointerDown={step === 'nozzle' ? startDrag('nozzle') : undefined}
                className={`absolute touch-none ${step === 'nozzle' ? 'cursor-grab hint rounded-lg' : ''}`}
                style={{ left: nozzlePos.x - 22, top: nozzlePos.y - 30, width: 44, height: 60, zIndex: 20, transition: drag ? 'none' : 'all .25s' }}
              >
                <svg width="44" height="60" viewBox="0 0 44 60">
                  <rect x="12" y="4" width="20" height="40" rx="8" fill="#16a34a" stroke="#14532d" strokeWidth="3" />
                  <rect x="8" y="26" width="28" height="9" rx="3" fill="#111" />
                  <rect x="18" y="44" width="8" height="16" fill="#9ca3af" />
                </svg>
              </div>
            )}
            {/* card */}
            {step === 'card' && (
              <div
                onPointerDown={startDrag('card')}
                className="absolute rounded-xl shadow-2xl cursor-grab touch-none flex flex-col justify-between p-2 text-white font-bold hint"
                style={{ left: (drag?.id === 'card' ? drag.x : 140) - 60, top: (drag?.id === 'card' ? drag.y : 540) - 38, width: 120, height: 76, background: 'linear-gradient(135deg,#6d28d9,#db2777)', zIndex: 30, transition: drag ? 'none' : 'all .25s' }}
              >
                <div className="w-8 h-6 rounded bg-yellow-300/90" />
                <div className="text-xs tracking-widest">NILLAN 💳</div>
              </div>
            )}
          </>
        )}

        {/* ---------- overfill: drip, explosion ---------- */}
        {step === 'drip' && (
          <>
            <div className="absolute text-3xl shake" style={{ left: inlet.x - 16, top: inlet.y - 4 }}>💦</div>
            <div className="absolute text-4xl" style={{ left: inlet.x - 12, top: inlet.y + 20, animation: 'drip 1.4s ease-in forwards' }}>💧</div>
            <div className="absolute rounded-full bg-black/40" style={{ left: inlet.x - 40, top: inlet.y + 195, width: 80, height: 14, animation: 'pop 1s 1.1s both' }} />
          </>
        )}
        {exploded && (
          <>
            <div className="absolute bg-gray-900 rounded-t-lg" style={{ left: 310, top: 600, width: 170, height: 60 }} />
            <div className="absolute text-8xl" style={{ left: 330, top: 520 }}>🔥🔥</div>
            <div className="absolute text-7xl opacity-80" style={{ left: 380, top: 440 }}>💨</div>
          </>
        )}
      </div>
      {step === 'boom' && (
        <>
          <img src={`/gifs/house-explosion.gif?t=${boomKey}`} alt="" className="absolute inset-0 w-full h-full object-cover z-50 pointer-events-none" />
          <div className="absolute inset-0 bg-white pointer-events-none z-50" style={{ animation: 'flash 1s 1.9s ease-out both' }} />
        </>
      )}

      <div className="absolute bottom-1 left-2 text-[10px] text-white/70 z-40">Car photo: “2009 red Subaru Forester side” by BrokenSphere, CC BY 3.0, via Wikimedia Commons (recolored)</div>

      {/* ---------- step tracker ---------- */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-2 z-40">
        {STEPS.map(([k, icon, label], i) => (
          <div key={k} className={`px-3 py-1 rounded-full text-sm font-bold shadow flex items-center gap-1 ${i < stepIdx ? 'bg-green-500 text-white' : i === stepIdx ? 'bg-yellow-300 text-purple-950 scale-110' : 'bg-white/70 text-gray-500'}`}>
            {i < stepIdx ? '✓' : icon}<span className="hidden md:inline">{label}</span>
          </div>
        ))}
      </div>

      {/* ---------- fill meter (fill step) ---------- */}
      {['fill', 'drip', 'boom'].includes(step) && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[min(92vw,640px)] bg-slate-900/90 rounded-2xl p-4 text-white shadow-xl z-40">
          <div className="flex justify-between text-sm font-bold mb-2">
            <span>⛽ FILL METER</span>
            <span className="text-emerald-300">{fails > 0 ? '🍀 Easier this time: wider zone, slower meter' : 'Stop it in the green zone!'}</span>
          </div>
          <div className="relative h-12 rounded-full bg-slate-700 overflow-hidden border-2 border-slate-400">
            <div className="absolute inset-y-0 bg-emerald-400/60 border-x-4 border-emerald-300" style={{ left: `${(zone.c - zone.width / 2) * 100}%`, width: `${zone.width * 100}%` }} />
            <div
              className={`absolute inset-y-0 w-2 rounded ${fillPhase === 'stopped' ? (fillRef.current.hit ? 'bg-emerald-300' : 'bg-red-500') : 'bg-white'}`}
              style={{ left: `calc(${marker * 100}% - 4px)`, boxShadow: '0 0 12px #fff' }}
            />
          </div>
        </div>
      )}

      {/* ---------- controls ---------- */}
      {step === 'park' && (
        <>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 text-white rounded-full px-6 py-2 font-bold z-40">← → to drive, ↓ to brake · stop inside the green box</div>
          <div className="absolute bottom-4 right-4 flex gap-2 md:hidden z-40">
            <button className={padBtn} {...hold('ArrowLeft')}>←</button>
            <button className={padBtn} {...hold('ArrowDown')}>■</button>
            <button className={padBtn} {...hold('ArrowRight')}>→</button>
          </div>
        </>
      )}
      {step === 'card' && <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 text-white rounded-full px-6 py-2 font-bold z-40">Drag your card to the reader 💳</div>}
      {step === 'fuel' && <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 text-white rounded-full px-6 py-2 font-bold z-40">Pick the right fuel for the car</div>}
      {step === 'cap' && <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 text-white rounded-full px-6 py-2 font-bold z-40">{capStage === 0 ? 'Click the fuel door on your car' : 'Now twist off the gas cap'}</div>}
      {step === 'nozzle' && <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 text-white rounded-full px-6 py-2 font-bold z-40">Drag the nozzle into the fuel tank opening</div>}
      {step === 'fill' && fillPhase === 'ready' && (
        <button onClick={startFill} className="absolute bottom-6 left-1/2 -translate-x-1/2 px-10 py-5 rounded-full text-2xl font-extrabold shadow-2xl bg-yellow-400 text-purple-950 hover:scale-105 active:scale-95 transition z-40">
          ▶ Squeeze the trigger (Space)
        </button>
      )}
      {step === 'fill' && fillPhase === 'running' && (
        <button
          onPointerDown={stopFill}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 px-14 py-6 rounded-full text-3xl font-extrabold shadow-2xl bg-red-500 text-white hover:bg-red-400 active:scale-95 transition touch-none z-40"
        >
          ✋ STOP! (Space)
        </button>
      )}

      {/* ---------- outcomes ---------- */}
      {step === 'laugh' && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-6 z-50">
          {gifOk
            ? <video src="/gifs/laughing.mp4" autoPlay loop playsInline onError={() => setGifOk(false)} className="pop max-h-[50vh] rounded-xl" />
            : <div className="pop text-[10rem] floaty">🤣</div>}
          <div className="text-white text-3xl font-extrabold text-center px-4">HAHAHAHA you blew up the station!</div>
          <button onClick={retry} className="px-8 py-4 rounded-full bg-yellow-400 text-purple-950 text-xl font-bold hover:scale-110 transition">🔁 Try again</button>
        </div>
      )}
      {step === 'success' && (
        <div className="absolute inset-0 bg-purple-900/60 flex flex-col items-center justify-center gap-6 z-50">
          <Confetti />
          <div className="pop text-9xl">🎉</div>
          <div className="pop text-white text-5xl font-extrabold">Full tank!</div>
          <button onClick={onDone} className="pop px-10 py-4 rounded-full bg-yellow-400 text-purple-950 text-2xl font-bold hover:scale-110 transition" style={{ animationDelay: '.6s' }}>
            🍰 On to the cake
          </button>
        </div>
      )}
    </div>
  );
}
