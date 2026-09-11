/**
 * 🗺️ Plansza Teterhii — Canvas 2D.
 *
 * Tu mechanika #8 przestaje być liczbą i staje się obrazem: nasycenie gracza
 * jedzie WPROST do kanału S każdego kafla. Spadnie — świat naprawdę szarzeje.
 * „Tańczące kolory strumienia" to powolny dryf odcienia liczony z czasu.
 *
 * Świadomie Canvas, nie WebGL: ma chodzić na słabej maszynie bez GPU.
 *
 * ⚠️ RYSUNEK NIE ZALEŻY OD requestAnimationFrame. Przeglądarka wstrzymuje rAF
 * w ukrytej karcie (zmierzone: visibilityState 'hidden' → zero klatek → czarna
 * plansza). Dlatego każdy ruch i każda zmiana nasycenia maluje klatkę
 * SYNCHRONICZNIE, a pętla animacji dokłada tylko taniec barw. Świat jest
 * poprawny nawet wtedy, gdy nic się nie animuje.
 */
import { useEffect, useRef } from 'react';
import { SZEROKOSC, WYSOKOSC, HUE_BIOMU, PRZEJSCIE, type Swiat } from '../../gra/teterhia';
import { barwa } from '../../gra/sos';
import type { Postac } from '../../gra/postac';

const KAFEL = 16;

interface Props {
  swiat: Swiat;
  postac: Postac;
  pozycja: { x: number; y: number };
  nasycenie: number;
  /** Indeksy kafli z widocznym questem (już przefiltrowane progiem odkrycia). */
  wezly: Set<number>;
  /** Indeksy questów już ukończonych. */
  ukonczone: Set<number>;
}

export default function Plansza(props: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  // Ref, żeby pętla rysująca nie restartowała się przy każdym kroku gracza.
  const dane = useRef<Props>(props);
  dane.current = props;
  const rysuj = useRef<(czas: number) => void>(() => {});

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    rysuj.current = (czas: number) => {
      const d = dane.current;
      // Wzrok: Wędrowiec widzi dalej. Poza zasięgiem świat gaśnie — nie znika,
      // tylko przestaje mówić. Mgła jest miękka, żeby nie ciąć kwadratem.
      const zasieg = d.postac.droga === 'wedrowiec' ? 13 : 9;
      const dryf = (czas / 120) % 360;

      for (let y = 0; y < WYSOKOSC; y++) {
        for (let x = 0; x < SZEROKOSC; x++) {
          const i = y * SZEROKOSC + x;
          const k = d.swiat.kafle[i];
          const dist = Math.hypot(x - d.pozycja.x, y - d.pozycja.y);
          const widok = Math.max(0.14, Math.min(1, 1.25 - dist / zasieg));

          // Strumień dostaje mocniejszy dryf — to on „tańczy".
          const wlasnyDryf = k.biom === 'strumien' ? dryf : dryf * 0.25;
          const jasnosc = (18 + k.wys * 34) * widok + 4;
          ctx.fillStyle = barwa(HUE_BIOMU[k.biom] + k.odchylHue, d.nasycenie * widok, jasnosc, wlasnyDryf);
          ctx.fillRect(x * KAFEL, y * KAFEL, KAFEL, KAFEL);

          if (!PRZEJSCIE[k.biom]) {
            ctx.fillStyle = `rgba(0,0,0,${0.28 * widok})`;
            ctx.fillRect(x * KAFEL, y * KAFEL + KAFEL - 4, KAFEL, 4);
          }

          if (d.wezly.has(i) && widok > 0.2) {
            const zrobiony = d.ukonczone.has(i);
            const puls = zrobiony ? 0.35 : 0.55 + 0.45 * Math.sin(czas / 320 + i);
            ctx.beginPath();
            ctx.arc(x * KAFEL + KAFEL / 2, y * KAFEL + KAFEL / 2, zrobiony ? 3 : 4.5, 0, Math.PI * 2);
            ctx.fillStyle = zrobiony
              ? `rgba(120,140,160,${0.5 * widok})`
              : barwa(48, Math.max(40, d.nasycenie), 62 + puls * 12);
            ctx.fill();
          }
        }
      }

      // Gracz
      const px = d.pozycja.x * KAFEL + KAFEL / 2;
      const py = d.pozycja.y * KAFEL + KAFEL / 2;
      ctx.beginPath();
      ctx.arc(px, py, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = barwa(280, Math.max(30, d.nasycenie), 60, dryf);
      ctx.stroke();
    };

    // Pierwsza klatka od razu — zanim rAF w ogóle dostanie szansę.
    rysuj.current(performance.now());

    let klatka = 0;
    const petla = (czas: number) => {
      rysuj.current(czas);
      klatka = requestAnimationFrame(petla);
    };
    klatka = requestAnimationFrame(petla);

    // Powrót do karty: rAF wstawał z opóźnieniem, plansza mrugała starym stanem.
    const naPowrocie = () => rysuj.current(performance.now());
    document.addEventListener('visibilitychange', naPowrocie);

    return () => {
      cancelAnimationFrame(klatka);
      document.removeEventListener('visibilitychange', naPowrocie);
    };
  }, []);

  // Każda zmiana stanu maluje natychmiast — bez czekania na klatkę animacji.
  useEffect(() => {
    rysuj.current(performance.now());
  }, [props.pozycja.x, props.pozycja.y, props.nasycenie, props.wezly, props.ukonczone, props.swiat]);

  return (
    <canvas
      ref={ref}
      width={SZEROKOSC * KAFEL}
      height={WYSOKOSC * KAFEL}
      className="w-full max-w-full rounded-xl border border-slate-800"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
