/**
 * 🛠️ tworzenie — trasy mostu dla etapów TWORZENIA gry (Suweren 2026-10-06: „Reżyser, potem Dyrygent, potem tworzenie:
 * generator obrazów, assetów 3D, ruchu, krajobrazów…”).
 *
 *   Scenariusz  → POST /api/gdd/szablon/:id (services/SzablonyGier.js — „Teterhia — Wieczna Saga”)
 *   Dyrygent    → POST /api/dyrygent/cel {cel:'gra'} (silniki + przydział modeli), POST /api/dyrygent/zastosuj
 *   Obrazy      → /api/assety3d/obrazy (FLUX.2 klein w stylu: jeden obiekt / zestaw / karta postaci / kraina)
 *   Bryła z obrazu → POST /api/assety3d/generuj {zObrazu, wycinek}
 *   Ruch        → /api/assety3d/:id/ruch (Blender: obrót, lewitacja, kołysanie, oddech, podskok)
 */
import { BRIDGE } from './bridge';

async function api<T>(sciezka: string, init?: RequestInit): Promise<T> {
    const r = await fetch(`${BRIDGE}${sciezka}`, { headers: { 'Content-Type': 'application/json' }, ...init });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || (d as { success?: boolean }).success === false) throw new Error((d as { message?: string }).message || `HTTP ${r.status}`);
    return d as T;
}
const post = <T,>(sciezka: string, body: unknown = {}) => api<T>(sciezka, { method: 'POST', body: JSON.stringify(body) });

// ── Scenariusze ──
export interface Szablon { id: string; nazwa: string; opis: string; galezie: number; kamienie: number; }
export const szablony = () => api<{ szablony: Szablon[] }>('/api/gdd/szablony').then((d) => d.szablony);
export const zasiejSzablon = (id: string, nadpisz = false) => post<{ projekt: string; nowy: boolean; nadpisano: boolean }>(`/api/gdd/szablon/${encodeURIComponent(id)}`, { nadpisz });

// ── Gałęzie świata (z GDD projektu) ──
export type StylObrazu = 'pojedynczy' | 'zestaw' | 'postac' | 'krajobraz';
export interface Galaz { id: string; nazwa: string; opis: string; propozycje: Array<{ opis: string; styl: StylObrazu }>; }
export const galezieProjektu = (projekt: string) => api<{ gdd: { galezie?: Galaz[] } | null }>(`/api/gdd/${encodeURIComponent(projekt)}`).then((d) => d.gdd?.galezie ?? []);

