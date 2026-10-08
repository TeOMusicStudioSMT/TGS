/**
 * 🗿 assety3d — Games Studio rozmawia z generatorem assetów 3D w moście (services/Assety3D.js).
 *
 * Suweren (2026-09-22): „generator assetów 3D do tych gier, z tekstu i zdjęć". Tekst → FLUX.2 klein
 * → TRELLIS.2; zdjęcie → TRELLIS.2. Biblioteka w moście, „do gry" kopiuje GLB do public/assety/
 * projektu i Kodeks widzi go w prompcie.
 */
import { BRIDGE } from './bridge';
import type { Pudelko, Sylwetka, UstawieniaKoloru } from './kolorBryly';

export interface Asset3D { id: string; nazwa: string; opis: string; zrodlo: 'tekst' | 'zdjecie' | 'obraz'; tekst: string | null; promptObrazu?: string; sciany: number; rozdzielczosc: number; utworzono: string; stan: 'trwa' | 'gotowe' | 'blad'; blad?: string; czasy: { obraz?: number; '3d'?: number; razem?: number }; rozmiarGlb?: number; wGrach: string[]; ulepsza?: string; poprawki?: Poprawka[]; siatka?: { trojkaty: number; fragment?: InfoFragmentu; swiatlo?: InfoSwiatla }; tekstury?: boolean; chmura?: { usluga: string; rodzaj: string; kredyty: number; kiedy: string }; }
/** Poprawki bryły (most: services/Assety3D.js) — kolejne kolory się składają, fragment liczy się ostatni. */
export type Poprawka = ({ rodzaj: 'kolor' } & UstawieniaKoloru & { kiedy: string }) | { rodzaj: 'fragment'; pudelko: Pudelko; sciany: number; kiedy: string } | { rodzaj: 'swiatlo'; pudelko: Pudelko; prog: number; kolor: string | null; moc: number; kiedy: string };
export interface InfoSwiatla { trojkaty: number; kolor: string; moc: number; srodek: [number, number, number]; promien: number; }
export interface InfoFragmentu { wMasterze: number; trojkaty: number; reszta: number; granica: number; prosba: number | null; ograniczony: boolean; }
export interface ZadanieAssetu { id: string; asset: string; stan: 'trwa' | 'gotowe' | 'blad'; etap: string; od: string; koniec: string | null; blad?: string | null; kroki?: Array<{ kiedy: string; etap: string; tekst: string }>; sekundyEtapu?: number; }
export interface StanAssetow { gotowe: boolean; comfy: boolean; braki: string[]; silnik: string; zadanW_toku: number; }

async function api<T>(sciezka: string, init?: RequestInit): Promise<T> {
    const r = await fetch(`${BRIDGE}${sciezka}`, { headers: init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }, ...init });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((d as { message?: string }).message || `HTTP ${r.status}`);
    return d as T;
}

