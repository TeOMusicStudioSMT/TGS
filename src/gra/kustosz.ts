/**
 * 🔮 Kustosz Teterhii — żywy quest z lokalnego modelu.
 *
 * Instrukcja systemowa Rady 7 miała iść do Google AI Studio. Nie idzie:
 * po pierwsze Suweren dostał tam Errora (nie było czego „dotknąć"), po drugie
 * chmura łamie 0.00G. Ta sama instrukcja żyje więc jako system prompt
 * LOKALNEGO modelu — most → Ollama, trasa POST /api/tgs/quest.
 *
 * Bez mostu Kustosz milczy i mówi wprost, że milczy. Gra zostaje przy questach
 * ziarnowych, które działają zawsze.
 */
import { bridge } from '../lib/bridge';
import type { Quest } from './questy';
import type { Postac } from './postac';

export interface KontekstKustosza {
  postac: Postac;
  swiat: string;
  biom: string;
  nasycenie: number;
  poziom: number;
  posiadaneUmiejetnosci: string[];
}

interface OdpowiedzMostu {
  success: boolean;
  quest?: Omit<Quest, 'zrodlo' | 'id'>;
  message?: string;
  model?: string;
}

/** Poproś Kustosza o quest. Rzuca błędem, gdy most/model nie odpowiada. */
export async function wykujQuest(k: KontekstKustosza): Promise<Quest> {
  const d = await bridge.post<OdpowiedzMostu>('/api/tgs/quest', k);
  if (!d.success || !d.quest) throw new Error(d.message || 'Kustosz nie wykuł questu.');
  const q = d.quest;
  if (!Array.isArray(q.wybory) || q.wybory.length < 2) {
    throw new Error('Kustosz zwrócił quest bez wyborów — odrzucam, zamiast pokazywać kalekę.');
  }
  return { ...q, id: `k-${Date.now()}`, zrodlo: 'kustosz' };
}
