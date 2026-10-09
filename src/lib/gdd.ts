/**
 * 📜 gdd — Games Studio rozmawia z modułem GDD w moście (services/Gdd.js).
 *
 * Suweren (2026-09-21): „panel do GDD (na wzór modułu opowieści z TeO Story) + panel z
 * Reżyserem Gry + ustawienia, na jakim silniku buduje". GDD leży w projekcie gry
 * (_OtakOs_Apki/<id>/gdd.json). Import: PDF (np. z Gemini) albo tekst → sekcje → plan
 * (kamienie milowe) → „Realizuj plan" karmi pętlę Kodeksa zadanie po zadaniu.
 */
import { BRIDGE } from './bridge';

export type Sekcja = 'wizja' | 'mechanika' | 'fabula' | 'postacie' | 'wizual' | 'audio' | 'technika';
export const SEKCJE: Array<{ id: Sekcja; etykieta: string; podpowiedz: string }> = [
    { id: 'wizja', etykieta: 'Wizja i koncepcja', podpowiedz: 'O czym jest gra, dla kogo, co w niej wyjątkowe.' },
    { id: 'mechanika', etykieta: 'Mechanika rozgrywki', podpowiedz: 'Sterowanie, pętla rozgrywki, zasady, wygrana/przegrana.' },
    { id: 'fabula', etykieta: 'Fabuła i quest', podpowiedz: 'Świat, historia, cel gracza, struktura poziomów.' },
    { id: 'postacie', etykieta: 'Postacie', podpowiedz: 'Gracz, wrogowie, NPC — statystyki, zachowania.' },
    { id: 'wizual', etykieta: 'Aspekty wizualne', podpowiedz: 'Styl, kamera, paleta, efekty.' },
    { id: 'audio', etykieta: 'Dźwięk i muzyka', podpowiedz: 'Muzyka, efekty, nastrój.' },
    { id: 'technika', etykieta: 'Kwestie techniczne', podpowiedz: 'Silnik, platformy, ograniczenia, co przepisano.' },
];

/** 🧱 Klocek zadania: rzecz z warsztatu (obraz/bryła) z rolą w grze; klucz null = jeszcze jej nie ma. */
export interface Klocek { rola: string; klucz: string | null; opis: string; }
export interface ZadanieGdd { id: string; tresc: string; stan: 'czeka' | 'trwa' | 'gotowe' | 'blad' | 'pominiete' | 'klocki'; uwaga?: string; kiedy?: string | null; zadanieId?: string | null; klocki?: Klocek[]; zastepcze?: boolean; }
export interface KlocekKatalogu { klucz: string; nazwa: string; opis: string; galaz: string | null; stan: 'w-grze' | 'bryla' | 'obraz' | 'koncept'; plik?: string; bryla?: string; obraz?: string; }
/** Stan klocków zadania względem warsztatu (most: KlockiGry.rozwiaz). */
export interface StanKlockowZadania { gotowe: Array<{ rola: string; plik: string; opis: string }>; doGry: Array<{ rola: string; bryla: string; opis: string }>; braki: Array<{ rola: string; co: 'bryla' | 'obraz'; opis: string; obraz?: string }>; koncepty: Array<{ rola: string; opis: string }>; }
export interface Kamien { id: string; tytul: string; opis: string; zadania: ZadanieGdd[]; }
export interface WpisRozmowy { kiedy: string; kto: 'suweren' | 'rezyser'; tresc: string; }
export interface Gdd {
    wersja: number; tytul: string; gatunek: string; silnik: string; perspektywa: string; platformy: string[];
    sekcje: Record<Sekcja, string>; kamienie: Kamien[]; galezie?: Array<{ id: string; nazwa: string; opis: string; propozycje: Array<{ opis: string; styl: string }> }>; filmy?: FilmGdd[]; historia: WpisRozmowy[]; zrodlo: string | null; zmieniono: string | null;
}
export interface SilnikGry { etykieta: string; dostepny: boolean; uwaga: string; }
export interface Produkcja { stan: 'trwa' | 'gotowe' | 'blad' | 'przerwana'; od: string; koniec?: string; biezace: { kamien: string; zadanie: string } | null; kroki: Array<{ kiedy: string; tekst: string }>; zrobione: number; padlo: number; naKlocki?: number; razem: number; model: string; }
/** Propozycja Reżysera. `kamienie` = PEŁNY plan po scaleniu w moście (Gdd.scalKamienie: gotowe zadania zachowują stan). */
export interface Propozycja { tytul?: string; gatunek?: string; perspektywa?: string; sekcje?: Partial<Record<Sekcja, string>>; kamienie?: Kamien[]; filmy?: FilmGdd[]; }
/** 🎬 Film gry (cutscenka/intro) — jedno ujęcie Wan 2.2 przy zdarzeniu gry (most: Gdd.filmy, services/FilmyGry.js). */
export interface FilmGdd { id: string; zdarzenie: string; tytul: string; opis: string; sekundy: number; stan: 'pomysl' | 'zlecony' | 'gotowy' | 'blad'; plik: string | null; prompt: string | null; blad?: string | null; kiedy?: string | null }

