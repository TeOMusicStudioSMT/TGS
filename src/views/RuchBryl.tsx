/**
 * 🎞️ Ruch brył — etap 1 (Suweren 2026-10-06: „trzeba potem sekcję do ruchów tych modeli”).
 *
 * Gotowa bryła z Assetów 3D → ruch całej bryły w Blenderze na moście (obrót, lewitacja, kołysanie, oddech, podskok) →
 * GLB z zapętloną animacją + podgląd mp4. Podgląd tutaj gra PRAWDZIWY plik GLB (AnimationMixer), nie film.
 * „Do gry z ruchem” kładzie <nazwa>-<ruch>.glb w public/assety gry, a Kodeks dostaje w prompcie, jak go odtworzyć.
 * Chodu i gestów tu nie ma — to etap 2 (szkielet + model ruchu, po sprawdzeniu licencji).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Film, Loader2, RefreshCw, Trash2, Gamepad2, Play } from 'lucide-react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { zwolnijScene } from '../lib/zwolnijScene';
import PasekSortowania, { posortuj, useSortowanie } from './PasekSortowania';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gry as pobierzGry, type ProjektGry } from '../lib/kodeks';
import { adresPliku, listaAssetow, type Asset3D } from '../lib/assety3d';
import { adresRuchu, policzRuch, ruchDoGry, ruchy as pobierzRuchy, usunRuch, zadanieRuchu, type RuchId, type RuchInfo, type WpisRuchu, type ZadanieRuchu } from '../lib/tworzenie';

type AssetZRuchem = Asset3D & { ruchy?: WpisRuchu[] };

function PodgladRuchu({ url }: { url: string | null }) {
    const ref = useRef<HTMLDivElement>(null);
    const [info, setInfo] = useState('');
    useEffect(() => {
        const el = ref.current; if (!el || !url) return;
        const w = el.clientWidth, h = el.clientHeight || 320;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setSize(w, h); renderer.setPixelRatio(Math.min(2, window.devicePixelRatio)); el.appendChild(renderer.domElement);
        const scena = new THREE.Scene();
        const kamera = new THREE.PerspectiveCamera(40, w / h, 0.01, 100); kamera.position.set(1.8, 1.3, 1.8);
        scena.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.4)); const d = new THREE.DirectionalLight(0xffffff, 1.2); d.position.set(3, 5, 2); scena.add(d);
        scena.add(new THREE.GridHelper(2, 10, 0x334155, 0x1e293b));
        const ctrl = new OrbitControls(kamera, renderer.domElement); ctrl.enableDamping = true; ctrl.target.set(0, 0.5, 0);
        let zywy = true; let mixer: THREE.AnimationMixer | null = null; const zegar = new THREE.Clock();
        new GLTFLoader().load(url, (g) => {
            if (!zywy) return;
            const model = g.scene;
            const box = new THREE.Box3().setFromObject(model); const size = box.getSize(new THREE.Vector3()); const s = 1 / Math.max(size.x, size.y, size.z, 1e-6);
            const opakowanie = new THREE.Group(); opakowanie.add(model); opakowanie.scale.setScalar(s);
            const c = box.getCenter(new THREE.Vector3()); model.position.set(-c.x, -box.min.y, -c.z);
            model.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && !(m.material as THREE.Material)?.type) m.material = new THREE.MeshStandardMaterial({ vertexColors: true }); });
            scena.add(opakowanie);
            if (g.animations.length) { mixer = new THREE.AnimationMixer(model); mixer.clipAction(g.animations[0]).play(); setInfo(`animacja „${g.animations[0].name}” · ${g.animations[0].duration.toFixed(2)} s, w pętli`); }
            else setInfo('ten GLB nie ma animacji');
        }, undefined, (e) => setInfo(`nie wczytałem GLB: ${(e as Error).message ?? e}`));
        const petla = () => { if (!zywy) return; ctrl.update(); mixer?.update(zegar.getDelta()); renderer.render(scena, kamera); requestAnimationFrame(petla); };
        petla();
        return () => { zywy = false; mixer?.stopAllAction(); ctrl.dispose(); zwolnijScene(scena, renderer); el.innerHTML = ''; };
    }, [url]);
    return <div className="relative h-80 w-full overflow-hidden rounded-xl border border-slate-800 bg-black/40"><div ref={ref} className="h-full w-full" />{!url && <p className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">Policz ruch albo wybierz gotowy.</p>}{info && <p className="absolute bottom-1 left-2 font-mono text-[10px] text-slate-400">{info}</p>}</div>;
}

export default function RuchBryl() {
    const [assety, setAssety] = useState<AssetZRuchem[]>([]);
    const [sortR, zmienSortR] = useSortowanie('ruch');
    const assetyWidoczne = posortuj(assety, sortR, { data: (a) => a.utworzono ?? '', nazwa: (a) => a.opis || a.nazwa, tekst: (a) => `${a.nazwa} ${(a.ruchy ?? []).map((r) => r.ruch).join(' ')}`, filtry: { zruchem: (a) => (a.ruchy?.length ?? 0) > 0, bezruchu: (a) => !(a.ruchy?.length), rig: (a) => a.chmura?.rodzaj === 'rig' || (a.ruchy ?? []).some((r) => String(r.ruch) === 'chod'), tekstury: (a) => !!a.tekstury } });
    const [ruchyInfo, setRuchyInfo] = useState<RuchInfo[]>([]);
    const [gry, setGry] = useState<ProjektGry[]>([]);
    const [wybrany, setWybrany] = useState<AssetZRuchem | null>(null);
    const [ruch, setRuch] = useState<RuchId>('oddech');
    const [sekundy, setSekundy] = useState(2);
    const [ogladany, setOgladany] = useState<WpisRuchu | null>(null);
    const [zadanie, setZadanie] = useState<ZadanieRuchu | null>(null);
    const [blad, setBlad] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);

    const odswiez = useCallback(async () => {
        try {
            const [a, r] = await Promise.all([listaAssetow(), pobierzRuchy()]);
            const gotowe = (a.assety as AssetZRuchem[]).filter((x) => x.stan === 'gotowe');
            setAssety(gotowe); setRuchyInfo(r.ruchy);
            setWybrany((w) => (w ? gotowe.find((x) => x.id === w.id) ?? null : gotowe[0] ?? null));
            const trwa = r.zadania.find((z) => z.stan === 'trwa'); if (trwa) setZadanie(trwa);
        } catch (e) { setBlad((e as Error).message); }
    }, []);
    useEffect(() => { void odswiez(); pobierzGry().then(setGry).catch(() => setGry([])); }, [odswiez]);
    useEffect(() => {
        if (!zadanie || zadanie.stan !== 'trwa') return;
        const t = setInterval(async () => { try { const z = await zadanieRuchu(zadanie.id); setZadanie(z); if (z.stan !== 'trwa') await odswiez(); } catch { /* most chwilowo */ } }, 3000);
        return () => clearInterval(t);
    }, [zadanie, odswiez]);
    useEffect(() => { setOgladany(wybrany?.ruchy?.find((r) => r.ruch === ruch) ?? wybrany?.ruchy?.at(-1) ?? null); }, [wybrany, ruch]);

    const licz = async () => {
        if (!wybrany) return;
        setBlad(null);
        try { const w = await policzRuch(wybrany.id, ruch, sekundy); setZadanie(await zadanieRuchu(w.zadanie)); }
        catch (e) { setBlad((e as Error).message); }
    };
    const doGry = async (wpis: WpisRuchu, gra: string) => {
        if (!wybrany) return;
        try { const d = await ruchDoGry(wybrany.id, gra, wpis.ruch); setInfo(`🎮 ${d.plik} w grze — Kodeks dostał w prompcie, jak odtworzyć animację.`); }
        catch (e) { setBlad((e as Error).message); }
    };
    const usun = async (wpis: WpisRuchu) => { if (!wybrany) return; try { await usunRuch(wybrany.id, wpis.ruch); await odswiez(); } catch (e) { setBlad((e as Error).message); } };

    const trwa = zadanie?.stan === 'trwa';
    return (
        <div className="space-y-4">
            <header className="flex items-center gap-3">
                <Film className="text-tgs-primary" size={22} />
                <div>
                    <h2 className="text-lg font-bold">Ruch brył</h2>
                    <p className="text-xs text-slate-400">Bryła z Assetów 3D → ruch w Blenderze (na moście) → GLB z zapętloną animacją + podgląd mp4. Etap 1: ruch całej bryły. Chód i gesty postaci — etap 2 (szkielet).</p>
                </div>
                <button onClick={() => void odswiez()} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-800" title="Odśwież"><RefreshCw size={16} /></button>
            </header>
            {blad && <p className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-2 text-sm text-rose-200">{blad}</p>}
            {info && <p className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-4 py-2 text-sm text-emerald-200">{info} <button onClick={() => setInfo(null)} className="ml-2 text-emerald-400/70">✕</button></p>}
            {zadanie && <p className={`rounded-lg border px-4 py-2 text-sm ${zadanie.stan === 'trwa' ? 'border-cyan-500/40 bg-cyan-950/20 text-cyan-200' : zadanie.stan === 'gotowe' ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200' : 'border-rose-500/40 bg-rose-950/20 text-rose-200'}`}>{trwa && <Loader2 size={12} className="mr-2 inline animate-spin" />}{zadanie.asset} · {zadanie.ruch} · {zadanie.etap}{zadanie.blad ? ` — ${zadanie.blad}` : ''}</p>}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr_380px]">
                <aside className="space-y-1">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Gotowe bryły</p>
                    <PasekSortowania s={sortR} zmien={zmienSortR} ile={assetyWidoczne.length} razem={assety.length} filtry={{ zruchem: '🎞️ z ruchami', bezruchu: '— bez ruchu', rig: '🦴 rig (chód)', tekstury: '☁️ z teksturami' }} />
                    {!assety.length && <p className="rounded-xl border border-slate-800 bg-tgs-panel/60 p-4 text-xs text-slate-500">Nie ma gotowych brył. Zrób je w Obrazach albo Assetach 3D.</p>}
                    {assetyWidoczne.map((a) => (
                        <button key={a.id} onClick={() => setWybrany(a)} className={`flex w-full items-center gap-2 rounded-lg border p-1.5 text-left ${wybrany?.id === a.id ? 'border-tgs-primary/50 bg-slate-800' : 'border-slate-800 bg-tgs-panel/60 hover:border-slate-600'}`}>
                            <img src={adresPliku(a.id, 'obraz.png')} alt="" className="h-10 w-10 rounded object-contain bg-black/40" onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
                            <span className="min-w-0 flex-1"><span className="block truncate text-sm">{a.nazwa}</span><span className="font-mono text-[10px] text-slate-500">{a.ruchy?.length ? `ruchy: ${a.ruchy.map((r) => r.ruch).join(', ')}` : 'bez ruchu'}</span></span>
                        </button>
                    ))}
                </aside>

                <section className="min-w-0 space-y-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {ruchyInfo.map((r) => (
                            <button key={r.id} onClick={() => setRuch(r.id)} className={`rounded-xl border p-3 text-left ${ruch === r.id ? 'border-tgs-primary/60 bg-tgs-primary/10' : 'border-slate-800 bg-tgs-panel/60 hover:border-slate-600'}`}>
                                <p className="text-sm font-semibold">{r.nazwa} {wybrany?.ruchy?.some((x) => x.ruch === r.id) && <span className="font-mono text-[10px] text-emerald-300">policzony</span>}</p>
                                <p className="text-[11px] text-slate-400">{r.opis}</p>
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-tgs-panel/60 p-3">
                        <label className="text-[11px] text-slate-400">Długość pętli
                            <select value={sekundy} onChange={(e) => setSekundy(Number(e.target.value))} className="ml-2 rounded-lg border border-slate-700 bg-black/40 px-2 py-1 text-xs">{[1, 2, 3, 4, 6, 8].map((s) => <option key={s} value={s}>{s} s</option>)}</select>
                        </label>
                        <button onClick={() => void licz()} disabled={!wybrany || trwa} className="ml-auto flex items-center gap-1 rounded-lg bg-tgs-primary/80 px-4 py-2 text-sm font-semibold text-black hover:bg-tgs-primary disabled:opacity-40">{trwa ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Policz ruch „{ruchyInfo.find((r) => r.id === ruch)?.nazwa ?? ruch}”</button>
                        <p className="w-full text-[10px] text-slate-500">Blender liczy na moście (Cycles na CPU: kilkadziesiąt sekund–kilka minut z podglądem). Jeden ruch naraz.</p>
                    </div>
                    {wybrany?.ruchy?.length ? (
                        <div className="space-y-2">
                            {wybrany.ruchy.map((r) => (
                                <div key={r.ruch} className={`flex flex-wrap items-center gap-2 rounded-xl border p-2 ${ogladany?.ruch === r.ruch ? 'border-tgs-primary/40 bg-slate-800' : 'border-slate-800 bg-tgs-panel/60'}`}>
                                    <button onClick={() => setOgladany(r)} className="text-sm font-semibold hover:text-tgs-primary">{ruchyInfo.find((x) => x.id === r.ruch)?.nazwa ?? r.ruch}</button>
                                    <span className="font-mono text-[10px] text-slate-500">{r.sekundy} s · {r.klatek ?? '?'} klatek · liczony {r.czas} s</span>
                                    <select defaultValue="" onChange={(e) => { if (e.target.value) { void doGry(r, e.target.value); e.target.value = ''; } }} className="ml-auto rounded-md border border-slate-700 bg-black/40 px-1 py-1 text-[11px]"><option value="">→ do gry z ruchem…</option>{gry.map((g) => <option key={g.id} value={g.id}>{g.nazwa}</option>)}</select>
                                    <button onClick={() => void usun(r)} className="rounded-md p-1 text-slate-500 hover:text-rose-300" title="Usuń ruch"><Trash2 size={14} /></button>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </section>

                <aside className="space-y-2">
                    <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500"><Gamepad2 size={12} /> GLB z animacją {ogladany ? `· ${ogladany.ruch}` : ''}</p>
                    <PodgladRuchu url={wybrany && ogladany ? adresRuchu(wybrany.id, ogladany.glb, Date.parse(ogladany.utworzono)) : null} />
                    {wybrany && ogladany?.mp4 && <video key={ogladany.utworzono} src={adresRuchu(wybrany.id, ogladany.mp4, Date.parse(ogladany.utworzono))} autoPlay loop muted playsInline className="w-full rounded-xl border border-slate-800 bg-black/40" />}
                </aside>
            </div>
        </div>
    );
}
