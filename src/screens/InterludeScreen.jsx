import React, { useEffect, useState } from 'react';

const TEXT = 'But we have to do something before that....';
const TYPE_MS = 85;

export default function InterludeScreen({ onNext }) {
  const [n, setN] = useState(0);
  const done = n >= TEXT.length;

  useEffect(() => {
    if (done) return;
    // pause a beat longer on the dramatic dots
    const delay = TEXT[n] === '.' ? 380 : TYPE_MS;
    const t = setTimeout(() => setN((v) => v + 1), delay);
    return () => clearTimeout(t);
  }, [n, done]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center text-white bg-gradient-to-b from-slate-950 via-indigo-950 to-purple-950 overflow-hidden px-6">
      <h1 className="text-4xl md:text-6xl font-extrabold max-w-4xl leading-tight min-h-[8rem]">
        {TEXT.slice(0, n)}
        {!done && <span className="inline-block w-1 h-[0.9em] bg-yellow-300 ml-1 align-middle animate-pulse" />}
      </h1>
      <div className={`mt-10 flex flex-col items-center gap-8 transition-opacity duration-700 ${done ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="text-7xl floaty">⛽🚗</div>
        <button
          onClick={onNext}
          className="px-10 py-4 rounded-full bg-yellow-400 text-purple-950 text-2xl font-bold shadow-xl hover:scale-110 active:scale-95 transition"
        >
          Let's goooo! 🚀
        </button>
      </div>
    </div>
  );
}
