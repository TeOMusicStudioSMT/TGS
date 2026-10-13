/**
 * 🐾 Bestiariusz Mini-TeOgochi (Suweren 2026-10-12): biblioteka samych Mini i ich rzadkości, projektowanie skilli,
 * dropy (jakie nowe skille Mini może zdobyć, z jaką szansą, od którego poziomu) i warianty wylosowanego stworka.
 * Zapis: most → public/bestiariusz.json gry (gra czyta go sama; Reżyser i Kodeks o nim wiedzą).
 * Rzadkość niesie próg naładowania Jaja (uderzeń w rytm BPM) — „od rzadkości” z rozmowy z Reżyserem.
 */
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Dice5, Loader2, PawPrint, Plus, Save, Trash2, X } from 'lucide-react';
import { DZIEDZINY, TYPY, losujWyklucie, wczytajBestiariusz, zapiszBestiariusz, wczytajZRuchem, rodzinaMini, type RodzinaZRuchem, type Bestiariusz as B, type Dziedzina, type MiniB, type Skill, type TypSkilla } from '../lib/bestiariusz';
import { klockiGdd, type KlocekKatalogu } from '../lib/gdd';
import { adresObrazu } from '../lib/tworzenie';
import { adresPliku } from '../lib/assety3d';

const pole = 'rounded border border-slate-700 bg-black/40 px-1.5 py-0.5 text-[11px] outline-none focus:border-tgs-primary/60';
const miniatura = (k: KlocekKatalogu | undefined) => (k?.obraz ? adresObrazu(k.obraz) : k?.bryla ? adresPliku(k.bryla, 'obraz.png') : null);
const noweId = (p: string) => `${p}-${Date.now().toString(36)}${Math.floor(Math.random() * 99)}`;

