/**
 * 🎨🔍 Poprawki brył w podglądzie (Suweren 2026-10-08: „kolor i zagęszczenie fragmentu”).
 *
 * Kolor: TA SAMA matematyka co most (services/Siatka3D.js → przekoloruj/poziomy) — suwaki pokazują na żywo
 * to, co most zapisze w nowej wersji. Zmieniasz jedno — zmień oba (test w moście: tests/bryly-poprawki.test.mjs).
 * Fragment: zaznaczenie na obrazie źródłowym → pudełko w ułamkach ramki bryły (lewo obrazu = −X, góra = +Y,
 * zmierzone na 5 bryłach TRELLIS.2 2026-10-08), przez ramkę sylwetki z mostu (`/api/assety3d/:id/sylwetka`).
 */
import type { Wycinek } from './tworzenie';

export interface UstawieniaKoloru { jasnosc: number; kontrast: number; nasycenie: number; odcien: number; czern: number; auto: boolean; }
export const KOLOR_ZERO: UstawieniaKoloru = { jasnosc: 0, kontrast: 0, nasycenie: 0, odcien: 0, czern: 0, auto: false };
export const bezZmian = (k: UstawieniaKoloru) => !k.auto && !k.jasnosc && !k.kontrast && !k.nasycenie && !k.odcien && !k.czern;

const doSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const doLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const obetnij = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lumi = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function obrocOdcien(r: number, g: number, b: number, stopnie: number): [number, number, number] {
    const a = (stopnie * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    return [
        r * (0.213 + c * 0.787 - s * 0.213) + g * (0.715 - c * 0.715 - s * 0.715) + b * (0.072 - c * 0.072 + s * 0.928),
        r * (0.213 - c * 0.213 + s * 0.143) + g * (0.715 + c * 0.285 + s * 0.140) + b * (0.072 - c * 0.072 - s * 0.283),
        r * (0.213 - c * 0.213 - s * 0.787) + g * (0.715 - c * 0.715 + s * 0.715) + b * (0.072 + c * 0.928 + s * 0.072),
    ];
}

/** Poziomy z percentyli luminancji (1% / 99%) w sRGB — jak `poziomy` w moście. */
export function poziomy(kolory: ArrayLike<number>) {
    const n = kolory.length / 3, krok = Math.max(1, Math.floor(n / 20000)), L: number[] = [];
    for (let v = 0; v < n; v += krok) L.push(lumi(doSrgb(kolory[v * 3]), doSrgb(kolory[v * 3 + 1]), doSrgb(kolory[v * 3 + 2])));
    L.sort((x, y) => x - y);
    const q = (p: number) => L[Math.min(L.length - 1, Math.floor(p * L.length))] ?? 0;
    return { czern: q(0.01), biel: q(0.99), srednia: L.reduce((s, x) => s + x, 0) / (L.length || 1) };
}

/** Kolory liniowe (jak COLOR_0) → poprawione. Kolejność: poziomy → odcień → nasycenie → kontrast → czerń → jasność. */
export function przekoloruj(kolory: ArrayLike<number>, k: UstawieniaKoloru, pz = k.auto ? poziomy(kolory) : null): Float32Array {
    const out = new Float32Array(kolory.length);
    const lo = pz ? pz.czern : 0, rozp = pz ? Math.max(0.05, pz.biel - pz.czern) : 1;
    const gamma = 2 ** -Math.max(-1, Math.min(1, k.jasnosc || 0));
    const kk = 1 + Math.max(-1, Math.min(1, k.kontrast || 0));
    const s = 1 + Math.max(-1, Math.min(1, k.nasycenie || 0));
    const h = k.odcien || 0;
    const cz = Math.max(0, Math.min(1, k.czern || 0));
    for (let i = 0; i < kolory.length; i += 3) {
        let r = doSrgb(kolory[i]), g = doSrgb(kolory[i + 1]), b = doSrgb(kolory[i + 2]);
        if (pz) { r = obetnij((r - lo) / rozp); g = obetnij((g - lo) / rozp); b = obetnij((b - lo) / rozp); }
        if (h) [r, g, b] = obrocOdcien(r, g, b, h).map(obetnij) as [number, number, number];
        if (s !== 1) { const L = lumi(r, g, b); r = obetnij(L + (r - L) * s); g = obetnij(L + (g - L) * s); b = obetnij(L + (b - L) * s); }
        if (kk !== 1) { r = obetnij((r - 0.5) * kk + 0.5); g = obetnij((g - 0.5) * kk + 0.5); b = obetnij((b - 0.5) * kk + 0.5); }
        if (cz) { r = cz + r * (1 - cz); g = cz + g * (1 - cz); b = cz + b * (1 - cz); }
        if (gamma !== 1) { r **= gamma; g **= gamma; b **= gamma; }
        out[i] = doLin(r); out[i + 1] = doLin(g); out[i + 2] = doLin(b);
    }
    return out;
}

export interface Pudelko { x0: number; x1: number; y0: number; y1: number; z0?: number; z1?: number; }
export interface Sylwetka { x0: number; y0: number; x1: number; y1: number; pewna: boolean; }

/** Zaznaczenie na obrazie (ułamki obrazu, y w dół) → pudełko bryły (ułamki ramki, y w górę), przez ramkę sylwetki. */
export function wycinekNaPudelko(w: Wycinek, s: Sylwetka): Pudelko {
    const sw = Math.max(1e-6, s.x1 - s.x0), sh = Math.max(1e-6, s.y1 - s.y0);
    const c = (v: number) => Math.max(0, Math.min(1, v));
    return {
        x0: c((w.x - s.x0) / sw), x1: c((w.x + w.w - s.x0) / sw),
        y0: c(1 - (w.y + w.h - s.y0) / sh), y1: c(1 - (w.y - s.y0) / sh),
    };
}
