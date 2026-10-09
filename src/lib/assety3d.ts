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
export type Poprawka = ({ rodzaj: 'kolor' } & UstawieniaKoloru & { kiedy: string }) | { rodzaj: 'fragment'; pudelko: Pudelko; sciany: number; kiedy: string } | { rodzaj: 'swiatlo'; pudelko: Pudelko; prog: number; kolor: string | null; moc: number; kiedy: string }
  /** ☁️ wersja z chmury (Meshy) — retekstura, remesh, obraz3d, rig */
  | { rodzaj: 'chmura'; usluga: string; zlecenie: string; kredyty: number; kiedy: string };
/** Poprawka po ludzku — każdy rodzaj (nieznany = sama nazwa, nigdy wyjątek: wywrotka tu czerniła całe studio). */
export function opisPoprawki(p: Poprawka): string {
  if (p.rodzaj === 'kolor') return '🎨 kolor';
  if (p.rodzaj === 'swiatlo') return `✨ oko ${p.kolor ?? 'auto'}`;
  if (p.rodzaj === 'fragment') return `🔍 fragment ${Number(p.sciany ?? 0).toLocaleString('pl-PL')}`;
  if (p.rodzaj === 'chmura') return `☁️ ${p.usluga ?? 'chmura'}: ${({ retekstura: 'retekstura', remesh: 'remesh', obraz3d: 'Image-to-3D', rig: 'szkielet + ruchy' } as Record<string, string>)[p.zlecenie] ?? p.zlecenie ?? '?'}${p.kredyty ? ` (${p.kredyty} kr.)` : ''}`;
  return String((p as { rodzaj?: string }).rodzaj ?? '?');
}
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
export type ZlecenieChmury = { rodzaj: 'retekstura'; styl: string; rozdzielczosc: '2k' | '4k' | '8k'; pbr: boolean } | { rodzaj: 'remesh'; sciany: number; topologia: 'triangle' | 'quad' }
  | { rodzaj: 'obraz3d'; model: 'latest' | 'meshy-6-lite'; rozdzielczosc: '2k' | '4k' | '8k'; pbr: boolean; poza: '' | 'a-pose' | 't-pose' }
  | { rodzaj: 'rig'; wzrost: number; akcje: number[] } | { rodzaj: 'akcje'; akcje: number[] };
/** 🎛️ Auto-dobór ≤ 10 akcji z biblioteki do zestawu (gra, walka, taniec…) — bez tych, które bryła już ma. Więcej = kolejna paczka na tym samym rigu. */
export const ZESTAWY_AKCJI: Record<string, string> = { gra: '🎮 podstawy gry', walka: '⚔️ walka', taniec: '💃 taniec', codzienne: '🏡 codzienne', cialo: '🤸 ruchy ciała' };
export const zestawAkcji = (id: string, zestaw: string) => api<{ akcje: AkcjaMeshy[] }>(`/api/assety3d/chmura/${encodeURIComponent(id)}/zestaw/${encodeURIComponent(zestaw)}`).then((d) => d.akcje);
/** 📚 Akcja z biblioteki animacji Meshy (rig: 3 kredyty za akcję, ≤ 10). */
export interface AkcjaMeshy { id: number; nazwa: string; klucz: string; kategoria: string; podkategoria: string; podglad: string | null }
export const akcjeMeshy = (kategoria = '', szukaj = '') => api<{ akcje: AkcjaMeshy[] }>(`/api/assety3d/chmura/akcje?kategoria=${encodeURIComponent(kategoria)}&szukaj=${encodeURIComponent(szukaj)}`).then((d) => d.akcje);
export interface WycenaChmury { kredyty: number; usdOkolo: number; saldo: number; wystarczy: boolean; mb: number; zaDuzy: boolean; cennik: string }
export interface ZadanieChmury { id: string; bryla: string; stan: string; postep: number; kredyty: number; asset: string | null; blad: string | null; ruchy?: string[]; uwagi?: string[] }
export const stanChmury = () => api<{ maKlucz: boolean; usdZaKredyt: number; zadania: ZadanieChmury[] }>('/api/assety3d/chmura');
export const wycenChmure = (id: string, zlecenie: ZlecenieChmury) => api<WycenaChmury>(`/api/assety3d/chmura/${encodeURIComponent(id)}/wycena`, { method: 'POST', body: JSON.stringify({ zlecenie }) });
export const zlecChmure = (id: string, zlecenie: ZlecenieChmury, zgodaKredyty: number) => api<{ zadanie: ZadanieChmury }>(`/api/assety3d/chmura/${encodeURIComponent(id)}/zlec`, { method: 'POST', body: JSON.stringify({ zlecenie, zgodaKredyty }) }).then((d) => d.zadanie);
// 🏷️ Zwiadowca promocji (most: services/ZwiadowcaPromocji.js) — kody i promocje ze źródłami z wyszukiwania; nic nie wpisuje, nie płaci.
export interface ZnaleziskoPromocji { rodzaj: 'kod' | 'promocja' | 'program' | 'partnerska'; kod: string | null; opis: string; rabat: string | null; zrodlo: string; tytulZrodla: string | null; wiekStrony: string | null; data: string | null; pewnosc: 'oficjalne' | 'agregator' | 'forum'; uwagi: string | null }
export interface ZwiadPromocji { usluga: string; kiedy: string; znalezione: ZnaleziskoPromocji[]; odrzucone: (ZnaleziskoPromocji & { powod: string })[]; podsumowanie: string; koszt: { wyszukan: number; tokenyWe: number; tokenyWy: number; usdWyszukiwania: number }; uwaga: string }
export const zwiadyPromocji = () => api<{ zwiady: ZwiadPromocji[] }>('/api/zwiadowca/promocje').then((d) => d.zwiady);
export const szukajPromocji = (usluga: string) => api<{ zwiad: ZwiadPromocji }>('/api/zwiadowca/promocje', { method: 'POST', body: JSON.stringify({ usluga }) }).then((d) => d.zwiad);
/** 👁️ Styl retekstury ze zdjęcia bryły (most pyta model widzący — zajmuje kartę na chwilę). */
export const stylZeZdjecia = (id: string) => api<{ styl: string; model: string }>(`/api/assety3d/chmura/${encodeURIComponent(id)}/styl`, { method: 'POST', body: '{}' });
/** Styl z opisu bryły i jej poprawek — od razu, bez modelu (gdy pole stylu puste). */
export function stylZOpisu(a: Asset3D): string {
  const opis = String(a.promptObrazu || a.opis || a.tekst || '').replace(/;?\s*jeden obiekt na spokojnym tle\s*$/i, '').trim();
  const swiatlo = [...(a.poprawki ?? [])].reverse().find((p) => (p as { rodzaj?: string }).rodzaj === 'swiatlo') as { kolor?: string } | undefined;
  return [opis, swiatlo?.kolor ? `świecące elementy w kolorze ${swiatlo.kolor}` : ''].filter(Boolean).join('; ').slice(0, 800);
}
export const zadanieChmury = (id: string) => api<{ zadanie: ZadanieChmury }>(`/api/assety3d/chmura/zadanie/${encodeURIComponent(id)}`).then((d) => d.zadanie);