// ── Pracownia obrazów ──
export interface StylInfo { nazwa: string; do3d: boolean; szer: number; wys: number; }
export interface ObrazGry { id: string; opis: string; styl: StylObrazu; galaz: string | null; projekt: string | null; szer: number; wys: number; do3d: boolean; stan: 'trwa' | 'gotowe' | 'blad'; blad?: string; utworzono: string; czas?: number; promptObrazu?: string; bryly: string[]; }
export interface ZadanieObrazu { id: string; obraz: string | null; stan: string; etap: string; blad?: string | null; }
export const obrazy = () => api<{ obrazy: ObrazGry[]; style: Record<StylObrazu, StylInfo>; zadania: ZadanieObrazu[] }>('/api/assety3d/obrazy');
export const narysuj = (p: { opis: string; styl: StylObrazu; galaz?: string | null; projekt?: string | null }) => post<{ zadanie: string; obraz: string }>('/api/assety3d/obrazy', p);
export const usunObraz = (id: string) => api<{ usunieto: boolean }>(`/api/assety3d/obrazy/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const adresObrazu = (id: string) => `${BRIDGE}/api/assety3d/obrazy/${encodeURIComponent(id)}/plik`;
export interface Wycinek { x: number; y: number; w: number; h: number; }
export const brylaZObrazu = (p: { zObrazu: string; wycinek?: Wycinek | null; nazwa?: string; projekt?: string | null; sciany?: number }) => post<{ zadanie: string; asset: string }>('/api/assety3d/generuj', p);

// ── Ruch brył ──
export type RuchId = 'obrot' | 'lewitacja' | 'kolysanie' | 'oddech' | 'podskok';
export interface RuchInfo { id: RuchId; nazwa: string; opis: string; }
export interface WpisRuchu { ruch: RuchId; glb: string; mp4: string | null; sekundy: number; klatek: number | null; czas: number; utworzono: string; }
export interface ZadanieRuchu { id: string; asset: string; ruch: RuchId; stan: 'trwa' | 'gotowe' | 'blad'; etap: string; blad: string | null; }
export const ruchy = () => api<{ ruchy: RuchInfo[]; zadania: ZadanieRuchu[] }>('/api/assety3d/ruchy');
export const policzRuch = (asset: string, ruch: RuchId, sekundy: number) => post<{ zadanie: string }>(`/api/assety3d/${encodeURIComponent(asset)}/ruch`, { ruch, sekundy });
export const zadanieRuchu = (id: string) => api<{ zadanie: ZadanieRuchu }>(`/api/assety3d/ruch/zadanie/${encodeURIComponent(id)}`).then((d) => d.zadanie);
export const usunRuch = (asset: string, ruch: RuchId) => api<{ ruchy: WpisRuchu[] }>(`/api/assety3d/${encodeURIComponent(asset)}/ruch/${ruch}`, { method: 'DELETE' });
export const ruchDoGry = (asset: string, projekt: string, ruch: RuchId) => post<{ plik: string }>(`/api/assety3d/${encodeURIComponent(asset)}/do-gry`, { projekt, ruch });
export const adresRuchu = (asset: string, plik: string, t = 0) => `${BRIDGE}/api/assety3d/${encodeURIComponent(asset)}/plik/${plik}${t ? `?t=${t}` : ''}`;

// ── Dyrygent (cel: gra) ──
export interface SilnikWpis { id: string; nazwa: string; gotowy: boolean; nieWiadomo: boolean; powod: string; licencja: string | null; }
export interface RodzajCelu { potrzebny: boolean; gotowe: SilnikWpis[]; niegotowe: SilnikWpis[]; kandydaci: Array<{ id: string; repo: string; licencja: string | null; komercyjna: boolean | null; stan: string; url?: string }>; }
export interface Przydzial { agent: string; model: string; powod: string; }
export interface WynikCelu { cel: string; etykieta: string; agenci: string[] | null; rodzaje: Record<string, RodzajCelu>; brakuje: string[]; moznaRuszyc: boolean; modele?: { przydzial: Przydzial[]; odrzucone?: Array<{ agent?: string; model?: string; powod: string }>; model: string }; modeleUwaga?: string; }
export const celGra = (zadanie?: string) => post<WynikCelu>('/api/dyrygent/cel', { cel: 'gra', zadanie: zadanie ?? '', modele: !!zadanie });
export const zastosujPrzydzial = (przydzial: Przydzial[]) => post<{ wynik: Array<{ agent: string; model: string; ok: true | string }> }>('/api/dyrygent/zastosuj', { przydzial }).then((d) => d.wynik);

// ── ⚡ Giełda Master Flow (TeOkoP GRV): zlecenie zadania albo całego projektu — ogłoszenie w wizytówce Katedry ──
export interface Zlecenie { id: string; rodzaj: 'zadanie' | 'projekt'; tytul: string; opis: string; modele: string[]; budzetGRV: number; stan: 'ogloszone' | 'wycofane'; od: string }
export const naGielde = (p: { rodzaj: 'zadanie' | 'projekt'; projekt: string; tytul: string; opis?: string; modele?: string[]; budzetGRV?: number }) =>
    post<{ zlecenie: Zlecenie }>('/api/gielda-mocy/zlecenia', p).then((d) => d.zlecenie);
