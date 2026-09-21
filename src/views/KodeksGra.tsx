/**
 * 🎮 KodeksGra — „Kodeks buduje grę" + panel produkcyjny (od 2026-09-21).
 *
 * Trzy kolumny: gry (nowa / wybór) · zlecenie + dziennik pętli na żywo · podgląd gry
 * z mostu, zrzut z testu, ANALIZA („stan gry i jak może się rozwinąć" — kierunki klikalne
 * jako gotowe zlecenia), PANEL PRODUKCYJNY (zlecenia dla Nocnej Zmiany: „rozwiń w nocy",
 * „zrób to w nocy", ich stan i dziennik).
 *
 * Silnik gry: three.js (szablon z mostu, junction do node_modules Games Studio). Pętla:
 * Kodeks pisze → tsc → vite build → puppeteer wciska WSAD/spację i czyta window.__gra →
 * poprawki → commit. Inspiracja godogen: przewodnik silnika + dowód przez uruchomienie.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Hammer, Loader2, Plus, RotateCcw, Trash2, ExternalLink, RefreshCw, Camera, Moon, Search, Play } from 'lucide-react';
import { adresGry, adresZrzutu, analizuj, buduj, cofnij, gry as pobierzGry, nowaGra, projekt as pobierzProjekt, silniki as pobierzSilniki, usunGre, usunNocne, zadaniaNocne, zlecNocnej, type Analiza, type Krok, type Projekt, type ProjektGry, type Silnik, type ZadanieNocne } from '../lib/kodeks';

const KOLOR: Record<string, string> = { model: 'text-cyan-300', postep: 'text-slate-500', pliki: 'text-emerald-300', build: 'text-emerald-300', test: 'text-emerald-300', blad: 'text-rose-300', koniec: 'text-amber-300', start: 'text-slate-400', stan: 'text-slate-400' };

const PRZYKLADY = [
    'Dodaj przeszkody (czerwone bloki) — zderzenie odejmuje 1 GRV i cofa gracza.',
    'Dodaj platformy na różnych wysokościach i skok, po którym gracz ląduje na platformie.',
    'Dodaj timer 60 s i ekran końcowy z wynikiem; R = od nowa.',
];

export default function KodeksGra() {
    const [lista, setLista] = useState<ProjektGry[] | null>(null);
    const [mostOffline, setMostOffline] = useState(false);
    const [wybrany, setWybrany] = useState<Projekt | null>(null);
    const [nazwa, setNazwa] = useState('');
    const [opis, setOpis] = useState('');
    const [zadanie, setZadanie] = useState('');
    const [kroki, setKroki] = useState<Krok[]>([]);
    const [pracuje, setPracuje] = useState(false);
    const [analizaTrwa, setAnalizaTrwa] = useState(false);
    const [t, setT] = useState(Date.now());
    const [blad, setBlad] = useState<string | null>(null);
    const [silniki, setSilniki] = useState<Silnik[]>([]);
    const [silnik, setSilnik] = useState('');
    const [nocne, setNocne] = useState<ZadanieNocne[]>([]);
    const dziennikRef = useRef<HTMLDivElement>(null);

    const odswiezListe = useCallback(async () => {
        try { setLista(await pobierzGry()); setMostOffline(false); } catch { setLista([]); setMostOffline(true); }
    }, []);
    const odswiezProjekt = useCallback(async (id: string) => {
        try {
            const p = await pobierzProjekt(id); setWybrany(p); setT(Date.now()); if (p.zadanieWToku) setPracuje(true);
            try { setNocne((await zadaniaNocne(id)).zadania); } catch { setNocne([]); }
        } catch (e) { setBlad((e as Error).message); }
    }, []);

    useEffect(() => { void odswiezListe(); }, [odswiezListe]);
    useEffect(() => { pobierzSilniki().then((s) => { setSilniki(s); setSilnik((s.find((x) => x.domyslny) ?? s[0])?.model ?? ''); }).catch(() => setSilniki([])); }, []);
    useEffect(() => { dziennikRef.current?.scrollTo({ top: dziennikRef.current.scrollHeight }); }, [kroki]);

    const utworz = async () => {
        setBlad(null);
        try { const p = await nowaGra(nazwa, opis); setNazwa(''); setOpis(''); await odswiezListe(); await odswiezProjekt(p.id); setKroki([]); if (opis.trim()) setZadanie(opis.trim()); }
        catch (e) { setBlad((e as Error).message); }
    };
    const zlec = async (tresc = zadanie) => {
        if (!wybrany || !tresc.trim()) return;
        setPracuje(true); setBlad(null); setKroki([]);
        try {
            await buduj(wybrany.id, tresc.trim(), (k) => {
                setKroki((prev) => k.typ === 'postep' && prev.at(-1)?.typ === 'postep' ? [...prev.slice(0, -1), k] : [...prev, k]);
                if (k.typ === 'test' || k.typ === 'koniec') setT(Date.now());
            }, silnik || undefined);
        } catch (e) { setBlad((e as Error).message); }
        finally { setPracuje(false); if (wybrany) await odswiezProjekt(wybrany.id); await odswiezListe(); }
    };
    const analiza = async () => {
        if (!wybrany) return;
        setAnalizaTrwa(true); setBlad(null);
        try { await analizuj(wybrany.id, silnik || undefined); await odswiezProjekt(wybrany.id); }
        catch (e) { setBlad((e as Error).message); }
        finally { setAnalizaTrwa(false); }
    };
    const doNocnej = async (rodzaj: 'kodeks-rozwin' | 'kodeks-zadanie', tresc?: string) => {
        if (!wybrany) return;
        try { await zlecNocnej(rodzaj, wybrany.id, tresc); setNocne((await zadaniaNocne(wybrany.id)).zadania); }
        catch (e) { setBlad((e as Error).message); }
    };
    const cofnijZmiane = async () => {
        if (!wybrany) return;
        try { const r = await cofnij(wybrany.id); setKroki((p) => [...p, { typ: 'stan', tekst: `↩ cofnięto do ${r.commit}${r.build.ok ? ', dist przebudowany' : ' — build padł: ' + r.build.etap}` }]); await odswiezProjekt(wybrany.id); }
        catch (e) { setBlad((e as Error).message); }
    };
    const usun = async () => {
        if (!wybrany || !window.confirm(`Usunąć grę „${wybrany.nazwa}" razem z kodem? Tego nie da się cofnąć.`)) return;
        try { await usunGre(wybrany.id); setWybrany(null); setKroki([]); await odswiezListe(); } catch (e) { setBlad((e as Error).message); }
    };

    const ostatniaAnaliza: Analiza | undefined = wybrany?.analizy?.at(-1);

    return (
        <div className="space-y-4">
            <header className="flex items-center gap-3">
                <Bot className="text-tgs-primary" size={22} />
                <div>
                    <h2 className="text-lg font-bold">Kodeks buduje grę</h2>
                    <p className="text-xs text-slate-400">three.js · Kodeks pisze → tsc/vite → puppeteer gra WSAD i czyta stan → poprawki → commit. Ty decydujesz, co dalej — albo zostawiasz to Nocnej Zmianie.</p>
                </div>
                <button onClick={odswiezListe} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-800" title="Odśwież"><RefreshCw size={16} /></button>
            </header>

            {mostOffline && <p className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-2 text-sm text-amber-200">Most (:3001) nie odpowiada — Kodeks mieszka w moście. Odpal Katedrę.</p>}
            {blad && <p className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-2 text-sm text-rose-200">{blad}</p>}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr_1fr]">
                {/* GRY */}
                <aside className="space-y-3">
                    <div className="space-y-2 rounded-xl border border-slate-800 bg-tgs-panel/60 p-3">
                        <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500"><Plus size={12} /> Nowa gra</p>
                        <input value={nazwa} onChange={(e) => setNazwa(e.target.value)} placeholder="Nazwa" className="w-full rounded-lg border border-slate-700 bg-black/40 px-3 py-2 text-sm outline-none focus:border-tgs-primary/60" />
                        <textarea value={opis} onChange={(e) => setOpis(e.target.value)} placeholder="O czym jest gra? (pierwsze zlecenie dla Kodeksa)" rows={3} className="w-full resize-none rounded-lg border border-slate-700 bg-black/40 px-3 py-2 text-xs outline-none focus:border-tgs-primary/60" />
                        <button onClick={utworz} disabled={!nazwa.trim() || mostOffline} className="w-full rounded-lg bg-tgs-primary/80 py-2 text-sm font-semibold text-black hover:bg-tgs-primary disabled:opacity-40">Załóż grę</button>
                    </div>
                    <div className="max-h-[50vh] space-y-1 overflow-y-auto rounded-xl border border-slate-800 bg-tgs-panel/60 p-2">
                        {lista === null ? <p className="p-2 text-xs text-slate-500">Łączę z mostem…</p>
                            : lista.length === 0 ? <p className="p-2 text-xs text-slate-500">Jeszcze żadnej gry. Załóż pierwszą.</p>
                                : lista.map((g) => (
                                    <button key={g.id} onClick={() => { void odswiezProjekt(g.id); setKroki([]); }} className={`w-full rounded-lg border px-3 py-2 text-left ${wybrany?.id === g.id ? 'border-tgs-primary/40 bg-slate-800' : 'border-transparent hover:bg-slate-800/60'}`}>
                                        <p className="truncate text-sm font-semibold">🎮 {g.nazwa}</p>
                                        <p className="font-mono text-[10px] text-slate-500">{g.id} · {g.iteracji} iter. · {g.zbudowana ? '✓ zbudowana' : 'szablon'}</p>
                                    </button>
                                ))}
                    </div>
                </aside>

                {/* ZLECENIE + DZIENNIK */}
                <section className="min-w-0 space-y-3">
                    {wybrany ? (
                        <>
                            <div className="space-y-2 rounded-xl border border-slate-800 bg-tgs-panel/60 p-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-bold">{wybrany.nazwa} <span className="font-mono text-[10px] text-slate-500">{wybrany.id}</span></p>
                                    <div className="flex gap-1">
                                        <button onClick={cofnijZmiane} disabled={pracuje || !wybrany.historia.some((h) => h.commit)} className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 disabled:opacity-30" title="Cofnij ostatnią zmianę"><RotateCcw size={16} /></button>
                                        <button onClick={usun} disabled={pracuje} className="rounded-lg p-1.5 text-rose-300 hover:bg-rose-900/40 disabled:opacity-30" title="Usuń grę"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                <textarea value={zadanie} onChange={(e) => setZadanie(e.target.value)} placeholder="Co Kodeks ma dobudować albo zmienić w grze…" rows={4} disabled={pracuje} className="w-full resize-none rounded-lg border border-slate-700 bg-black/40 px-3 py-2 text-sm outline-none focus:border-tgs-primary/60 disabled:opacity-60" />
                                <div className="flex flex-wrap gap-1.5">
                                    {PRZYKLADY.map((p) => <button key={p} onClick={() => setZadanie(p)} disabled={pracuje} className="rounded-md bg-slate-800 px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-700 disabled:opacity-40">{p.slice(0, 52)}…</button>)}
                                </div>
                                {silniki.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-slate-500">Silnik</span>
                                        <select value={silnik} onChange={(e) => setSilnik(e.target.value)} disabled={pracuje} className="flex-1 rounded-lg border border-slate-700 bg-black/40 px-2 py-1.5 text-xs outline-none disabled:opacity-60">
                                            {silniki.map((s) => <option key={s.id} value={s.model} disabled={!s.dostepny}>{s.etykieta}{s.dostepny ? '' : ' — brak klucza'}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <button onClick={() => zlec()} disabled={pracuje || !zadanie.trim()} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-tgs-primary/80 py-2.5 text-sm font-semibold text-black hover:bg-tgs-primary disabled:opacity-40">
                                        {pracuje ? <><Loader2 size={16} className="animate-spin" /> Kodeks pracuje…</> : <><Hammer size={16} /> Zleć teraz</>}
                                    </button>
                                    <button onClick={() => doNocnej('kodeks-zadanie', zadanie.trim())} disabled={pracuje || !zadanie.trim()} title="Dodaj do kolejki Nocnej Zmiany — zrobi to, gdy komputer będzie wolny" className="flex items-center gap-1.5 rounded-lg border border-tgs-accent/40 bg-tgs-accent/10 px-3 text-xs text-slate-200 hover:bg-tgs-accent/20 disabled:opacity-40">
                                        <Moon size={14} /> w nocy
                                    </button>
                                </div>
                                <p className="text-[10px] leading-snug text-slate-500">Na tej maszynie runda Kodeksa (9B) to 4–5 min; gra jest testowana w headless Chrome (WSAD, spacja, odczyt window.__gra).</p>
                            </div>
                            <div ref={dziennikRef} className="h-[34vh] space-y-1 overflow-y-auto rounded-xl border border-slate-800 bg-black/60 p-3 font-mono text-[11px]">
                                {kroki.length === 0 ? <p className="text-slate-600">Dziennik Kodeksa pojawi się po zleceniu.</p>
                                    : kroki.map((k, i) => <p key={i} className={KOLOR[k.typ] ?? 'text-slate-300'}><span className="text-slate-600">{(k.kiedy ?? '').slice(11, 19)}</span> {k.tekst ?? (k.typ === 'start' ? `start · ${k.model}` : k.typ === 'stan' ? `${k.stan}${k.wynik?.powod ? ' — ' + k.wynik.powod : ''}` : JSON.stringify(k))}</p>)}
                            </div>
                        </>
                    ) : <p className="rounded-xl border border-dashed border-slate-800 p-10 text-center text-sm text-slate-500">Wybierz grę albo załóż nową — Kodeks czeka.</p>}
                </section>

                {/* PODGLĄD + ANALIZA + PANEL PRODUKCYJNY */}
                <section className="min-w-0 space-y-3">
                    {wybrany && (
                        <>
                            <div className="overflow-hidden rounded-xl border border-slate-800 bg-tgs-panel/60">
                                <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
                                    <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Gra z mostu</p>
                                    {wybrany.zbudowana && <a href={adresGry(wybrany.id)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-tgs-primary hover:underline"><Play size={12} /> graj w nowej karcie <ExternalLink size={10} /></a>}
                                </div>
                                {wybrany.zbudowana
                                    ? <iframe key={t} src={`${adresGry(wybrany.id)}?t=${t}`} title="Gra" className="h-[36vh] w-full bg-black" />
                                    : <div className="flex h-[36vh] items-center justify-center text-xs text-slate-500">Jeszcze nie zbudowana — po pierwszym zleceniu pojawi się tu.</div>}
                            </div>
                            {wybrany.ostatniZrzut && (
                                <details className="rounded-xl border border-slate-800 bg-tgs-panel/60 p-2">
                                    <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-slate-500"><Camera size={12} className="mr-1 inline" /> Zrzut z testu puppeteera</summary>
                                    <img src={adresZrzutu(wybrany.id, t)} alt="Zrzut z testu" className="mt-2 w-full rounded-lg border border-slate-800" />
                                </details>
                            )}

                            {/* ANALIZA */}
                            <div className="space-y-2 rounded-xl border border-slate-800 bg-tgs-panel/60 p-3">
                                <div className="flex items-center justify-between">
                                    <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Stan gry i kierunki rozwoju</p>
                                    <button onClick={analiza} disabled={analizaTrwa || pracuje} className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] hover:bg-slate-700 disabled:opacity-40">
                                        {analizaTrwa ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />} {ostatniaAnaliza ? 'Analizuj ponownie' : 'Analizuj'}
                                    </button>
                                </div>
                                {ostatniaAnaliza ? (
                                    <div className="space-y-2 text-[12px]">
                                        <p className="text-slate-200">{ostatniaAnaliza.stan}</p>
                                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                                            <div><p className="text-emerald-400">Działa</p><ul className="list-disc pl-4 text-slate-300">{ostatniaAnaliza.dziala.map((d, i) => <li key={i}>{d}</li>)}</ul></div>
                                            <div><p className="text-rose-400">Brakuje</p><ul className="list-disc pl-4 text-slate-300">{ostatniaAnaliza.brakuje.map((d, i) => <li key={i}>{d}</li>)}</ul></div>
                                        </div>
                                        <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Kierunki — kliknij, żeby wstawić jako zlecenie</p>
                                        <ul className="space-y-1">
                                            {ostatniaAnaliza.kierunki.map((k, i) => (
                                                <li key={i}>
                                                    <button onClick={() => setZadanie(k.zadanie)} className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-left hover:border-tgs-primary/40">
                                                        <p className="text-[12px] font-semibold text-slate-100">{k.tytul}</p>
                                                        <p className="text-[11px] text-slate-400">{k.opis}</p>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                        <p className="text-[10px] text-slate-500">Analiza z {ostatniaAnaliza.kiedy.slice(0, 16).replace('T', ' ')} · {ostatniaAnaliza.model}</p>
                                    </div>
                                ) : <p className="text-[11px] text-slate-500">Kodeks (z kartą Reżysera) przeczyta kod i historię, powie, co działa, co kuleje i jak grę rozwinąć — z gotowymi zleceniami.</p>}
                            </div>

                            {/* PANEL PRODUKCYJNY */}
                            <div className="space-y-2 rounded-xl border border-tgs-accent/30 bg-tgs-accent/5 p-3">
                                <div className="flex items-center justify-between">
                                    <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-400"><Moon size={12} /> Panel produkcyjny — Nocna Zmiana</p>
                                    <button onClick={() => doNocnej('kodeks-rozwin')} disabled={pracuje} className="rounded-lg bg-tgs-accent/30 px-2.5 py-1 text-[11px] text-slate-100 hover:bg-tgs-accent/50 disabled:opacity-40">+ Rozwiń w nocy</button>
                                </div>
                                <p className="text-[10px] leading-snug text-slate-500">„Rozwiń w nocy" = analiza (jeśli nie ma świeżej) + następne zadanie z niej, zrobione, gdy komputer jest wolny. „w nocy" przy zleceniu = konkretne zadanie do kolejki. Stan i wyniki są też w karcie Nocnej Zmiany w Katedrze.</p>
                                {nocne.length ? (
                                    <ul className="space-y-1">
                                        {nocne.map((z) => (
                                            <li key={z.id} className="flex items-center gap-2 rounded-lg bg-black/40 px-2 py-1.5 text-[11px]">
                                                <span className={`font-mono ${z.stan === 'gotowe' ? 'text-emerald-400' : z.stan === 'blad' ? 'text-rose-400' : z.stan === 'trwa' ? 'text-cyan-300' : 'text-slate-400'}`}>{z.stan}</span>
                                                <span className="truncate text-slate-300">{z.rodzaj === 'kodeks-rozwin' ? 'rozwiń (analiza + krok)' : String((z.parametry as { zadanie?: string }).zadanie ?? '').slice(0, 80)}</span>
                                                {z.blad && <span className="truncate text-rose-300" title={z.blad}>{z.blad.slice(0, 60)}</span>}
                                                {z.stan !== 'trwa' && <button onClick={async () => { await usunNocne(z.id); setNocne((await zadaniaNocne(wybrany.id)).zadania); }} className="ml-auto text-slate-500 hover:text-rose-300" title="Usuń z kolejki"><Trash2 size={12} /></button>}
                                            </li>
                                        ))}
                                    </ul>
                                ) : <p className="text-[11px] text-slate-500">Brak zleceń nocnych dla tej gry.</p>}
                            </div>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}
