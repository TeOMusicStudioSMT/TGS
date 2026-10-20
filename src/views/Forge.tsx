/**
 * 🔨 TeO Forge — Multi-Engine.
 *
 * Unreal: realne trasy /api/uneng/launch, /api/uneng/run-headless, /api/uneng/headless-status.
 * Unity (2026-10-20, services/Unity.js w moście): /api/unity/stan, projekty, launch, build, eksport brył —
 * zakładka działa, gdy most widzi Unity; inaczej mówi wprost, co zainstalować (Hub + Unity 6 LTS, pakiet unity-mcp).
 * Godot / silniki autorskie to GNIAZDA PUSTE — mówią to wprost i podają, czego brakuje w moście. Zero atrap.
 *
 * „WYKUJ ŚWIAT" PRZYJECHAŁO Z HUBA (2026-09-11). Hub trzymał w menu własny
 * TeoArcadeForge: obok tych samych tras UE miał plan craftu, zasilenie wyspy
 * i generator skryptu UE z modelu — a do tego wpięte Reżysera i Księgarnię
 * Skilli, które mają domy w Story i Marketplace. Suweren: „forge = games studio,
 * tam je przenieś". Przeniesione są FUNKCJE, nie cudze wtyczki.
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { bridge } from '../lib/bridge';
import { listaAssetow, type Asset3D } from '../lib/assety3d';

type Silnik = 'unreal' | 'wykuj' | 'unity' | 'godot' | 'custom';

const ZAKLADKI: { id: Silnik; nazwa: string }[] = [
  { id: 'unreal', nazwa: 'Unreal Engine' },
  { id: 'wykuj', nazwa: 'Wykuj świat' },
  { id: 'unity', nazwa: 'Unity' },
  { id: 'godot', nazwa: 'Godot' },
  { id: 'custom', nazwa: 'Silnik autorski' },
];

/** Czego brakuje w moście, żeby zakładka przestała być pusta. */
const BRAKUJE: Record<Exclude<Silnik, 'unreal' | 'wykuj' | 'unity'>, string> = {
  godot: 'POST /api/godot/launch + /api/godot/export (godot --headless --export-release)',
  custom: 'POST /api/silnik/uruchom {komenda} — generyczny spawn z białą listą binarek',
};

