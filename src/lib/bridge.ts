/**
 * 🌉 Most Wiesia — jedyne wejście TGS do maszyny Suwerena.
 *
 * ZASADA 0.00G: nic tu nie udaje, że działa. Każde wywołanie albo trafia na żywy
 * endpoint mostu, albo rzuca błędem, który UI pokazuje wprost („most offline").
 * Żadnych `catch { return fakeSuccess }`.
 */

// `?most=3009` w adresie = most testowy (Klaudiusz sprawdza nowy kod bez restartu żywego :3001).
const mostZAdresu = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('most') : null;
export const BRIDGE = /^\d{2,5}$/.test(mostZAdresu ?? '') ? `http://127.0.0.1:${mostZAdresu}` : 'http://127.0.0.1:3001';

export class BridgeOffline extends Error {
  constructor() {
    super('Most (:3001) nie odpowiada — odpal Katedrę (START_KATEDRA.bat).');
    this.name = 'BridgeOffline';
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BRIDGE}${path}`, init);
  } catch {
    throw new BridgeOffline();
  }
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

export const bridge = {
  get: <T,>(path: string) => call<T>(path),
  post: <T,>(path: string, body?: unknown) =>
    call<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    }),
};

/** Czy most żyje? Zwraca true/false — nie rzuca. */
export async function mostZyje(): Promise<boolean> {
  try {
    await fetch(`${BRIDGE}/api/craft/recipes`);
    return true;
  } catch {
    return false;
  }
}
