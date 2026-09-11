/**
 * 🛰️ Teleport — odbiór misji z Katedry.
 *
 * Hub wysyła parametry dwiema drogami (patrz TeO_Genesis/lib/teleport.ts):
 * Query Params (przeżywa zmianę portu / serwowanie przez most) i BroadcastChannel
 * (żyje tylko w obrębie jednego originu). TGS czyta OBIE.
 */

export const TGS_CHANNEL = 'teo_games_teleport';

export interface MisjaTGS {
  action?: 'open_game' | 'forge' | 'new_world';
  gameId?: string;
  engine?: 'unreal' | 'unity' | 'godot' | 'custom';
  prompt?: string;
  returnUrl?: string;
}

/** Wyłuskaj misję z adresu (?action=...&gameId=...). Null, gdy brak. */
export function misjaZAdresu(): MisjaTGS | null {
  const q = new URLSearchParams(window.location.search);
  if (![...q.keys()].length) return null;
  const m: MisjaTGS = {};
  const a = q.get('action');
  if (a === 'open_game' || a === 'forge' || a === 'new_world') m.action = a;
  const e = q.get('engine');
  if (e === 'unreal' || e === 'unity' || e === 'godot' || e === 'custom') m.engine = e;
  for (const k of ['gameId', 'prompt', 'returnUrl'] as const) {
    const v = q.get(k);
    if (v) m[k] = v;
  }
  return Object.keys(m).length ? m : null;
}

/** Nasłuch na kanale (gdy Hub i TGS siedzą na tym samym originie). */
export function nasluchujMisji(cb: (m: MisjaTGS) => void): () => void {
  const ch = new BroadcastChannel(TGS_CHANNEL);
  ch.onmessage = (ev) => {
    if (ev.data?.type === 'MISJA') cb(ev.data.misja as MisjaTGS);
  };
  return () => ch.close();
}
