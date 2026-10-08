/**
 * 🖼️ Pracownia obrazów (i Krajobrazy) — etap tworzenia po Reżyserze i Dyrygencie.
 *
 * Suweren 2026-10-06: „przydałby się taki generator, co generuje takie zdjęcia, a potem z nich modele 3D… i żeby miały
 * propozycje przypisane do gałęzi kategorii świata gry”. Gałęzie bierzemy z GDD wybranej gry (Teterhia ma 7), każda
 * propozycja ma opis i styl. Obraz rysuje FLUX.2 klein na moście; „🗿 Do 3D” robi bryłę: styl „jeden obiekt” w całości,
 * koncepty (zestaw, karta postaci, kraina) — tylko z WYCINKA zaznaczonego myszą (cały arkusz = bryła-kolaż).
 * `tryb="krajobraz"` = zakładka Krajobrazy: tylko styl kraina i gałąź krain; do 3D się nie idzie (teren gry liczy Kodeks z ziarna).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, RefreshCw, Trash2, Wand2, Box, Mountain, Crop, X } from 'lucide-react';
import { gry as pobierzGry, type ProjektGry } from '../lib/kodeks';
import { adresObrazu, brylaZObrazu, galezieProjektu, narysuj, obrazy as pobierzObrazy, usunObraz, type Galaz, type ObrazGry, type StylInfo, type StylObrazu, type Wycinek, type ZadanieObrazu } from '../lib/tworzenie';

/** Zaznaczanie wycinka myszą na obrazie — ułamki 0–1 względem obrazu. */
export function ZaznaczWycinek({ src, wycinek, onZmiana }: { src: string; wycinek: Wycinek | null; onZmiana: (w: Wycinek | null) => void }) {
    const ref = useRef<HTMLDivElement>(null);
    const start = useRef<{ x: number; y: number } | null>(null);
    const pkt = (e: React.PointerEvent) => {
        const r = ref.current!.getBoundingClientRect();
        return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
    };
    return (
        <div ref={ref} className="relative cursor-crosshair select-none touch-none overflow-hidden rounded-lg border border-slate-700"
            onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); start.current = pkt(e); onZmiana(null); }}
            onPointerMove={(e) => { if (!start.current) return; const p = pkt(e), s = start.current; onZmiana({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) }); }}
            onPointerUp={() => { start.current = null; if (wycinek && (wycinek.w < 0.03 || wycinek.h < 0.03)) onZmiana(null); }}>
            <img src={src} alt="" draggable={false} className="block w-full" />
            {wycinek && <div className="pointer-events-none absolute border-2 border-tgs-primary bg-tgs-primary/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" style={{ left: `${wycinek.x * 100}%`, top: `${wycinek.y * 100}%`, width: `${wycinek.w * 100}%`, height: `${wycinek.h * 100}%` }} />}
        </div>
    );
}

