import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// NOTE: OSM has "Flagstone Way" in Newmarket (no "Flagstone Avenue"); coordinates are approximate.
const HOME = [44.0615, -79.4862];
const COSTCO_GAS = [44.0710, -79.4899]; // Costco, Green Lane Centre (Yonge St & Green Lane)
const DRIVE_MS = 22000;

const pin = (emoji, cls = 'emoji-pin') =>
  L.divIcon({ html: `<div class="${cls}">${emoji}</div>`, className: '', iconSize: [34, 34], iconAnchor: [17, 17] });

async function fetchRoute() {
  const url = `https://router.project-osrm.org/route/v1/driving/${HOME[1]},${HOME[0]};${COSTCO_GAS[1]},${COSTCO_GAS[0]}?overview=full&geometries=geojson`;
  try {
    const r = await fetch(url);
    const j = await r.json();
    return j.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  } catch {
    return [HOME, COSTCO_GAS];
  }
}

function cumulative(pts) {
  const d = [0];
  for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + L.latLng(pts[i - 1]).distanceTo(pts[i]));
  return d;
}

export default function DriveScreen({ onArrive }) {
  const mapEl = useRef(null);
  const state = useRef({});
  const [ready, setReady] = useState(false);
  const [driving, setDriving] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const map = L.map(mapEl.current, { zoomControl: false }).setView(HOME, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    L.marker(HOME, { icon: pin('🏠') }).addTo(map);
    L.marker(COSTCO_GAS, { icon: pin('⛽') }).addTo(map);
    const car = L.marker(HOME, { icon: pin('🚗', 'car-icon'), zIndexOffset: 1000 }).addTo(map);
    state.current = { map, car };
    let dead = false;
    fetchRoute().then((pts) => {
      if (dead) return;
      L.polyline(pts, { color: '#7c3aed', weight: 6, opacity: 0.8 }).addTo(map);
      map.fitBounds(L.latLngBounds(pts).pad(0.2));
      state.current.pts = pts;
      state.current.dist = cumulative(pts);
      setReady(true);
    });
    return () => { dead = true; cancelAnimationFrame(state.current.raf); map.remove(); };
  }, []);

  const start = () => {
    const s = state.current;
    setDriving(true);
    s.map.setView(s.pts[0], 16, { animate: true });
    const total = s.dist[s.dist.length - 1];
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / DRIVE_MS);
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const target = eased * total;
      let i = 1;
      while (i < s.dist.length - 1 && s.dist[i] < target) i++;
      const seg = (target - s.dist[i - 1]) / (s.dist[i] - s.dist[i - 1] || 1);
      const a = s.pts[i - 1], b = s.pts[i];
      const pos = [a[0] + (b[0] - a[0]) * seg, a[1] + (b[1] - a[1]) * seg];
      s.car.setLatLng(pos);
      s.map.panTo(pos, { animate: false });
      if (p < 1) s.raf = requestAnimationFrame(step);
      else {
        setArrived(true);
        setTimeout(() => setFade(true), 1200);
        setTimeout(onArrive, 2000);
      }
    };
    s.raf = requestAnimationFrame(step);
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapEl} />
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 rounded-full px-5 py-2 shadow-lg font-bold text-purple-900 whitespace-nowrap">
        🏠 Flagstone Ave → ⛽ Costco, Yonge &amp; Green Lane
      </div>
      {!driving && (
        <button disabled={!ready} onClick={start}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] px-10 py-4 rounded-full bg-yellow-400 text-purple-950 text-2xl font-bold shadow-xl hover:scale-110 active:scale-95 transition disabled:opacity-50">
          {ready ? '🚗 Start driving' : 'Loading map…'}
        </button>
      )}
      {arrived && (
        <div className="absolute inset-0 z-[1001] flex items-center justify-center pointer-events-none">
          <div className="pop text-7xl">⛽</div>
        </div>
      )}
      <div className={`absolute inset-0 z-[1002] bg-black pointer-events-none transition-opacity duration-700 ${fade ? 'opacity-100' : 'opacity-0'}`} />
    </div>
  );
}
