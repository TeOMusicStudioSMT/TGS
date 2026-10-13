/**
 * 🐾 Bestiariusz Mini-TeOgochi — most: GET|PUT /api/bestiariusz/:projekt (TeO_Genesis services/Bestiariusz.js),
 * plik gry public/bestiariusz.json. Losowanie tu = TA SAMA logika co w moście i w grze (podgląd rozkładu wykluć).
 */
import { BRIDGE } from './bridge';

export type Dziedzina = 'takt' | 'zwinnosc' | 'spryt' | 'urok';
export type TypSkilla = 'cios' | 'specjalny' | 'pasywny' | 'taniec';
export const DZIEDZINY: Record<Dziedzina, string> = { takt: '🎵 Takt', zwinnosc: '🌀 Zwinność', spryt: '🧩 Spryt', urok: '✨ Urok' };
export const TYPY: Record<TypSkilla, string> = { cios: '⚔️ cios', specjalny: '💥 specjalny', pasywny: '🛡️ pasywny', taniec: '💃 taniec' };

export interface Rzadkosc { id: string; nazwa: string; kolor: string; szansa: number; progJaja: number; mnoznik: number }
export interface Skill { id: string; nazwa: string; dziedzina: Dziedzina | null; typ: TypSkilla; moc: number; opis: string }
export interface Wariant { id: string; nazwa: string; odcien: number; szansa: number; opis: string }
export interface Drop { skill: string; szansa: number; odPoziomu: number }
export interface MiniB { id: string; nazwa: string; klucz: string | null; rzadkosc: string; dziedzina: Dziedzina; opis: string; skille: string[]; warianty: Wariant[]; dropy: Drop[] }
export interface Bestiariusz { wersja: 1; rzadkosci: Rzadkosc[]; skille: Skill[]; mini: MiniB[]; zmieniono: string | null }

async function api<T>(sciezka: string, init?: RequestInit): Promise<T> {
    const r = await fetch(`${BRIDGE}${sciezka}`, { headers: { 'Content-Type': 'application/json' }, ...init });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || (d as { success?: boolean }).success === false) throw new Error((d as { message?: string }).message || `HTTP ${r.status}`);
    return d as T;
}
export const wczytajBestiariusz = (projekt: string) => api<{ bestiariusz: Bestiariusz }>(`/api/bestiariusz/${encodeURIComponent(projekt)}`).then((d) => d.bestiariusz);
export const zapiszBestiariusz = (projekt: string, b: Bestiariusz) => api<{ bestiariusz: Bestiariusz }>(`/api/bestiariusz/${encodeURIComponent(projekt)}`, { method: 'PUT', body: JSON.stringify({ bestiariusz: b }) }).then((d) => d.bestiariusz);

/** 🕺 Rodzina wersji bryły z ruchami z riga (most: services/MiniZRuchem.js) — scalona wersja = najwięcej klipów. */
export interface RodzinaZRuchem {
    klucz: string; bryla: string; nazwa: string; opis: string; galaz: string | null; obraz: string | null; mini: boolean;
    kategoria: 'tancerz' | 'wojownik' | 'gesty' | 'wedrowiec'; kategoriaNazwa: string; klipow: number; rodzaje: Record<string, number>;
    klipy: string[]; wersji: number; wersjiZRuchem: number; klucze: string[]; utworzono: string | null; tekstury: boolean;
}
export const wczytajZRuchem = (projekt: string) => api<{ rodziny: RodzinaZRuchem[] }>(`/api/bestiariusz/${encodeURIComponent(projekt)}/z-ruchem`).then((d) => d.rodziny);
/** Rodzina, do której należy klucz Mini (dowolna wersja: obraz, korzeń, poprawka, rig, plik w grze). */
export const rodzinaMini = (rodziny: RodzinaZRuchem[], klucz: string | null) => (klucz ? rodziny.find((r) => r.klucze.includes(klucz)) ?? null : null);

function wybierzWage<T>(lista: T[], waga: (x: T) => number, los: () => number): T | null {
    const suma = lista.reduce((s, x) => s + Math.max(0, waga(x)), 0);
    if (suma <= 0) return null;
    let r = los() * suma;
    for (const x of lista) { r -= Math.max(0, waga(x)); if (r < 0) return x; }
    return lista[lista.length - 1] ?? null;
}
/** Wyklucie: rzadkość (szanse jak wagi, tylko rzadkości z Mini) → Mini tej rzadkości → wariant (reszta do 100% = bazowy). */
export function losujWyklucie(b: Bestiariusz, los: () => number = Math.random): { mini: MiniB; rzadkosc: Rzadkosc; wariant: Wariant | null } | null {
    const rz = wybierzWage(b.rzadkosci.filter((r) => b.mini.some((m) => m.rzadkosc === r.id)), (r) => r.szansa, los);
    if (!rz) return null;
    const kand = b.mini.filter((m) => m.rzadkosc === rz.id);
    const mini = kand[Math.floor(los() * kand.length)];
    const bazowy = Math.max(0, 100 - mini.warianty.reduce((s, w) => s + w.szansa, 0));
    const w = wybierzWage<Wariant | { id: null; szansa: number }>([...mini.warianty, { id: null, szansa: bazowy }], (x) => x.szansa, los);
    return { mini, rzadkosc: rz, wariant: w && w.id ? (w as Wariant) : null };
}
