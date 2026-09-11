/**
 * 🎲 Rdzeń determinizmu Teterhii.
 *
 * Punkt 2 specyfikacji: „świat wygenerowany jest wypadkową punktu 1" — czyli
 * postaci. To musi być PRAWDA, nie ozdobnik: ta sama postać ma dawać ten sam
 * świat na każdej maszynie i po każdym restarcie. Dlatego zero Math.random()
 * w generatorze — wszystko jedzie z ziarna policzonego z cech gracza.
 */

/** FNV-1a 32-bit — stabilny hash tekstu na ziarno. */
export function hash(tekst: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < tekst.length; i++) {
    h ^= tekst.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — mały, szybki PRNG. Zwraca funkcję dającą liczby [0,1). */
export function losowarka(ziarno: number): () => number {
  let a = ziarno >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Wybór elementu z listy — deterministyczny, przez podaną losowarkę. */
export function wybierz<T>(los: () => number, lista: readonly T[]): T {
  return lista[Math.floor(los() * lista.length)];
}

/** Interpolacja liniowa. */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Wygładzenie krawędzi (smoothstep) — miękkie przejścia biomów. */
export const gladko = (t: number) => t * t * (3 - 2 * t);
