/**
 * ↕️ Pasek sortowania list (Suweren 2026-10-10: „trzeba dodać listy sortujące do naszych obrazów / assetów 3D / ruchu”):
 * kolejność (najnowsze, najstarsze, A–Z, Z–A), szukanie w nazwie i opisie, filtr właściwy dla widoku. Wybór pamiętany
 * w localStorage osobno dla każdego widoku (`tgs_sort_<klucz>`).
 */
import { useEffect, useState } from 'react';
import { ArrowDownUp, Search } from 'lucide-react';

export type Kolejnosc = 'nowe' | 'stare' | 'az' | 'za';
export interface StanSortowania { kolejnosc: Kolejnosc; szukaj: string; filtr: string }
const KOLEJNOSCI: Record<Kolejnosc, string> = { nowe: 'najnowsze', stare: 'najstarsze', az: 'A–Z', za: 'Z–A' };

/** Stan paska z pamięcią per widok. */
export function useSortowanie(klucz: string): [StanSortowania, (z: Partial<StanSortowania>) => void] {
    const [s, setS] = useState<StanSortowania>(() => {
        try { return { kolejnosc: 'nowe', szukaj: '', filtr: '', ...JSON.parse(localStorage.getItem(`tgs_sort_${klucz}`) ?? '{}') }; } catch { return { kolejnosc: 'nowe', szukaj: '', filtr: '' }; }
    });
    useEffect(() => { try { localStorage.setItem(`tgs_sort_${klucz}`, JSON.stringify({ kolejnosc: s.kolejnosc, filtr: s.filtr })); } catch { /* bez pamięci */ } }, [klucz, s.kolejnosc, s.filtr]);
    return [s, (z) => setS((x) => ({ ...x, ...z }))];
}

/** Posortuj i przefiltruj: `data` (ISO), `nazwa`, `tekst` (do szukania), `filtry` = {id: predykat}. */
export function posortuj<T>(lista: T[], s: StanSortowania, o: { data: (x: T) => string; nazwa: (x: T) => string; tekst?: (x: T) => string; filtry?: Record<string, (x: T) => boolean> }): T[] {
    const q = s.szukaj.trim().toLowerCase();
    const f = s.filtr && o.filtry?.[s.filtr];
    const out = lista.filter((x) => (!f || f(x)) && (!q || `${o.nazwa(x)} ${o.tekst?.(x) ?? ''}`.toLowerCase().includes(q)));
    const por = { nowe: (a: T, b: T) => o.data(b).localeCompare(o.data(a)), stare: (a: T, b: T) => o.data(a).localeCompare(o.data(b)), az: (a: T, b: T) => o.nazwa(a).localeCompare(o.nazwa(b), 'pl'), za: (a: T, b: T) => o.nazwa(b).localeCompare(o.nazwa(a), 'pl') }[s.kolejnosc];
    return [...out].sort(por);
}

export default function PasekSortowania({ s, zmien, filtry = {}, ile, razem }: { s: StanSortowania; zmien: (z: Partial<StanSortowania>) => void; filtry?: Record<string, string>; ile: number; razem: number }) {
    return (
        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px]">
            <ArrowDownUp size={12} className="text-slate-500" />
            <select value={s.kolejnosc} onChange={(e) => zmien({ kolejnosc: e.target.value as Kolejnosc })} className="rounded border border-slate-700 bg-black/40 px-1 py-0.5">{Object.entries(KOLEJNOSCI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            {Object.keys(filtry).length > 0 && <select value={s.filtr} onChange={(e) => zmien({ filtr: e.target.value })} className="rounded border border-slate-700 bg-black/40 px-1 py-0.5"><option value="">wszystkie</option>{Object.entries(filtry).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}
            <label className="flex min-w-0 flex-1 items-center gap-1 rounded border border-slate-700 bg-black/40 px-1.5 py-0.5"><Search size={11} className="text-slate-500" /><input value={s.szukaj} onChange={(e) => zmien({ szukaj: e.target.value })} placeholder="szukaj w nazwie i opisie" className="min-w-0 flex-1 bg-transparent outline-none" /></label>
            <span className="font-mono text-[10px] text-slate-500">{ile === razem ? razem : `${ile}/${razem}`}</span>
        </div>
    );
}
