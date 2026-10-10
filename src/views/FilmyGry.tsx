/**
 * 🎬 Filmy gry — w zakładce Reżysera (most: Gdd.filmy + services/FilmyGry.js). Reżyser proponuje cutscenki i intro
 * w rozmowie („Wpisz do GDD”), tu je widać, poprawiasz opis i zdarzenie, dodajesz własne i ZLECASZ.
 * 🎥 Reżyser Wideo (Suweren 2026-10-10: „film stylu gry oraz postacie z gry w nim… wybór między Wan a FLUX”): silnik
 * FLUX → Wan (kadr FLUX.2 z obrazami obsady gry jako wzorami, ożywiony przez Wan 2.2), FLUX (ten kadr + ruch kamery,
 * szybko) albo Wan (sam tekst). Obsadę wybierasz albo zostawiasz Reżyserowi Wideo; kadr widać przy filmie.
 */
import { useEffect, useState } from 'react';
import { Clapperboard, Loader2, Plus, Trash2 } from 'lucide-react';
import { BRIDGE } from '../lib/bridge';
import { obsadaGry, zapiszGdd, zdarzeniaGry, zlecFilm, type CzlonekObsady, type FilmGdd, type Gdd } from '../lib/gdd';

const SILNIKI: Record<string, string> = { 'flux-wan': '🎨→🎞️ FLUX → Wan', flux: '🎨 FLUX + kamera', wan: '🎞️ Wan (tekst)' };
const RUCHY: Record<string, string> = { '': '🎥 ruch: Reżyser', najazd: 'najazd', odjazd: 'odjazd', 'w-lewo': 'panorama ←', 'w-prawo': 'panorama →', 'w-gore': 'w górę', staly: 'stoi' };