function Unreal() {
  const [log, setLog] = useState('');
  const [zajety, setZajety] = useState(false);

  const wykonaj = async (opis: string, fn: () => Promise<unknown>) => {
    setZajety(true);
    setLog(`⟳ ${opis}…`);
    try {
      const d = (await fn()) as { success?: boolean; message?: string };
      if (d.success === false) throw new Error(d.message || 'most odmówił');
      setLog(`✅ ${opis}: ${JSON.stringify(d, null, 2)}`);
      toast.success(opis);
    } catch (e) {
      setLog(`⚠ ${(e as Error).message}`);
      toast.error((e as Error).message);
    } finally {
      setZajety(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">
        Projekty UE żyją w <code className="text-tgs-primary">TeO_Genesis/TeO_Arcade_Forge/</code> (GENESIS_OVERRIDE,
        ElectricDreamsEnv). Ścieżka do binarki UE siedzi w zmiennej <code>OTAKOS_UE_PATH</code> po stronie mostu.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          disabled={zajety}
          onClick={() => wykonaj('Otwieram Unreal Engine', () => bridge.post('/api/uneng/launch'))}
          className="rounded bg-tgs-primary px-3 py-2 text-sm font-medium text-tgs-dark disabled:opacity-50"
        >
          Otwórz edytor
        </button>
        <button
          disabled={zajety}
          onClick={() =>
            wykonaj('Buduję świat bez okna (headless)', () =>
              bridge.post('/api/uneng/run-headless', { script: '_headless_build.py' }),
            )
          }
          className="rounded bg-tgs-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Build headless
        </button>
        <button
          disabled={zajety}
          onClick={() => wykonaj('Stan buildu', () => bridge.get('/api/uneng/headless-status'))}
          className="rounded border border-slate-700 px-3 py-2 text-sm disabled:opacity-50"
        >
          Odśwież log
        </button>
      </div>
      {log && (
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-xs text-slate-300">
          {log}
        </pre>
      )}
    </div>
  );
}

/**
 * Wykuj świat — trzy realne trasy mostu, każda osobno, żeby dało się przerwać
 * po dowolnej:
 *   · plan craftu   → POST /api/craft/plan   { target }        (statyczne przepisy, bez modelu)
 *   · zasil wyspę   → POST /api/island/scan  { dir }           (liczy ludzi i przedmioty w katalogu)
 *   · skrypt UE     → POST /api/forge/ue-script { prompt }     (MODEL pisze Python pod UE; zapis na dysk)
 *
 * ⚠️ Tylko ostatnia woła model — i mówi, KTÓRY odpowiedział, bo skrypt bez
 * podpisu silnika za miesiąc wygląda, jakby napisał go człowiek.
 */
function WykujSwiat() {
  const [cel, setCel] = useState('tratwa');
  const [plan, setPlan] = useState('');
  const [katalog, setKatalog] = useState('');
  const [wyspa, setWyspa] = useState('');
  const [opis, setOpis] = useState('');
  const [kod, setKod] = useState('');
  const [plik, setPlik] = useState('');
  const [silnik, setSilnik] = useState('');
  const [zajety, setZajety] = useState<'' | 'plan' | 'wyspa' | 'skrypt'>('');

  const planuj = async () => {
    setZajety('plan');
    try {
      const d = await bridge.post<{ success: boolean; message?: string; name: string; energy: number; steps: string[] }>('/api/craft/plan', { target: cel });
      if (!d.success) throw new Error(d.message || 'Plan nieudany');
      setPlan(`⛵ ${d.name} (energia ${d.energy}):\n${d.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setZajety(''); }
  };

  const zasil = async () => {
    if (!katalog.trim()) { toast.error('Podaj katalog wyspy.'); return; }
    setZajety('wyspa');
    try {
      const d = await bridge.post<{ success: boolean; message?: string; people: number; assets: number; total: number }>('/api/island/scan', { dir: katalog.trim() });
      if (!d.success) throw new Error(d.message || 'Skan nieudany');
      setWyspa(`✅ ${d.people} ludzi · ${d.assets} przedmiotów (${d.total}). W UE: scene_island_populate.py`);
      toast.success(`Wyspa zasilona: ${d.people} ludzi, ${d.assets} przedmiotów.`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setZajety(''); }
  };

  const wykuj = async () => {
    if (!opis.trim()) { toast.error('Opisz scenę, którą model ma wykuć.'); return; }
    setZajety('skrypt');
    try {
      const d = await bridge.post<{ success: boolean; message?: string; code: string; file: string; model: string }>('/api/forge/ue-script', { prompt: opis });
      if (!d.success) throw new Error(d.message || 'Generacja nieudana');
      setKod(d.code); setPlik(d.file); setSilnik(d.model);
      toast.success(`Skrypt UE gotowy (${d.model}). Zapisany na dysku.`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setZajety(''); }
  };

  const przycisk = 'rounded bg-tgs-primary px-3 py-2 text-sm font-medium text-tgs-dark disabled:opacity-50';
  const pole = 'w-full rounded border border-slate-700 bg-black/40 px-3 py-2 text-sm text-slate-200 outline-none focus:border-tgs-primary';

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-400">
        Blueprint <code className="text-tgs-primary">GENESIS OVERRIDE</code>: zaplanuj craft, zasil wyspę ludźmi
        i przedmiotami, a potem każ modelowi wykuć skrypt Pythona pod UE. Każdy krok osobno.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2 rounded-xl border border-slate-800 p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">1 · plan craftu</div>
          <select value={cel} onChange={(e) => setCel(e.target.value)} className={pole}>
            <option value="tratwa">Tratwa</option>
            <option value="lodz">Łódź</option>
            <option value="statek">Statek</option>
          </select>
          <button disabled={!!zajety} onClick={planuj} className={przycisk}>{zajety === 'plan' ? 'planuję…' : 'Zaplanuj'}</button>
          {plan && <pre className="whitespace-pre-wrap rounded bg-black/40 p-3 text-xs text-slate-300">{plan}</pre>}
        </div>

        <div className="space-y-2 rounded-xl border border-slate-800 p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">2 · zasil wyspę</div>
          <input value={katalog} onChange={(e) => setKatalog(e.target.value)} placeholder="katalog z ludźmi i przedmiotami" className={pole} />
          <button disabled={!!zajety} onClick={zasil} className={przycisk}>{zajety === 'wyspa' ? 'skanuję…' : 'Skanuj'}</button>
          {wyspa && <p className="text-xs text-slate-300">{wyspa}</p>}
        </div>

        <div className="space-y-2 rounded-xl border border-slate-800 p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">3 · skrypt UE z modelu</div>
          <textarea value={opis} onChange={(e) => setOpis(e.target.value)} rows={3} placeholder="opis sceny do wykucia" className={pole} />
          <button disabled={!!zajety} onClick={wykuj} className={przycisk}>{zajety === 'skrypt' ? 'model pisze…' : 'Wykuj skrypt'}</button>
          {kod && (
            <div className="space-y-1">
              <div className="text-[11px] text-slate-500">
                silnik: <span className="text-tgs-primary">{silnik}</span> · plik: <code>{plik}</code>
              </div>
              <pre className="max-h-64 overflow-auto rounded bg-black/40 p-3 text-xs text-tgs-primary">{kod}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type ProjektUnity = { id: string; wersja: string | null; mcp: boolean; gltf: boolean; skryptBudowy: boolean };
type ZadanieUnity = { id: string; rodzaj: string; projekt: string; stan: string; cel?: string; ogon?: string | null; powod?: string; dziennik: string };
type StanUnity = {
  gotowy: boolean; hub: string | null; powod: string | null; instrukcja: string[] | null; katalog: string;
  edytory: { sciezka: string; wersja: string | null; zrodlo: string }[]; projekty: ProjektUnity[]; cele: string[];
  mcp: { pakiet: string; wProjektach: string[]; uwaga: string }; zadania: ZadanieUnity[];
};

/**
 * 🎲 Unity — drugi silnik obok gier three.js. Stan z mostu (Hub, edytory, projekty w _OtakOs_Unity z pakietami
 * Unity MCP i glTFast), nowy projekt (-createProject), otwarcie, budowa z wiersza poleceń, bryły z Assetów 3D do Assets/.
 * Bez Unity na maszynie: powód i instrukcja z mostu — nic nie udaje.
 */
function Unity() {
  const [stan, setStan] = useState<StanUnity | null>(null);
  const [blad, setBlad] = useState('');
  const [nowy, setNowy] = useState('');
  const [cel, setCel] = useState('windows');
  const [bryly, setBryly] = useState<Asset3D[]>([]);
  const [bryla, setBryla] = useState('');
  const [zajety, setZajety] = useState('');

  const odswiez = async () => {
    try { setStan(await bridge.get<StanUnity>('/api/unity/stan')); setBlad(''); }
    catch (e) { setBlad(/404/.test((e as Error).message) ? 'Most nie zna jeszcze /api/unity — zrestartuj most Katedry (services/Unity.js).' : (e as Error).message); }
  };
  useEffect(() => {
    void odswiez();
    listaAssetow().then((r) => setBryly(r.assety.filter((a) => a.stan === 'gotowe'))).catch(() => {});
  }, []);
  useEffect(() => {
    if (!stan?.zadania.some((z) => z.stan === 'trwa')) return;
    const t = setInterval(() => { void odswiez(); }, 3000);
    return () => clearInterval(t);
  }, [stan]);

  const wykonaj = async (opis: string, fn: () => Promise<{ success?: boolean; message?: string; uwaga?: string }>) => {
    setZajety(opis);
    try {
      const d = await fn();
      if (d.success === false) throw new Error(d.message || 'most odmówił');
      toast.success(d.uwaga ? `${opis} — ${d.uwaga}` : opis);
      await odswiez();
    } catch (e) { toast.error(`${opis}: ${(e as Error).message}`); }
    finally { setZajety(''); }
  };

  const przycisk = 'rounded bg-tgs-primary px-2 py-1 text-xs font-medium text-tgs-dark disabled:opacity-50';
  const pole = 'rounded border border-slate-700 bg-black/40 px-2 py-1 text-xs text-slate-200 outline-none focus:border-tgs-primary';

  if (blad) return <p className="rounded-xl border border-dashed border-amber-700/60 bg-amber-950/20 p-5 text-sm text-amber-300">{blad}</p>;
  if (!stan) return <p className="text-sm text-slate-500">⟳ pytam most o Unity…</p>;

  const pakietMcp = (
    <p className="text-xs text-slate-400">
      🤖 Agenci w Unity (CoplayDev/unity-mcp): w projekcie Window → Package Manager → + → Add package from git URL →{' '}
      <code className="break-all text-tgs-primary">{stan.mcp.pakiet}</code>, potem Window → MCP for Unity → Configure All Detected Clients
      (wymaga uv i Pythona 3.10+). {stan.mcp.uwaga}
    </p>
  );

  if (!stan.gotowy) {
    return (
      <div className="space-y-3 rounded-xl border border-dashed border-amber-700/60 bg-amber-950/20 p-5">
        <p className="font-medium text-amber-300">{stan.powod}</p>
        {stan.hub && <p className="text-xs text-slate-400">Unity Hub: <code>{stan.hub}</code></p>}
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-300">
          {(stan.instrukcja ?? []).map((l) => <li key={l}>{l}</li>)}
        </ol>
        <p className="text-xs text-slate-500">Projekty Unity Katedra trzyma w <code>{stan.katalog}</code>. Most sam niczego nie pobiera ani nie instaluje.</p>
        <button onClick={() => void odswiez()} className="rounded border border-slate-700 px-3 py-1 text-xs">↻ sprawdź ponownie</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1 text-xs text-slate-400">
        {stan.hub && <div>Unity Hub: <code>{stan.hub}</code></div>}
        <div>Edytory: {stan.edytory.map((e) => <span key={e.sciezka} className="mr-2 text-tgs-primary" title={e.sciezka}>{e.wersja ?? '?'} ({e.zrodlo})</span>)}</div>
        <div>Projekty w <code>{stan.katalog}</code></div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input value={nowy} onChange={(e) => setNowy(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="nowy-projekt" className={pole} />
        <button disabled={!!zajety || nowy.length < 2} onClick={() => wykonaj(`Zakładam projekt ${nowy}`, () => bridge.post('/api/unity/projekty', { projekt: nowy }))} className={przycisk}>＋ Nowy projekt Unity</button>
        <select value={cel} onChange={(e) => setCel(e.target.value)} className={pole}>{stan.cele.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={bryla} onChange={(e) => setBryla(e.target.value)} className={`${pole} max-w-xs`}>
          <option value="">— bryła z Assetów 3D —</option>
          {bryly.map((b) => <option key={b.id} value={b.id}>{b.nazwa}</option>)}
        </select>
      </div>

      {stan.projekty.length === 0 ? <p className="text-sm text-slate-500">Brak projektów Unity — załóż pierwszy.</p> : (
        <table className="w-full text-left text-xs">
          <thead className="text-slate-500"><tr><th className="py-1">projekt</th><th>wersja</th><th>Unity MCP</th><th>glTFast</th><th /></tr></thead>
          <tbody>
            {stan.projekty.map((p) => (
              <tr key={p.id} className="border-t border-slate-800">
                <td className="py-2 text-slate-200">{p.id}</td>
                <td>{p.wersja ?? 'nieotwarty'}</td>
                <td>{p.mcp ? '✅' : '—'}</td>
                <td title={p.gltf ? '' : 'bez glTFast Unity nie wczyta GLB z Katedry'}>{p.gltf ? '✅' : '⚠'}</td>
                <td className="space-x-1 text-right">
                  <button disabled={!!zajety} onClick={() => wykonaj(`Otwieram ${p.id}`, () => bridge.post('/api/unity/launch', { projekt: p.id }))} className={przycisk}>Otwórz</button>
                  <button disabled={!!zajety} onClick={() => wykonaj(`Buduję ${p.id} (${cel})`, () => bridge.post('/api/unity/build', { projekt: p.id, cel }))} className={przycisk}>Buduj {cel}</button>
                  <button disabled={!!zajety || !bryla} onClick={() => wykonaj(`Bryła → ${p.id}`, () => bridge.post('/api/unity/eksport', { projekt: p.id, asset: bryla }))} className={przycisk}>🗿 Bryła do Assets</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {stan.zadania.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">zadania Unity</div>
          {stan.zadania.map((z) => (
            <div key={z.id} className="rounded bg-black/30 p-2 text-xs text-slate-300">
              {z.stan === 'trwa' ? '⟳' : z.stan === 'gotowe' ? '✅' : '⚠'} {z.rodzaj} {z.projekt}{z.cel ? ` → ${z.cel}` : ''} · {z.stan}
              {z.powod && <div className="text-amber-300">{z.powod}</div>}
              {z.ogon && <pre className="mt-1 whitespace-pre-wrap text-[11px] text-slate-400">{z.ogon}</pre>}
              <div className="text-[10px] text-slate-500">dziennik: {z.dziennik}</div>
            </div>
          ))}
        </div>
      )}
      {pakietMcp}
    </div>
  );
}

function GniazdoPuste({ silnik }: { silnik: Exclude<Silnik, 'unreal' | 'wykuj' | 'unity'> }) {
  return (
    <div className="rounded-xl border border-dashed border-amber-700/60 bg-amber-950/20 p-5">
      <p className="font-medium text-amber-300">Gniazdo puste — ta zakładka niczego nie uruchamia.</p>
      <p className="mt-2 text-sm text-slate-400">
        Rada 7 zapisała ten silnik w wizji, ale w moście nie ma dla niego trasy. Żeby ożył, dopisz do{' '}
        <code className="text-tgs-primary">wiesio-bridge.js</code>:
      </p>
      <pre className="mt-3 overflow-x-auto rounded bg-black/40 p-3 text-xs text-tgs-primary">{BRAKUJE[silnik]}</pre>
    </div>
  );
}

export default function Forge() {
  const [akt, setAkt] = useState<Silnik>('unreal');
  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        {ZAKLADKI.map((z) => (
          <button
            key={z.id}
            onClick={() => setAkt(z.id)}
            className={`rounded-t px-3 py-2 text-sm ${
              akt === z.id ? 'bg-slate-800 text-tgs-primary' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {z.nazwa}
            {z.id !== 'unreal' && z.id !== 'wykuj' && z.id !== 'unity' && <span className="ml-1 text-amber-500">•</span>}
          </button>
        ))}
      </nav>
      {akt === 'unreal' ? <Unreal /> : akt === 'wykuj' ? <WykujSwiat /> : akt === 'unity' ? <Unity /> : <GniazdoPuste silnik={akt} />}
    </div>
  );
}
