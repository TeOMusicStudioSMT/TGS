/**
 * 🎨 Sos — Autentyczność i Barwa (punkt 8, cel główny punkt 6).
 *
 * Sedno gry: „im gra jest Autentyczna i empatyczna, holistyczna — tym barwna;
 * zaś sztuczność i brutalność — wyblakła, i wielu questów nawet nie da się odkryć".
 *
 * ⚠️ TO NIE JEST LICZNIK OZDOBNY. Nasycenie realnie steruje renderem planszy
 * (kanał S w HSL) ORAZ widocznością sekretów. Zejdź poniżej progu — sekrety
 * znikają z planszy i nie da się w nie wejść. Mechanika, nie deklaracja.
 */
import type { Postac } from './postac';

export type Ton = 'autentyczny' | 'empatyczny' | 'holistyczny' | 'sztuczny' | 'brutalny';

/** Ile punktów nasycenia daje jeden wybór o danym tonie. */
export const WAGA_TONU: Record<Ton, number> = {
  autentyczny: +6,
  empatyczny: +5,
  holistyczny: +7,
  sztuczny: -8,
  brutalny: -12,
};

export const OPIS_TONU: Record<Ton, string> = {
  autentyczny: 'autentyczny',
  empatyczny: 'empatyczny',
  holistyczny: 'holistyczny',
  sztuczny: 'sztuczny',
  brutalny: 'brutalny',
};

export const NASYCENIE_STARTOWE = 50;
const PROG_BAZOWY = 55;

/** Próg, powyżej którego sekrety Teterhii stają się widoczne. Badacz ma niżej. */
export function progOdkrycia(p: Postac): number {
  return p.droga === 'badacz' ? PROG_BAZOWY - 8 : PROG_BAZOWY;
}

/** Nowe nasycenie po wyborze. Droga Opiekuna wzmacnia empatię. */
export function poWyborze(nasycenie: number, ton: Ton, p: Postac): number {
  let delta = WAGA_TONU[ton];
  if (p.droga === 'opiekun' && ton === 'empatyczny') delta *= 1.3;
  return Math.max(0, Math.min(100, Math.round(nasycenie + delta)));
}

/**
 * Barwa kafla w HSL. Nasycenie gracza JEST kanałem S — świat blaknie dosłownie.
 * `dryf` to „tańczące kolory strumienia": powolne przesunięcie odcienia w czasie.
 */
export function barwa(hue: number, nasycenie: number, jasnosc: number, dryf = 0): string {
  const h = (((hue + dryf) % 360) + 360) % 360;
  const s = Math.max(2, Math.min(100, nasycenie));
  return `hsl(${h.toFixed(1)} ${s.toFixed(0)}% ${jasnosc.toFixed(0)}%)`;
}

/** Krótki opis stanu świata — to, co gracz czyta na pasku. */
export function stanSwiata(nasycenie: number): string {
  if (nasycenie >= 85) return 'Teterhia śpiewa. Strumień tańczy pełnią barw.';
  if (nasycenie >= 70) return 'Świat nasyca się. Sekrety wychodzą z mgły.';
  if (nasycenie >= 55) return 'Barwa wraca. Coś zaczyna prześwitywać.';
  if (nasycenie >= 35) return 'Kolory przygasają. Sekrety schowały się.';
  if (nasycenie >= 15) return 'Świat blednie. Strumień milknie.';
  return 'Szarość. Teterhia przestała odpowiadać.';
}
