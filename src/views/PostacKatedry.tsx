/**
 * 🏛️ Postać Twojej Katedry — JEDNA na Katedrę (most: services/PostacKatedry.js), avatar Suwerena w MRPG Teterhii.
 * Z opisu (🖼️ obraz → 🗿 bryła) albo ze zdjęcia (🗿 bryła prosto), potem ☁️ tekstury i 🦴 rig w Assetach 3D (Meshy,
 * za zgodą) → 📣 Opublikuj: gra stawia ją pierwszą w Bramie, z nią schodzisz na każdą wyspę; wizytówka pokazuje ją sieci.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Landmark, Loader2 } from 'lucide-react';
import { adresObrazu, opublikujPostac, postacBryla, postacKatedry, postacZOpisu, postacZeZdjecia, wycofajPostac, zapiszPostac, type KartaPostaci, type StanPostaci } from '../lib/tworzenie';
import { adresPliku } from '../lib/assety3d';
import PodpiecieZasobu from './PodpiecieZasobu';

const ETAP: Record<string, string> = { brak: '— brak karty', pomysl: '💡 karta', rysuje: '⏳ rysuje się', blad: '⚠ obraz padł', obraz: '🖼️ obraz', rzezbi: '⏳ rzeźbi się', bryla: '🗿 bryła', tekstury: '☁️ tekstury', rig: '🦴 rig + chód', opublikowana: '📣 opublikowana' };
const ZYWIOLY = ['ogien', 'woda', 'ziemia', 'powietrze', 'eter'];
const DROGI = ['tworca', 'opiekun', 'wedrowiec', 'badacz'];
type Forma = Pick<KartaPostaci, 'imie' | 'plec' | 'zywiol' | 'droga' | 'opis'>;

export default function PostacKatedry({ onAssety }: { onAssety?: () => void }) {
    const [s, setS] = useState<StanPostaci | null>(null);
    const [forma, setForma] = useState<Forma | null>(null);
    const [praca, setPraca] = useState<string | null>(null);
    const [blad, setBlad] = useState<string | null>(null);
    const plik = useRef<HTMLInputElement>(null);
    const odswiez = useCallback(async () => {
        try {
            const d = await postacKatedry();
            setS(d);
            setForma((f) => f ?? (d.karta ? { imie: d.karta.imie, plec: d.karta.plec, zywiol: d.karta.zywiol, droga: d.karta.droga, opis: d.karta.opis } : { imie: d.imie ?? '', plec: 'inna', zywiol: 'eter', droga: 'wedrowiec', opis: '' }));
        } catch (e) { setBlad((e as Error).message); }
    }, []);
    useEffect(() => { void odswiez(); }, [odswiez]);
    useEffect(() => {
        if (s?.etap !== 'rysuje' && s?.etap !== 'rzezbi') return;
        const t = setInterval(() => void odswiez(), 15_000);
        return () => clearInterval(t);
    }, [s?.etap, odswiez]);
    const zrob = async (klucz: string, fn: () => Promise<unknown>) => {
        setBlad(null); setPraca(klucz);
        try { await fn(); await odswiez(); } catch (e) { setBlad((e as Error).message); } finally { setPraca(null); }
    };
    const przycisk = (klucz: string, napis: string, fn: () => Promise<unknown>, tytul = '', akcent = false) => (
        <button onClick={() => void zrob(klucz, fn)} disabled={!!praca} title={tytul} className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] disabled:opacity-40 ${akcent ? 'border-tgs-primary/60 text-tgs-primary' : 'border-slate-700 hover:border-tgs-primary/50'}`}>{praca === klucz && <Loader2 size={10} className="animate-spin" />}{napis}</button>
    );
    const zdjecie = (f: File | undefined) => {
        if (!f) return;
        const r = new FileReader();
        r.onload = () => void zrob('zdjecie', () => postacZeZdjecia(String(r.result)));
        r.readAsDataURL(f);
    };
    if (!s || !forma) return null;
    const k = s.karta;
    const zmieniona = !k || k.imie !== forma.imie || k.plec !== forma.plec || k.zywiol !== forma.zywiol || k.droga !== forma.droga || k.opis !== forma.opis;
    const etap = s.etap;

    return (
        <section className="space-y-2 rounded-xl border border-tgs-primary/30 bg-tgs-panel/60 p-3">
            <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-tgs-primary/80"><Landmark size={12} /> Postać Twojej Katedry · MRPG</p>
                <span className="font-mono text-[10px] text-slate-400">{ETAP[etap] ?? etap}</span>
            </div>
            <p className="text-[10px] leading-snug text-slate-500">Jedna na Katedrę — z nią schodzisz na każdą wyspę Teterhii (w Bramie stoi pierwsza). Z opisu albo ze zdjęcia; tekstury i rig z chodem w Assetach 3D (Meshy, za zgodą); 📣 Opublikuj — gra i wizytówka w sieci.</p>
            <div className="flex gap-2">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded border border-slate-800 bg-black/40">
                    {s.najlepsza ? <img src={adresPliku(s.najlepsza.id, 'obraz.png')} alt="" className="h-full w-full object-contain" />
                        : k?.obraz && etap !== 'rysuje' && etap !== 'blad' ? <img src={adresObrazu(k.obraz)} alt="" className="h-full w-full object-contain" />
                            : <div className="flex h-full items-center justify-center text-3xl text-slate-600">🏛️</div>}
                </div>
                <div className="min-w-0 flex-1 space-y-1 text-[11px]">
                    <div className="flex flex-wrap gap-2">
                        <input value={forma.imie} onChange={(e) => setForma({ ...forma, imie: e.target.value })} placeholder="Imię (puste = z księgi GRV)" maxLength={24} className="w-40 rounded border border-slate-700 bg-black/40 px-2 py-0.5 outline-none" />
                        <select value={forma.plec} onChange={(e) => setForma({ ...forma, plec: e.target.value as Forma['plec'] })} className="rounded border border-slate-700 bg-black/40 px-1"><option value="kobieta">♀ kobieta</option><option value="mezczyzna">♂ mężczyzna</option><option value="inna">✦ inna</option></select>
                        <select value={forma.zywiol} onChange={(e) => setForma({ ...forma, zywiol: e.target.value })} className="rounded border border-slate-700 bg-black/40 px-1">{ZYWIOLY.map((z) => <option key={z}>{z}</option>)}</select>
                        <select value={forma.droga} onChange={(e) => setForma({ ...forma, droga: e.target.value })} className="rounded border border-slate-700 bg-black/40 px-1">{DROGI.map((z) => <option key={z}>{z}</option>)}</select>
                    </div>
                    <textarea value={forma.opis} onChange={(e) => setForma({ ...forma, opis: e.target.value })} rows={2} placeholder="Wygląd Twojej postaci: strój, rekwizyt, sylwetka — dwie nogi i A-pozę dokłada Pracownia sama" className="w-full resize-none rounded border border-slate-700 bg-black/40 px-2 py-1 outline-none" />
                    <div className="flex flex-wrap gap-1">
                        {zmieniona && przycisk('karta', k ? '💾 Zapisz kartę' : '💾 Załóż kartę', () => zapiszPostac(forma), k && k.opis !== forma.opis ? 'Nowy wygląd = obraz od nowa (stary zostaje w Pracowni)' : '', true)}
                        {k && !zmieniona && !s.najlepsza && ['pomysl', 'blad', 'obraz'].includes(etap) && przycisk('opis', k.obraz ? '🖼️ Narysuj od nowa' : '🖼️ Z opisu (obraz)', () => postacZOpisu(), 'FLUX.2 lokalnie, styl „Postać do riga”')}
                        {k && !zmieniona && etap === 'obraz' && przycisk('bryla', '🗿 Bryła z obrazu', () => postacBryla(), 'TRELLIS.2 lokalnie')}
                        {k && !zmieniona && !['rysuje', 'rzezbi'].includes(etap) && (
                            <button onClick={() => plik.current?.click()} disabled={!!praca} title="Bryła prosto ze zdjęcia (TRELLIS lokalnie). Pozę do riga da potem Meshy Image-to-3D z A-pozą." className="flex items-center gap-1 rounded-md border border-slate-700 px-2 py-0.5 text-[10px] hover:border-tgs-primary/50 disabled:opacity-40">{praca === 'zdjecie' && <Loader2 size={10} className="animate-spin" />}📷 Ze zdjęcia</button>
                        )}
                        <input ref={plik} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { zdjecie(e.target.files?.[0]); e.target.value = ''; }} />
                        {(etap === 'bryla' || etap === 'tekstury') && (
                            <button onClick={onAssety} disabled={!onAssety} title={`Assety 3D → wersja ${s.najlepsza?.id} → ☁️ Meshy`} className="rounded-md border border-sky-500/40 px-2 py-0.5 text-[10px] text-sky-200">{etap === 'bryla' ? '☁️ tekstury w Assetach 3D →' : '🦴 rig w Assetach 3D →'}</button>
                        )}
                        {s.najlepsza && (etap !== 'opublikowana' || s.nowszaNizWGrze) && przycisk('publikuj', '📣 Opublikuj', () => opublikujPostac(), s.najlepsza.ruchy.includes('chod') ? 'Z chodem (animowany GLB)' : 'Bez riga — w grze stoi i oddycha', true)}
                        {s.opublikowana && przycisk('wycofaj', '✕ wycofaj', () => wycofajPostac(), 'Gra i wizytówka przestają ją pokazywać (bryły zostają)')}
                    </div>
                    <PodpiecieZasobu obraz={k?.obraz ?? null} korzen={k?.korzen ?? null} zajety={!!praca} onPodepnij={(z) => { const opis = forma.opis.trim() ? forma.opis : z.opis ?? ''; setForma({ ...forma, opis }); void zrob('podepnij', () => zapiszPostac({ ...forma, opis, ...(z.obraz !== undefined ? { obraz: z.obraz } : {}), ...(z.korzen !== undefined ? { korzen: z.korzen } : {}) })); }} />
                    {s.blad && <p className="text-[10px] text-amber-300">⚠ {s.blad}</p>}
                    {s.nowszaNizWGrze && <p className="text-[10px] text-sky-300">Jest lepsza wersja niż opublikowana — „Opublikuj” podmieni.</p>}
                    {s.opublikowana && <p className="font-mono text-[9px] text-slate-600">opublikowana {new Date(s.opublikowana.kiedy).toLocaleString('pl-PL')} · {(s.opublikowana.bajtow / 1e6).toFixed(1)} MB{s.opublikowana.ruch ? ' · z chodem' : ''}</p>}
                </div>
            </div>
            {blad && <p className="text-[10px] text-amber-300">⚠ {blad}</p>}
        </section>
    );
}
