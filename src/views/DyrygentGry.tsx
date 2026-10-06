/**
 * 🎼 Dyrygent gry — krok po Reżyserze (Suweren 2026-10-06: „zbudowana z Reżyserem, potem Dyrygent, potem tworzenie”).
 *
 * Dwie rzeczy z mostu, bez zgadywania:
 *   1. SILNIKI do celu „gra” (POST /api/dyrygent/cel): obraz (potrzebny), 3D, muzyka, głos (pomocne) — gotowe, niegotowe
 *      z powodem, kandydaci Zwiadowcy. Sondy niczego nie budzą: śpiący ComfyUI = „nie wiadomo”.
 *   2. MODELE dla grających TeOgochi (Pionek, Kodeks, Paleta) dobrane do wizji z GDD; „Zastosuj” ustawia stałe silniki —
 *      Studio Gier (Kodeks, Reżyser Gry) bierze model Kodeksa z tego przydziału.
 */
import { useEffect, useState } from 'react';
import { Music2, Loader2, RefreshCw, Check, AlertTriangle, HelpCircle } from 'lucide-react';
import { gry as pobierzGry, type ProjektGry } from '../lib/kodeks';
import { wczytajGdd } from '../lib/gdd';
import { celGra, zastosujPrzydzial, type WynikCelu } from '../lib/tworzenie';

const ETYKIETY: Record<string, string> = { obraz: '🖼️ Obraz', '3d': '🗿 Bryły 3D', muzyka: '🎵 Muzyka', glos: '🗣️ Głos', wideo: '🎬 Wideo', usta: '👄 Usta', glebia: '🧊 Głębia', stemy: '🎚️ Stemy', mowa: '📝 Mowa' };

