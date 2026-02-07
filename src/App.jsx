import React, { useState, useEffect } from 'react';

// ============================================
// DATE CONFIG
// ============================================
const date = 2;
const month = 8;
const oneDay = 24 * 60 * 60 * 1000;

// ============================================
// UTIL
// ============================================
const isValid16DigitNumber = (value) => /^\d{16}$/.test(value);

// ============================================
// COUNTDOWN SCREEN
// ============================================
const CountdownScreen = ({ onComplete }) => {
  let target = new Date(new Date().getFullYear(), month, date);

  const getTimeLeft = () => {
    let diff = target - new Date();

    if (diff <= 0 && diff >= -oneDay) return null;

    const now = new Date();
    if (now >= target) {
      target = new Date(now.getFullYear() + 1, month, date);
    }

    diff = target - now;
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  };

  const [timeLeft, setTimeLeft] = useState(getTimeLeft());

  useEffect(() => {
    const interval = setInterval(() => {
      const updated = getTimeLeft();
      if (!updated) onComplete();
      else setTimeLeft(updated);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!timeLeft) return null;

  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white">
      <div className="grid grid-cols-4 gap-8 text-center">
        {Object.entries(timeLeft).map(([label, value]) => (
          <div key={label}>
            <div className="text-4xl font-bold">
              {String(value).padStart(2, '0')}
            </div>
            <div className="uppercase text-xs tracking-widest text-gray-300">
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// GIFT SCREEN
// ============================================
const GiftScreen = ({ onComplete }) => {
  const [stage, setStage] = useState('gift');
  const [secret, setSecret] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const handleNickname = () => {
    if (nickname.trim().toLowerCase() === 'laddoo') {
      onComplete();
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-white bg-black">
      {stage === 'gift' && (
        <button
          onClick={() => setStage('fake')}
          className="text-8xl animate-bounce"
        >
          🎁
        </button>
      )}

      {stage === 'fake' && (
        <div className="flex flex-col items-center gap-4 mt-6">
          <input
            value={secret}
            onChange={(e) => {
              setSecret(e.target.value);
              setError('');
            }}
            maxLength={16}
            inputMode="numeric"
            className="px-4 py-2 rounded-lg text-black w-72"
            placeholder="Gimme your credit card 🔫"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={() => {
              if (!isValid16DigitNumber(secret)) {
                setError('Must be exactly 16 digits');
                return;
              }
              setStage('nickname');
            }}
            className="bg-pink-500 px-6 py-2 rounded-lg font-bold"
          >
            Continue
          </button>

          <button
            onClick={() => setStage('nickname')}
            className="text-sm underline text-gray-300"
          >
            No I don’t wanna
          </button>
        </div>
      )}

      {stage === 'nickname' && (
        <div
          className={`flex flex-col items-center gap-4 mt-6 ${
            shake ? 'animate-shake' : ''
          }`}
        >
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="px-4 py-2 rounded-lg text-black w-72"
            placeholder="What's your family nickname?"
          />
          <button
            onClick={handleNickname}
            className="bg-pink-500 px-6 py-2 rounded-lg font-bold"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================
// WELCOME SCREEN
// ============================================
const WelcomeScreen = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gradient-to-br from-green-800 to-green-900 text-white">
      <div className="text-6xl mb-6">🎮</div>
      <h1 className="text-4xl font-bold mb-4">
        Pokémon Birthday Challenge
      </h1>
      <p className="text-xl max-w-md">
        Hey Mr. Laddoo 💖  
        Your adventure begins… but today, just enjoy the love.
      </p>
    </div>
  );
};

// ============================================
// MAIN APP
// ============================================
export default function App() {
  const [screen, setScreen] = useState('countdown');

  return (
    <div className="h-screen w-screen">
      {screen === 'countdown' && (
        <CountdownScreen onComplete={() => setScreen('gift')} />
      )}
      {screen === 'gift' && (
        <GiftScreen onComplete={() => setScreen('welcome')} />
      )}
      {screen === 'welcome' && <WelcomeScreen />}
    </div>
  );
}
