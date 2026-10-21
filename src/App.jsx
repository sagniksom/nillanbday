import React, { useState } from 'react';
import HelloScreen from './screens/HelloScreen';
import InterludeScreen from './screens/InterludeScreen';
import DriveScreen from './screens/DriveScreen';
import PumpScreen from './screens/PumpScreen';
import CakeScreen from './screens/CakeScreen';

export default function App() {
  const [screen, setScreen] = useState('hello');
  return (
    <div className="w-screen h-screen">
      {screen === 'hello' && <HelloScreen onNext={() => setScreen('interlude')} />}
      {screen === 'interlude' && <InterludeScreen onNext={() => setScreen('drive')} />}
      {screen === 'drive' && <DriveScreen onArrive={() => setScreen('pump')} />}
      {screen === 'pump' && <PumpScreen onDone={() => setScreen('cake')} />}
      {screen === 'cake' && <CakeScreen onRestart={() => setScreen('hello')} />}
    </div>
  );
}