async function api<T>(sciezka: string, init?: RequestInit): Promise<T> {
    const r = await fetch(`${BRIDGE}${sciezka}`, { headers: init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }, ...init });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((d as { message?: string }).message || `HTTP ${r.status}`);
    return d as T;
}
const p = (id: string) => `/api/gdd/${encodeURIComponent(id)}`;

export const silnikiGdd = () => api<{ silniki: Record<string, SilnikGry> }>('/api/gdd/silniki').then((d) => d.silniki);
export const wczytajGdd = (id: string) => api<{ gdd: Gdd | null; produkcja: Produkcja | null }>(p(id));
export const zdarzeniaGry = () => api<{ zdarzenia: Record<string, string> }>('/api/gdd/zdarzenia').then((d) => d.zdarzenia);
export const zlecFilm = (id: string, film: string) => api<{ film: FilmGdd }>(`${p(id)}/film/${encodeURIComponent(film)}/zlec`, { method: 'POST', body: '{}' }).then((d) => d.film);
export const zapiszGdd = (id: string, gdd: Partial<Gdd>) => api<{ gdd: Gdd }>(p(id), { method: 'PUT', body: JSON.stringify({ gdd }) }).then((d) => d.gdd);
export const importujTekst = (id: string, tekst: string, silnik: string, model?: string) => api<{ gdd: Gdd }>(`${p(id)}/import`, { method: 'POST', body: JSON.stringify({ tekst, silnik, model }) }).then((d) => d.gdd);
export const importujPlik = (id: string, plik: File, silnik: string, model?: string) => {
    const fd = new FormData(); fd.append('plik', plik); fd.append('silnik', silnik); if (model) fd.append('model', model);
    return api<{ gdd: Gdd }>(`${p(id)}/import`, { method: 'POST', body: fd }).then((d) => d.gdd);
};
export const planGdd = (id: string, odNowa = false, model?: string) => api<{ gdd: Gdd }>(`${p(id)}/plan`, { method: 'POST', body: JSON.stringify({ odNowa, model }) }).then((d) => d.gdd);
export const rozmowaGdd = (id: string, wypowiedz: string, historia: WpisRozmowy[], model?: string) => api<{ odpowiedz: string; propozycja: Propozycja | null; model: string }>(`${p(id)}/rozmowa`, { method: 'POST', body: JSON.stringify({ wypowiedz, historia, model }) });
/** `zapasowe` — modele, które próbują zadania, na którym główny padł (najwyżej 3; ten, który zrobi, prowadzi dalej). */
/** `chmuraPoChmurze` (domyślnie tak): główny z chmury padnie → najpierw inna chmura (wybrana albo auto: inny dostawca), lokalne na końcu. */
export const realizujGdd = (id: string, kamien?: string, model?: string, zapasowe: string[] = [], chmuraPoChmurze = true) => api<{ start: boolean; zadan: number; model: string; zapasowe: string[] }>(`${p(id)}/realizuj`, { method: 'POST', body: JSON.stringify({ kamien, model, zapasowe, chmuraPoChmurze }) });
export const produkcjaGdd = (id: string) => api<{ produkcja: Produkcja | null }>(`${p(id)}/produkcja`).then((d) => d.produkcja);
export const przerwijGdd = (id: string) => api<{ przerwano: boolean }>(`${p(id)}/przerwij`, { method: 'POST', body: '{}' });

// 🧱 Klocki gry — katalog warsztatu, stan klocków zadań, dobór do planu, zgoda na bryły zastępcze.
export const klockiGdd = (id: string) => api<{ katalog: KlocekKatalogu[]; zadania: Record<string, StanKlockowZadania> }>(`${p(id)}/klocki`);
export const dobierzKlockiGdd = (id: string, model?: string) => api<{ gdd: Gdd; dobrane: number; model: string }>(`${p(id)}/klocki/dobierz`, { method: 'POST', body: JSON.stringify({ model }) });
export const ustawZadanieGdd = (id: string, zadanie: string, zmiana: { klocki?: Klocek[]; zastepcze?: boolean }) => api<{ gdd: Gdd }>(`${p(id)}/zadanie/${encodeURIComponent(zadanie)}`, { method: 'POST', body: JSON.stringify(zmiana) }).then((d) => d.gdd);
/** 🔎 Co robi Kodeks TERAZ: ostatnie zadanie projektu w toku i jego kroki (rundy, znaki, recenzent, build). */
export interface KrokKodeksa { kiedy: string; typ: string; tekst: string; znakow?: number }
export async function krokiKodeksa(projekt: string): Promise<KrokKodeksa[]> {
    const p = await api<{ zadania: Array<{ id: string; stan: string }> }>(`/api/appstudio/projekty/${encodeURIComponent(projekt)}`);
    const z = [...(p.zadania ?? [])].reverse().find((x) => x.stan === 'trwa') ?? p.zadania?.at(-1);
    if (!z) return [];
    const d = await api<{ zadanie: { kroki: KrokKodeksa[] } }>(`/api/appstudio/zadania/${encodeURIComponent(z.id)}`);
    return d.zadanie?.kroki ?? [];
}
