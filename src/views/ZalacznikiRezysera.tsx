/**
 * 📎 Gotowe assety gry do rozmowy z Reżyserem (Suweren 2026-10-11: „dodaj możliwość, by gotowy asset gry można dodać do
 * rozmowy z Reżyserem gry”). Lista z katalogu klocków gry (most: GET /api/gdd/:id/klocki) — bryły w grze ✅, bryły 📦,
 * obrazy 🗿, koncepty 🏞️; wybrane (≤ 8) idą z wiadomością jako klucze, most dokłada Reżyserowi fakty o nich.
 */
import { useEffect, useMemo, useState } from 'react';
import { Paperclip, X } from 'lucide-react';
import { klockiGdd, type KlocekKatalogu } from '../lib/gdd';

export const MAX_ZALACZNIKOW = 8;
const ZNAK: Record<KlocekKatalogu['stan'], string> = { 'w-grze': '✅', bryla: '📦', obraz: '🗿', koncept: '🏞️' };
const OPIS: Record<KlocekKatalogu['stan'], string> = { 'w-grze': 'w grze', bryla: 'bryła', obraz: 'obraz', koncept: 'koncept' };

/** Przycisk 📎 + okienko wyboru (nad polem wpisu). */
export function WyborZalacznikow({ projekt, wybrane, zmien, wylaczony }: { projekt: string | null; wybrane: KlocekKatalogu[]; zmien: (l: KlocekKatalogu[]) => void; wylaczony?: boolean }) {
    const [otwarte, setOtwarte] = useState(false);
    const [katalog, setKatalog] = useState<KlocekKatalogu[] | null>(null);
    const [szukaj, setSzukaj] = useState('');
    const [filtr, setFiltr] = useState<KlocekKatalogu['stan'] | ''>('');
    useEffect(() => { setKatalog(null); }, [projekt]);
    useEffect(() => {
        if (!otwarte || !projekt || katalog) return;
        klockiGdd(projekt).then((d) => setKatalog(d.katalog)).catch(() => setKatalog([]));
    }, [otwarte, projekt, katalog]);
    const widoczne = useMemo(() => {
        const q = szukaj.trim().toLowerCase();
        const kolej: KlocekKatalogu['stan'][] = ['w-grze', 'bryla', 'obraz', 'koncept'];
        return (katalog ?? []).filter((k) => (!filtr || k.stan === filtr) && (!q || `${k.nazwa} ${k.galaz ?? ''}`.toLowerCase().includes(q)))
            .sort((a, b) => kolej.indexOf(a.stan) - kolej.indexOf(b.stan));
    }, [katalog, szukaj, filtr]);
    const przelacz = (k: KlocekKatalogu) => {
        if (wybrane.some((x) => x.klucz === k.klucz)) zmien(wybrane.filter((x) => x.klucz !== k.klucz));
        else if (wybrane.length < MAX_ZALACZNIKOW) zmien([...wybrane, k]);
    };

    return (
        <div className="relative">
            <button type="button" onClick={() => setOtwarte((o) => !o)} disabled={wylaczony || !projekt} title="📎 Dołącz gotowy asset gry do rozmowy"
                className={`flex h-full items-center rounded-lg border px-2 disabled:opacity-40 ${otwarte ? 'border-tgs-primary/60 text-tgs-primary' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}>
                <Paperclip size={15} />
            </button>
            {otwarte && (
                <div className="absolute bottom-full right-0 z-30 mb-2 w-[min(360px,80vw)] rounded-xl border border-slate-700 bg-slate-950 p-2 shadow-2xl">
                    <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-500">
                        <span>📎 Assety gry · wybrane {wybrane.length}/{MAX_ZALACZNIKOW}</span>
                        <button onClick={() => setOtwarte(false)} className="hover:text-slate-200"><X size={12} /></button>
                    </div>
                    <div className="mb-1 flex gap-1">
                        <input value={szukaj} onChange={(e) => setSzukaj(e.target.value)} placeholder="szukaj…" className="min-w-0 flex-1 rounded border border-slate-700 bg-black/40 px-2 py-1 text-[11px] outline-none" />
                        <select value={filtr} onChange={(e) => setFiltr(e.target.value as KlocekKatalogu['stan'] | '')} className="rounded border border-slate-700 bg-black/40 px-1 text-[11px]">
                            <option value="">wszystkie</option>{(Object.keys(ZNAK) as KlocekKatalogu['stan'][]).map((s) => <option key={s} value={s}>{ZNAK[s]} {OPIS[s]}</option>)}
                        </select>
                    </div>
                    <div className="max-h-64 space-y-0.5 overflow-y-auto">
                        {katalog === null ? <p className="p-2 text-[11px] text-slate-500">Wczytuję katalog gry…</p>
                            : !widoczne.length ? <p className="p-2 text-[11px] text-slate-500">Brak assetów{szukaj ? ' dla tego szukania' : ''}.</p>
                                : widoczne.map((k) => {
                                    const jest = wybrane.some((x) => x.klucz === k.klucz);
                                    return (
                                        <button key={k.klucz} onClick={() => przelacz(k)} title={k.opis}
                                            className={`flex w-full items-start gap-1.5 rounded px-1.5 py-1 text-left text-[11px] ${jest ? 'bg-tgs-primary/15 text-tgs-primary' : 'text-slate-300 hover:bg-slate-800'}`}>
                                            <span>{jest ? '☑' : ZNAK[k.stan]}</span>
                                            <span className="min-w-0 flex-1 truncate">{k.nazwa}</span>
                                            {k.galaz && <span className="shrink-0 text-[9px] text-slate-500">{k.galaz}</span>}
                                        </button>
                                    );
                                })}
                    </div>
                </div>
            )}
        </div>
    );
}

/** Chipy wybranych assetów nad polem wpisu (✕ zdejmuje). */
export function ChipyZalacznikow({ wybrane, zmien }: { wybrane: KlocekKatalogu[]; zmien: (l: KlocekKatalogu[]) => void }) {
    if (!wybrane.length) return null;
    return (
        <div className="flex flex-wrap gap-1 px-2 pt-2">
            {wybrane.map((k) => (
                <span key={k.klucz} title={k.opis} className="flex max-w-[220px] items-center gap-1 rounded-full border border-tgs-primary/40 bg-tgs-primary/10 px-2 py-0.5 text-[10px] text-tgs-primary">
                    <span>{ZNAK[k.stan]}</span><span className="truncate">{k.nazwa}</span>
                    <button onClick={() => zmien(wybrane.filter((x) => x.klucz !== k.klucz))} className="opacity-70 hover:opacity-100"><X size={10} /></button>
                </span>
            ))}
        </div>
    );
}
