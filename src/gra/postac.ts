/**
 * 🧬 Moduł tworzenia postaci + wkładki Suwerena (punkt 1 specyfikacji).
 *
 * Wkładki to NIE ozdoba. Wolne słowa wpisane przez gracza wchodzą wprost do
 * ziarna świata — dwie postaci z tym samym żywiołem, ale innymi wkładkami,
 * dostają inną Teterhię. Tak „świat jest wypadkową postaci" staje się mierzalne.
 */
import { hash } from './rdzen';

export const ZYWIOLY = [
  { id: 'ogien', nazwa: 'Ogień', hue: 12, opis: 'Impuls. Świat odpowiada ostrymi grzbietami i żarem.' },
  { id: 'woda', nazwa: 'Woda', hue: 200, opis: 'Przepływ. Teterhia rozlewa się strumieniami i zatokami.' },
  { id: 'ziemia', nazwa: 'Ziemia', hue: 96, opis: 'Trwanie. Gęste gaje, gliniaste płaskowyże.' },
  { id: 'powietrze', nazwa: 'Powietrze', hue: 168, opis: 'Lekkość. Rozrzedzone równiny, dużo nieba.' },
  { id: 'eter', nazwa: 'Eter', hue: 280, opis: 'Między. Świat mniej stabilny — i przez to bogatszy w sekrety.' },
] as const;

export const DROGI = [
  { id: 'tworca', nazwa: 'Twórca', opis: 'Więcej mGRV za autentyczność (WOW ×1.25).' },
  { id: 'opiekun', nazwa: 'Opiekun', opis: 'Empatia podnosi nasycenie mocniej (×1.3).' },
  { id: 'wedrowiec', nazwa: 'Wędrowiec', opis: 'Większy zasięg wzroku — sekrety widać z dalsza.' },
  { id: 'badacz', nazwa: 'Badacz', opis: 'Niższy próg odkrycia sekretów (−8 nasycenia).' },
] as const;

export type ZywiolId = (typeof ZYWIOLY)[number]['id'];
export type DrogaId = (typeof DROGI)[number]['id'];

export interface Postac {
  imie: string;
  zywiol: ZywiolId;
  droga: DrogaId;
  /** Wkładki Suwerena — wolne słowa. Wchodzą w ziarno świata. */
  wkladki: string[];
  utworzona: number;
}

/** Ziarno świata = wypadkowa CAŁEJ postaci. Kolejność wkładek nieistotna. */
export function ziarnoPostaci(p: Postac): number {
  const wkladki = [...p.wkladki].map((w) => w.trim().toLowerCase()).filter(Boolean).sort();
  return hash(`${p.imie.trim().toLowerCase()}|${p.zywiol}|${p.droga}|${wkladki.join(',')}`);
}

export const zywiolPostaci = (p: Postac) => ZYWIOLY.find((z) => z.id === p.zywiol)!;
export const drogaPostaci = (p: Postac) => DROGI.find((d) => d.id === p.droga)!;