export default function DyrygentGry({ wybranaGra, onGra }: { wybranaGra: string; onGra: (id: string) => void }) {
    const [gry, setGry] = useState<ProjektGry[]>([]);
    const [wynik, setWynik] = useState<WynikCelu | null>(null);
    const [zadanie, setZadanie] = useState('');
    const [praca, setPraca] = useState<'silniki' | 'modele' | 'zastosuj' | null>(null);
    const [blad, setBlad] = useState<string | null>(null);
    const [zastosowano, setZastosowano] = useState<Array<{ agent: string; model: string; ok: true | string }> | null>(null);

    const silniki = async () => { setPraca('silniki'); setBlad(null); try { setWynik(await celGra()); } catch (e) { setBlad((e as Error).message); } finally { setPraca(null); } };
    useEffect(() => { pobierzGry().then(setGry).catch(() => setGry([])); void silniki(); }, []);
    useEffect(() => {
        if (!wybranaGra) return;
        wczytajGdd(wybranaGra).then((d) => { const g = d.gdd; if (g) setZadanie(`${g.tytul}${g.gatunek ? ` (${g.gatunek})` : ''}. ${g.sekcje.wizja}`.slice(0, 1800)); }).catch(() => {});
    }, [wybranaGra]);

    const modele = async () => {
        setPraca('modele'); setBlad(null); setZastosowano(null);
        try { setWynik(await celGra(zadanie)); } catch (e) { setBlad((e as Error).message); } finally { setPraca(null); }
    };
    const zastosuj = async () => {
        if (!wynik?.modele?.przydzial.length) return;
        setPraca('zastosuj'); setBlad(null);
        try { setZastosowano(await zastosujPrzydzial(wynik.modele.przydzial)); } catch (e) { setBlad((e as Error).message); } finally { setPraca(null); }
    };

    return (
        <div className="space-y-4">
            <header className="flex items-center gap-3">
                <Music2 className="text-tgs-primary" size={22} />
                <div>
                    <h2 className="text-lg font-bold">Dyrygent gry</h2>
                    <p className="text-xs text-slate-400">Po GDD: czym Katedra narysuje, wyrzeźbi i nagra tę grę (silniki) i na jakich modelach zagrają TeOgochi od gier. Prawda z mostu — co nie gotowe, mówi dlaczego.</p>
                </div>
                <button onClick={() => void silniki()} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-800" title="Sprawdź silniki"><RefreshCw size={16} className={praca === 'silniki' ? 'animate-spin' : ''} /></button>
            </header>
            {blad && <p className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-2 text-sm text-rose-200">{blad}</p>}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <section className="space-y-2 rounded-xl border border-slate-800 bg-tgs-panel/60 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Silniki do celu „gra”</p>
                    {!wynik && praca === 'silniki' && <Loader2 className="animate-spin text-slate-500" />}
                    {wynik && (
                        <>
                            <p className={`text-sm ${wynik.moznaRuszyc ? 'text-emerald-300' : 'text-amber-300'}`}>{wynik.moznaRuszyc ? '✓ Potrzebne silniki są gotowe.' : `Brakuje: ${wynik.brakuje.map((r) => ETYKIETY[r] ?? r).join(', ')} — bez tego gra nie dostanie obrazów.`}</p>
                            {Object.entries(wynik.rodzaje).map(([r, d]) => (
                                <div key={r} className="rounded-lg border border-slate-800 p-2">
                                    <p className="text-sm font-semibold">{ETYKIETY[r] ?? r} <span className="font-mono text-[10px] text-slate-500">{d.potrzebny ? 'potrzebny' : 'pomocny'}</span></p>
                                    {[...d.gotowe, ...d.niegotowe].map((s) => (
                                        <p key={s.id} className="flex items-start gap-1 text-[11px] text-slate-300">
                                            {s.gotowy ? <Check size={12} className="mt-0.5 text-emerald-400" /> : s.nieWiadomo ? <HelpCircle size={12} className="mt-0.5 text-slate-500" /> : <AlertTriangle size={12} className="mt-0.5 text-amber-400" />}
                                            <span><b>{s.nazwa}</b>{s.licencja ? ` · ${s.licencja}` : ''} — <span className="text-slate-400">{s.powod}</span></span>
                                        </p>
                                    ))}
                                    {d.kandydaci.length > 0 && <p className="mt-1 text-[10px] text-slate-500">Zwiadowca: {d.kandydaci.map((k) => `${k.repo} (${k.stan}${k.komercyjna === false ? ', tylko niekomercyjnie' : ''})`).join(' · ')}</p>}
                                </div>
                            ))}
                        </>
                    )}
                </section>

                <section className="space-y-2 rounded-xl border border-slate-800 bg-tgs-panel/60 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Modele dla TeOgochi od gier</p>
                    <label className="block text-[10px] text-slate-500">Gra (zadanie z wizji GDD)
                        <select value={wybranaGra} onChange={(e) => onGra(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-700 bg-black/40 px-2 py-1 text-xs">
                            <option value="">— wybierz —</option>{gry.map((g) => <option key={g.id} value={g.id}>{g.nazwa}</option>)}
                        </select>
                    </label>
                    <textarea value={zadanie} onChange={(e) => setZadanie(e.target.value)} rows={5} placeholder="Co budujemy — Dyrygent dobierze modele pod to zadanie." className="w-full resize-none rounded-lg border border-slate-700 bg-black/40 px-3 py-2 text-xs outline-none focus:border-tgs-primary/60" />
                    <button onClick={() => void modele()} disabled={!!praca || zadanie.trim().length < 5} className="flex w-full items-center justify-center gap-1 rounded-lg bg-tgs-primary/80 py-2 text-sm font-semibold text-black hover:bg-tgs-primary disabled:opacity-40">{praca === 'modele' ? <Loader2 size={14} className="animate-spin" /> : <Music2 size={14} />} Dobierz modele</button>
                    {wynik?.modeleUwaga && <p className="text-xs text-amber-300">{wynik.modeleUwaga}</p>}
                    {wynik?.modele && (
                        <div className="space-y-1">
                            <p className="text-[10px] text-slate-500">Dyrygent grał na: {wynik.modele.model}</p>
                            {wynik.modele.przydzial.map((p) => <p key={p.agent} className="text-xs"><b>{p.agent}</b> → <span className="font-mono text-tgs-accent">{p.model}</span> <span className="text-slate-400">— {p.powod}</span></p>)}
                            {wynik.modele.odrzucone?.map((o, i) => <p key={i} className="text-[11px] text-rose-300">odrzucone: {o.agent ?? '?'} → {o.model ?? '?'} ({o.powod})</p>)}
                            <button onClick={() => void zastosuj()} disabled={!!praca || !wynik.modele.przydzial.length} className="flex w-full items-center justify-center gap-1 rounded-lg border border-tgs-primary/50 py-2 text-sm text-tgs-primary hover:bg-tgs-primary/10 disabled:opacity-40">{praca === 'zastosuj' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Zastosuj (stałe silniki TeOgochi)</button>
                        </div>
                    )}
                    {zastosowano && <div className="space-y-0.5">{zastosowano.map((z) => <p key={z.agent} className={`text-xs ${z.ok === true ? 'text-emerald-300' : 'text-rose-300'}`}>{z.agent}: {z.ok === true ? `gra teraz na ${z.model}` : z.ok}</p>)}<p className="text-[10px] text-slate-500">Kodeks buduje i Reżyser Gry odpowiada na modelu Kodeksa z tego przydziału.</p></div>}
                </section>
            </div>
        </div>
    );
}
