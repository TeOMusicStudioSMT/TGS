/**
 * 🌍 Teterhia — generator świata 2D (punkt 2 specyfikacji).
 *
 * Świat jest DETERMINISTYCZNĄ wypadkową postaci: całość liczy się z ziarna
 * (patrz postac.ts → ziarnoPostaci). Ta sama postać = ta sama Teterhia, zawsze.
 * Żywioł przesuwa paletę i rozkład biomów, wkładki Suwerena mieszają ziarno.
 *
 * Szum: wartościowy (value noise) na rzadkiej siatce + wygładzenie. Prosty
 * świadomie — ma chodzić na słabej maszynie bez GPU, w Canvas 2D.
 */
import { losowarka, lerp, gladko } from './rdzen';
import { ziarnoPostaci, zywiolPostaci, type Postac } from './postac';

export const SZEROKOSC = 48;
export const WYSOKOSC = 32;

export type Biom = 'strumien' | 'gaj' | 'rownina' | 'grzbiet' | 'pustka';

export interface Kafel {
  biom: Biom;
  /** 0..1 — wysokość terenu. */
  wys: number;
  /** Odchylenie odcienia od palety biomu — daje ziarnistość. */
  odchylHue: number;
  /** Kafel z sekretem: widoczny dopiero powyżej progu nasycenia. */
  sekret: boolean;
}

export interface Swiat {
  nazwa: string;
  ziarno: number;
  kafle: Kafel[];
  /** Pozycja startowa gracza. */
  start: { x: number; y: number };
}

/** Bazowy odcień biomu, przesunięty żywiołem postaci. */
export const HUE_BIOMU: Record<Biom, number> = {
  strumien: 195,
  gaj: 120,
  rownina: 65,
  grzbiet: 25,
  pustka: 275,
};

export const PRZEJSCIE: Record<Biom, boolean> = {
  strumien: true,
  gaj: true,
  rownina: true,
  grzbiet: false, // grzbietów nie przejdziesz — świat ma kształt
  pustka: true,
};

export const NAZWA_BIOMU: Record<Biom, string> = {
  strumien: 'Strumień',
  gaj: 'Gaj',
  rownina: 'Równina',
  grzbiet: 'Grzbiet',
  pustka: 'Pustka',
};

/** Value noise: rzadka siatka losowych wartości + dwuliniowa interpolacja. */
function szum(los: () => number, gestosc: number): (x: number, y: number) => number {
  const w = Math.ceil(SZEROKOSC / gestosc) + 2;
  const h = Math.ceil(WYSOKOSC / gestosc) + 2;
  const siatka = Array.from({ length: w * h }, () => los());
  return (x, y) => {
    const gx = x / gestosc;
    const gy = y / gestosc;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const tx = gladko(gx - x0);
    const ty = gladko(gy - y0);
    const v = (i: number, j: number) => siatka[Math.min(h - 1, j) * w + Math.min(w - 1, i)];
    return lerp(lerp(v(x0, y0), v(x0 + 1, y0), tx), lerp(v(x0, y0 + 1), v(x0 + 1, y0 + 1), tx), ty);
  };
}

/** Ile świata zajmuje dany biom — żywioł przechyla rozkład. */
function progiBiomow(zywiol: string): { woda: number; gaj: number; rownina: number } {
  switch (zywiol) {
    case 'woda': return { woda: 0.42, gaj: 0.62, rownina: 0.82 };
    case 'ogien': return { woda: 0.18, gaj: 0.34, rownina: 0.62 };
    case 'ziemia': return { woda: 0.26, gaj: 0.58, rownina: 0.86 };
    case 'powietrze': return { woda: 0.24, gaj: 0.40, rownina: 0.88 };
    default: return { woda: 0.30, gaj: 0.48, rownina: 0.74 }; // eter — najbardziej mieszany
  }
}

export function generujTeterhie(p: Postac): Swiat {
  const ziarno = ziarnoPostaci(p);
  const los = losowarka(ziarno);
  const zywiol = zywiolPostaci(p);

  const teren = szum(los, 7);
  const wilgoc = szum(los, 11);
  const progi = progiBiomow(p.zywiol);

  // Eter jest „między" — mniej stabilny, więcej sekretów (opis żywiołu to obiecuje).
  const szansaSekretu = p.zywiol === 'eter' ? 0.05 : 0.03;

  const kafle: Kafel[] = [];
  for (let y = 0; y < WYSOKOSC; y++) {
    for (let x = 0; x < SZEROKOSC; x++) {
      const h = teren(x, y);
      const w = wilgoc(x, y);
      let biom: Biom;
      if (h < progi.woda) biom = 'strumien';
      else if (h < progi.gaj) biom = w > 0.5 ? 'gaj' : 'rownina';
      else if (h < progi.rownina) biom = 'rownina';
      else biom = 'grzbiet';
      // Pustka: rzadkie wyrwy tam, gdzie wilgoć skrajnie niska — dziury w tkaninie świata.
      if (biom !== 'strumien' && w < 0.12) biom = 'pustka';

      kafle.push({
        biom,
        wys: h,
        odchylHue: (los() - 0.5) * 26 + zywiol.hue * 0.06,
        sekret: PRZEJSCIE[biom] && los() < szansaSekretu,
      });
    }
  }

  // Start: pierwszy przechodni kafel od środka, spiralnie na zewnątrz.
  const sx = Math.floor(SZEROKOSC / 2);
  const sy = Math.floor(WYSOKOSC / 2);
  let start = { x: sx, y: sy };
  szukanie: for (let r = 0; r < Math.max(SZEROKOSC, WYSOKOSC); r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = sx + dx;
        const y = sy + dy;
        if (x < 0 || y < 0 || x >= SZEROKOSC || y >= WYSOKOSC) continue;
        if (PRZEJSCIE[kafle[y * SZEROKOSC + x].biom]) { start = { x, y }; break szukanie; }
      }
    }
  }

  return { nazwa: nazwijTeterhie(ziarno), ziarno, kafle, start };
}

const CZLON_A = ['Tet', 'Ver', 'Sol', 'Nym', 'Kor', 'Ael', 'Rhe', 'Zan'];
const CZLON_B = ['erhia', 'andra', 'ulis', 'oria', 'esse', 'ynth', 'arum'];

function nazwijTeterhie(ziarno: number): string {
  const los = losowarka(ziarno ^ 0x5bf03635);
  const a = CZLON_A[Math.floor(los() * CZLON_A.length)];
  const b = CZLON_B[Math.floor(los() * CZLON_B.length)];
  return a + b;
}

export const kafelPod = (s: Swiat, x: number, y: number): Kafel | null =>
  x < 0 || y < 0 || x >= SZEROKOSC || y >= WYSOKOSC ? null : s.kafle[y * SZEROKOSC + x];
