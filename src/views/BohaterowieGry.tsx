/**
 * 🧝 Bohaterowie startowi — w zakładce Reżysera (most: services/Bohaterowie.js). Każdy bohater idzie drogą
 * 🖼️ obraz (FLUX lokalnie, „Postać do riga”) → 🗿 bryła (TRELLIS lokalnie) → ☁️ tekstury i 🦴 rig (Meshy, w Assetach 3D,
 * za wyceną i zgodą) → 🎮 do gry (gra pokazuje go w Bramie). Etap liczy most z faktów — nic tu nie udaje.
 */
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Users } from 'lucide-react';
import { adresObrazu, bohaterDoGry, bohaterZGry, bohaterowie, narysujBohatera, usunBohatera, wyrzezbBohatera, zapiszBohatera, type Bohater } from '../lib/tworzenie';
import { adresPliku } from '../lib/assety3d';

const ETAP: Record<string, string> = { pomysl: '💡 pomysł', rysuje: '⏳ rysuje się', blad: '⚠ obraz padł', obraz: '🖼️ obraz', rzezbi: '⏳ rzeźbi się', bryla: '🗿 bryła', tekstury: '☁️ tekstury', rig: '🦴 rig + chód', 'w-grze': '🎮 w grze' };
const ZYWIOLY = ['ogien', 'woda', 'ziemia', 'powietrze', 'eter'];
const DROGI = ['tworca', 'opiekun', 'wedrowiec', 'badacz'];
const PLEC: Record<string, string> = { kobieta: '♀', mezczyzna: '♂', inna: '✦' };
type Nowy = { imie: string; plec: Bohater['plec']; zywiol: string; droga: string; opis: string };

