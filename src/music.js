// One looping background track at a time, with a short crossfade when switching.
// Both tracks are created and preloaded up front so a switch starts instantly instead of
// waiting on a download. Browsers block autoplay until the user interacts, so a blocked
// track starts on the first pointer/key event.
const SOURCES = { hbday: '/audio/hbday.mp3', gas: '/audio/gasgasgas.mp3' };
const VOLUME = 0.6;

const tracks = {};
for (const [name, src] of Object.entries(SOURCES)) {
  const a = new Audio(src);
  a.loop = true;
  a.preload = 'auto';
  a.volume = VOLUME;
  a.load();
  tracks[name] = a;
}

let current = null;
let armed = false;

function fadeOut(a) {
  const id = setInterval(() => {
    a.volume = Math.max(0, a.volume - 0.1);
    if (a.volume <= 0) { clearInterval(id); a.pause(); a.currentTime = 0; }
  }, 50);
}

function armRetry() {
  if (armed) return;
  armed = true;
  const retry = () => {
    const a = tracks[current];
    if (!a) return;
    a.play().then(() => {
      armed = false;
      window.removeEventListener('pointerdown', retry);
      window.removeEventListener('keydown', retry);
    }).catch(() => {});
  };
  window.addEventListener('pointerdown', retry);
  window.addEventListener('keydown', retry);
}

export function playMusic(name) {
  if (current === name) return;
  if (current) fadeOut(tracks[current]);
  current = name;
  const a = tracks[name];
  a.volume = VOLUME;
  a.play().catch(armRetry);
}