export default function FilmyGry({ projekt, gdd, zmien, odswiez }: { projekt: string; gdd: Gdd; zmien: (z: Partial<Gdd>) => void; odswiez: () => Promise<void> }) {
    const [zdarzenia, setZdarzenia] = useState<Record<string, string>>({});
    const [obsada, setObsada] = useState<CzlonekObsady[]>([]);
    const [blad, setBlad] = useState<string | null>(null);
    const filmy = gdd.filmy ?? [];
    useEffect(() => { zdarzeniaGry().then(setZdarzenia).catch(() => setZdarzenia({})); }, []);
    useEffect(() => { obsadaGry(projekt).then(setObsada).catch(() => setObsada([])); }, [projekt]);
    // stan zleconych filmów odświeżamy, póki coś się liczy (Wan potrafi liczyć kilkadziesiąt minut)
    useEffect(() => {
        if (!filmy.some((f) => f.stan === 'zlecony')) return;
        const t = setInterval(() => void odswiez(), 20_000);
        return () => clearInterval(t);
    }, [filmy, odswiez]);

    const ustaw = (i: number, pola: Partial<FilmGdd>) => zmien({ filmy: filmy.map((f, j) => (j === i ? { ...f, ...pola } : f)) });
    const dodaj = () => zmien({ filmy: [...filmy, { id: '', zdarzenie: 'start', tytul: 'Nowy film', opis: '', sekundy: 4, stan: 'pomysl', plik: null, prompt: null, silnik: 'flux-wan', postacie: [] } as FilmGdd] });
    const zlec = async (f: FilmGdd) => {
        if (!f.id) { setBlad('Najpierw zapisz GDD (nowy film dostaje id przy zapisie).'); return; }
        const s = f.silnik ?? 'flux-wan';
        const ile = s === 'wan' ? 'Wan 2.2 z tekstu' : s === 'flux' ? 'kadr FLUX.2 z postaciami gry + ruch kamery (kilka minut)' : 'kadr FLUX.2 z postaciami gry → Wan 2.2 go ożywia';
        if (!window.confirm(`🎬 Zlecić „${f.tytul}” (${f.sekundy} s)?\n\n${ile}.\nObsada: ${f.postacie?.length ? f.postacie.map((id) => obsada.find((o) => o.id === id)?.imie ?? id).join(', ') : 'wybierze Reżyser Wideo'}.\nLiczy się lokalnie w ComfyUI${s === 'flux' ? '' : ' — Wan na tej karcie nawet kilkadziesiąt minut'}; zajmuje GPU. GDD zapiszę przed zleceniem.`)) return;
        setBlad(null);
        try { await zapiszGdd(projekt, gdd); await zlecFilm(projekt, f.id); await odswiez(); } catch (e) { setBlad((e as Error).message); }
    };
    const STAN: Record<string, string> = { pomysl: '💡 pomysł', zlecony: '⏳ liczy się', gotowy: '✅ w grze', blad: '⚠ błąd' };
    const przelaczPostac = (i: number, f: FilmGdd, id: string) => {
        const p = f.postacie ?? [];
        ustaw(i, { postacie: p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(0, 3) });
    };

    return (
        <section className="space-y-2 rounded-xl border border-slate-800 bg-tgs-panel/60 p-3">
            <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500"><Clapperboard size={12} /> Filmy gry · Reżyser Wideo</p>
                <button onClick={dodaj} className="flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-0.5 text-[11px] hover:border-tgs-primary/40"><Plus size={12} /> film</button>
            </div>
            <p className="text-[10px] leading-snug text-slate-500">Reżyser Wideo zna styl wizualny z GDD, krainy i obsadę gry ({obsada.length} postaci z obrazami). Każdy film to jedno ujęcie 2–5 s bez dźwięku, przypięte do zdarzenia; gra odtwarza je sama (Esc — pomiń).</p>
            {filmy.length === 0 && <p className="text-[11px] text-slate-500">Brak filmów. Poproś Reżysera: „zaproponuj intro i cutscenki do najważniejszych zdarzeń”.</p>}
            {filmy.map((f, i) => (
                <div key={f.id || `nowy-${i}`} className="space-y-1 rounded-lg border border-slate-800 bg-black/20 p-2 text-[11px]">
                    <div className="flex flex-wrap items-center gap-2">
                        <input value={f.tytul} onChange={(e) => ustaw(i, { tytul: e.target.value })} className="min-w-0 flex-1 rounded border border-slate-700 bg-black/40 px-2 py-0.5 outline-none" />
                        <select value={f.zdarzenie} onChange={(e) => ustaw(i, { zdarzenie: e.target.value })} className="rounded border border-slate-700 bg-black/40 px-1 py-0.5">{Object.entries(zdarzenia).map(([k, v]) => <option key={k} value={k} title={v}>{k}</option>)}</select>
                        <select value={f.sekundy} onChange={(e) => ustaw(i, { sekundy: Number(e.target.value) })} className="rounded border border-slate-700 bg-black/40 px-1 py-0.5">{[2, 3, 4, 5].map((s) => <option key={s} value={s}>{s} s</option>)}</select>
                        <span className="font-mono text-[10px] text-slate-400">{STAN[f.stan] ?? f.stan}</span>
                        <button onClick={() => zmien({ filmy: filmy.filter((x) => x !== f) })} title="Usuń z GDD (plik w grze zostaje)" className="text-slate-500 hover:text-red-400"><Trash2 size={12} /></button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <select value={f.silnik ?? 'flux-wan'} onChange={(e) => ustaw(i, { silnik: e.target.value as FilmGdd['silnik'] })} title="FLUX → Wan: kadr z postaciami gry ożywiony; FLUX: kadr + ruch kamery (szybko); Wan: z samego tekstu" className="rounded border border-slate-700 bg-black/40 px-1 py-0.5">{Object.entries(SILNIKI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                        <select value={f.ruch ?? ''} onChange={(e) => ustaw(i, { ruch: (e.target.value || null) as FilmGdd['ruch'] })} disabled={f.silnik === 'wan'} className="rounded border border-slate-700 bg-black/40 px-1 py-0.5 disabled:opacity-40">{Object.entries(RUCHY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                    </div>
                    {f.silnik !== 'wan' && obsada.length > 0 && (
                        <div className="flex flex-wrap gap-1" title="Obsada filmu (≤ 3) — ich obrazy idą do FLUX jako wzory. Bez wyboru obsadza Reżyser Wideo.">
                            <span className="text-[10px] text-slate-500">🎭 {f.postacie?.length ? '' : 'Reżyser wybierze ·'}</span>
                            {obsada.map((o) => (
                                <button key={o.id} onClick={() => przelaczPostac(i, f, o.id)} className={`rounded-full border px-1.5 py-0 text-[10px] ${f.postacie?.includes(o.id) ? 'border-fuchsia-400/70 bg-fuchsia-500/15 text-fuchsia-200' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}>{o.id === 'katedra' ? '🏛️ ' : o.id.startsWith('b:') ? '🧝 ' : '🖼️ '}{o.imie}</button>
                            ))}
                        </div>
                    )}
                    <textarea value={f.opis} onChange={(e) => ustaw(i, { opis: e.target.value })} rows={2} placeholder="Co dzieje się w ujęciu (miejsce, kto, co robi) — po polsku; Reżyser Wideo zrobi z tego kadr i ruch w stylu gry" className="w-full resize-none rounded border border-slate-700 bg-black/40 px-2 py-1 outline-none" />
                    {f.kadr && <img src={`${BRIDGE}/api/gdd/${encodeURIComponent(projekt)}/film/${encodeURIComponent(f.id)}/kadr?t=${encodeURIComponent(f.kiedy ?? '')}`} alt="kadr FLUX" className="max-h-36 rounded border border-slate-800" />}
                    {f.obsadaUzyta?.length ? <p className="text-[10px] text-slate-500">🎭 w kadrze: {f.obsadaUzyta.map((o) => o.imie).join(', ')}{f.silnikUzyty ? ` · ${SILNIKI[f.silnikUzyty] ?? f.silnikUzyty}` : ''}</p> : null}
                    {f.kadrPrompt && <p className="font-mono text-[10px] text-slate-500">kadr: {f.kadrPrompt}</p>}
                    {f.prompt && <p className="font-mono text-[10px] text-slate-500">ruch: {f.prompt}</p>}
                    {f.stan === 'blad' && f.blad && <p className="text-[10px] text-amber-300">⚠ {f.blad}</p>}
                    {f.stan === 'gotowy' && f.plik && <video src={`${BRIDGE}/apki/${encodeURIComponent(projekt)}/${f.plik}`} controls muted className="max-h-40 rounded border border-slate-800" />}
                    <button onClick={() => void zlec(f)} disabled={f.stan === 'zlecony' || !f.opis.trim() || !f.id} title={f.id ? '' : 'Najpierw zapisz GDD'} className="flex items-center gap-1 rounded-lg border border-tgs-primary/50 px-2 py-0.5 text-[11px] text-tgs-primary disabled:opacity-40">{f.stan === 'zlecony' ? <Loader2 size={11} className="animate-spin" /> : <Clapperboard size={11} />} {f.stan === 'gotowy' ? 'Zleć ponownie' : `Zleć film (${SILNIKI[f.silnik ?? 'flux-wan']})`}</button>
                </div>
            ))}
            {blad && <p className="text-[10px] text-amber-300">⚠ {blad}</p>}
        </section>
    );
}