export const stanAssetow = () => api<StanAssetow>('/api/assety3d/stan');
export const listaAssetow = () => api<{ assety: Asset3D[]; zadania: ZadanieAssetu[] }>('/api/assety3d');
export const zadanieAssetu = (id: string) => api<{ zadanie: ZadanieAssetu }>(`/api/assety3d/zadania/${encodeURIComponent(id)}`).then((d) => d.zadanie);
export const generujZTekstu = (p: { tekst: string; nazwa?: string; projekt?: string | null; sciany?: number; rozdzielczosc?: number }) => api<{ zadanie: string; asset: string }>('/api/assety3d/generuj', { method: 'POST', body: JSON.stringify(p) });
export const generujZeZdjecia = (plik: File, p: { nazwa?: string; opis?: string; projekt?: string | null; sciany?: number; rozdzielczosc?: number }) => {
    const fd = new FormData(); fd.append('zdjecie', plik);
    for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== null && v !== '') fd.append(k, String(v));
    return api<{ zadanie: string; asset: string }>('/api/assety3d/generuj', { method: 'POST', body: fd });
};
export const doGry = (id: string, projekt: string) => api<{ plik: string }>(`/api/assety3d/${encodeURIComponent(id)}/do-gry`, { method: 'POST', body: JSON.stringify({ projekt }) });
export const usunAsset = (id: string) => api<{ usunieto: boolean }>(`/api/assety3d/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const adresPliku = (id: string, plik: 'model.glb' | 'obraz.png', t = 0) => `${BRIDGE}/api/assety3d/${encodeURIComponent(id)}/plik/${plik}${t ? `?t=${t}` : ''}`;
/** 🏛️ Bryła na Stół — stado ulepsza opis, po ratyfikacji Zlecenia Stada liczą NOWĄ wersję (linia OBIEKT:). */
export const naStol = (id: string, uwagi: string) => api<{ karta: { id: string; tytul: string } }>(`/api/assety3d/${encodeURIComponent(id)}/na-stol`, { method: 'POST', body: JSON.stringify({ uwagi }) });
/** 📦 Bryła do Składnicy Katedry (_OtakOs_Assety/bryly) — wspólna dla Story, gier i innych modułów; bez dubli. */
export const doSkladnicy = (id: string) => api<{ nowy: boolean; asset: { id: string } }>(`/api/assety3d/${encodeURIComponent(id)}/do-skladnicy`, { method: 'POST', body: '{}' });
/** ✨ Upiększ lokalnie: ta sama bryła z tego samego źródła, gęściej (1024, więcej ścian); stara zostaje. */
export const upiekszLokalnie = (id: string, p: { rozdzielczosc?: number; sciany?: number } = {}) => api<{ zadanie: string; asset: string }>(`/api/assety3d/${encodeURIComponent(id)}/upiekszaj`, { method: 'POST', body: JSON.stringify(p) });
/** 🎨 Kolor bryły → NOWA wersja obok starej (sekundy, bez GPU). */
export const przekolorujBryle = (id: string, k: UstawieniaKoloru) => api<{ asset: Asset3D }>(`/api/assety3d/${encodeURIComponent(id)}/kolor`, { method: 'POST', body: JSON.stringify(k) }).then((d) => d.asset);
/** 🔍 Gęściej we fragmencie (pudełko w ułamkach ramki bryły) → NOWA wersja; `sciany` = całość. */
export const zageszczFragment = (id: string, p: { fragment: Pudelko; scianyFragmentu: number; sciany: number }) => api<{ asset: Asset3D }>(`/api/assety3d/${encodeURIComponent(id)}/fragment`, { method: 'POST', body: JSON.stringify(p) }).then((d) => d.asset);
/** Ramka sylwetki na obrazie źródłowym — do przeliczenia zaznaczenia na pudełko bryły. */
export const sylwetkaBryly = (id: string) => api<{ sylwetka: Sylwetka }>(`/api/assety3d/${encodeURIComponent(id)}/sylwetka`).then((d) => d.sylwetka);
/** ✨ Świecące oko: pudełko + próg jasności 0–1 (świeci tylko jaśniejsze) + kolor #rrggbb (albo null = kolor oka) + moc → NOWA wersja. */
export const zaswiec = (id: string, p: { fragment: Pudelko; prog: number; kolor: string | null; moc: number }) => api<{ asset: Asset3D }>(`/api/assety3d/${encodeURIComponent(id)}/swiatlo`, { method: 'POST', body: JSON.stringify(p) }).then((d) => d.asset);

// ☁️ Dopracowanie w chmurze (Meshy, most: services/ChmuraBryl.js) — wycena → zgoda na kwotę → zlecenie w tle → nowa wersja.
export type ZlecenieChmury = { rodzaj: 'retekstura'; styl: string; rozdzielczosc: '2k' | '4k' | '8k'; pbr: boolean } | { rodzaj: 'remesh'; sciany: number; topologia: 'triangle' | 'quad' };
export interface WycenaChmury { kredyty: number; usdOkolo: number; saldo: number; wystarczy: boolean; mb: number; zaDuzy: boolean; cennik: string }
export interface ZadanieChmury { id: string; bryla: string; stan: string; postep: number; kredyty: number; asset: string | null; blad: string | null }
export const stanChmury = () => api<{ maKlucz: boolean; usdZaKredyt: number; zadania: ZadanieChmury[] }>('/api/assety3d/chmura');
export const wycenChmure = (id: string, zlecenie: ZlecenieChmury) => api<WycenaChmury>(`/api/assety3d/chmura/${encodeURIComponent(id)}/wycena`, { method: 'POST', body: JSON.stringify({ zlecenie }) });
export const zlecChmure = (id: string, zlecenie: ZlecenieChmury, zgodaKredyty: number) => api<{ zadanie: ZadanieChmury }>(`/api/assety3d/chmura/${encodeURIComponent(id)}/zlec`, { method: 'POST', body: JSON.stringify({ zlecenie, zgodaKredyty }) }).then((d) => d.zadanie);
export const zadanieChmury = (id: string) => api<{ zadanie: ZadanieChmury }>(`/api/assety3d/chmura/zadanie/${encodeURIComponent(id)}`).then((d) => d.zadanie);
