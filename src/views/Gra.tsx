/**
 * 🎮 TGS — „To Get Sauce" → „TeO Great Show". Wersja 2D.
 *
 * Pętla: postać → świat (wypadkowa postaci) → ruch → quest → wybór → nasycenie
 * przestawia BARWĘ świata i WIDOCZNOŚĆ sekretów → mGRV/EXP/umiejętność.
 *
 * Gra chodzi w całości offline. Most i Ollama są DODATKIEM (żywe questy
 * Kustosza, plecak spięty z księgą GRV), nie warunkiem grania.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Sparkles, RotateCcw, Backpack, Box, Grid3x3, Loader2 } from 'lucide-react';
import { bridge } from '../lib/bridge';
import { pobierzStado, rozstawNpc, rozmawiajZNpc, listaScenografii, kadryZObrazem, projektyStory, zbudujScenografie, wczytajPostawione, zapiszPostawione, type Npc, type TuraNpc, type Scenografia, type KadrZObrazem, type Postawiona } from '../gra/npc';
import { BRIDGE } from '../lib/bridge';
import Swiat3D from './gra/Swiat3D';
import { generujTeterhie, kafelPod, PRZEJSCIE, NAZWA_BIOMU, SZEROKOSC, WYSOKOSC, type Swiat } from '../gra/teterhia';
import { progOdkrycia, poWyborze, stanSwiata, barwa, OPIS_TONU, type Ton } from '../gra/sos';
import { kurs, nagrodaMGRV, poziom, expDoNastepnego, mozliwaWymiana } from '../gra/ekonomia';
import { questDlaKafla, UMIEJETNOSCI, type Quest } from '../gra/questy';
import { wykujQuest } from '../gra/kustosz';
import { nowyStan, wczytaj, zapisz, skasuj, metryki, type StanGry } from '../gra/zapis';
import type { Postac } from '../gra/postac';
import TworzeniePostaci from './gra/TworzeniePostaci';
import Plansza from './gra/Plansza';
import Plecak from './gra/Plecak';

/** Wszystkie kafle-węzły świata, z przypisanym questem. Deterministyczne. */
function wezlySwiata(swiat: Swiat): Map<number, Quest> {
  const m = new Map<number, Quest>();
  let n = 0;
  swiat.kafle.forEach((k, i) => {
    if (!k.sekret) return;
    // Co czwarty węzeł jest sekretem — te odsłaniają się dopiero z nasyceniem.
    m.set(i, questDlaKafla(n, n % 4 === 3));
    n++;
  });
  return m;
}

