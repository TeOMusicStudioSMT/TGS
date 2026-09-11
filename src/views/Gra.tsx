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
import { Sparkles, RotateCcw, Backpack } from 'lucide-react';
import { generujTeterhie, kafelPod, PRZEJSCIE, NAZWA_BIOMU, SZEROKOSC, type Swiat } from '../gra/teterhia';
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

  const postac = stan?.postac;
  const swiat = useMemo(() => (postac ? generujTeterhie(postac) : null), [postac]);
  const wezly = useMemo(() => (swiat ? wezlySwiata(swiat) : new Map<number, Quest>()), [swiat]);

  const nasycenie = stan?.nasycenie ?? 0;

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
        <Plansza
          swiat={swiat}
          postac={stan.postac}
          pozycja={stan.pozycja}
          nasycenie={stan.nasycenie}
          wezly={widoczne}
          ukonczone={new Set(stan.ukonczone)}
        />
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
