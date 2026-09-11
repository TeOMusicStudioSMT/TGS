/**
 * 💾 Stan gry — suwerennie, w localStorage. Zero chmury.
 *
 * Świata NIE zapisujemy: jest deterministyczny z postaci, więc odtwarza się
 * w milisekundy. Zapisujemy tylko to, czego nie da się przeliczyć — drogę gracza.
 */
import type { Postac } from './postac';
import { NASYCENIE_STARTOWE, type Ton } from './sos';
import { METRYKI_ZEROWE, type Metryki } from './ekonomia';

const KLUCZ = 'tgs_stan_v1';

export interface StanGry {
  postac: Postac;
  pozycja: { x: number; y: number };
  nasycenie: number;
  mgrv: number;
  exp: number;
  umiejetnosci: string[];
  /** Ukończone questy — po id kafla, żeby ten sam kafel nie oddawał nagrody dwa razy. */
  ukonczone: number[];
  /** Historia tonów — podstawa metryki WOW. */
  tony: Ton[];
  podjete: number;
  kroki: number;
}

export function nowyStan(postac: Postac, start: { x: number; y: number }): StanGry {
  return {
    postac,
    pozycja: { ...start },
    nasycenie: NASYCENIE_STARTOWE,
    mgrv: 0,
    exp: 0,
    umiejetnosci: [],
    ukonczone: [],
    tony: [],
    podjete: 0,
    kroki: 0,
  };
}

export function wczytaj(): StanGry | null {
  try {
    const s = localStorage.getItem(KLUCZ);
    if (!s) return null;
    const d = JSON.parse(s) as StanGry;
    return d?.postac?.imie ? d : null;
  } catch {
    return null;
  }
}

export function zapisz(stan: StanGry): void {
  try {
    localStorage.setItem(KLUCZ, JSON.stringify(stan));
  } catch {
    /* pełny storage — gra działa dalej, tylko bez zapisu */
  }
}

export function skasuj(): void {
  try { localStorage.removeItem(KLUCZ); } catch { /* nic */ }
}

/** Metryki liczone ZE STANU — nie z powietrza. */
export function metryki(stan: StanGry): Metryki {
  const dobre = stan.tony.filter((t) => t === 'autentyczny' || t === 'holistyczny' || t === 'empatyczny').length;
  return {
    ...METRYKI_ZEROWE,
    // Popularność zostaje 0: sieci graczy nie ma, więc nie zmyślam liczby.
    aktywnosc: Math.min(1, stan.kroki / 400),
    efektywnosc: stan.podjete === 0 ? 0 : stan.ukonczone.length / stan.podjete,
    wow: stan.tony.length === 0 ? 0 : dobre / stan.tony.length,
  };
}
