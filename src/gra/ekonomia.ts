/**
 * 💎 mGRV i EXP (punkt 3 specyfikacji).
 *
 * mGRV = mini-GRV dla gier. Kurs dynamiczny: f(Popularność, Aktywność,
 * Efektywność, WOW). Skumulowane mGRV mają dawać prawdziwego GRV.
 *
 * ⚠️ UCZCIWIE: wymiana mGRV → GRV NIE JEST PODŁĄCZONA. Most ma księgę GRV
 * (/api/grv/ledger, /api/grv/mint-respiration), ale nie ma trasy, która
 * przyjęłaby mGRV z gry. Dopóki jej nie ma, `mozliwaWymiana()` zwraca powód
 * odmowy, a UI pokazuje kłódkę — zamiast udawać przelew, którego nie ma.
 */

export interface Metryki {
  /** 0..1 — ilu graczy dotyka tego świata. Na razie zawsze 0: sieci nie ma. */
  popularnosc: number;
  /** 0..1 — jak żywa jest sesja (ruchy, wejścia w questy). */
  aktywnosc: number;
  /** 0..1 — ile questów kończy się sukcesem względem podjętych. */
  efektywnosc: number;
  /** 0..1 — udział wyborów holistycznych i autentycznych. */
  wow: number;
}

export const METRYKI_ZEROWE: Metryki = { popularnosc: 0, aktywnosc: 0, efektywnosc: 0, wow: 0 };

/** Ile mGRV trzeba skumulować na 1 GRV. */
export const PROG_WYMIANY = 1000;

/**
 * Kurs mGRV — mnożnik nagrody. WOW waży najmocniej, bo to on odróżnia
 * autentyczną kreację od mielenia questów.
 */
export function kurs(m: Metryki): number {
  const s =
    0.15 * m.popularnosc +
    0.20 * m.aktywnosc +
    0.25 * m.efektywnosc +
    0.40 * m.wow;
  return Number((0.5 + 1.5 * s).toFixed(3)); // 0.5× (martwo) … 2.0× (pełnia)
}

/** Nagroda za quest: baza × kurs, zaokrąglona. Twórca ma premię do WOW. */
export function nagrodaMGRV(baza: number, m: Metryki, premiaWow = 1): number {
  return Math.round(baza * kurs({ ...m, wow: Math.min(1, m.wow * premiaWow) }));
}

/** EXP → poziom. Progi rosną kwadratowo. */
export function poziom(exp: number): number {
  return Math.floor(Math.sqrt(exp / 25)) + 1;
}

export function expDoNastepnego(exp: number): { potrzeba: number; wPoziomie: number } {
  const p = poziom(exp);
  const dolny = 25 * (p - 1) ** 2;
  const gorny = 25 * p ** 2;
  return { potrzeba: gorny - dolny, wPoziomie: exp - dolny };
}

/** Czy da się wymienić mGRV na GRV? Zwraca powód odmowy albo null. */
export function mozliwaWymiana(mgrv: number): string | null {
  if (mgrv < PROG_WYMIANY) return `Potrzeba ${PROG_WYMIANY} mGRV (masz ${mgrv}).`;
  return 'Most nie ma trasy POST /api/tgs/wymiana — wymiana mGRV→GRV jeszcze nie istnieje.';
}
