/**
 * 🗿 Assety3D — bryły do gier z tekstu i zdjęć (od 2026-09-22).
 *
 * Lewa kolumna: zlecenie (opis albo zdjęcie, nazwa, liczba ścian, rozdzielczość, gra docelowa)
 * + stan silnika (ComfyUI, wagi TRELLIS.2). Środek: biblioteka assetów z obrazem koncepcyjnym,
 * czasami i przyciskiem „do gry". Prawa: podgląd GLB w three.js (OrbitControls) — to, co
 * naprawdę wyszło z TRELLIS.2, nie obrazek. Logika w moście (services/Assety3D.js).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Loader2, RefreshCw, Trash2, Upload, Wand2, Gamepad2, Image as ImageIcon } from 'lucide-react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gry as pobierzGry, type ProjektGry } from '../lib/kodeks';
import { adresPliku, doGry, generujZTekstu, generujZeZdjecia, listaAssetow, stanAssetow, usunAsset, zadanieAssetu, type Asset3D, type StanAssetow, type ZadanieAssetu } from '../lib/assety3d';

function PodgladGlb({ url }: { url: string | null }) {
    const ref = useRef<HTMLDivElement>(null);
    const [info, setInfo] = useState<string>('');
    useEffect(() => {
        const el = ref.current; if (!el || !url) return;
        const w = el.clientWidth, h = el.clientHeight || 320;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setSize(w, h); renderer.setPixelRatio(Math.min(2, window.devicePixelRatio)); el.appendChild(renderer.domElement);
        const scena = new THREE.Scene();
        const kamera = new THREE.PerspectiveCamera(40, w / h, 0.01, 100); kamera.position.set(1.6, 1.2, 1.6);
        scena.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.4)); const d = new THREE.DirectionalLight(0xffffff, 1.2); d.position.set(3, 5, 2); scena.add(d);
        scena.add(new THREE.GridHelper(2, 10, 0x334155, 0x1e293b));
        const ctrl = new OrbitControls(kamera, renderer.domElement); ctrl.enableDamping = true; ctrl.target.set(0, 0.4, 0);
        let zywy = true; let model: THREE.Object3D | null = null;
        new GLTFLoader().load(url, (g) => {
            if (!zywy) return;
            model = g.scene;
            const box = new THREE.Box3().setFromObject(model); const size = box.getSize(new THREE.Vector3()); const s = 1 / Math.max(size.x, size.y, size.z, 1e-6);
            model.scale.setScalar(s); const box2 = new THREE.Box3().setFromObject(model); const c = box2.getCenter(new THREE.Vector3()); model.position.sub(c); model.position.y += (box2.max.y - box2.min.y) / 2;
            let tri = 0; model.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.geometry) { tri += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; if (!(m.material as THREE.Material)?.type) m.material = new THREE.MeshStandardMaterial({ vertexColors: true }); } });
            setInfo(`${Math.round(tri)} trójkątów · ${size.x.toFixed(2)}×${size.y.toFixed(2)}×${size.z.toFixed(2)}`);
            scena.add(model);
            (window as unknown as { __podglad?: unknown }).__podglad = { model, kamera, ctrl };   // do podglądu z konsoli / testów
        }, undefined, (e) => setInfo(`nie wczytałem GLB: ${(e as Error).message ?? e}`));
        const petla = () => { if (!zywy) return; ctrl.update(); if (model) model.rotation.y += 0.002; renderer.render(scena, kamera); requestAnimationFrame(petla); };
        petla();
        return () => { zywy = false; ctrl.dispose(); renderer.dispose(); el.innerHTML = ''; };
    }, [url]);
    return <div className="relative h-80 w-full overflow-hidden rounded-xl border border-slate-800 bg-black/40"><div ref={ref} className="h-full w-full" />{!url && <p className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">Wybierz asset z biblioteki, żeby obejrzeć GLB.</p>}{info && <p className="absolute bottom-1 left-2 font-mono text-[10px] text-slate-400">{info}</p>}</div>;
}

export default function Assety3D() {
    const [stan, setStan] = useState<StanAssetow | null>(null);
    const [assety, setAssety] = useState<Asset3D[]>([]);
    const [zadania, setZadania] = useState<ZadanieAssetu[]>([]);
    const [biezace, setBiezace] = useState<ZadanieAssetu | null>(null);
    const [gry, setGry] = useState<ProjektGry[]>([]);
    const [wybrany, setWybrany] = useState<Asset3D | null>(null);
    const [tekst, setTekst] = useState('');
    const [nazwa, setNazwa] = useState('');
    const [projekt, setProjekt] = useState('');
    const [sciany, setSciany] = useState(20000);
    const [rozdz, setRozdz] = useState(1024);
    const [blad, setBlad] = useState<string | null>(null);
    const [wysylam, setWysylam] = useState(false);
    const plikRef = useRef<HTMLInputElement>(null);

    const odswiez = useCallback(async () => {
        try { const d = await listaAssetow(); setAssety(d.assety); setZadania(d.zadania); const trwa = d.zadania.find((z) => z.stan === 'trwa'); if (trwa) setBiezace(await zadanieAssetu(trwa.id)); else setBiezace((b) => (b && b.stan === 'trwa' ? null : b)); } catch (e) { setBlad((e as Error).message); }
    }, []);
    useEffect(() => { void odswiez(); stanAssetow().then(setStan).catch(() => setStan(null)); pobierzGry().then(setGry).catch(() => setGry([])); }, [odswiez]);
    useEffect(() => { if (!biezace || biezace.stan !== 'trwa') return; const t = setInterval(async () => { try { const z = await zadanieAssetu(biezace.id); setBiezace(z); if (z.stan !== 'trwa') { await odswiez(); stanAssetow().then(setStan).catch(() => {}); } } catch { /* most chwilowo */ } }, 5000); return () => clearInterval(t); }, [biezace, odswiez]);

    const zlec = async (plik?: File) => {
        setBlad(null); setWysylam(true);
        try {
            const p = { nazwa: nazwa || undefined, projekt: projekt || null, sciany, rozdzielczosc: rozdz };
            const w = plik ? await generujZeZdjecia(plik, { ...p, opis: tekst || undefined }) : await generujZTekstu({ tekst, ...p });
            setBiezace(await zadanieAssetu(w.zadanie)); setTekst(''); setNazwa(''); await odswiez();
        } catch (e) { setBlad((e as Error).message); } finally { setWysylam(false); if (plikRef.current) plikRef.current.value = ''; }
    };
    const dodajDoGry = async (a: Asset3D, gra: string) => { try { await doGry(a.id, gra); await odswiez(); } catch (e) { setBlad((e as Error).message); } };
    const usun = async (a: Asset3D) => { if (!window.confirm(`Usunąć asset „${a.nazwa}" z biblioteki? (kopie w grach zostają)`)) return; try { await usunAsset(a.id); if (wybrany?.id === a.id) setWybrany(null); await odswiez(); } catch (e) { setBlad((e as Error).message); } };

    const trwa = biezace?.stan === 'trwa';
    return (
        <div className="space-y-4">
            <header className="flex items-center gap-3">
                <Box className="text-tgs-primary" size={22} />
                <div>
                    <h2 className="text-lg font-bold">Assety 3D</h2>
                    <p className="text-xs text-slate-400">Opis albo zdjęcie → obraz (FLUX.2 klein) → siatka z kolorami (TRELLIS.2, MIT) → GLB. Wszystko lokalnie na ComfyUI. „Do gry" kładzie plik w public/assety/ i Kodeks go widzi.</p>
                </div>
                <button onClick={() => { void odswiez(); stanAssetow().then(setStan).catch(() => {}); }} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-800" title="Odśwież"><RefreshCw size={16} /></button>
            </header>
            {stan && !stan.gotowe && <p className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-2 text-sm text-amber-200">Silnik niegotowy: {stan.braki.join(' · ')}</p>}
            {blad && <p className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-2 text-sm text-rose-200">{blad}</p>}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_380px]">
                <aside className="space-y-3">
                    <div className="space-y-2 rounded-xl border border-slate-800 bg-tgs-panel/60 p-3">
                        <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500"><Wand2 size={12} /> Nowy asset</p>
                        <textarea value={tekst} onChange={(e) => setTekst(e.target.value)} rows={3} placeholder={'Opis po polsku, np. „kamienny golem porośnięty mchem, zielone oczy" (przy zdjęciu: opcjonalny opis)'} className="w-full resize-none rounded-lg border border-slate-700 bg-black/40 px-3 py-2 text-xs outline-none focus:border-tgs-primary/60" />
                        <input value={nazwa} onChange={(e) => setNazwa(e.target.value)} placeholder="Nazwa pliku (np. golem)" className="w-full rounded-lg border border-slate-700 bg-black/40 px-3 py-1.5 text-xs outline-none focus:border-tgs-primary/60" />
                        <div className="grid grid-cols-2 gap-2">
                            <label className="text-[10px] text-slate-500">Ścian<select value={sciany} onChange={(e) => setSciany(Number(e.target.value))} className="mt-0.5 w-full rounded-lg border border-slate-700 bg-black/40 px-2 py-1 text-xs">{[3000, 8000, 20000, 50000].map((n) => <option key={n} value={n}>{n.toLocaleString('pl-PL')}</option>)}</select></label>
                            <label className="text-[10px] text-slate-500">Rozdzielczość<select value={rozdz} onChange={(e) => setRozdz(Number(e.target.value))} className="mt-0.5 w-full rounded-lg border border-slate-700 bg-black/40 px-2 py-1 text-xs">{[1024, 1280, 1536].map((n) => <option key={n} value={n}>{n}{n === 1024 ? ' (szybko)' : ''}</option>)}</select></label>
                        </div>
                        <label className="text-[10px] text-slate-500">Od razu do gry<select value={projekt} onChange={(e) => setProjekt(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-700 bg-black/40 px-2 py-1 text-xs"><option value="">— tylko biblioteka —</option>{gry.map((g) => <option key={g.id} value={g.id}>{g.nazwa}</option>)}</select></label>
                        <button onClick={() => void zlec()} disabled={wysylam || trwa || tekst.trim().length < 3 || !stan?.gotowe} className="flex w-full items-center justify-center gap-1 rounded-lg bg-tgs-primary/80 py-2 text-sm font-semibold text-black hover:bg-tgs-primary disabled:opacity-40">{wysylam ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Z tekstu</button>
                        <label className={`flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg border border-slate-700 py-2 text-sm hover:border-tgs-primary/40 ${wysylam || trwa || !stan?.gotowe ? 'pointer-events-none opacity-40' : ''}`}><Upload size={14} /> Ze zdjęcia<input ref={plikRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void zlec(f); }} /></label>
                        <p className="text-[10px] leading-snug text-slate-500">Jeden asset naraz (6 GB VRAM). Nie odpalaj w tym czasie renderów w Story.</p>
                    </div>
                    {biezace && (
                        <div className={`space-y-1 rounded-xl border p-3 text-xs ${biezace.stan === 'trwa' ? 'border-cyan-500/40 bg-cyan-950/20' : biezace.stan === 'gotowe' ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-rose-500/40 bg-rose-950/20'}`}>
                            <p className="flex items-center gap-2 font-semibold">{biezace.stan === 'trwa' && <Loader2 size={12} className="animate-spin" />}{biezace.asset} · {biezace.etap}{biezace.sekundyEtapu ? ` · ${biezace.sekundyEtapu} s` : ''}</p>
                            <div className="max-h-32 space-y-0.5 overflow-y-auto font-mono text-[10px] text-slate-400">{(biezace.kroki ?? []).map((k, i) => <p key={i}>{new Date(k.kiedy).toLocaleTimeString('pl-PL')} {k.tekst}</p>)}</div>
                        </div>
                    )}
                    {stan && <p className="px-1 text-[10px] text-slate-500">{stan.silnik} · ComfyUI {stan.comfy ? 'żyje' : 'śpi'}</p>}
                </aside>

                <section className="min-w-0">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {assety.length === 0 && zadania.length === 0 && <p className="col-span-full rounded-xl border border-slate-800 bg-tgs-panel/60 p-6 text-center text-sm text-slate-500">Biblioteka pusta. Opisz pierwszy asset albo wrzuć zdjęcie.</p>}
                        {assety.map((a) => (
                            <div key={a.id} onClick={() => setWybrany(a)} className={`cursor-pointer space-y-1 rounded-xl border p-2 ${wybrany?.id === a.id ? 'border-tgs-primary/50 bg-slate-800' : 'border-slate-800 bg-tgs-panel/60 hover:border-slate-600'}`}>
                                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-black/40">
                                    {a.stan === 'trwa' ? <Loader2 className="animate-spin text-slate-500" /> : <img src={adresPliku(a.id, 'obraz.png')} alt={a.nazwa} className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                                </div>
                                <p className="truncate text-sm font-semibold">{a.nazwa} <span className={`font-mono text-[10px] ${a.stan === 'gotowe' ? 'text-emerald-300' : a.stan === 'blad' ? 'text-rose-300' : 'text-cyan-300'}`}>{a.stan}</span></p>
                                <p className="line-clamp-2 text-[11px] text-slate-400">{a.opis}</p>
                                <p className="font-mono text-[10px] text-slate-500">{a.zrodlo === 'tekst' ? <Wand2 size={10} className="mr-1 inline" /> : <ImageIcon size={10} className="mr-1 inline" />}{a.czasy?.razem ? `${a.czasy.razem} s` : ''}{a.czasy?.['3d'] ? ` (3D ${a.czasy['3d']} s)` : ''}{a.rozmiarGlb ? ` · ${(a.rozmiarGlb / 1e6).toFixed(1)} MB` : ''}{a.wGrach?.length ? ` · w: ${a.wGrach.join(', ')}` : ''}</p>
                                {a.blad && <p className="text-[10px] text-rose-300">{a.blad}</p>}
                                <div className="flex items-center gap-1">
                                    {a.stan === 'gotowe' && <select defaultValue="" onClick={(e) => e.stopPropagation()} onChange={(e) => { if (e.target.value) { void dodajDoGry(a, e.target.value); e.target.value = ''; } }} className="min-w-0 flex-1 rounded-md border border-slate-700 bg-black/40 px-1 py-1 text-[11px]"><option value="">→ do gry…</option>{gry.map((g) => <option key={g.id} value={g.id}>{g.nazwa}</option>)}</select>}
                                    <button onClick={(e) => { e.stopPropagation(); void usun(a); }} className="rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-rose-300" title="Usuń z biblioteki"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <aside className="space-y-2">
                    <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500"><Gamepad2 size={12} /> Podgląd GLB {wybrany ? `· ${wybrany.nazwa}` : ''}</p>
                    <PodgladGlb url={wybrany && wybrany.stan === 'gotowe' ? adresPliku(wybrany.id, 'model.glb', Date.parse(wybrany.utworzono)) : null} />
                    {wybrany && <img src={adresPliku(wybrany.id, 'obraz.png')} alt="" className="w-full rounded-xl border border-slate-800 bg-black/40 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                    {wybrany?.promptObrazu && <p className="text-[10px] leading-snug text-slate-500">prompt: {wybrany.promptObrazu}</p>}
                </aside>
            </div>
        </div>
    );
}