export default function BohaterowieGry({ projekt, onAssety }: { projekt: string; onAssety?: () => void }) {
    const [lista, setLista] = useState<Bohater[]>([]);
    const [blad, setBlad] = useState<string | null>(null);
    const [praca, setPraca] = useState<string | null>(null);
    const [nowy, setNowy] = useState<Nowy | null>(null);
    const odswiez = useCallback(async () => { try { setLista(await bohaterowie(projekt)); } catch (e) { setBlad((e as Error).message); } }, [projekt]);
    useEffect(() => { void odswiez(); }, [odswiez]);
    // obraz i bryła liczą się w tle — odświeżamy, póki coś trwa
    useEffect(() => {
        if (!lista.some((b) => b.etap === 'rysuje' || b.etap === 'rzezbi')) return;
        const t = setInterval(() => void odswiez(), 15_000);
        return () => clearInterval(t);
    }, [lista, odswiez]);
    const zrob = async (klucz: string, fn: () => Promise<unknown>) => {
        setBlad(null); setPraca(klucz);
        try { await fn(); await odswiez(); } catch (e) { setBlad((e as Error).message); } finally { setPraca(null); }
    };
    const przycisk = (klucz: string, napis: string, fn: () => Promise<unknown>, tytul = '') => (
        <button onClick={() => void zrob(klucz, fn)} disabled={!!praca} title={tytul} className="flex items-center gap-1 rounded-md border border-slate-700 px-2 py-0.5 text-[10px] hover:border-tgs-primary/50 disabled:opacity-40">{praca === klucz && <Loader2 size={10} className="animate-spin" />}{napis}</button>
    );

    return (
        <section className="space-y-2 rounded-xl border border-slate-800 bg-tgs-panel/60 p-3">
            <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500"><Users size={12} /> Bohaterowie startowi · {lista.filter((b) => b.etap === 'w-grze').length}/{lista.length} w grze</p>
                <button onClick={() => setNowy(nowy ? null : { imie: '', plec: 'kobieta', zywiol: 'eter', droga: 'wedrowiec', opis: '' })} className="flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-0.5 text-[11px] hover:border-tgs-primary/40"><Plus size={12} /> bohater</button>
            </div>
            <p className="text-[10px] leading-snug text-slate-500">Droga: 🖼️ obraz (lokalnie) → 🗿 bryła (lokalnie) → ☁️ tekstury i 🦴 rig w Assetach 3D (Meshy, płatne, za zgodą) → 🎮 do gry. Bohater w grze pojawia się w Bramie; z rigiem chodzi.</p>
            {nowy && (
                <div className="space-y-1 rounded-lg border border-tgs-primary/30 bg-black/20 p-2 text-[11px]">
                    <div className="flex flex-wrap gap-2">
                        <input value={nowy.imie} onChange={(e) => setNowy({ ...nowy, imie: e.target.value })} placeholder="Imię" maxLength={24} className="w-28 rounded border border-slate-700 bg-black/40 px-2 py-0.5 outline-none" />
                        <select value={nowy.plec} onChange={(e) => setNowy({ ...nowy, plec: e.target.value as Bohater['plec'] })} className="rounded border border-slate-700 bg-black/40 px-1"><option value="kobieta">♀ kobieta</option><option value="mezczyzna">♂ mężczyzna</option><option value="inna">✦ inna</option></select>
                        <select value={nowy.zywiol} onChange={(e) => setNowy({ ...nowy, zywiol: e.target.value })} className="rounded border border-slate-700 bg-black/40 px-1">{ZYWIOLY.map((z) => <option key={z}>{z}</option>)}</select>
                        <select value={nowy.droga} onChange={(e) => setNowy({ ...nowy, droga: e.target.value })} className="rounded border border-slate-700 bg-black/40 px-1">{DROGI.map((z) => <option key={z}>{z}</option>)}</select>
                    </div>
                    <textarea value={nowy.opis} onChange={(e) => setNowy({ ...nowy, opis: e.target.value })} rows={2} placeholder="Wygląd: strój, rekwizyt, sylwetka (dwie nogi i A-pozę dokłada Pracownia sama)" className="w-full resize-none rounded border border-slate-700 bg-black/40 px-2 py-1 outline-none" />
                    <button onClick={() => void zrob('nowy', async () => { await zapiszBohatera(projekt, nowy); setNowy(null); })} disabled={!!praca} className="rounded-md bg-tgs-primary/80 px-2 py-0.5 text-[11px] font-semibold text-black">Dodaj bohatera</button>
                </div>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
                {lista.map((b) => (
                    <div key={b.id} className="flex gap-2 rounded-lg border border-slate-800 bg-black/20 p-2 text-[11px]">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded border border-slate-800 bg-black/40">
                            {b.najlepsza ? <img src={adresPliku(b.najlepsza.id, 'obraz.png')} alt="" className="h-full w-full object-contain" />
                                : b.obraz && b.etap !== 'rysuje' && b.etap !== 'blad' ? <img src={adresObrazu(b.obraz)} alt="" className="h-full w-full object-contain" />
                                    : <div className="flex h-full items-center justify-center text-2xl text-slate-600">{PLEC[b.plec]}</div>}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-100">{PLEC[b.plec]} {b.imie}</span>
                                <span className="font-mono text-[9px] text-slate-500">{b.zywiol} · {b.droga}</span>
                                <span className="ml-auto font-mono text-[9px] text-slate-400">{ETAP[b.etap] ?? b.etap}</span>
                            </div>
                            <p className="line-clamp-2 text-[10px] text-slate-400" title={b.opis}>{b.opis}</p>
                            {b.blad && <p className="text-[10px] text-amber-300">⚠ {b.blad}</p>}
                            {b.nowszaNizWGrze && <p className="text-[10px] text-sky-300">Jest lepsza wersja niż ta w grze — „Do gry” podmieni.</p>}
                            <div className="flex flex-wrap gap-1">
                                {['pomysl', 'blad', 'obraz'].includes(b.etap) && !b.najlepsza && przycisk(`o-${b.id}`, b.obraz ? '🖼️ Narysuj od nowa' : '🖼️ Narysuj', () => narysujBohatera(projekt, b.id), 'FLUX.2 lokalnie — styl „Postać do riga”: dwie nogi, A-poza')}
                                {b.etap === 'obraz' && przycisk(`b-${b.id}`, '🗿 Bryła lokalnie', () => wyrzezbBohatera(projekt, b.id), 'TRELLIS.2 z obrazu — baza pod Meshy')}
                                {(b.etap === 'bryla' || b.etap === 'tekstury') && (
                                    <button onClick={onAssety} disabled={!onAssety} title={`Assety 3D → wersja ${b.najlepsza?.id} → ☁️ Meshy: ${b.etap === 'bryla' ? 'Image-to-3D (tekstury, A-poza)' : 'Rig + chód'}`} className="rounded-md border border-sky-500/40 px-2 py-0.5 text-[10px] text-sky-200">{b.etap === 'bryla' ? '☁️ tekstury w Assetach 3D →' : '🦴 rig w Assetach 3D →'}</button>
                                )}
                                {b.najlepsza && (b.etap !== 'w-grze' || b.nowszaNizWGrze) && przycisk(`g-${b.id}`, '🎮 Do gry', () => bohaterDoGry(projekt, b.id), b.najlepsza.ruchy.includes('chod') ? 'Z chodem (animowany GLB)' : 'Bez riga — w grze stoi i oddycha')}
                                {b.wGrze && przycisk(`z-${b.id}`, '✕ z gry', () => bohaterZGry(projekt, b.id))}
                                <button onClick={() => { if (window.confirm(`Usunąć bohatera „${b.imie}” z listy? (obrazy i bryły zostają)`)) void zrob(`u-${b.id}`, () => usunBohatera(projekt, b.id)); }} title="Usuń z listy" className="ml-auto text-slate-500 hover:text-red-400"><Trash2 size={11} /></button>
                            </div>
                            {b.najlepsza && <p className="font-mono text-[9px] text-slate-600">wersja {b.najlepsza.id}{b.wersji > 1 ? ` · ${b.wersji} wersji` : ''}</p>}
                        </div>
                    </div>
                ))}
            </div>
            {lista.length === 0 && !blad && <p className="text-[11px] text-slate-500">Brak bohaterów — dodaj pierwszego („+ bohater”).</p>}
            {blad && <p className="text-[10px] text-amber-300">⚠ {blad}</p>}
        </section>
    );
}