export default function Gra() {
  const [stan, setStan] = useState<StanGry | null>(() => wczytaj());
  const [otwarty, setOtwarty] = useState<{ quest: Quest; kafel: number | null } | null>(null);
  const [plecak, setPlecak] = useState(false);
  const [kuje, setKuje] = useState(false);
  // 🧊 3D: teren z Blendera (.glb) + NPC ze stada. Suweren: „rozwinięcie gry do 3D — robione w Blenderze".
  const [widok3d, setWidok3d] = useState<boolean>(() => localStorage.getItem('tgs_widok') === '3d');
  const [glb, setGlb] = useState<string | null>(null);
  const [buduje, setBuduje] = useState(false);
  const [npc, setNpc] = useState<Npc[]>([]);
  const [rozmowa, setRozmowa] = useState<{ npc: Npc; historia: TuraNpc[]; tekst: string; czeka: boolean } | null>(null);
  // 🎬 Scenografie z kadrów Story: biblioteka (.glb w public) + te postawione w TYM świecie (localStorage per ziarno).
  const [scenPanel, setScenPanel] = useState(false);
  const [scenografie, setScenografie] = useState<Scenografia[]>([]);
  const [postawione, setPostawione] = useState<Postawiona[]>([]);
  const [projekty, setProjekty] = useState<string[]>([]);
  const [projektKadru, setProjektKadru] = useState('');
  const [kadry, setKadry] = useState<KadrZObrazem[]>([]);
  const [budujeScen, setBudujeScen] = useState<string | null>(null);

  const postac = stan?.postac;
  const swiat = useMemo(() => (postac ? generujTeterhie(postac) : null), [postac]);
  const wezly = useMemo(() => (swiat ? wezlySwiata(swiat) : new Map<number, Quest>()), [swiat]);

  const nasycenie = stan?.nasycenie ?? 0;

  // Który .glb należy do tego świata — manifest z public/assets/swiaty (bez mostu).
  useEffect(() => {
    if (!swiat) return;
    fetch('/assets/swiaty/swiaty.json').then((r) => (r.ok ? r.json() : { swiaty: [] })).then((d) => {
      const s = (d.swiaty ?? []).find((x: { ziarno: number; glb: string }) => x.ziarno === swiat.ziarno);
      setGlb(s ? `${s.glb}?v=${encodeURIComponent(String(s.kiedy ?? ''))}` : null);
    }).catch(() => setGlb(null));
  }, [swiat]);

  // NPC = stado z mostu (bez postaci gracza), rozstawione deterministycznie ze ziarna.
  useEffect(() => {
    if (!swiat) return;
    pobierzStado().then((s) => setNpc(rozstawNpc(s.filter((t) => t.id !== postac?.teogochi?.id), swiat, SZEROKOSC, WYSOKOSC))).catch(() => setNpc([]));
  }, [swiat, postac]);

  useEffect(() => {
    if (!swiat) return;
    setPostawione(wczytajPostawione(swiat.ziarno));
    listaScenografii().then(setScenografie).catch(() => setScenografie([]));
  }, [swiat]);
  useEffect(() => { if (scenPanel) projektyStory().then((p) => { setProjekty(p); setProjektKadru((x) => x || p[0] || ''); }).catch(() => setProjekty([])); }, [scenPanel]);
  useEffect(() => { if (projektKadru) kadryZObrazem(projektKadru).then(setKadry).catch(() => setKadry([])); }, [projektKadru]);

  const postaw = (s: Scenografia) => {
    if (!swiat || !stan) return;
    const n: Postawiona = { id: `${s.id}-${Date.now().toString(36)}`, url: s.url, nazwa: s.nazwa, x: stan.pozycja.x, y: stan.pozycja.y, skala: 0.25, obrot: 0 };
    const l = [...postawione, n]; setPostawione(l); zapiszPostawione(swiat.ziarno, l);
    setWidok3d(true); localStorage.setItem('tgs_widok', '3d');
    toast.success(`„${s.nazwa}" stoi na (${n.x}, ${n.y}) — skala 0,25 (studio 16 m = 4 kafle).`);
  };
  const zdejmij = (id: string) => { if (!swiat) return; const l = postawione.filter((p) => p.id !== id); setPostawione(l); zapiszPostawione(swiat.ziarno, l); };
  const zmienPostawiona = (id: string, zm: Partial<Postawiona>) => { if (!swiat) return; const l = postawione.map((p) => (p.id === id ? { ...p, ...zm } : p)); setPostawione(l); zapiszPostawione(swiat.ziarno, l); };

  const zbudujScenografieZKadru = async (k: KadrZObrazem) => {
    setBudujeScen(k.id);
    try {
      const r = await zbudujScenografie({ projekt: projektKadru, kadrId: k.id });
      toast.success(`${r.blender}: scenografia „${r.wpis.nazwa}" gotowa w ${r.sekundy} s.`);
      const l = await listaScenografii(); setScenografie(l);
      const s = l.find((x) => x.url === r.wpis.url); if (s) postaw(s);
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e), { duration: 9000 }); }
    finally { setBudujeScen(null); }
  };

  const zbudujWBlenderze = async () => {
    if (!swiat || !postac) return;
    setBuduje(true);
    try {
      const r = await bridge.post<{ glb: string; sekundy: number; blender: string; kiedy: string }>('/api/tgs/3d/swiat', {
        nazwa: swiat.nazwa, ziarno: swiat.ziarno, szerokosc: SZEROKOSC, wysokosc: WYSOKOSC, kafle: swiat.kafle, postac,
      });
      setGlb(`${r.glb}?v=${encodeURIComponent(r.kiedy)}`);
      setWidok3d(true); localStorage.setItem('tgs_widok', '3d');
      toast.success(`${r.blender} zbudował teren w ${r.sekundy} s.`);
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e), { duration: 9000 }); }
    finally { setBuduje(false); }
  };

  const otworzRozmowe = (n: Npc) => {
    if (!n.wyklute) { toast(`${n.forma} ${n.imie} to jeszcze jajko — wykluje się w Katedrze, wtedy przemówi.`, { icon: '🥚' }); return; }
    setRozmowa({ npc: n, historia: [], tekst: '', czeka: false });
  };
  const powiedzNpc = async () => {
    if (!rozmowa || !swiat || !stan || rozmowa.czeka) return;
    const t = rozmowa.tekst.trim(); if (!t) return;
    const hist: TuraNpc[] = [...rozmowa.historia, { kto: 'gracz', tresc: t }];
    setRozmowa({ ...rozmowa, historia: hist, tekst: '', czeka: true });
    try {
      const k = kafelPod(swiat, rozmowa.npc.x, rozmowa.npc.y);
      const r = await rozmawiajZNpc({ teogochiId: rozmowa.npc.id, wypowiedz: t, historia: rozmowa.historia, swiat: `${swiat.nazwa} (ziarno ${swiat.ziarno})`, kafel: k ? `${NAZWA_BIOMU[k.biom]}, rola NPC: ${rozmowa.npc.rola}` : rozmowa.npc.rola, gracz: `${stan.postac.imie}, poziom ${poziom(stan.exp)}, nasycenie ${stan.nasycenie}` });
      setRozmowa((s) => (s ? { ...s, historia: [...hist, { kto: 'npc', tresc: r.mowa }], czeka: false } : s));
    } catch (e) {
      setRozmowa((s) => (s ? { ...s, historia: [...hist, { kto: 'npc', tresc: `(${rozmowa.npc.imie} milczy: ${e instanceof Error ? e.message : String(e)})` }], czeka: false } : s));
    }
  };

  /** Węzły widoczne TERAZ — sekrety odsłania dopiero nasycenie. Punkt 8. */
  const widoczne = useMemo(() => {
    const s = new Set<number>();
    if (!postac) return s;
    const prog = progOdkrycia(postac);
    wezly.forEach((q, i) => {
      if (!q.sekretny || nasycenie >= prog) s.add(i);
    });
    return s;
  }, [wezly, nasycenie, postac]);

  useEffect(() => {
    if (stan) zapisz(stan);
  }, [stan]);

  const ruch = useCallback(
    (dx: number, dy: number) => {
      setStan((s) => {
        if (!s || !swiat) return s;
        const x = s.pozycja.x + dx;
        const y = s.pozycja.y + dy;
        const k = kafelPod(swiat, x, y);
        if (!k || !PRZEJSCIE[k.biom]) return s;
        return { ...s, pozycja: { x, y }, kroki: s.kroki + 1 };
      });
    },
    [swiat],
  );

  // Sterowanie. Nie łapiemy klawiszy, gdy otwarty jest quest — tam się czyta.
  useEffect(() => {
    if (!stan || otwarty || plecak) return;
    const nt = (e: KeyboardEvent) => {
      const mapa: Record<string, [number, number]> = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        w: [0, -1],
        s: [0, 1],
        a: [-1, 0],
        d: [1, 0],
      };
      // Pisząc do NPC (w, s, a, d w zdaniu) nie chcemy biegać po mapie.
      const cel = e.target as HTMLElement | null;
      if (cel && (cel.tagName === 'INPUT' || cel.tagName === 'TEXTAREA')) return;
      const v = mapa[e.key];
      if (v) {
        e.preventDefault();
        ruch(v[0], v[1]);
      }
    };
    window.addEventListener('keydown', nt);
    return () => window.removeEventListener('keydown', nt);
  }, [ruch, stan, otwarty, plecak]);

  const pozX = stan?.pozycja.x;
  const pozY = stan?.pozycja.y;

  // Wejście na węzeł otwiera quest — raz, dopóki nie jest ukończony.
  useEffect(() => {
    if (otwarty || pozX === undefined || pozY === undefined) return;
    const i = pozY * SZEROKOSC + pozX;
    if (!widoczne.has(i)) return;
    setStan((s) => {
      if (!s || s.ukonczone.includes(i)) return s;
      const q = wezly.get(i);
      if (!q) return s;
      setOtwarty({ quest: q, kafel: i });
      return { ...s, podjete: s.podjete + 1 };
    });
  }, [pozX, pozY, widoczne, wezly, otwarty]);

  const rozstrzygnij = (ton: Ton) => {
    if (!stan || !otwarty) return;
    const { quest, kafel } = otwarty;
    const m = metryki(stan);
    const premia = stan.postac.droga === 'tworca' ? 1.25 : 1;
    const zysk = nagrodaMGRV(quest.bazaMGRV, m, premia);
    const noweNasycenie = poWyborze(stan.nasycenie, ton, stan.postac);
    const zdobyta = quest.umiejetnosc && !stan.umiejetnosci.includes(quest.umiejetnosc);

    setStan({
      ...stan,
      nasycenie: noweNasycenie,
      mgrv: stan.mgrv + zysk,
      exp: stan.exp + quest.exp,
      tony: [...stan.tony, ton],
      ukonczone: kafel === null ? stan.ukonczone : [...stan.ukonczone, kafel],
      umiejetnosci: zdobyta ? [...stan.umiejetnosci, quest.umiejetnosc!] : stan.umiejetnosci,
    });
    setOtwarty(null);

    const roznica = noweNasycenie - stan.nasycenie;
    toast(`${roznica >= 0 ? '🎨' : '🌫️'} +${zysk} mGRV · +${quest.exp} EXP · barwa ${roznica >= 0 ? '+' : ''}${roznica}`, {
      duration: 4000,
    });
    if (zdobyta) {
      toast.success(`Umiejętność: ${UMIEJETNOSCI[quest.umiejetnosc!] ?? quest.umiejetnosc}`, { duration: 7000 });
    }
  };

  const poprosKustosza = async () => {
    if (!stan || !swiat) return;
    setKuje(true);
    try {
      const k = kafelPod(swiat, stan.pozycja.x, stan.pozycja.y)!;
      const q = await wykujQuest({
        postac: stan.postac,
        swiat: swiat.nazwa,
        biom: NAZWA_BIOMU[k.biom],
        nasycenie: stan.nasycenie,
        poziom: poziom(stan.exp),
        posiadaneUmiejetnosci: stan.umiejetnosci,
      });
      setOtwarty({ quest: q, kafel: null });
      setStan((s) => (s ? { ...s, podjete: s.podjete + 1 } : s));
    } catch (e) {
      toast.error((e as Error).message, { duration: 8000 });
    } finally {
      setKuje(false);
    }
  };

  if (!stan || !swiat) {
    return (
      <TworzeniePostaci
        naGotowe={(p: Postac) => {
          const s = generujTeterhie(p);
          setStan(nowyStan(p, s.start));
        }}
      />
    );
  }

  const m = metryki(stan);
  const { potrzeba, wPoziomie } = expDoNastepnego(stan.exp);
  const powodOdmowy = mozliwaWymiana(stan.mgrv);
  const kafel = kafelPod(swiat, stan.pozycja.x, stan.pozycja.y)!;
  const sekretneRazem = [...wezly.values()].filter((q) => q.sekretny).length;
  const sekretneWidoczne = [...widoczne].filter((i) => wezly.get(i)?.sekretny).length;
  const ukryte = sekretneRazem - sekretneWidoczne;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button onClick={() => { setWidok3d(false); localStorage.setItem('tgs_widok', '2d'); }} className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 ${!widok3d ? 'border-tgs-primary text-tgs-primary' : 'border-slate-700 text-slate-400'}`}><Grid3x3 size={13} /> plansza 2D</button>
          <button onClick={() => { setWidok3d(true); localStorage.setItem('tgs_widok', '3d'); }} className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 ${widok3d ? 'border-tgs-primary text-tgs-primary' : 'border-slate-700 text-slate-400'}`}><Box size={13} /> świat 3D</button>
          <button onClick={() => void zbudujWBlenderze()} disabled={buduje} className="ml-auto flex items-center gap-1 rounded-lg border border-amber-500/50 px-3 py-1.5 text-amber-200 disabled:opacity-50" title="Ten sam teren, który widzisz na planszy, zbudowany w Blenderze i wyeksportowany do .glb (ok. 30 s)">
            {buduje ? <Loader2 size={13} className="animate-spin" /> : '🧊'} {glb ? 'Przebuduj w Blenderze' : 'Zbuduj w Blenderze'}
          </button>
          <button onClick={() => setScenPanel((v) => !v)} className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 ${scenPanel ? 'border-fuchsia-400 text-fuchsia-200' : 'border-fuchsia-500/50 text-fuchsia-200'}`} title="Scenografia z kadru Story: kadr .png → studio w Blenderze → .glb → stoi w Twoim świecie">
            🎬 Scenografia z kadru Story{postawione.length ? ` (${postawione.length})` : ''}
          </button>
          <span className="text-slate-600">{npc.length} NPC ze stada{stan.postac.teogochi ? ` · grasz jako ${stan.postac.teogochi.forma} ${stan.postac.teogochi.imie}` : ''}</span>
        </div>
        {scenPanel && (
          <div className="rounded-xl border border-fuchsia-500/30 bg-tgs-panel p-3 text-xs">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="mb-1 text-[10px] uppercase tracking-widest text-slate-400">Z kadru Story → Blender → .glb</div>
                <select value={projektKadru} onChange={(e) => setProjektKadru(e.target.value)} className="mb-2 w-full rounded border border-slate-700 bg-black/40 px-2 py-1 text-slate-200">
                  {!projekty.length && <option value="">most milczy — brak projektów</option>}
                  {projekty.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <div className="grid max-h-56 grid-cols-3 gap-1.5 overflow-y-auto">
                  {!kadry.length && <div className="col-span-3 text-slate-500">Ten projekt nie ma kadrów z obrazem (.png) — policz je w kolejce KADR w Story.</div>}
                  {kadry.map((k) => (
                    <button key={k.id} onClick={() => void zbudujScenografieZKadru(k)} disabled={!!budujeScen} title={`${k.tytul}\n${k.opis}`} className="group relative overflow-hidden rounded border border-slate-700 hover:border-fuchsia-400 disabled:opacity-50">
                      <img src={`${BRIDGE}${k.plik}`} alt={k.tytul} className="aspect-video w-full object-cover" loading="lazy" />
                      <div className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-1 py-0.5 text-[9px] text-slate-200">{budujeScen === k.id ? '🧊 Blender…' : k.tytul}</div>
                    </button>
                  ))}
                </div>
                <div className="mt-1 text-[10px] text-slate-600">klik = studio z tego kadru (cyklorama, podłoga, światło) w Blenderze → od razu staje tam, gdzie stoisz</div>
              </div>
              <div>
                <div className="mb-1 text-[10px] uppercase tracking-widest text-slate-400">Biblioteka scenografii ({scenografie.length}) · w tym świecie ({postawione.length})</div>
                <div className="max-h-28 space-y-1 overflow-y-auto">
                  {scenografie.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 rounded border border-slate-800 px-2 py-1">
                      <span className="flex-1 truncate text-slate-200" title={s.opis}>{s.nazwa} <span className="text-slate-600">· {s.projekt} · {(s.bajtow / 1e6).toFixed(1)} MB</span></span>
                      <button onClick={() => postaw(s)} className="rounded border border-fuchsia-500/50 px-2 py-0.5 text-[10px] text-fuchsia-200">postaw tutaj</button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 max-h-32 space-y-1 overflow-y-auto">
                  {postawione.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 rounded border border-slate-800 px-2 py-1">
                      <span className="flex-1 truncate text-slate-300">{p.nazwa} <span className="text-slate-600">({p.x}, {p.y})</span></span>
                      <label className="text-slate-500">skala <input type="number" step={0.05} min={0.05} max={2} value={p.skala} onChange={(e) => zmienPostawiona(p.id, { skala: Number(e.target.value) || 0.25 })} className="w-14 rounded border border-slate-700 bg-black/40 px-1 text-slate-200" /></label>
                      <label className="text-slate-500">obrót <input type="number" step={15} value={p.obrot} onChange={(e) => zmienPostawiona(p.id, { obrot: Number(e.target.value) || 0 })} className="w-14 rounded border border-slate-700 bg-black/40 px-1 text-slate-200" /></label>
                      <button onClick={() => zmienPostawiona(p.id, { x: stan.pozycja.x, y: stan.pozycja.y })} className="text-[10px] text-slate-400 hover:text-white" title="przenieś tam, gdzie stoisz">tu</button>
                      <button onClick={() => zdejmij(p.id)} className="text-[10px] text-slate-500 hover:text-red-400">zdejmij</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {widok3d ? (
          <Swiat3D swiat={swiat} postac={stan.postac} pozycja={stan.pozycja} npc={npc} wezly={widoczne} ukonczone={new Set(stan.ukonczone)} glb={glb} scenografie={postawione} onNpc={otworzRozmowe} />
        ) : (
          <Plansza
            swiat={swiat}
            postac={stan.postac}
            pozycja={stan.pozycja}
            nasycenie={stan.nasycenie}
            wezly={widoczne}
            ukonczone={new Set(stan.ukonczone)}
          />
        )}
        {rozmowa && (
          <div className="rounded-xl border p-3 text-sm" style={{ borderColor: `${rozmowa.npc.kolor}77` }}>
            <div className="mb-2 flex items-center justify-between">
              <span style={{ color: rozmowa.npc.kolor }}>{rozmowa.npc.forma} <b>{rozmowa.npc.imie}</b> <span className="text-xs text-slate-500">· {rozmowa.npc.rola} · {rozmowa.npc.dziedzina}</span></span>
              <button onClick={() => setRozmowa(null)} className="text-xs text-slate-500 hover:text-white">zamknij</button>
            </div>
            <div className="max-h-40 space-y-1 overflow-y-auto text-xs">
              {!rozmowa.historia.length && <div className="text-slate-500">Powiedz coś — odpowie prawdziwy TeOgochi przez most (Ollama, lokalnie).</div>}
              {rozmowa.historia.map((h, i) => <div key={i} className={h.kto === 'gracz' ? 'text-right text-slate-300' : ''} style={h.kto === 'npc' ? { color: rozmowa.npc.kolor } : {}}>{h.tresc}</div>)}
              {rozmowa.czeka && <div className="text-slate-500"><Loader2 size={11} className="inline animate-spin" /> myśli…</div>}
            </div>
            <div className="mt-2 flex gap-2">
              <input value={rozmowa.tekst} onChange={(e) => setRozmowa({ ...rozmowa, tekst: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') void powiedzNpc(); e.stopPropagation(); }} placeholder="np. gdzie tu szukać Sosu?" className="flex-1 rounded-lg border border-slate-700 bg-black/40 px-2 py-1.5 text-xs outline-none" />
              <button onClick={() => void powiedzNpc()} disabled={rozmowa.czeka} className="rounded-lg px-3 text-xs font-bold text-black disabled:opacity-40" style={{ backgroundColor: rozmowa.npc.kolor }}>mów</button>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span>WSAD / strzałki — ruch</span>
          <span>·</span>
          <span>{NAZWA_BIOMU[kafel.biom]}</span>
          <span>·</span>
          <span>{swiat.nazwa}</span>
          {ukryte > 0 && (
            <span className="text-amber-500/80">
              · {ukryte} {ukryte === 1 ? 'quest schowany' : 'questów schowanych'} we mgle
            </span>
          )}
        </div>
      </div>

      <aside className="space-y-4">
        <section className="rounded-xl border border-slate-800 bg-tgs-panel p-4">
          <div className="mb-1 flex items-baseline justify-between">
            <h3 className="font-semibold">{stan.postac.imie}</h3>
            <span className="text-xs text-slate-500">poziom {poziom(stan.exp)}</span>
          </div>
          <p className="mb-3 text-xs text-slate-500">{stanSwiata(stan.nasycenie)}</p>

          <label className="text-xs text-slate-400">Nasycenie barw · {stan.nasycenie}/100</label>
          <div className="mb-3 mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${stan.nasycenie}%`, background: barwa(150, stan.nasycenie, 55) }}
            />
          </div>

          <label className="text-xs text-slate-400">
            EXP · {wPoziomie}/{potrzeba}
          </label>
          <div className="mb-3 mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-tgs-accent" style={{ width: `${(wPoziomie / potrzeba) * 100}%` }} />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-tgs-grv">{stan.mgrv} mGRV</span>
            <span className="text-xs text-slate-500">kurs ×{kurs(m)}</span>
          </div>
          <button
            disabled
            title={powodOdmowy ?? ''}
            className="mt-2 w-full cursor-not-allowed rounded border border-slate-800 py-1.5 text-xs text-slate-500"
          >
            Wymień na GRV 🔒
          </button>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{powodOdmowy}</p>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={poprosKustosza}
            disabled={kuje}
            className="flex items-center justify-center gap-2 rounded-lg bg-tgs-accent py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <Sparkles size={15} />
            {kuje ? 'Kuje…' : 'Kustosz'}
          </button>
          <button
            onClick={() => setPlecak(!plecak)}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 py-2 text-sm hover:border-slate-500"
          >
            <Backpack size={15} />
            Plecak
          </button>
        </div>

        {plecak && <Plecak postac={stan.postac} umiejetnosci={stan.umiejetnosci} />}

        <button
          onClick={() => {
            if (!confirm('Skasować postać i świat? Tej Teterhii nie da się odzyskać inaczej niż tymi samymi wkładkami.')) return;
            skasuj();
            setStan(null);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-800 py-2 text-xs text-slate-500 hover:border-red-900 hover:text-red-400"
        >
          <RotateCcw size={13} />
          Nowa postać
        </button>
      </aside>

      {otwarty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-tgs-panel p-6">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-tgs-primary">{otwarty.quest.tytul}</h3>
              <span className="text-[10px] uppercase tracking-wider text-slate-600">
                {otwarty.quest.zrodlo === 'kustosz' ? 'kustosz · lokalny model' : 'ziarno świata'}
              </span>
            </div>
            <p className="mb-5 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{otwarty.quest.tresc}</p>
            <div className="space-y-2">
              {otwarty.quest.wybory.map((w, i) => (
                <button
                  key={i}
                  onClick={() => rozstrzygnij(w.ton)}
                  className="group w-full rounded-lg border border-slate-700 px-4 py-3 text-left text-sm transition hover:border-tgs-primary"
                >
                  {w.tekst}
                  {/* Ton pokazujemy dopiero po najechaniu: gra ma stawiać przed
                      wyborem, nie przed tabelką punktów. */}
                  <span className="ml-2 text-[10px] uppercase tracking-wider text-slate-700 opacity-0 transition group-hover:opacity-100">
                    {OPIS_TONU[w.ton]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
