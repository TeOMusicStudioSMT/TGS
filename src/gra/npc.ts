/**
 * 🥚 TeOgochi w Teterhii — jako POSTAĆ gracza i jako NPC.
 *
 * Suweren (Lab, zlecenie): „nowe postacie pierwszoplanowe jak i NPC — tak, by
 * w postacie i NPC mogły się wcielać nasze TeOgochi".
 *
 * NPC nie są wymyślone: to migawka stada z mostu (/api/lab/stado — imię,
 * dziedzina, forma, etap, kolor, wyklute). Każdy dostaje w świecie MIEJSCE
 * liczone ze ziarna świata (ten sam świat = ci sami mieszkańcy w tych samych
 * miejscach) i ROLĘ z dziedziny. Rozmowa z NPC idzie do mostu
 * (/api/tgs/npc/rozmowa) — mówi prawdziwy TeOgochi, nie skrypt.
 *
 * ⚠️ Jajka (niewyklute) też stoją w świecie — ale milczą. To jest stan faktyczny
 * stada, nie ozdoba: gdy Suweren wykluje TeOgochi w Katedrze, w grze zacznie mówić.
 */
import { BRIDGE, bridge } from '../lib/bridge';
import { PRZEJSCIE, type Swiat } from './teterhia';

export interface Teogochi { id: string; imie: string; dziedzina: string; kolor: string; forma: string; etap: string; xp: number; wyklute?: boolean }

export interface Npc extends Teogochi {
  x: number;
  y: number;
  rola: string;
}

/** Rola w Teterhii z dziedziny TeOgochi — słowa gry, nie Katedry. */
export function rolaZDziedziny(dziedzina: string): string {
  const d = dziedzina.toLowerCase();
  if (d.includes('muzy')) return 'Pieśniarka strumienia';
  if (d.includes('film') || d.includes('wideo') || d.includes('kadr')) return 'Strażniczka obrazów';
  if (d.includes('kod') || d.includes('mechan')) return 'Kowal mechanizmów';
  if (d.includes('kanon') || d.includes('kronik')) return 'Kronikarz Sosu';
  if (d.includes('bizn') || d.includes('ekonom') || d.includes('grv')) return 'Kupiec z równiny';
  if (d.includes('obraz') || d.includes('palet') || d.includes('mod')) return 'Malarz gaju';
  if (d.includes('gr')) return 'Kustosz przejść';
  return 'Wędrowiec pustki';
}

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rozstawienie stada w świecie: deterministyczne ze ziarna, tylko na przejezdnych kaflach, nie na starcie. */
export function rozstawNpc(stado: Teogochi[], swiat: Swiat, w: number, h: number): Npc[] {
  const los = mulberry(swiat.ziarno ^ 0x7e0);
  const zajete = new Set<number>([swiat.start.y * w + swiat.start.x]);
  const npc: Npc[] = [];
  for (const t of stado) {
    for (let proba = 0; proba < 200; proba++) {
      const x = Math.floor(los() * w), y = Math.floor(los() * h);
      const i = y * w + x;
      const k = swiat.kafle[i];
      if (!k || !PRZEJSCIE[k.biom] || zajete.has(i)) continue;
      // Nie tłoczyć: sąsiad nie może stać tuż obok.
      if ([...zajete].some((j) => Math.abs((j % w) - x) <= 1 && Math.abs(Math.floor(j / w) - y) <= 1)) continue;
      zajete.add(i);
      npc.push({ ...t, x, y, rola: rolaZDziedziny(t.dziedzina) });
      break;
    }
  }
  return npc;
}

export async function pobierzStado(): Promise<Teogochi[]> {
  const d = await bridge.get<{ gatunki: Teogochi[] }>('/api/lab/stado');
  return d.gatunki ?? [];
}

export interface TuraNpc { kto: 'gracz' | 'npc'; tresc: string }

/** 🎬 Scenografie z kadrów Story — .glb w public/assets/scenografie (manifest bez mostu). */
export interface Scenografia { id: string; projekt: string; nazwa: string; url: string; bajtow: number; opis: string; kiedy: string; zrodlo?: { kadr: string | null } }
/** Scenografia POSTAWIONA w konkretnym świecie: gdzie i w jakiej skali (1 kafel = 1 jednostka; studio ma 16 m). */
export interface Postawiona { id: string; url: string; nazwa: string; x: number; y: number; skala: number; obrot: number }

export async function listaScenografii(): Promise<Scenografia[]> {
  const r = await fetch('/assets/scenografie/scenografie.json');
  if (!r.ok) return [];
  return ((await r.json()).scenografie ?? []) as Scenografia[];
}
export interface KadrZObrazem { id: string; tytul: string; opis: string; etap: string; obraz: boolean; plik: string }
export async function kadryZObrazem(projekt: string): Promise<KadrZObrazem[]> {
  const d = await bridge.get<{ kadry: KadrZObrazem[] }>(`/api/produkcja/kadry-z-obrazem?projekt=${encodeURIComponent(projekt)}`);
  return (d.kadry ?? []).filter((k) => k.obraz);
}
export async function projektyStory(): Promise<string[]> {
  const d = await bridge.get<{ projekty: { nazwa: string }[] }>('/api/rezyser/projekty');
  return (d.projekty ?? []).map((p) => p.nazwa);
}
export const zbudujScenografie = (b: { projekt: string; kadrId: string; nazwa?: string }) =>
  bridge.post<{ wpis: Scenografia; sekundy: number; blender: string }>('/api/tgs/3d/scenografia', b);

const KLUCZ = (ziarno: number) => `tgs_scenografie_${ziarno}`;
export function wczytajPostawione(ziarno: number): Postawiona[] {
  try { return JSON.parse(localStorage.getItem(KLUCZ(ziarno)) || '[]'); } catch { return []; }
}
export function zapiszPostawione(ziarno: number, lista: Postawiona[]): void {
  try { localStorage.setItem(KLUCZ(ziarno), JSON.stringify(lista)); } catch { /* brak miejsca — scena żyje w oknie */ }
}

export async function rozmawiajZNpc(dane: { teogochiId: string; wypowiedz: string; historia: TuraNpc[]; swiat: string; kafel: string; gracz: string }) {
  const r = await fetch(`${BRIDGE}/api/tgs/npc/rozmowa`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dane) });
  const d = await r.json();
  if (!r.ok || !d.success) throw new Error(d.message || `HTTP ${r.status}`);
  return d as { mowa: string; model: string; npc: { id: string; imie: string; forma: string } };
}
