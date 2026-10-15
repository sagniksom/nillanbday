import React from 'react';
import { Confetti, playSound } from '../confetti';

export default function HelloScreen({ onNext }) {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center text-white bg-gradient-to-br from-fuchsia-700 via-purple-800 to-indigo-950 overflow-hidden">
      <Confetti count={80} />
      <div className="text-7xl mb-4 floaty">🎂</div>
      <h1 className="pop text-5xl md:text-7xl font-extrabold drop-shadow-lg px-4">Happy Birthday,</h1>
      <h1 className="pop text-6xl md:text-8xl font-extrabold text-yellow-300 drop-shadow-lg" style={{ animationDelay: '.3s' }}>Nillan!</h1>
      <button
        onClick={() => { playSound('/audio/welcome.mp3'); onNext(); }}
        className="pop mt-12 px-10 py-4 rounded-full bg-yellow-400 text-purple-950 text-2xl font-bold shadow-xl hover:scale-110 active:scale-95 transition"
        style={{ animationDelay: '.8s' }}
      >
        🍰 Go to the cake
      </button>
    </div>
  );
}
