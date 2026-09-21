/**
 * 🎮 kodeks — Games Studio rozmawia z Kodeksem w moście (services/AppStudio.js, typ 'gra').
 *
 * Suweren (2026-09-21): „buduj z three.js, zacznij od gry zbieraj monety GRV — to będzie
 * pierwsza część przyszłej platformówki; moduł analizujący stan gry i jak może się rozwinąć;
 * Nocna Zmiana też to może brać; panel produkcyjny". Cała logika jest w moście; tu jest
 * klient: projekty typu 'gra', zlecenie ze strumieniem kroków (SSE przez fetch), analiza,
 * zlecenia dla Nocnej Zmiany.
 */
import { BRIDGE } from './bridge';

export interface ProjektGry { id: string; typ: string; nazwa: string; opis: string; utworzono: string; ostatnia: string; zbudowana: boolean; zrzut: boolean; iteracji: number; }
export interface WpisHistorii { zadanie: string | null; tresc: string; ok: boolean; rundy: number; sekundy: number; kiedy: string; commit: string | null; }
export interface Kierunek { tytul: string; opis: string; zadanie: string; }
export interface Analiza { kiedy: string; model: string; stan: string; dziala: string[]; brakuje: string[]; kierunki: Kierunek[]; nastepneZadanie: string; }
export interface Projekt extends ProjektGry { historia: WpisHistorii[]; analizy?: Analiza[]; ostatniZrzut: string | null; pliki: Array<{ sciezka: string; tresc: string }>; zadanieWToku: string | null; }
export interface Krok { typ: string; tekst?: string; kiedy?: string; stan?: string; wynik?: { ok: boolean; rundy: number; sekundy: number; commit?: string | null; powod?: string | null }; zadanie?: string; model?: string; migawki?: Array<{ kiedy: string; tekst: string }>; }
export interface Silnik { id: string; model: string; etykieta: string; domyslny: boolean; dostepny: boolean; uwaga: string; }
export interface ZadanieNocne { id: string; rodzaj: string; stan: string; parametry: Record<string, unknown>; dodano: string; koniec?: string; blad?: string | null; wynik?: string | null; }

async function api<T>(sciezka: string, init?: RequestInit): Promise<T> {
    const r = await fetch(`${BRIDGE}${sciezka}`, { headers: { 'Content-Type': 'application/json' }, ...init });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((d as { message?: string }).message || `HTTP ${r.status}`);
    return d as T;
}

export const gry = () => api<{ projekty: ProjektGry[] }>('/api/appstudio/projekty').then((d) => d.projekty.filter((p) => p.typ === 'gra'));
export const projekt = (id: string) => api<{ projekt: Projekt }>(`/api/appstudio/projekty/${encodeURIComponent(id)}`).then((d) => d.projekt);
export const nowaGra = (nazwa: string, opis: string) => api<{ projekt: Projekt }>('/api/appstudio/projekty', { method: 'POST', body: JSON.stringify({ nazwa, opis, typ: 'gra' }) }).then((d) => d.projekt);
export const usunGre = (id: string) => api<{ usunieto: boolean }>(`/api/appstudio/projekty/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const cofnij = (id: string) => api<{ ok: boolean; commit: string; build: { ok: boolean; etap: string } }>(`/api/appstudio/projekty/${encodeURIComponent(id)}/cofnij`, { method: 'POST' });
export const silniki = () => api<{ silniki: Silnik[] }>('/api/appstudio/silniki').then((d) => d.silniki);
export const analizuj = (id: string, model?: string) => api<{ analiza: Analiza }>(`/api/appstudio/projekty/${encodeURIComponent(id)}/analiza`, { method: 'POST', body: JSON.stringify({ model }) }).then((d) => d.analiza);
export const adresGry = (id: string) => `${BRIDGE}/apki/${encodeURIComponent(id)}/`;
export const adresZrzutu = (id: string, t = Date.now()) => `${BRIDGE}/api/appstudio/projekty/${encodeURIComponent(id)}/zrzut?t=${t}`;

/** Panel produkcyjny: zlecenia dla Nocnej Zmiany dotyczące tej gry + dodawanie nowych. */
export const zadaniaNocne = (id: string) => api<{ zadania: ZadanieNocne[]; dziennik: Array<{ id: string; rodzaj: string; stan: string; kiedy: string; blad?: string | null }> }>('/api/nocna/stan')
    .then((d) => ({ zadania: d.zadania.filter((z) => (z.parametry as { projektKodeksa?: string })?.projektKodeksa === id), dziennik: d.dziennik }));
export const zlecNocnej = (rodzaj: 'kodeks-rozwin' | 'kodeks-zadanie', id: string, zadanie?: string, notatka = 'z Games Studio') =>
    api<{ zadanie: ZadanieNocne }>('/api/nocna/dodaj', { method: 'POST', body: JSON.stringify({ rodzaj, parametry: { projektKodeksa: id, ...(zadanie ? { zadanie } : {}) }, notatka }) }).then((d) => d.zadanie);
export const usunNocne = (idZadania: string) => api<{ usunieto: number }>(`/api/nocna/${encodeURIComponent(idZadania)}`, { method: 'DELETE' });

/** Zleć budowę i czytaj kroki na żywo. */
export async function buduj(id: string, zadanie: string, naKrok: (k: Krok) => void, model?: string): Promise<void> {
    const r = await fetch(`${BRIDGE}/api/appstudio/projekty/${encodeURIComponent(id)}/buduj`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ zadanie, model, strumien: true }) });
    if (!r.ok || !r.body) { const d = await r.json().catch(() => ({})); throw new Error((d as { message?: string }).message || `HTTP ${r.status}`); }
    const czytnik = r.body.getReader(); const dek = new TextDecoder(); let bufor = '';
    for (;;) {
        const { value, done } = await czytnik.read();
        if (done) break;
        bufor += dek.decode(value, { stream: true });
        let i: number;
        while ((i = bufor.indexOf('\n\n')) >= 0) {
            const blok = bufor.slice(0, i); bufor = bufor.slice(i + 2);
            const linia = blok.split('\n').find((l) => l.startsWith('data: '));
            if (linia) { try { naKrok(JSON.parse(linia.slice(6)) as Krok); } catch { /* niepełny blok */ } }
        }
    }
}
