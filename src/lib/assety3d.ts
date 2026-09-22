/**
 * 🗿 assety3d — Games Studio rozmawia z generatorem assetów 3D w moście (services/Assety3D.js).
 *
 * Suweren (2026-09-22): „generator assetów 3D do tych gier, z tekstu i zdjęć". Tekst → FLUX.2 klein
 * → TRELLIS.2; zdjęcie → TRELLIS.2. Biblioteka w moście, „do gry" kopiuje GLB do public/assety/
 * projektu i Kodeks widzi go w prompcie.
 */
import { BRIDGE } from './bridge';

export interface Asset3D { id: string; nazwa: string; opis: string; zrodlo: 'tekst' | 'zdjecie'; tekst: string | null; promptObrazu?: string; sciany: number; rozdzielczosc: number; utworzono: string; stan: 'trwa' | 'gotowe' | 'blad'; blad?: string; czasy: { obraz?: number; '3d'?: number; razem?: number }; rozmiarGlb?: number; wGrach: string[]; }
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
