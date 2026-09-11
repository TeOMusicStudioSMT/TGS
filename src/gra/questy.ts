/**
 * 📜 Questy — żywy świat (punkt 4) i umiejętności wyłącznie z questów (punkt 7).
 *
 * Dwa źródła questów:
 *  · ZIARNOWE — deterministyczne, wpisane w świat, działają BEZ mostu i bez AI.
 *    Dzięki nim gra jest grywalna offline, na 0.00G, bez Ollamy.
 *  · ŻYWE — generowane przez lokalnego Kustosza Teterhii (most → Ollama).
 *    Gdy mostu nie ma, UI mówi to wprost i zostaje przy ziarnowych.
 */
import type { Ton } from './sos';

export interface Wybor {
  tekst: string;
  ton: Ton;
}

export interface Quest {
  id: string;
  tytul: string;
  tresc: string;
  wybory: Wybor[];
  /** Nagroda bazowa w mGRV (mnożona przez kurs) i EXP. */
  bazaMGRV: number;
  exp: number;
  /** Umiejętność do zdobycia — TYLKO tędy. Punkt 7. */
  umiejetnosc?: string;
  /** Sekretny quest: dostępny dopiero powyżej progu nasycenia. */
  sekretny: boolean;
  /** Skąd pochodzi — uczciwie widoczne w UI. */
  zrodlo: 'ziarno' | 'kustosz';
}

export const UMIEJETNOSCI: Record<string, string> = {
  sluch: 'Słuch Strumienia — słyszysz, gdzie świat chce, żebyś poszedł.',
  dlon: 'Dłoń Twórcy — zostawiasz ślad, który trwa po Tobie.',
  oko: 'Oko Pustki — widzisz wyrwy w tkaninie świata.',
  oddech: 'Oddech — potrafisz zatrzymać się, zanim odpowiesz.',
  echo: 'Echo — Twoje słowa wracają do Ciebie z odpowiedzią.',
};

/** Questy wpisane w ziarno — grywalne bez mostu. */
export const QUESTY_ZIARNOWE: Quest[] = [
  {
    id: 'z-01', tytul: 'Pierwszy Strumień', sekretny: false, zrodlo: 'ziarno',
    tresc: 'Strumień płynie w poprzek Twojej drogi. Woda niesie coś, co wygląda jak cudze odbicie — ktoś tu był i zostawił po sobie ślad. Możesz go wziąć, ominąć albo zapytać strumienia, czyj jest.',
    wybory: [
      { tekst: 'Pytam strumień, czyje to odbicie.', ton: 'holistyczny' },
      { tekst: 'Zostawiam. Nie moje.', ton: 'autentyczny' },
      { tekst: 'Biorę — przyda się.', ton: 'sztuczny' },
    ],
    bazaMGRV: 40, exp: 30, umiejetnosc: 'sluch',
  },
  {
    id: 'z-02', tytul: 'Gaj, który pamięta', sekretny: false, zrodlo: 'ziarno',
    tresc: 'Drzewa w tym gaju rosną w krąg, jakby coś otaczały. W środku siedzi ktoś, kto nie podnosi wzroku. Nie prosi o pomoc. Nie mówi nic.',
    wybory: [
      { tekst: 'Siadam obok. Nic nie mówię.', ton: 'empatyczny' },
      { tekst: 'Pytam wprost, czego potrzebuje.', ton: 'autentyczny' },
      { tekst: 'Idę dalej — to nie mój quest.', ton: 'sztuczny' },
      { tekst: 'Podnoszę go siłą. Szybciej będzie.', ton: 'brutalny' },
    ],
    bazaMGRV: 55, exp: 45, umiejetnosc: 'oddech',
  },
  {
    id: 'z-03', tytul: 'Wyrwa', sekretny: false, zrodlo: 'ziarno',
    tresc: 'Pustka. Kawałek świata, którego po prostu nie ma — jakby generator o nim zapomniał. Coś w Tobie chce ją zaszpachlować. Coś innego chce w nią zajrzeć.',
    wybory: [
      { tekst: 'Zaglądam w wyrwę.', ton: 'autentyczny' },
      { tekst: 'Siadam na krawędzi i patrzę, aż przestanie być straszna.', ton: 'holistyczny' },
      { tekst: 'Zasypuję. Świat ma być cały.', ton: 'sztuczny' },
    ],
    bazaMGRV: 70, exp: 60, umiejetnosc: 'oko',
  },
  {
    id: 's-01', tytul: 'Sos', sekretny: true, zrodlo: 'ziarno',
    tresc: 'Nie ma tu nikogo. Nie ma questu. Jest tylko miejsce, w którym świat jest najbardziej sobą — i pytanie, które słyszysz własnym głosem: „po co to robisz?". Nie ma dobrej odpowiedzi. Jest tylko Twoja.',
    wybory: [
      { tekst: 'Bo chcę zobaczyć, co powstanie.', ton: 'autentyczny' },
      { tekst: 'Bo ktoś tego potrzebuje.', ton: 'empatyczny' },
      { tekst: 'Bo to wszystko jest jednym ruchem.', ton: 'holistyczny' },
      { tekst: 'Bo tak wypada.', ton: 'sztuczny' },
    ],
    bazaMGRV: 150, exp: 120, umiejetnosc: 'echo',
  },
];

/** Deterministyczny przydział questów do kafli-sekretów świata. */
export function questDlaKafla(indeks: number, sekretny: boolean): Quest {
  const pula = QUESTY_ZIARNOWE.filter((q) => q.sekretny === sekretny);
  return pula[indeks % pula.length];
}
