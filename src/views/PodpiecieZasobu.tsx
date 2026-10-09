/**
 * 🔗 Podpięcie gotowego zasobu do bohatera / postaci Katedry (Suweren 2026-10-09: „czy nie można dodać już gotowego modelu 3D…
 * czy też zdjęcia z obrazów z zakładki Postacie i frakcje”): obraz z Pracowni (najpierw gałęzie postaci i Mini-TeOgochi)
 * albo gotowa bryła z Assetów 3D — bez rysowania od zera. Most sprawdza, że zasób istnieje; etap liczy z jego wersji.
 */
import { useEffect, useState } from 'react';
import { listaAssetow, type Asset3D } from '../lib/assety3d';
import { obrazy as pobierzObrazy, type ObrazGry } from '../lib/tworzenie';

const POSTACIOWE = ['postacie', 'mini-teogochi'];

export default function PodpiecieZasobu({ obraz, korzen, onPodepnij, zajety = false }: { obraz: string | null; korzen: string | null; onPodepnij: (z: { obraz?: string | null; korzen?: string | null; opis?: string }) => void; zajety?: boolean }) {
    const [obrazyGry, setObrazy] = useState<ObrazGry[]>([]);
    const [bryly, setBryly] = useState<Asset3D[]>([]);
    useEffect(() => {
        pobierzObrazy().then((d) => setObrazy(d.obrazy.filter((o) => o.stan === 'gotowe' && o.styl !== 'krajobraz').sort((a, b) => Number(POSTACIOWE.includes(b.galaz ?? '')) - Number(POSTACIOWE.includes(a.galaz ?? '')) || b.utworzono.localeCompare(a.utworzono)))).catch(() => setObrazy([]));
        listaAssetow().then((d) => setBryly(d.assety.filter((a) => a.stan === 'gotowe'))).catch(() => setBryly([]));
    }, []);
    const etykieta = (t: string) => (t.length > 60 ? `${t.slice(0, 58)}…` : t);
    return (
        <div className="flex flex-wrap gap-1 text-[10px]">
            <select value={obraz ?? ''} disabled={zajety} onChange={(e) => { const o = obrazyGry.find((x) => x.id === e.target.value); onPodepnij({ obraz: e.target.value || null, ...(o ? { opis: o.opis } : {}) }); }} title="Gotowy obraz z Pracowni zamiast rysowania od zera" className="min-w-0 max-w-[48%] flex-1 rounded border border-slate-700 bg-black/40 px-1 py-0.5">
                <option value="">🖼️ obraz z Pracowni…</option>
                {obrazyGry.map((o) => <option key={o.id} value={o.id}>{POSTACIOWE.includes(o.galaz ?? '') ? (o.galaz === 'mini-teogochi' ? '🐾 ' : '🧝 ') : ''}{etykieta(o.opis)}</option>)}
            </select>
            <select value={korzen ?? ''} disabled={zajety} onChange={(e) => { const a = bryly.find((x) => x.id === e.target.value); onPodepnij({ korzen: e.target.value || null, ...(a ? { opis: a.opis } : {}) }); }} title="Gotowa bryła z Assetów 3D — liczą się też jej nowsze wersje (tekstury, rig, kolor)" className="min-w-0 max-w-[48%] flex-1 rounded border border-slate-700 bg-black/40 px-1 py-0.5">
                <option value="">🗿 gotowa bryła 3D…</option>
                {bryly.map((a) => <option key={a.id} value={a.id}>{a.tekstury ? '☁️ ' : ''}{((a as Asset3D & { ruchy?: unknown[] }).ruchy ?? []).length ? '🦴 ' : ''}{etykieta(a.opis || a.nazwa)} · {a.id.slice(-4)}</option>)}
            </select>
        </div>
    );
}