export default function PracowniaObrazow({ tryb = 'obrazy', wybranaGra, onGra }: { tryb?: 'obrazy' | 'krajobraz'; wybranaGra: string; onGra: (id: string) => void }) {
    const krajobraz = tryb === 'krajobraz';
    const [gry, setGry] = useState<ProjektGry[]>([]);
    const [galezie, setGalezie] = useState<Galaz[]>([]);
    const [galaz, setGalaz] = useState<string>('');
    const [lista, setLista] = useState<ObrazGry[]>([]);
    const [style, setStyle] = useState<Record<string, StylInfo>>({});
    const [zadania, setZadania] = useState<ZadanieObrazu[]>([]);
    const [opis, setOpis] = useState('');
    const [styl, setStyl] = useState<StylObrazu>(krajobraz ? 'krajobraz' : 'pojedynczy');
    const [wybrany, setWybrany] = useState<ObrazGry | null>(null);
    const [wycinek, setWycinek] = useState<Wycinek | null>(null);
    const [blad, setBlad] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [praca, setPraca] = useState(false);

    const odswiez = useCallback(async () => {
        try { const d = await pobierzObrazy(); setLista(d.obrazy); setStyle(d.style); setZadania(d.zadania); setWybrany((w) => (w ? d.obrazy.find((o) => o.id === w.id) ?? null : w)); }
        catch (e) { setBlad((e as Error).message); }
    }, []);
    useEffect(() => { void odswiez(); pobierzGry().then(setGry).catch(() => setGry([])); }, [odswiez]);
    // 🧱 Z Reżysera („czeka na klocek”): gotowy opis do narysowania albo obraz, z którego trzeba zrobić bryłę.
    const [doWskazania, setDoWskazania] = useState<string | null>(null);
    useEffect(() => {
        if (krajobraz) return;
        try {
            const d = JSON.parse(localStorage.getItem('tgs_do_pracowni') || 'null') as { opis?: string; obraz?: string } | null;
            localStorage.removeItem('tgs_do_pracowni');
            if (d?.opis) { setOpis(d.opis); setInfo('🧱 Klocek dla Reżysera: opis już wpisany — wybierz styl (pojedynczy = jeden obiekt do 3D) i „Rysuj”.'); }
            if (d?.obraz) setDoWskazania(d.obraz);
        } catch { /* bez pamięci */ }
    }, [krajobraz]);
    useEffect(() => {
        if (!doWskazania) return;
        const o = lista.find((x) => x.id === doWskazania);
        if (!o) return;
        setGalaz(''); setWybrany(o); setDoWskazania(null);
        setInfo('🧱 Klocek dla Reżysera: ten obraz czeka na bryłę — „Do 3D” (karta postaci / zestaw: najpierw zaznacz jeden obiekt).');
    }, [doWskazania, lista]);
    useEffect(() => {
        if (!wybranaGra) { setGalezie([]); return; }
        galezieProjektu(wybranaGra).then((g) => { setGalezie(g); setGalaz((obecna) => obecna || (krajobraz ? g.find((x) => x.id === 'krainy')?.id ?? '' : '')); }).catch(() => setGalezie([]));
    }, [wybranaGra, krajobraz]);
    const trwa = zadania.some((z) => z.stan === 'trwa') || lista.some((o) => o.stan === 'trwa');
    useEffect(() => { if (!trwa) return; const t = setInterval(() => void odswiez(), 5000); return () => clearInterval(t); }, [trwa, odswiez]);

    const biezacaGalaz = galezie.find((g) => g.id === galaz) ?? null;
    const propozycje = (biezacaGalaz?.propozycje ?? []).filter((p) => !krajobraz || p.styl === 'krajobraz');
    const widoczne = lista.filter((o) => (krajobraz ? o.styl === 'krajobraz' : o.styl !== 'krajobraz') && (!galaz || o.galaz === galaz));

    const rysuj = async () => {
        setBlad(null); setPraca(true);
        try { await narysuj({ opis, styl, galaz: galaz || null, projekt: wybranaGra || null }); setOpis(''); await odswiez(); }
        catch (e) { setBlad((e as Error).message); } finally { setPraca(false); }
    };
    const doBryly = async (o: ObrazGry) => {
        setBlad(null);
        if (!o.do3d && !wycinek) { setBlad('To koncept — zaznacz myszą na obrazie JEDEN obiekt (np. złożoną postać), z całego arkusza wyjdzie bryła-kolaż.'); return; }
        try { const w = await brylaZObrazu({ zObrazu: o.id, wycinek, projekt: null }); setInfo(`🗿 Bryła „${w.asset}” liczy się w Assetach 3D (TRELLIS.2, kilka minut). Potem zakładka Ruch.`); setWycinek(null); }
        catch (e) { setBlad((e as Error).message); }
    };
    const usun = async (o: ObrazGry) => { if (!window.confirm('Usunąć obraz z Pracowni? (bryły z niego zostają)')) return; try { await usunObraz(o.id); if (wybrany?.id === o.id) setWybrany(null); await odswiez(); } catch (e) { setBlad((e as Error).message); } };

    const Ikona = krajobraz ? Mountain : ImageIcon;
    return (
        <div className="space-y-4">
            <header className="flex items-center gap-3">
                <Ikona className="text-tgs-primary" size={22} />
                <div>
                    <h2 className="text-lg font-bold">{krajobraz ? 'Krajobrazy — krainy świata' : 'Pracownia obrazów'}</h2>
                    <p className="text-xs text-slate-400">{krajobraz
                        ? 'Koncepty krain (biomów) z gałęzi „Krainy” GDD — klimat, paleta i światło dla Kodeksa. Teren gry liczy się z ziarna Teterhii; do 3D krajobraz nie idzie.'
                        : 'Opis albo propozycja z gałęzi świata → obraz (FLUX.2 klein, lokalnie) → „Do 3D”. Jeden obiekt idzie w całości; zestaw modelarski i karta postaci — przez wycinek.'}</p>
                </div>
                <button onClick={() => void odswiez()} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-800" title="Odśwież"><RefreshCw size={16} /></button>
            </header>
            {blad && <p className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-2 text-sm text-rose-200">{blad}</p>}
            {info && <p className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-4 py-2 text-sm text-emerald-200">{info} <button onClick={() => setInfo(null)} className="ml-2 text-emerald-400/70">✕</button></p>}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr_380px]">
                <aside className="space-y-3">
                    <div className="space-y-2 rounded-xl border border-slate-800 bg-tgs-panel/60 p-3">
                        <label className="block text-[10px] text-slate-500">Gra (gałęzie z jej GDD)
                            <select value={wybranaGra} onChange={(e) => { onGra(e.target.value); setGalaz(''); }} className="mt-0.5 w-full rounded-lg border border-slate-700 bg-black/40 px-2 py-1 text-xs">
                                <option value="">— bez gry —</option>{gry.map((g) => <option key={g.id} value={g.id}>{g.nazwa}</option>)}
                            </select>
                        </label>
                        {wybranaGra && !galezie.length && <p className="text-[10px] text-amber-300/80">Ta gra nie ma gałęzi świata w GDD. Teterhia ma je w scenariuszu (GDD i Reżyser → „Teterhia — Wieczna Saga”).</p>}
                        {galezie.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {galezie.filter((g) => !krajobraz || g.propozycje.some((p) => p.styl === 'krajobraz')).map((g) => (
                                    <button key={g.id} onClick={() => setGalaz(galaz === g.id ? '' : g.id)} title={g.opis} className={`rounded-full border px-2 py-0.5 text-[11px] ${galaz === g.id ? 'border-tgs-primary/60 bg-tgs-primary/15 text-tgs-primary' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}>{g.nazwa}</button>
                                ))}
                            </div>
                        )}
                        {propozycje.length > 0 && (
                            <div className="space-y-1">
                                <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Propozycje gałęzi</p>
                                {propozycje.map((p, i) => (
                                    <button key={i} onClick={() => { setOpis(p.opis); setStyl(p.styl); }} className="block w-full rounded-lg border border-slate-800 px-2 py-1 text-left text-[11px] text-slate-300 hover:border-tgs-primary/40">
                                        <span className="mr-1 font-mono text-[9px] text-tgs-accent">{style[p.styl]?.nazwa ?? p.styl}</span>{p.opis}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="space-y-2 rounded-xl border border-slate-800 bg-tgs-panel/60 p-3">
                        <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500"><Wand2 size={12} /> Nowy obraz</p>
                        <textarea value={opis} onChange={(e) => setOpis(e.target.value)} rows={4} placeholder={krajobraz ? 'Kraina po polsku, np. „dolina strumieni o świcie, mgła nad zatokami”' : 'Opis po polsku, np. „DJ w tech-wear z maską i neonowymi słuchawkami”'} className="w-full resize-none rounded-lg border border-slate-700 bg-black/40 px-3 py-2 text-xs outline-none focus:border-tgs-primary/60" />
                        {!krajobraz && (
                            <label className="block text-[10px] text-slate-500">Styl
                                <select value={styl} onChange={(e) => setStyl(e.target.value as StylObrazu)} className="mt-0.5 w-full rounded-lg border border-slate-700 bg-black/40 px-2 py-1 text-xs">
                                    {Object.entries(style).filter(([k]) => k !== 'krajobraz').map(([k, s]) => <option key={k} value={k}>{s.nazwa}</option>)}
                                </select>
                            </label>
                        )}
                        <button onClick={() => void rysuj()} disabled={praca || trwa || opis.trim().length < 3} className="flex w-full items-center justify-center gap-1 rounded-lg bg-tgs-primary/80 py-2 text-sm font-semibold text-black hover:bg-tgs-primary disabled:opacity-40">{praca ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Narysuj</button>
                        <p className="text-[10px] leading-snug text-slate-500">Jedno zadanie GPU naraz (wspólna kolejka z bryłami 3D). ~1 min na 6 GB VRAM, gdy karta jest wolna.</p>
                    </div>
                </aside>

                <section className="min-w-0">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {!widoczne.length && <p className="col-span-full rounded-xl border border-slate-800 bg-tgs-panel/60 p-6 text-center text-sm text-slate-500">{galaz ? 'W tej gałęzi jeszcze nic. Kliknij propozycję i „Narysuj”.' : 'Pusto. Wybierz grę i gałąź świata albo opisz własny obraz.'}</p>}
                        {widoczne.map((o) => (
                            <div key={o.id} onClick={() => { setWybrany(o); setWycinek(null); }} className={`cursor-pointer space-y-1 rounded-xl border p-2 ${wybrany?.id === o.id ? 'border-tgs-primary/50 bg-slate-800' : 'border-slate-800 bg-tgs-panel/60 hover:border-slate-600'}`}>
                                <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-black/40">
                                    {o.stan === 'trwa' ? <Loader2 className="animate-spin text-slate-500" /> : o.stan === 'blad' ? <p className="p-2 text-[10px] text-rose-300">{o.blad}</p> : <img src={adresObrazu(o.id)} alt={o.opis} className="h-full w-full object-contain" />}
                                </div>
                                <p className="line-clamp-2 text-[11px] text-slate-300">{o.opis}</p>
                                <p className="flex items-center gap-1 font-mono text-[10px] text-slate-500">{style[o.styl]?.nazwa ?? o.styl}{o.galaz ? ` · ${galezie.find((g) => g.id === o.galaz)?.nazwa ?? o.galaz}` : ''}{o.czas ? ` · ${o.czas} s` : ''}{o.bryly?.length ? ` · brył: ${o.bryly.length}` : ''}
                                    <button onClick={(e) => { e.stopPropagation(); void usun(o); }} className="ml-auto rounded p-0.5 hover:text-rose-300" title="Usuń"><Trash2 size={12} /></button>
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                <aside className="space-y-2">
                    {!wybrany && <p className="rounded-xl border border-slate-800 bg-tgs-panel/60 p-4 text-xs text-slate-500">Wybierz obraz, żeby go obejrzeć{krajobraz ? '.' : ' i zrobić z niego bryłę.'}</p>}
                    {wybrany?.stan === 'gotowe' && (
                        <>
                            {krajobraz ? <img src={adresObrazu(wybrany.id)} alt="" className="w-full rounded-lg border border-slate-700" /> : <ZaznaczWycinek src={adresObrazu(wybrany.id)} wycinek={wycinek} onZmiana={setWycinek} />}
                            {!krajobraz && (
                                <div className="space-y-1">
                                    <p className="flex items-center gap-1 text-[11px] text-slate-400"><Crop size={12} /> {wycinek ? `wycinek ${Math.round(wycinek.w * 100)}% × ${Math.round(wycinek.h * 100)}%` : wybrany.do3d ? 'cały obraz (albo zaznacz myszą wycinek)' : 'zaznacz myszą JEDEN obiekt'}
                                        {wycinek && <button onClick={() => setWycinek(null)} className="ml-auto rounded p-0.5 hover:text-rose-300" title="Wyczyść"><X size={12} /></button>}
                                    </p>
                                    <button onClick={() => void doBryly(wybrany)} disabled={!wybrany.do3d && !wycinek} className="flex w-full items-center justify-center gap-1 rounded-lg border border-tgs-primary/50 py-2 text-sm text-tgs-primary hover:bg-tgs-primary/10 disabled:opacity-40"><Box size={14} /> Do 3D</button>
                                </div>
                            )}
                            {wybrany.promptObrazu && <p className="text-[10px] leading-snug text-slate-500">prompt: {wybrany.promptObrazu}</p>}
                        </>
                    )}
                </aside>
            </div>
        </div>
    );
}