export default function Bestiariusz({ wybranaGra }: { wybranaGra: string | null }) {
    const [b, setB] = useState<B | null>(null);
    const [katalog, setKatalog] = useState<KlocekKatalogu[]>([]);
    const [brudne, setBrudne] = useState(false);
    const [praca, setPraca] = useState<string | null>(null);
    const [blad, setBlad] = useState<string | null>(null);
    const [otwarty, setOtwarty] = useState<string | null>(null);
    const [wybor, setWybor] = useState(false);
    const [losowania, setLosowania] = useState<ReturnType<typeof losujWyklucie>[]>([]);
    const [rodziny, setRodziny] = useState<RodzinaZRuchem[] | null>(null);
    const [tylkoMini, setTylkoMini] = useState(true);

    const wczytaj = useCallback(async () => {
        if (!wybranaGra) return;
        setBlad(null);
        try { setB(await wczytajBestiariusz(wybranaGra)); setBrudne(false); } catch (e) { setBlad((e as Error).message); }
        klockiGdd(wybranaGra).then((d) => setKatalog(d.katalog)).catch(() => setKatalog([]));
        wczytajZRuchem(wybranaGra).then(setRodziny).catch(() => setRodziny([]));
    }, [wybranaGra]);
    useEffect(() => { void wczytaj(); }, [wczytaj]);

    const zmien = (f: (x: B) => B) => { setB((x) => (x ? f(x) : x)); setBrudne(true); };
    const zmienMini = (id: string, z: Partial<MiniB>) => zmien((x) => ({ ...x, mini: x.mini.map((m) => (m.id === id ? { ...m, ...z } : m)) }));
    const zmienSkill = (id: string, z: Partial<Skill>) => zmien((x) => ({ ...x, skille: x.skille.map((s) => (s.id === id ? { ...s, ...z } : s)) }));
    const zapisz = async () => { if (!b || !wybranaGra) return; setPraca('zapis'); setBlad(null); try { setB(await zapiszBestiariusz(wybranaGra, b)); setBrudne(false); } catch (e) { setBlad((e as Error).message); } finally { setPraca(null); } };

    // 🕺 tylko Mini z ruchem (rodziny wersji z rigiem), których jeszcze nie ma w Bestiariuszu — kolejność z mostu (kategoria, klipy)
    const kandydaci = useMemo(() => (rodziny ?? []).filter((r) => (!tylkoMini || r.mini) && !b?.mini.some((m) => r.klucze.includes(m.klucz ?? ''))), [rodziny, b, tylkoMini]);
    // 🔗 Mini wskazujące starszą wersję rodziny (obraz, bryłę przed rigiem, plik gry bez ruchów) → scalona wersja z ruchami
    const doScalenia = useMemo(() => (b?.mini ?? []).filter((m) => { const r = rodzinaMini(rodziny ?? [], m.klucz); return r && r.klucz !== m.klucz; }), [b, rodziny]);
    const KOLEJ = { tancerz: 0, wojownik: 1, gesty: 2, wedrowiec: 3 } as const;
    const miniPosortowane = useMemo(() => [...(b?.mini ?? [])].sort((x, y) => {
        const rx = rodzinaMini(rodziny ?? [], x.klucz), ry = rodzinaMini(rodziny ?? [], y.klucz);
        return (rx ? KOLEJ[rx.kategoria] : 9) - (ry ? KOLEJ[ry.kategoria] : 9) || (ry?.klipow ?? 0) - (rx?.klipow ?? 0) || x.nazwa.localeCompare(y.nazwa, 'pl');
    }), [b, rodziny]);
    const sumaSzans = b?.rzadkosci.reduce((s, r) => s + r.szansa, 0) ?? 0;
    const rozklad = useMemo(() => { const l: Record<string, number> = {}; for (const w of losowania) if (w) l[w.rzadkosc.id] = (l[w.rzadkosc.id] ?? 0) + 1; return l; }, [losowania]);

    if (!wybranaGra) return <p className="rounded-xl border border-slate-800 bg-tgs-panel/60 p-6 text-center text-sm text-slate-500">Wybierz grę (Reżyser i GDD albo Galeria), żeby otworzyć jej Bestiariusz.</p>;
    if (!b) return <p className="p-6 text-sm text-slate-500">{blad ? `⚠ ${blad}` : 'Wczytuję Bestiariusz…'}</p>;

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
                <PawPrint className="text-tgs-primary" />
                <div className="flex-1">
                    <h2 className="text-lg font-semibold">Bestiariusz Mini-TeOgochi</h2>
                    <p className="text-xs text-slate-500">Rzadkości (szansa wyklucia, próg Jaja, mnożnik), stworki z wariantami, skille i dropy → <span className="font-mono">public/bestiariusz.json</span> gry „{wybranaGra}”. Gra losuje z tego pliku.</p>
                </div>
                <button onClick={() => void zapisz()} disabled={!brudne || !!praca} className="flex items-center gap-1 rounded-lg bg-tgs-primary/80 px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-40">{praca ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Zapisz{brudne ? ' *' : ''}</button>
            </div>
            {blad && <p className="text-xs text-amber-300">⚠ {blad}</p>}

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[260px_minmax(0,1fr)_280px]">
                {/* RZADKOŚCI + PODGLĄD LOSOWANIA */}
                <section className="space-y-2 self-start rounded-xl border border-slate-800 bg-tgs-panel/60 p-3">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">💎 Rzadkości</p>
                    {b.rzadkosci.map((r, i) => (
                        <div key={r.id} className="space-y-1 rounded-lg border p-2" style={{ borderColor: `${r.kolor}66` }}>
                            <div className="flex items-center gap-1">
                                <input type="color" value={r.kolor} onChange={(e) => zmien((x) => ({ ...x, rzadkosci: x.rzadkosci.map((y, j) => (j === i ? { ...y, kolor: e.target.value } : y)) }))} className="h-5 w-6 cursor-pointer bg-transparent" />
                                <input value={r.nazwa} onChange={(e) => zmien((x) => ({ ...x, rzadkosci: x.rzadkosci.map((y, j) => (j === i ? { ...y, nazwa: e.target.value } : y)) }))} className={`${pole} min-w-0 flex-1 font-semibold`} style={{ color: r.kolor }} />
                                <span className="text-[10px] text-slate-500">{b.mini.filter((m) => m.rzadkosc === r.id).length} Mini</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-400">
                                {([['szansa', 'szansa %', 0, 100, 0.5], ['progJaja', 'próg Jaja', 10, 2000, 1], ['mnoznik', 'mnożnik', 0.5, 5, 0.05]] as const).map(([k, et, min, max, krok]) => (
                                    <label key={k} className="flex flex-col">{et}<input type="number" min={min} max={max} step={krok} value={r[k]} onChange={(e) => zmien((x) => ({ ...x, rzadkosci: x.rzadkosci.map((y, j) => (j === i ? { ...y, [k]: Number(e.target.value) } : y)) }))} className={pole} /></label>
                                ))}
                            </div>
                        </div>
                    ))}
                    <p className={`text-[10px] ${Math.abs(sumaSzans - 100) < 0.01 ? 'text-slate-500' : 'text-amber-300'}`}>Suma szans: {sumaSzans}% {Math.abs(sumaSzans - 100) < 0.01 ? '' : '(liczą się proporcje, ale czytelniej, gdy to 100%)'} · próg Jaja = uderzeń w rytm BPM do wyklucia.</p>
                    <div className="border-t border-slate-800 pt-2">
                        <button onClick={() => setLosowania(Array.from({ length: 20 }, () => losujWyklucie(b)))} disabled={!b.mini.length} className="flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-1 text-[11px] hover:border-tgs-primary/50 disabled:opacity-40"><Dice5 size={13} /> wylosuj 20 wykluć</button>
                        {losowania.length > 0 && (
                            <div className="mt-1 space-y-0.5 text-[10px]">
                                <p className="text-slate-400">{b.rzadkosci.filter((r) => rozklad[r.id]).map((r) => <span key={r.id} style={{ color: r.kolor }}>{r.nazwa} {rozklad[r.id]} · </span>)}</p>
                                <div className="max-h-40 overflow-y-auto">{losowania.map((w, i) => w && <p key={i}><span style={{ color: w.rzadkosc.kolor }}>●</span> {w.mini.nazwa}{w.wariant ? <span className="text-tgs-primary"> · {w.wariant.nazwa}</span> : <span className="text-slate-600"> · bazowy</span>}</p>)}</div>
                            </div>
                        )}
                    </div>
                </section>

                {/* BIBLIOTEKA MINI */}
                <section className="space-y-2 rounded-xl border border-slate-800 bg-tgs-panel/60 p-3">
                    <div className="flex items-center justify-between">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">🐾 Biblioteka Mini ({b.mini.length})</p>
                        <div className="flex gap-1">
                            {doScalenia.length > 0 && <button onClick={() => zmien((x) => ({ ...x, mini: x.mini.map((m) => { const r = rodzinaMini(rodziny ?? [], m.klucz); return r && r.klucz !== m.klucz ? { ...m, klucz: r.klucz } : m; }) }))} title="Przepnij Mini na scaloną wersję z ruchami (najwięcej klipów w rodzinie wersji)" className="flex items-center gap-1 rounded-lg border border-amber-500/60 px-2 py-0.5 text-[11px] text-amber-200 hover:border-amber-300">🔗 Scal wersje ({doScalenia.length})</button>}
                            <button onClick={() => setWybor((x) => !x)} className="flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-0.5 text-[11px] hover:border-tgs-primary/50"><Plus size={12} /> 🕺 z ruchem ({rodziny === null ? '…' : kandydaci.length})</button>
                            <button onClick={() => { const id = noweId('mini'); zmien((x) => ({ ...x, mini: [...x.mini, { id, nazwa: 'Nowy Mini', klucz: null, rzadkosc: x.rzadkosci[0].id, dziedzina: 'takt', opis: '', skille: [], warianty: [], dropy: [] }] })); setOtwarty(id); }} className="flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-0.5 text-[11px] hover:border-tgs-primary/50"><Plus size={12} /> pusty</button>
                        </div>
                    </div>
                    {wybor && (
                        <div className="space-y-1 rounded-lg border border-slate-800 p-1">
                            <label className="flex items-center gap-1 px-1 text-[10px] text-slate-400"><input type="checkbox" checked={tylkoMini} onChange={(e) => setTylkoMini(e.target.checked)} /> tylko Mini-TeOgochi (bez bohaterów i stworów świata)</label>
                            <div className="grid max-h-72 grid-cols-2 gap-1 overflow-y-auto sm:grid-cols-4">
                                {rodziny === null && <p className="col-span-full p-2 text-[11px] text-slate-500">Szukam brył z ruchami w Assetach 3D…</p>}
                                {rodziny !== null && !kandydaci.length && <p className="col-span-full p-2 text-[11px] text-slate-500">Wszystkie Mini z ruchem są już w Bestiariuszu. Ruchy dodasz w Assety 3D → Meshy → rig i akcje.</p>}
                                {kandydaci.map((r, i) => (
                                    <Fragment key={r.klucz}>
                                        {(i === 0 || kandydaci[i - 1].kategoria !== r.kategoria) && <p className="col-span-full px-1 pt-1 text-[10px] font-semibold text-slate-400">{r.kategoriaNazwa}</p>}
                                        <button title={`${r.opis}

Klipy: ${r.klipy.slice(0, 30).join(', ')}${r.klipy.length > 30 ? '…' : ''}`} onClick={() => zmien((x) => ({ ...x, mini: [...x.mini, { id: noweId('mini'), nazwa: r.nazwa, klucz: r.klucz, rzadkosc: x.rzadkosci[0].id, dziedzina: r.kategoria === 'wojownik' ? 'zwinnosc' : 'takt', opis: r.opis.slice(0, 400), skille: [], warianty: [], dropy: [] }] }))}
                                            className="flex flex-col items-center gap-1 rounded border border-slate-800 p-1 text-[10px] hover:border-tgs-primary/50">
                                            <img src={adresPliku(r.bryla, 'obraz.png')} alt="" className="h-14 w-14 rounded object-cover" onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
                                            <span className="line-clamp-2 text-center">{r.nazwa}</span>
                                            <span className="text-slate-500">🕺 {r.klipow} klipów · {r.wersji} wers.</span>
                                        </button>
                                    </Fragment>
                                ))}
                            </div>
                        </div>
                    )}
                    {!b.mini.length && <p className="text-[11px] text-slate-500">Pusto. Dodaj stworki z Pracowni (Obrazy → gałąź Mini-TeOgochi) albo pustego Mini.</p>}
                    <div className="grid grid-cols-1 gap-2 2xl:grid-cols-2">
                        {miniPosortowane.map((m) => {
                            const rz = b.rzadkosci.find((r) => r.id === m.rzadkosc);
                            const k = katalog.find((x) => x.klucz === m.klucz);
                            const rodz = rodzinaMini(rodziny ?? [], m.klucz);
                            const obrazek = miniatura(k) ?? (rodz ? adresPliku(rodz.bryla, 'obraz.png') : null);
                            const otw = otwarty === m.id;
                            return (
                                <div key={m.id} className="rounded-lg border bg-black/20 p-2 text-[11px]" style={{ borderColor: `${rz?.kolor ?? '#334155'}88` }}>
                                    <div className="flex items-center gap-2">
                                        {obrazek ? <img src={obrazek} alt="" className="h-12 w-12 rounded object-cover" title={rodz ? `${rodz.kategoriaNazwa} · ${rodz.klipow} klipów ruchu` : undefined} /> : <div className="flex h-12 w-12 items-center justify-center rounded bg-slate-800">🥚</div>}
                                        <div className="min-w-0 flex-1">
                                            <input value={m.nazwa} onChange={(e) => zmienMini(m.id, { nazwa: e.target.value })} className={`${pole} w-full font-semibold`} />
                                            <div className="mt-1 grid grid-cols-2 gap-1">
                                                <select value={m.rzadkosc} onChange={(e) => zmienMini(m.id, { rzadkosc: e.target.value })} className={pole} style={{ color: rz?.kolor }}>{b.rzadkosci.map((r) => <option key={r.id} value={r.id}>{r.nazwa}</option>)}</select>
                                                <select value={m.dziedzina} onChange={(e) => zmienMini(m.id, { dziedzina: e.target.value as Dziedzina })} className={pole}>{(Object.keys(DZIEDZINY) as Dziedzina[]).map((d) => <option key={d} value={d}>{DZIEDZINY[d]}</option>)}</select>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <button onClick={() => setOtwarty(otw ? null : m.id)} className="rounded border border-slate-700 px-1.5 text-[10px] hover:border-tgs-primary/50">{otw ? '▲' : '▼'}</button>
                                            <button onClick={() => zmien((x) => ({ ...x, mini: x.mini.filter((y) => y.id !== m.id) }))} title="Usuń z Bestiariusza (obraz/bryła zostają)" className="text-slate-500 hover:text-red-400"><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                    <p className="mt-1 text-[10px] text-slate-500">{rodz ? <span className="text-tgs-primary">{rodz.kategoriaNazwa} · 🕺 {rodz.klipow} klipów{rodz.klucz !== m.klucz ? ' · ⚠ starsza wersja — 🔗 Scal' : ''} · </span> : <span className="text-amber-300/80">bez ruchów · </span>}{m.skille.length} skille · {m.warianty.length} warianty · {m.dropy.length} dropy{rz ? ` · Jajo: ${rz.progJaja} uderzeń · ×${rz.mnoznik}` : ''}</p>
                                    {otw && (
                                        <div className="mt-2 space-y-2 border-t border-slate-800 pt-2">
                                            <textarea value={m.opis} onChange={(e) => zmienMini(m.id, { opis: e.target.value })} rows={2} placeholder="opis stworka" className={`${pole} w-full resize-none`} />
                                            <div>
                                                <p className="text-[10px] text-slate-400">Skille startowe (≤ 6):</p>
                                                <div className="flex flex-wrap gap-1">{b.skille.map((s) => { const ma = m.skille.includes(s.id); return <button key={s.id} onClick={() => zmienMini(m.id, { skille: ma ? m.skille.filter((x) => x !== s.id) : [...m.skille, s.id].slice(0, 6) })} className={`rounded-full border px-1.5 text-[10px] ${ma ? 'border-tgs-primary/60 bg-tgs-primary/15 text-tgs-primary' : 'border-slate-700 text-slate-400'}`}>{s.nazwa}</button>; })}{!b.skille.length && <span className="text-[10px] text-slate-600">— zaprojektuj skille po prawej</span>}</div>
                                            </div>
                                            <div>
                                                <p className="flex items-center justify-between text-[10px] text-slate-400">Warianty (reszta do 100% = bazowy)<button onClick={() => zmienMini(m.id, { warianty: [...m.warianty, { id: noweId('w'), nazwa: 'Wariant', odcien: 60, szansa: 10, opis: '' }].slice(0, 8) })} className="text-tgs-primary">＋</button></p>
                                                {m.warianty.map((w, j) => (
                                                    <div key={w.id} className="mt-0.5 flex flex-wrap items-center gap-1">
                                                        {miniatura(k) && <img src={miniatura(k)!} alt="" className="h-6 w-6 rounded object-cover" style={{ filter: `hue-rotate(${w.odcien}deg)` }} />}
                                                        <input value={w.nazwa} onChange={(e) => zmienMini(m.id, { warianty: m.warianty.map((y, i) => (i === j ? { ...y, nazwa: e.target.value } : y)) })} className={`${pole} min-w-[6rem] flex-1`} />
                                                        <input type="range" min={-180} max={180} value={w.odcien} title={`odcień ${w.odcien}°`} onChange={(e) => zmienMini(m.id, { warianty: m.warianty.map((y, i) => (i === j ? { ...y, odcien: Number(e.target.value) } : y)) })} className="w-16" />
                                                        <input type="number" min={0} max={100} value={w.szansa} title="szansa %" onChange={(e) => zmienMini(m.id, { warianty: m.warianty.map((y, i) => (i === j ? { ...y, szansa: Number(e.target.value) } : y)) })} className={`${pole} w-12`} />
                                                        <button onClick={() => zmienMini(m.id, { warianty: m.warianty.filter((_, i) => i !== j) })} className="text-slate-500 hover:text-red-400"><X size={11} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div>
                                                <p className="flex items-center justify-between text-[10px] text-slate-400">Dropy — nowe skille po starciach<button disabled={!b.skille.length} onClick={() => zmienMini(m.id, { dropy: [...m.dropy, { skill: b.skille[0].id, szansa: 10, odPoziomu: 3 }].slice(0, 8) })} className="text-tgs-primary disabled:opacity-30">＋</button></p>
                                                {m.dropy.map((d, j) => (
                                                    <div key={j} className="mt-0.5 flex flex-wrap items-center gap-1">
                                                        <select value={d.skill} onChange={(e) => zmienMini(m.id, { dropy: m.dropy.map((y, i) => (i === j ? { ...y, skill: e.target.value } : y)) })} className={`${pole} min-w-0 flex-1`}>{b.skille.map((s) => <option key={s.id} value={s.id}>{s.nazwa}</option>)}</select>
                                                        <label className="text-[10px] text-slate-500">%<input type="number" min={0} max={100} value={d.szansa} onChange={(e) => zmienMini(m.id, { dropy: m.dropy.map((y, i) => (i === j ? { ...y, szansa: Number(e.target.value) } : y)) })} className={`${pole} w-12`} /></label>
                                                        <label className="text-[10px] text-slate-500">od poz.<input type="number" min={1} max={20} value={d.odPoziomu} onChange={(e) => zmienMini(m.id, { dropy: m.dropy.map((y, i) => (i === j ? { ...y, odPoziomu: Number(e.target.value) } : y)) })} className={`${pole} w-10`} /></label>
                                                        <button onClick={() => zmienMini(m.id, { dropy: m.dropy.filter((_, i) => i !== j) })} className="text-slate-500 hover:text-red-400"><X size={11} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* PROJEKTANT SKILLI */}
                <section className="space-y-2 self-start rounded-xl border border-slate-800 bg-tgs-panel/60 p-3">
                    <div className="flex items-center justify-between">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">⚔️ Skille ({b.skille.length})</p>
                        <button onClick={() => zmien((x) => ({ ...x, skille: [...x.skille, { id: noweId('sk'), nazwa: 'Nowy skill', dziedzina: null, typ: 'cios', moc: 10, opis: '' }] }))} className="flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-0.5 text-[11px] hover:border-tgs-primary/50"><Plus size={12} /> skill</button>
                    </div>
                    {!b.skille.length && <p className="text-[11px] text-slate-500">Zaprojektuj skille: cios, specjalny, pasywny albo taneczny — potem przypisz je Mini jako startowe albo jako drop.</p>}
                    {b.skille.map((s) => {
                        const uzyty = b.mini.filter((m) => m.skille.includes(s.id) || m.dropy.some((d) => d.skill === s.id)).length;
                        return (
                            <div key={s.id} className="space-y-1 rounded-lg border border-slate-800 bg-black/20 p-2">
                                <div className="flex items-center gap-1">
                                    <input value={s.nazwa} onChange={(e) => zmienSkill(s.id, { nazwa: e.target.value })} className={`${pole} min-w-0 flex-1 font-semibold`} />
                                    <button onClick={() => zmien((x) => ({ ...x, skille: x.skille.filter((y) => y.id !== s.id), mini: x.mini.map((m) => ({ ...m, skille: m.skille.filter((y) => y !== s.id), dropy: m.dropy.filter((d) => d.skill !== s.id) })) }))} title={uzyty ? `Używa ${uzyty} Mini — zniknie też u nich` : 'Usuń'} className="text-slate-500 hover:text-red-400"><Trash2 size={12} /></button>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    <select value={s.typ} onChange={(e) => zmienSkill(s.id, { typ: e.target.value as TypSkilla })} className={pole}>{(Object.keys(TYPY) as TypSkilla[]).map((t) => <option key={t} value={t}>{TYPY[t]}</option>)}</select>
                                    <select value={s.dziedzina ?? ''} onChange={(e) => zmienSkill(s.id, { dziedzina: (e.target.value || null) as Dziedzina | null })} className={pole}><option value="">każda dziedzina</option>{(Object.keys(DZIEDZINY) as Dziedzina[]).map((d) => <option key={d} value={d}>{DZIEDZINY[d]}</option>)}</select>
                                    <label className="flex items-center gap-0.5 text-[10px] text-slate-500">moc<input type="number" min={1} max={100} value={s.moc} onChange={(e) => zmienSkill(s.id, { moc: Number(e.target.value) })} className={`${pole} w-12`} /></label>
                                </div>
                                <textarea value={s.opis} onChange={(e) => zmienSkill(s.id, { opis: e.target.value })} rows={2} placeholder="co robi w starciu / tańcu" className={`${pole} w-full resize-none`} />
                                <p className="text-[10px] text-slate-600">{uzyty ? `u ${uzyty} Mini` : 'jeszcze nieprzypisany'}</p>
                            </div>
                        );
                    })}
                </section>
            </div>
        </div>
    );
}
