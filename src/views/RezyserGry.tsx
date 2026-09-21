/**
 * 📜 RezyserGry — GDD + Reżyser Gry + silnik (od 2026-09-21).
 *
 * Na wzór modułu opowieści z TeO Story: po lewej gry i USTAWIENIA (silnik, na którym
 * Katedra buduje — dziś naprawdę tylko three.js; reszta to plany), w środku GDD
 * (sekcje jak w definicji: wizja · mechanika · fabuła · postacie · wizual · audio · technika,
 * import z PDF/tekstu, plan = kamienie milowe z zadaniami dla Kodeksa, „Realizuj plan"),
 * po prawej ROZMOWA Z REŻYSEREM GRY (kotwica = GDD; jego PROPOZYCJA_GDD można wpisać
 * jednym kliknięciem). Cała logika mieszka w moście (services/Gdd.js).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Clapperboard, FileUp, Loader2, ListChecks, Play, RefreshCw, Save, Send, Square, Cpu, Check } from 'lucide-react';
import { gry as pobierzGry, silniki as pobierzModele, type ProjektGry, type Silnik } from '../lib/kodeks';
import { SEKCJE, importujPlik, importujTekst, planGdd, produkcjaGdd, przerwijGdd, realizujGdd, rozmowaGdd, silnikiGdd, wczytajGdd, zapiszGdd, type Gdd, type Produkcja, type Propozycja, type Sekcja, type SilnikGry, type WpisRozmowy } from '../lib/gdd';

const STAN_ZADANIA: Record<string, string> = { czeka: 'text-slate-500', trwa: 'text-cyan-300', gotowe: 'text-emerald-300', blad: 'text-rose-300', pominiete: 'text-slate-600 line-through' };
const ZNAK: Record<string, string> = { czeka: '○', trwa: '◐', gotowe: '●', blad: '✗', pominiete: '–' };

export default function RezyserGry() {
    const [lista, setLista] = useState<ProjektGry[] | null>(null);
    const [mostOffline, setMostOffline] = useState(false);
    const [wybrany, setWybrany] = useState<string | null>(null);
    const [gdd, setGdd] = useState<Gdd | null>(null);
    const [brudne, setBrudne] = useState(false);
    const [produkcja, setProdukcja] = useState<Produkcja | null>(null);
    const [silniki, setSilniki] = useState<Record<string, SilnikGry>>({});
    const [modele, setModele] = useState<Silnik[]>([]);
    const [model, setModel] = useState('');
    const [praca, setPraca] = useState<string | null>(null);   // 'import' | 'plan' | 'rozmowa' | 'zapis'
    const [blad, setBlad] = useState<string | null>(null);
    const [tekstImportu, setTekstImportu] = useState('');
    const [pokazImport, setPokazImport] = useState(false);
    const [wypowiedz, setWypowiedz] = useState('');
    const [rozmowa, setRozmowa] = useState<WpisRozmowy[]>([]);
    const [propozycja, setPropozycja] = useState<Propozycja | null>(null);
    const plikRef = useRef<HTMLInputElement>(null);
    const rozmowaRef = useRef<HTMLDivElement>(null);

    const odswiezListe = useCallback(async () => {
        try { setLista(await pobierzGry()); setMostOffline(false); } catch { setLista([]); setMostOffline(true); }
    }, []);
    const wczytaj = useCallback(async (id: string) => {
        setBlad(null);
        try {
            const d = await wczytajGdd(id);
            setWybrany(id); setGdd(d.gdd ?? pusteGdd()); setProdukcja(d.produkcja); setBrudne(false);
            setRozmowa(d.gdd?.historia ?? []); setPropozycja(null);
        } catch (e) { setBlad((e as Error).message); }
    }, []);

    useEffect(() => { void odswiezListe(); }, [odswiezListe]);
    useEffect(() => { silnikiGdd().then(setSilniki).catch(() => setSilniki({})); pobierzModele().then((s) => { setModele(s); setModel((s.find((x) => x.domyslny) ?? s[0])?.model ?? ''); }).catch(() => setModele([])); }, []);
    useEffect(() => { rozmowaRef.current?.scrollTo({ top: rozmowaRef.current.scrollHeight }); }, [rozmowa, praca]);
    // Produkcja w tle: dopóki trwa, pytamy most co 10 s (zadania Kodeksa trwają minuty).
    useEffect(() => {
        if (!wybrany || produkcja?.stan !== 'trwa') return;
        const t = setInterval(async () => {
            try { const p = await produkcjaGdd(wybrany); setProdukcja(p); if (p?.stan !== 'trwa') { const d = await wczytajGdd(wybrany); if (d.gdd) { setGdd(d.gdd); setBrudne(false); } } else { const d = await wczytajGdd(wybrany); if (d.gdd && !brudne) setGdd(d.gdd); } } catch { /* most chwilowo nie odpowiada */ }
        }, 10_000);
        return () => clearInterval(t);
    }, [wybrany, produkcja?.stan, brudne]);

    const zmien = (zmiana: Partial<Gdd>) => { setGdd((g) => g ? { ...g, ...zmiana } : g); setBrudne(true); };
    const zmienSekcje = (s: Sekcja, tresc: string) => { setGdd((g) => g ? { ...g, sekcje: { ...g.sekcje, [s]: tresc } } : g); setBrudne(true); };

    const zapisz = async () => {
        if (!wybrany || !gdd) return;
        setPraca('zapis'); setBlad(null);
        try { setGdd(await zapiszGdd(wybrany, gdd)); setBrudne(false); } catch (e) { setBlad((e as Error).message); } finally { setPraca(null); }
    };
    const importuj = async (plik?: File) => {
        if (!wybrany || !gdd) return;
        if (!plik && tekstImportu.trim().length < 100) { setBlad('Wklej co najmniej 100 znaków albo wybierz PDF.'); return; }
        setPraca('import'); setBlad(null);
        try {
            const g = plik ? await importujPlik(wybrany, plik, gdd.silnik, model || undefined) : await importujTekst(wybrany, tekstImportu, gdd.silnik, model || undefined);
            setGdd(g); setBrudne(false); setPokazImport(false); setTekstImportu('');
        } catch (e) { setBlad((e as Error).message); } finally { setPraca(null); if (plikRef.current) plikRef.current.value = ''; }
    };
    const plan = async (odNowa: boolean) => {
        if (!wybrany) return;
        if (brudne) await zapisz();
        setPraca('plan'); setBlad(null);
        try { setGdd(await planGdd(wybrany, odNowa, model || undefined)); setBrudne(false); } catch (e) { setBlad((e as Error).message); } finally { setPraca(null); }
    };
    const realizuj = async (kamien?: string) => {
        if (!wybrany) return;
        if (brudne) await zapisz();
        setBlad(null);
        try { await realizujGdd(wybrany, kamien, model || undefined); setProdukcja(await produkcjaGdd(wybrany)); } catch (e) { setBlad((e as Error).message); }
    };
    const przerwij = async () => { if (wybrany) { try { await przerwijGdd(wybrany); } catch (e) { setBlad((e as Error).message); } } };
    const powiedz = async () => {
        if (!wybrany || !wypowiedz.trim() || praca) return;
        const tresc = wypowiedz.trim(); setWypowiedz(''); setPraca('rozmowa'); setBlad(null); setPropozycja(null);
        const historia = [...rozmowa, { kiedy: new Date().toISOString(), kto: 'suweren' as const, tresc }];
        setRozmowa(historia);
        try {
            const r = await rozmowaGdd(wybrany, tresc, rozmowa, model || undefined);
            setRozmowa([...historia, { kiedy: new Date().toISOString(), kto: 'rezyser', tresc: r.odpowiedz }]);
            if (r.propozycja && (r.propozycja.sekcje || r.propozycja.tytul)) setPropozycja(r.propozycja);
        } catch (e) { setBlad((e as Error).message); } finally { setPraca(null); }
    };
    const wpiszPropozycje = () => {
        if (!propozycja || !gdd) return;
        const sekcje = { ...gdd.sekcje };
        for (const [k, v] of Object.entries(propozycja.sekcje ?? {})) if (typeof v === 'string' && v.trim()) sekcje[k as Sekcja] = v;
        zmien({ sekcje, ...(propozycja.tytul ? { tytul: propozycja.tytul } : {}), ...(propozycja.gatunek ? { gatunek: propozycja.gatunek } : {}), ...(propozycja.perspektywa ? { perspektywa: propozycja.perspektywa } : {}) });
        setPropozycja(null);
    };
    const ustawStanZadania = (kmId: string, zdId: string, stan: 'czeka' | 'pominiete') => {
        if (!gdd) return;
        zmien({ kamienie: gdd.kamienie.map((k) => k.id !== kmId ? k : { ...k, zadania: k.zadania.map((z) => z.id === zdId ? { ...z, stan } : z) }) });
    };

    const razem = gdd?.kamienie.reduce((s, k) => s + k.zadania.length, 0) ?? 0;
    const gotowe = gdd?.kamienie.reduce((s, k) => s + k.zadania.filter((z) => z.stan === 'gotowe').length, 0) ?? 0;
    const czeka = gdd?.kamienie.reduce((s, k) => s + k.zadania.filter((z) => z.stan === 'czeka' || z.stan === 'blad').length, 0) ?? 0;

    return (
        <div className="space-y-4">
            <header className="flex items-center gap-3">
                <Clapperboard className="text-tgs-primary" size={22} />
                <div>
                    <h2 className="text-lg font-bold">GDD i Reżyser Gry</h2>
                    <p className="text-xs text-slate-400">Dokument projektu gry: sekcje → plan (kamienie milowe) → „Realizuj plan" oddaje zadania Kodeksowi po kolei. Reżyser Gry pilnuje GDD i proponuje zmiany.</p>
                </div>
                <button onClick={odswiezListe} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-800" title="Odśwież"><RefreshCw size={16} /></button>
            </header>

            {mostOffline && <p className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-2 text-sm text-amber-200">Most (:3001) nie odpowiada — GDD i Reżyser mieszkają w moście. Odpal Katedrę.</p>}
            {blad && <p className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-2 text-sm text-rose-200">{blad}</p>}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr_340px]">
                {/* GRY + USTAWIENIA */}
                <aside className="space-y-3">
                    <div className="max-h-[40vh] space-y-1 overflow-y-auto rounded-xl border border-slate-800 bg-tgs-panel/60 p-2">
                        <p className="px-1 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">Gry (z „Kodeks buduje")</p>
                        {lista === null ? <p className="p-2 text-xs text-slate-500">Łączę z mostem…</p>
                            : lista.length === 0 ? <p className="p-2 text-xs text-slate-500">Brak gier. Załóż w „Kodeks buduje".</p>
                                : lista.map((g) => (
                                    <button key={g.id} onClick={() => void wczytaj(g.id)} className={`w-full rounded-lg border px-3 py-2 text-left ${wybrany === g.id ? 'border-tgs-primary/40 bg-slate-800' : 'border-transparent hover:bg-slate-800/60'}`}>
                                        <p className="truncate text-sm font-semibold">🎮 {g.nazwa}</p>
                                        <p className="font-mono text-[10px] text-slate-500">{g.id}</p>
                                    </button>
                                ))}
                    </div>
                    <div className="space-y-2 rounded-xl border border-slate-800 bg-tgs-panel/60 p-3">
                        <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500"><Cpu size={12} /> Silnik gry</p>
                        <select value={gdd?.silnik ?? 'three'} disabled={!gdd} onChange={(e) => zmien({ silnik: e.target.value })} className="w-full rounded-lg border border-slate-700 bg-black/40 px-2 py-1.5 text-xs outline-none focus:border-tgs-primary/60 disabled:opacity-50">
                            {Object.entries(silniki).map(([id, s]) => <option key={id} value={id} disabled={!s.dostepny}>{s.etykieta}{s.dostepny ? '' : ' (plan)'}</option>)}
                        </select>
                        {gdd && silniki[gdd.silnik] && <p className="text-[10px] leading-snug text-slate-500">{silniki[gdd.silnik].uwaga}</p>}
                        <p className="flex items-center gap-1.5 pt-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">Model (Reżyser i Kodeks)</p>
                        <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-black/40 px-2 py-1.5 text-xs outline-none focus:border-tgs-primary/60">
                            {modele.map((m) => <option key={m.id} value={m.model} disabled={!m.dostepny}>{m.etykieta}{m.domyslny ? ' (domyślny)' : ''}{m.dostepny ? '' : ' — brak klucza'}</option>)}
                        </select>
                        <p className="text-[10px] leading-snug text-slate-500">Domyślnie lokalnie. Chmura tylko gdy sam ją wybierzesz i jest klucz w Kiblu.</p>
                    </div>
                </aside>

                {/* GDD */}
                <section className="min-w-0 space-y-3">
                    {!gdd ? <p className="rounded-xl border border-slate-800 bg-tgs-panel/60 p-6 text-center text-sm text-slate-500">Wybierz grę — GDD powstaje w jej katalogu (gdd.json).</p> : (
                        <>
                            <div className="space-y-2 rounded-xl border border-slate-800 bg-tgs-panel/60 p-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <input value={gdd.tytul} onChange={(e) => zmien({ tytul: e.target.value })} placeholder="Tytuł gry" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-black/40 px-3 py-2 text-sm font-semibold outline-none focus:border-tgs-primary/60" />
                                    <button onClick={() => setPokazImport((v) => !v)} className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs hover:border-tgs-primary/40"><FileUp size={14} /> Import</button>
                                    <button onClick={zapisz} disabled={!brudne || !!praca} className="flex items-center gap-1 rounded-lg bg-tgs-primary/80 px-3 py-2 text-xs font-semibold text-black hover:bg-tgs-primary disabled:opacity-40">{praca === 'zapis' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Zapisz</button>
                                </div>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                    <input value={gdd.gatunek} onChange={(e) => zmien({ gatunek: e.target.value })} placeholder="Gatunek (np. ARPG)" className="rounded-lg border border-slate-700 bg-black/40 px-3 py-1.5 text-xs outline-none focus:border-tgs-primary/60" />
                                    <input value={gdd.perspektywa} onChange={(e) => zmien({ perspektywa: e.target.value })} placeholder="Perspektywa (izometria, FPP…)" className="rounded-lg border border-slate-700 bg-black/40 px-3 py-1.5 text-xs outline-none focus:border-tgs-primary/60" />
                                    <input value={gdd.platformy.join(', ')} onChange={(e) => zmien({ platformy: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="Platformy" className="rounded-lg border border-slate-700 bg-black/40 px-3 py-1.5 text-xs outline-none focus:border-tgs-primary/60" />
                                </div>
                                {gdd.zrodlo && <p className="font-mono text-[10px] text-slate-500">źródło: {gdd.zrodlo}{gdd.zmieniono ? ` · zmieniono ${new Date(gdd.zmieniono).toLocaleString('pl-PL')}` : ''}</p>}
                                {pokazImport && (
                                    <div className="space-y-2 rounded-lg border border-slate-700 bg-black/30 p-3">
                                        <p className="text-[11px] text-slate-400">Wklej dokument gry (np. z Gemini) albo wybierz PDF. Reżyser przepisze go na sekcje pod silnik „{silniki[gdd.silnik]?.etykieta ?? gdd.silnik}", a potem ułoży plan. To trwa kilka minut na lokalnym modelu — nadpisze obecne sekcje i plan.</p>
                                        <textarea value={tekstImportu} onChange={(e) => setTekstImportu(e.target.value)} rows={5} placeholder="Tekst dokumentu…" className="w-full resize-none rounded-lg border border-slate-700 bg-black/40 px-3 py-2 text-xs outline-none focus:border-tgs-primary/60" />
                                        <div className="flex flex-wrap items-center gap-2">
                                            <input ref={plikRef} type="file" accept=".pdf,.txt,.md" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importuj(f); }} className="text-xs text-slate-400 file:mr-2 file:rounded-md file:border-0 file:bg-slate-700 file:px-2 file:py-1 file:text-xs file:text-slate-100" disabled={!!praca} />
                                            <button onClick={() => void importuj()} disabled={!!praca} className="ml-auto flex items-center gap-1 rounded-lg bg-tgs-primary/80 px-3 py-1.5 text-xs font-semibold text-black hover:bg-tgs-primary disabled:opacity-40">{praca === 'import' ? <><Loader2 size={14} className="animate-spin" /> Reżyser czyta…</> : 'Importuj tekst'}</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                {SEKCJE.map((s) => (
                                    <details key={s.id} open={!!gdd.sekcje[s.id]} className="rounded-xl border border-slate-800 bg-tgs-panel/60">
                                        <summary className="cursor-pointer px-3 py-2 text-[12px] font-semibold text-slate-100">{s.etykieta} <span className="font-normal text-slate-500">{gdd.sekcje[s.id] ? `· ${gdd.sekcje[s.id].length} zn.` : '· pusto'}</span></summary>
                                        <textarea value={gdd.sekcje[s.id]} onChange={(e) => zmienSekcje(s.id, e.target.value)} placeholder={s.podpowiedz} rows={Math.min(12, Math.max(3, Math.ceil((gdd.sekcje[s.id]?.length ?? 0) / 110)))} className="w-full resize-y rounded-b-xl border-t border-slate-800 bg-black/30 px-3 py-2 text-xs leading-relaxed outline-none focus:bg-black/50" />
                                    </details>
                                ))}
                            </div>

                            {/* PLAN + PRODUKCJA */}
                            <div className="space-y-2 rounded-xl border border-slate-800 bg-tgs-panel/60 p-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500"><ListChecks size={12} /> Plan produkcji {razem ? `· ${gotowe}/${razem} gotowych` : ''}</p>
                                    <div className="ml-auto flex flex-wrap gap-2">
                                        <button onClick={() => void plan(gdd.kamienie.length > 0)} disabled={!!praca || produkcja?.stan === 'trwa'} className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs hover:border-tgs-primary/40 disabled:opacity-40">{praca === 'plan' ? <Loader2 size={14} className="animate-spin" /> : <ListChecks size={14} />} {gdd.kamienie.length ? 'Plan od nowa' : 'Plan z GDD'}</button>
                                        {produkcja?.stan === 'trwa'
                                            ? <button onClick={przerwij} className="flex items-center gap-1 rounded-lg border border-rose-500/50 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-950/40"><Square size={14} /> Przerwij po bieżącym</button>
                                            : <button onClick={() => void realizuj()} disabled={!czeka || !!praca} className="flex items-center gap-1 rounded-lg bg-emerald-500/80 px-3 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-40"><Play size={14} /> Realizuj plan ({czeka})</button>}
                                    </div>
                                </div>
                                {produkcja && (
                                    <div className={`rounded-lg border px-3 py-2 text-xs ${produkcja.stan === 'trwa' ? 'border-cyan-500/40 bg-cyan-950/20' : produkcja.stan === 'gotowe' ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-amber-500/40 bg-amber-950/20'}`}>
                                        <p className="flex items-center gap-2">{produkcja.stan === 'trwa' && <Loader2 size={12} className="animate-spin" />}<span className="font-semibold">Produkcja: {produkcja.stan}</span><span className="text-slate-400">{produkcja.zrobione}/{produkcja.razem} · {produkcja.model}</span></p>
                                        {produkcja.biezace && <p className="mt-1 text-slate-300">▶ {produkcja.biezace.kamien}: {produkcja.biezace.zadanie}</p>}
                                        <div className="mt-1 max-h-28 space-y-0.5 overflow-y-auto font-mono text-[10px] text-slate-500">{produkcja.kroki.slice(-8).map((k, i) => <p key={i}>{new Date(k.kiedy).toLocaleTimeString('pl-PL')} {k.tekst}</p>)}</div>
                                    </div>
                                )}
                                {gdd.kamienie.length === 0 ? <p className="text-[11px] text-slate-500">Jeszcze bez planu. „Plan z GDD" poprosi Reżysera o 5 kamieni milowych × 2 zadania dla Kodeksa.</p> : (
                                    <ol className="space-y-2">
                                        {gdd.kamienie.map((k, i) => (
                                            <li key={k.id} className="rounded-lg border border-slate-800 bg-black/30 p-2">
                                                <div className="flex items-start gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[12px] font-semibold text-slate-100">{i + 1}. {k.tytul}</p>
                                                        <p className="text-[11px] text-slate-400">{k.opis}</p>
                                                    </div>
                                                    {k.zadania.some((z) => z.stan === 'czeka' || z.stan === 'blad') && produkcja?.stan !== 'trwa' && <button onClick={() => void realizuj(k.id)} title="Realizuj tylko ten kamień" className="rounded-md p-1 text-emerald-300 hover:bg-slate-800"><Play size={14} /></button>}
                                                </div>
                                                <ul className="mt-1 space-y-0.5">
                                                    {k.zadania.map((z) => (
                                                        <li key={z.id} className={`flex items-start gap-2 text-[11px] ${STAN_ZADANIA[z.stan]}`}>
                                                            <span className="font-mono">{ZNAK[z.stan]}</span>
                                                            <span className="min-w-0 flex-1">{z.tresc}{z.uwaga && <span className="ml-1 text-[10px] opacity-70">({z.uwaga})</span>}</span>
                                                            {produkcja?.stan !== 'trwa' && (z.stan === 'czeka' || z.stan === 'blad'
                                                                ? <button onClick={() => ustawStanZadania(k.id, z.id, 'pominiete')} title="Pomiń" className="text-slate-600 hover:text-slate-300">–</button>
                                                                : z.stan === 'pominiete' && <button onClick={() => ustawStanZadania(k.id, z.id, 'czeka')} title="Przywróć" className="text-slate-600 hover:text-slate-300">○</button>)}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </div>
                        </>
                    )}
                </section>

                {/* REŻYSER GRY */}
                <aside className="flex min-h-[60vh] flex-col rounded-xl border border-slate-800 bg-tgs-panel/60">
                    <p className="flex items-center gap-1.5 border-b border-slate-800 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-slate-500"><Clapperboard size={12} /> Reżyser Gry</p>
                    <div ref={rozmowaRef} className="flex-1 space-y-2 overflow-y-auto p-3 text-[12px]">
                        {!gdd ? <p className="text-slate-500">Wybierz grę, żeby porozmawiać o jej GDD.</p>
                            : rozmowa.length === 0 ? <p className="text-slate-500">Reżyser zna GDD tej gry. Zapytaj o mechanikę, poproś o przepisanie sekcji albo o ocenę planu — gdy zaproponuje zmianę, pojawi się przycisk „Wpisz do GDD".</p>
                                : rozmowa.map((w, i) => (
                                    <div key={i} className={`rounded-lg px-3 py-2 ${w.kto === 'suweren' ? 'ml-6 bg-slate-800 text-slate-100' : 'mr-6 bg-black/40 text-slate-300'}`}>
                                        <p className="mb-0.5 font-mono text-[9px] uppercase tracking-wider text-slate-500">{w.kto === 'suweren' ? 'Suweren' : 'Reżyser'}</p>
                                        <p className="whitespace-pre-wrap leading-relaxed">{w.tresc}</p>
                                    </div>
                                ))}
                        {praca === 'rozmowa' && <p className="flex items-center gap-2 text-slate-500"><Loader2 size={12} className="animate-spin" /> Reżyser myśli (lokalny model — bywa minuta)…</p>}
                        {propozycja && (
                            <div className="rounded-lg border border-tgs-primary/40 bg-tgs-primary/10 p-2">
                                <p className="text-[11px] text-slate-300">Reżyser proponuje zmiany: {[...(propozycja.tytul ? ['tytuł'] : []), ...Object.keys(propozycja.sekcje ?? {})].join(', ')}</p>
                                <div className="mt-1 flex gap-2">
                                    <button onClick={wpiszPropozycje} className="flex items-center gap-1 rounded-md bg-tgs-primary/80 px-2 py-1 text-[11px] font-semibold text-black hover:bg-tgs-primary"><Check size={12} /> Wpisz do GDD</button>
                                    <button onClick={() => setPropozycja(null)} className="rounded-md px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-800">Odrzuć</button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2 border-t border-slate-800 p-2">
                        <textarea value={wypowiedz} onChange={(e) => setWypowiedz(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void powiedz(); } }} disabled={!gdd || praca === 'rozmowa'} rows={2} placeholder="Powiedz Reżyserowi…" className="min-w-0 flex-1 resize-none rounded-lg border border-slate-700 bg-black/40 px-3 py-2 text-xs outline-none focus:border-tgs-primary/60 disabled:opacity-50" />
                        <button onClick={() => void powiedz()} disabled={!gdd || !wypowiedz.trim() || !!praca} className="rounded-lg bg-tgs-primary/80 px-3 text-black hover:bg-tgs-primary disabled:opacity-40"><Send size={16} /></button>
                    </div>
                </aside>
            </div>
        </div>
    );
}

function pusteGdd(): Gdd {
    return { wersja: 1, tytul: '', gatunek: '', silnik: 'three', perspektywa: '', platformy: ['przeglądarka'], sekcje: { wizja: '', mechanika: '', fabula: '', postacie: '', wizual: '', audio: '', technika: '' }, kamienie: [], historia: [], zrodlo: null, zmieniono: null };
}
