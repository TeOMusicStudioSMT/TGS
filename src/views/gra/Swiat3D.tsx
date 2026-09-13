/**
 * 🧊 Swiat3D — Teterhia w trzech wymiarach.
 *
 * Teren przychodzi z Blendera jako .glb (most: POST /api/tgs/3d/swiat buduje go
 * z TYCH SAMYCH kafli, które rysuje plansza 2D, i zapisuje do
 * public/assets/swiaty/). Tu three.js tylko go ładuje i dokłada to, czego w .glb
 * świadomie nie ma: gracza, NPC-TeOgochi (ze stada), znaczniki questów.
 *
 * ⚠️ Gdy .glb dla tego świata jeszcze nie istnieje — panel mówi to wprost
 * i daje przycisk „Zbuduj w Blenderze". Nie rysuje atrapy terenu.
 *
 * Sterowanie: WSAD / strzałki jak na planszy (obsługuje Gra.tsx); kamera —
 * OrbitControls (mysz). Klik na NPC → rozmowa (Gra.tsx dostaje id).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SZEROKOSC, WYSOKOSC, type Swiat } from '../../gra/teterhia';
import { zywiolPostaci, type Postac } from '../../gra/postac';
import type { Npc, Postawiona } from '../../gra/npc';

interface Props {
  swiat: Swiat;
  postac: Postac;
  pozycja: { x: number; y: number };
  npc: Npc[];
  wezly: Set<number>;
  ukonczone: Set<number>;
  glb: string | null;
  scenografie?: Postawiona[];
  onNpc?: (n: Npc) => void;
}

/** Sprite z tekstem — etykieta nad postacią (emoji formy + imię). */
function etykieta(tekst: string, kolor: string): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 0, 256, 64);
  g.font = '28px "Segoe UI Emoji", "Segoe UI", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = kolor; g.fillText(tekst, 128, 34);
  const tex = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  s.scale.set(4, 1, 1);
  return s;
}

