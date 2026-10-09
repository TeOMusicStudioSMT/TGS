/**
 * 🎬 Filmy gry — w zakładce Reżysera (most: Gdd.filmy + services/FilmyGry.js). Reżyser proponuje cutscenki i intro
 * w rozmowie („Wpisz do GDD”), tu je widać, poprawiasz opis i zdarzenie, dodajesz własne i ZLECASZ: Wan 2.2 lokalnie
 * (2–5 s, jedno ujęcie) → plik w grze → gra sama gra film przy zdarzeniu (src/filmy.ts w grze).
 */
import { useEffect, useState } from 'react';
import { Clapperboard, Loader2, Plus, Trash2 } from 'lucide-react';
import { BRIDGE } from '../lib/bridge';
import { zdarzeniaGry, zlecFilm, type FilmGdd, type Gdd } from '../lib/gdd';

export default function FilmyGry({ projekt, gdd, zmien, odswiez }: { projekt: string; gdd: Gdd; zmien: (z: Partial<Gdd>) => void; odswiez: () => Promise<void> }) {
    const [zdarzenia, setZdarzenia] = useState<Record<string, string>>({});
    const [blad, setBlad] = useState<string | null>(null);
    const filmy = gdd.filmy ?? [];
    useEffect(() => { zdarzeniaGry().then(setZdarzenia).catch(() => setZdarzenia({})); }, []);
    // stan zleconych filmów odświeżamy, póki coś się liczy (Wan potrafi liczyć kilkadziesiąt minut)
    useEffect(() => {
        if (!filmy.some((f) => f.stan === 'zlecony')) return;
        const t = setInterval(() => void odswiez(), 20_000);
        return () => clearInterval(t);
    }, [filmy, odswiez]);

    const ustaw = (i: number, pola: Partial<FilmGdd>) => zmien({ filmy: filmy.map((f, j) => (j === i ? { ...f, ...pola } : f)) });
    const dodaj = () => zmien({ filmy: [...filmy, { id: '', zdarzenie: 'start', tytul: 'Nowy film', opis: '', sekundy: 4, stan: 'pomysl', plik: null, prompt: null } as FilmGdd] });
    const zlec = async (f: FilmGdd) => {
        if (!f.id) { setBlad('Najpierw zapisz GDD (nowy film dostaje id przy zapisie).'); return; }
        if (!window.confirm(`🎬 Zlecić „${f.tytul}” (${f.sekundy} s) do Wan 2.2?\n\nLiczy się lokalnie w ComfyUI — na tej karcie nawet kilkadziesiąt minut i zajmuje GPU (nie odpalaj w tym czasie podcastu ani brył).`)) return;
        setBlad(null);
        try { await zlecFilm(projekt, f.id); await odswiez(); } catch (e) { setBlad((e as Error).message); }
    };
    const STAN: Record<string, string> = { pomysl: '💡 pomysł', zlecony: '⏳ liczy się', gotowy: '✅ w grze', blad: '⚠ błąd' };

    return (
        <section className="space-y-2 rounded-xl border border-slate-800 bg-tgs-panel/60 p-3">
            <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500"><Clapperboard size={12} /> Filmy gry · cutscenki i intro</p>
                <button onClick={dodaj} className="flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-0.5 text-[11px] hover:border-tgs-primary/40"><Plus size={12} /> film</button>
            </div>
            <p className="text-[10px] leading-snug text-slate-500">Każdy film to jedno ujęcie Wan 2.2 (2–5 s, bez dźwięku), przypięte do zdarzenia w grze. Reżyser proponuje je w rozmowie; gra odtwarza je sama, każdy raz na urządzenie (Esc — pomiń).</p>
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
                    <textarea value={f.opis} onChange={(e) => ustaw(i, { opis: e.target.value })} rows={2} placeholder="Co widać w ujęciu (miejsce, postać, ruch kamery) — po polsku; most przełoży to na prompt Wan" className="w-full resize-none rounded border border-slate-700 bg-black/40 px-2 py-1 outline-none" />
                    {f.prompt && <p className="font-mono text-[10px] text-slate-500">prompt Wan: {f.prompt}</p>}
                    {f.stan === 'blad' && f.blad && <p className="text-[10px] text-amber-300">⚠ {f.blad}</p>}
                    {f.stan === 'gotowy' && f.plik && <video src={`${BRIDGE}/apki/${encodeURIComponent(projekt)}/${f.plik}`} controls muted className="max-h-40 rounded border border-slate-800" />}
                    <button onClick={() => void zlec(f)} disabled={f.stan === 'zlecony' || !f.opis.trim() || !f.id} title={f.id ? '' : 'Najpierw zapisz GDD'} className="flex items-center gap-1 rounded-lg border border-tgs-primary/50 px-2 py-0.5 text-[11px] text-tgs-primary disabled:opacity-40">{f.stan === 'zlecony' ? <Loader2 size={11} className="animate-spin" /> : <Clapperboard size={11} />} {f.stan === 'gotowy' ? 'Zleć ponownie' : 'Zleć film (Wan, lokalnie)'}</button>
                </div>
            ))}
            {blad && <p className="text-[10px] text-amber-300">⚠ {blad}</p>}
        </section>
    );
}
