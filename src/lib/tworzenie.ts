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
/** ✨ nowe propozycje gałęzi (model Reżysera) i 🐾 gałęzie scenariusza, których GDD jeszcze nie ma (np. Mini-TeOgochi). */
export const nowePropozycje = (projekt: string, galaz: string) => post<{ propozycje: Galaz['propozycje'] }>(`/api/gdd/${encodeURIComponent(projekt)}/galezie/${encodeURIComponent(galaz)}/propozycje`).then((d) => d.propozycje);
export const brakujaceGalezie = (projekt: string) => api<{ galezie: Array<{ id: string; nazwa: string; opis: string }> }>(`/api/gdd/${encodeURIComponent(projekt)}/galezie/brakujace`).then((d) => d.galezie);
export const uzupelnijGalezie = (projekt: string) => post<{ dodane: string[] }>(`/api/gdd/${encodeURIComponent(projekt)}/galezie/uzupelnij`).then((d) => d.dodane);
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

// ── 🧝 Bohaterowie startowi (services/Bohaterowie.js): karta → obraz → bryła → [Meshy tekstury + rig] → do gry ──
export type EtapBohatera = 'pomysl' | 'rysuje' | 'blad' | 'obraz' | 'rzezbi' | 'bryla' | 'tekstury' | 'rig' | 'w-grze';
export interface Bohater {
    id: string; imie: string; plec: 'kobieta' | 'mezczyzna' | 'inna'; zywiol: string; droga: string; opis: string;
    obraz: string | null; wGrze: { plik: string; zrodlo: string; ruch: string | null } | null;
    etap: EtapBohatera; najlepsza: { id: string; tekstury: boolean; ruchy: string[] } | null; wersji: number; blad: string | null; nowszaNizWGrze: boolean;
}
const pB = (projekt: string) => `/api/bohaterowie/${encodeURIComponent(projekt)}`;
export const bohaterowie = (projekt: string) => api<{ bohaterowie: Bohater[] }>(pB(projekt)).then((d) => d.bohaterowie);
export const zapiszBohatera = (projekt: string, b: Partial<Bohater>) => post<{ bohater: Bohater }>(pB(projekt), b).then((d) => d.bohater);
export const usunBohatera = (projekt: string, id: string) => api(`${pB(projekt)}/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const narysujBohatera = (projekt: string, id: string) => post(`${pB(projekt)}/${encodeURIComponent(id)}/obraz`);
export const wyrzezbBohatera = (projekt: string, id: string) => post(`${pB(projekt)}/${encodeURIComponent(id)}/bryla`);
export const bohaterDoGry = (projekt: string, id: string) => post(`${pB(projekt)}/${encodeURIComponent(id)}/do-gry`);
export const bohaterZGry = (projekt: string, id: string) => api(`${pB(projekt)}/${encodeURIComponent(id)}/do-gry`, { method: 'DELETE' });

// ── 🏛️ Postać Katedry (services/PostacKatedry.js): JEDNA postać tej Katedry — avatar w MRPG Teterhii ──
export interface KartaPostaci { imie: string; plec: Bohater['plec']; zywiol: string; droga: string; opis: string; obraz: string | null; korzen: string | null; opublikowana: { zrodlo: string; ruch: string | null; bajtow: number; kiedy: string } | null }
export interface StanPostaci {
    karta: KartaPostaci | null; imie?: string | null; etap: EtapBohatera | 'brak' | 'opublikowana';
    najlepsza?: Bohater['najlepsza']; wersji?: number; blad?: string | null; nowszaNizWGrze?: boolean; opublikowana: KartaPostaci['opublikowana'];
}
export const postacKatedry = () => api<StanPostaci & { success: boolean }>('/api/postac-katedry');
export const zapiszPostac = (k: Partial<KartaPostaci>) => post<{ karta: KartaPostaci }>('/api/postac-katedry', k).then((d) => d.karta);
export const postacZOpisu = () => post('/api/postac-katedry/obraz');
export const postacBryla = () => post('/api/postac-katedry/bryla');
export const postacZeZdjecia = (dataURL: string) => post('/api/postac-katedry/zdjecie', { dataURL });
export const opublikujPostac = () => post('/api/postac-katedry/opublikuj');
export const wycofajPostac = () => api('/api/postac-katedry/opublikuj', { method: 'DELETE' });