export default function Swiat3D({ swiat, postac, pozycja, npc, wezly, ukonczone, glb, scenografie = [], onNpc }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const scenaRef = useRef<{ scena: THREE.Scene; teren: THREE.Object3D | null; gracz: THREE.Group; npcGrupa: THREE.Group; znaczniki: THREE.Group; scenGrupa: THREE.Group; wysokosc: (x: number, y: number) => number } | null>(null);
  const [stanGlb, setStanGlb] = useState<'laduje' | 'ok' | 'brak' | 'blad'>('laduje');
  const [blad, setBlad] = useState('');
  const hue = useMemo(() => zywiolPostaci(postac).hue, [postac]);

  // Pozycja kafla → współrzędne sceny (jak w skrypcie bpy: x - W/2, H/2 - y; y kafla to -Z? Blender Y → three -Z).
  const doSceny = (x: number, y: number) => new THREE.Vector3(x + 0.5 - SZEROKOSC / 2, 0, -(WYSOKOSC / 2 - y - 0.5));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const szer = el.clientWidth, wys = Math.max(360, Math.round(szer * 0.6));
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.setSize(szer, wys);
    el.appendChild(renderer.domElement);
    const scena = new THREE.Scene();
    scena.background = new THREE.Color('#0a0f1c');
    scena.fog = new THREE.Fog('#0a0f1c', 40, 90);
    const kamera = new THREE.PerspectiveCamera(50, szer / wys, 0.1, 300);
    kamera.position.set(0, 26, 34);
    const ster = new OrbitControls(kamera, renderer.domElement);
    ster.maxPolarAngle = Math.PI * 0.47; ster.minDistance = 8; ster.maxDistance = 90;
    scena.add(new THREE.HemisphereLight('#cfe8ff', '#2a1d3a', 0.9));
    const slonce = new THREE.DirectionalLight('#fff4d6', 1.4); slonce.position.set(20, 40, 10); scena.add(slonce);

    const gracz = new THREE.Group();
    const cialo = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.7, 4, 12), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(hue / 360, 0.8, 0.55), emissive: new THREE.Color().setHSL(hue / 360, 0.8, 0.25) }));
    cialo.position.y = 0.7; gracz.add(cialo);
    const et = etykieta(`★ ${postac.imie}`, '#fde68a'); et.position.y = 1.9; gracz.add(et);
    scena.add(gracz);
    const npcGrupa = new THREE.Group(); scena.add(npcGrupa);
    const znaczniki = new THREE.Group(); scena.add(znaczniki);
    const scenGrupa = new THREE.Group(); scena.add(scenGrupa);

    const stan = { scena, teren: null as THREE.Object3D | null, gracz, npcGrupa, znaczniki, scenGrupa, wysokosc: (_x: number, _y: number) => 0 };
    scenaRef.current = stan;

    // Wysokość terenu pod kaflem — z raycastu w dół (teren ma prawdziwe zbocza z Blendera).
    const ray = new THREE.Raycaster();
    stan.wysokosc = (x, y) => {
      if (!stan.teren) return 0;
      const p = doSceny(x, y); p.y = 50;
      ray.set(p, new THREE.Vector3(0, -1, 0));
      const t = ray.intersectObject(stan.teren, true)[0];
      return t ? t.point.y : 0;
    };

    if (glb) {
      new GLTFLoader().load(glb, (g) => {
        g.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { const mat = m.material as THREE.MeshStandardMaterial; mat.vertexColors = true; mat.flatShading = true; mat.needsUpdate = true; } });
        stan.teren = g.scene; scena.add(g.scene);
        setStanGlb('ok');
      }, undefined, (e) => { setStanGlb('blad'); setBlad(String((e as Error).message ?? e)); });
    } else setStanGlb('brak');

    const naKlik = (ev: MouseEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      const m = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(m, kamera);
      const t = ray.intersectObjects(npcGrupa.children, true)[0];
      const id = t?.object?.parent?.userData?.id ?? t?.object?.userData?.id;
      if (id && onNpc) { const n = npc.find((x) => x.id === id); if (n) onNpc(n); }
    };
    renderer.domElement.addEventListener('click', naKlik);

    let zywy = true;
    const tik = () => { if (!zywy) return; ster.update(); renderer.render(scena, kamera); requestAnimationFrame(tik); };
    tik();
    // ResizeObserver, nie tylko window.resize: przy montażu kontener bywa jeszcze wąski
    // (zmierzone: 141 px), a rośnie po ułożeniu siatki — canvas musi za tym nadążyć.
    const naRozmiar = () => { const s = Math.max(200, el.clientWidth), h = Math.max(360, Math.round(s * 0.6)); renderer.setSize(s, h); kamera.aspect = s / h; kamera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(naRozmiar); ro.observe(el);
    window.addEventListener('resize', naRozmiar);
    return () => { zywy = false; ro.disconnect(); window.removeEventListener('resize', naRozmiar); renderer.domElement.removeEventListener('click', naKlik); ster.dispose(); renderer.dispose(); el.removeChild(renderer.domElement); scenaRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glb, swiat.ziarno]);

  // Gracz podąża za pozycją; kamera trzyma cel na graczu.
  useEffect(() => {
    const s = scenaRef.current; if (!s) return;
    const p = doSceny(pozycja.x, pozycja.y); p.y = s.wysokosc(pozycja.x, pozycja.y);
    s.gracz.position.copy(p);
  }, [pozycja, stanGlb]);

  // NPC ze stada + znaczniki questów.
  useEffect(() => {
    const s = scenaRef.current; if (!s) return;
    s.npcGrupa.clear(); s.znaczniki.clear();
    for (const n of npc) {
      const g = new THREE.Group(); g.userData.id = n.id;
      const kol = new THREE.Color(n.kolor || '#94a3b8');
      const c = new THREE.Mesh(n.wyklute ? new THREE.CapsuleGeometry(0.3, 0.6, 4, 10) : new THREE.SphereGeometry(0.42, 12, 10), new THREE.MeshStandardMaterial({ color: kol, emissive: kol.clone().multiplyScalar(n.wyklute ? 0.35 : 0.1), roughness: 0.6 }));
      c.position.y = n.wyklute ? 0.6 : 0.42; c.userData.id = n.id; g.add(c);
      const e = etykieta(`${n.forma} ${n.imie}`, n.kolor || '#e2e8f0'); e.position.y = 1.7; e.userData.id = n.id; g.add(e);
      const p = doSceny(n.x, n.y); p.y = s.wysokosc(n.x, n.y); g.position.copy(p);
      s.npcGrupa.add(g);
    }
    wezly.forEach((i) => {
      const x = i % SZEROKOSC, y = Math.floor(i / SZEROKOSC);
      const gotowy = ukonczone.has(i);
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), new THREE.MeshStandardMaterial({ color: gotowy ? '#64748b' : '#fbbf24', emissive: gotowy ? '#000' : '#a16207' }));
      const p = doSceny(x, y); p.y = s.wysokosc(x, y) + 0.9; m.position.copy(p);
      s.znaczniki.add(m);
    });
  }, [npc, wezly, ukonczone, stanGlb]);

  // 🎬 Scenografie z kadrów Story — .glb studia (cyklorama z kadru) postawione na kaflach.
  // Ładowane po URL; ta sama lista = te same obiekty (klucz url+x+y+skala).
  useEffect(() => {
    const s = scenaRef.current; if (!s) return;
    const klucze = new Set(scenografie.map((p) => `${p.url}|${p.x}|${p.y}|${p.skala}|${p.obrot}`));
    for (const o of [...s.scenGrupa.children]) if (!klucze.has(o.userData.klucz)) s.scenGrupa.remove(o);
    const juz = new Set(s.scenGrupa.children.map((o) => o.userData.klucz as string));
    const loader = new GLTFLoader();
    for (const p of scenografie) {
      const klucz = `${p.url}|${p.x}|${p.y}|${p.skala}|${p.obrot}`;
      if (juz.has(klucz)) continue;
      loader.load(p.url, (g) => {
        const ob = g.scene; ob.userData.klucz = klucz;
        ob.scale.setScalar(p.skala);
        ob.rotation.y = (p.obrot * Math.PI) / 180;
        const poz = doSceny(p.x, p.y); poz.y = s.wysokosc(p.x, p.y); ob.position.copy(poz);
        s.scenGrupa.add(ob);
      }, undefined, () => { /* brak pliku — lista w Gra.tsx pokaże, że .glb nie ma */ });
    }
  }, [scenografie, stanGlb]);

  return (
    <div className="relative">
      <div ref={ref} className="w-full overflow-hidden rounded-xl border border-slate-800 bg-black" />
      {stanGlb === 'brak' && <div className="absolute inset-x-0 top-0 m-3 rounded-lg border border-amber-500/40 bg-amber-950/60 p-3 text-xs text-amber-100">Ten świat nie ma jeszcze terenu z Blendera — kliknij „Zbuduj w Blenderze". Do tego czasu widać tylko postacie i questy na płaskim czarnym tle (bez atrapy terenu).</div>}
      {stanGlb === 'laduje' && glb && <div className="absolute left-3 top-3 text-xs text-slate-400">ładuję teren…</div>}
      {stanGlb === 'blad' && <div className="absolute inset-x-0 top-0 m-3 rounded-lg border border-red-500/40 bg-red-950/60 p-3 text-xs text-red-100">Teren nie wczytał się: {blad}</div>}
      <div className="absolute bottom-2 right-3 text-[10px] text-slate-500">mysz — kamera · WSAD — ruch · klik NPC — rozmowa</div>
    </div>
  );
}
