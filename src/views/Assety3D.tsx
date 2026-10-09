/**
 * 🗿 Assety3D — bryły do gier z tekstu i zdjęć (od 2026-09-22).
 *
 * Lewa kolumna: zlecenie (opis albo zdjęcie, nazwa, liczba ścian, rozdzielczość, gra docelowa)
 * + stan silnika (ComfyUI, wagi TRELLIS.2). Środek: biblioteka assetów z obrazem koncepcyjnym,
 * czasami i przyciskiem „do gry". Prawa: podgląd GLB w three.js (OrbitControls) — to, co
 * naprawdę wyszło z TRELLIS.2, nie obrazek. Logika w moście (services/Assety3D.js).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Loader2, RefreshCw, Trash2, Upload, Wand2, Gamepad2, Image as ImageIcon, Landmark, Package, Sparkles, Palette, ScanSearch, X, Eye, Cloud } from 'lucide-react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { zwolnijScene } from '../lib/zwolnijScene';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gry as pobierzGry, type ProjektGry } from '../lib/kodeks';
import { adresPliku, doGry, doSkladnicy, naStol, upiekszLokalnie, generujZTekstu, generujZeZdjecia, listaAssetow, stanAssetow, usunAsset, zadanieAssetu, przekolorujBryle, zageszczFragment, zaswiec, sylwetkaBryly, stanChmury, wycenChmure, zlecChmure, zadanieChmury, opisPoprawki, akcjeMeshy, zestawAkcji, ZESTAWY_AKCJI, type AkcjaMeshy, stylZeZdjecia, stylZOpisu, szukajPromocji, zwiadyPromocji, type ZwiadPromocji, type WycenaChmury, type ZadanieChmury, type ZlecenieChmury, type Asset3D, type StanAssetow, type ZadanieAssetu } from '../lib/assety3d';
import { KOLOR_ZERO, bezZmian, jasnoscSrgb, przekoloruj, przekolorujPiksele, wycinekNaPudelko, zHex, type Pudelko, type Sylwetka, type UstawieniaKoloru } from '../lib/kolorBryly';
import type { Wycinek } from '../lib/tworzenie';
import { ZaznaczWycinek } from './PracowniaObrazow';

/** Kolory wierzchołków każdej siatki podglądu: oryginał (z pliku) + ramka geometrii — pod suwaki koloru i fragment. */
// Atrybuty bywają PRZEPLECIONE (GLB z mostu: pozycja i kolor w jednym buforze) — `.array` to wtedy cały bufor,
// więc czytamy i piszemy wyłącznie przez getX/setXYZ (zmierzone 2026-10-08: `.array` dawał „kolory” −0,5).
type Atrybut = THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
interface KoloryPodgladu { attr: Atrybut; orig: Float32Array; poz: Atrybut; box: THREE.Box3; }

/** Podgląd świecącego oka: pudełko + próg jasności + barwa (null = jasnożółta) — jak wybierzSwiecace w moście, tylko per wierzchołek. */
interface PodgladSwiatla { pudelko: Pudelko; prog: number; kolor: string | null; }

function PodgladGlb({ url, kolor = null, fragment = null, swiatlo = null }: { url: string | null; kolor?: UstawieniaKoloru | null; fragment?: Pudelko | null; swiatlo?: PodgladSwiatla | null }) {
    const ref = useRef<HTMLDivElement>(null);
    const [info, setInfo] = useState<string>('');
    const siatki = useRef<KoloryPodgladu[]>([]);
    // 🎨 tekstury barwy (bryły z Meshy): oryginał pikseli + płótno, na którym suwaki liczą podgląd
    const tekstury = useRef<{ mapa: THREE.Texture; maty: THREE.MeshStandardMaterial[]; orig: ImageData; plotno: HTMLCanvasElement; tex: THREE.CanvasTexture }[]>([]);
    const [wczytano, setWczytano] = useState(0);
    useEffect(() => {
        const el = ref.current; if (!el || !url) return;
        const w = el.clientWidth, h = el.clientHeight || 320;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setSize(w, h); renderer.setPixelRatio(Math.min(2, window.devicePixelRatio)); el.appendChild(renderer.domElement);
        // Karta graficzna pełna (np. podcast, ComfyUI) → przeglądarka zabiera kontekst WebGL. Mówimy to, zamiast czernieć.
        renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); setInfo('⚠ karta graficzna odebrała podglądowi pamięć (zajęta innym zadaniem) — podgląd wróci po zwolnieniu karty; przełącz bryłę, żeby spróbować znów'); });
        const scena = new THREE.Scene();
        const kamera = new THREE.PerspectiveCamera(40, w / h, 0.01, 100); kamera.position.set(1.6, 1.2, 1.6);
        scena.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.4)); const d = new THREE.DirectionalLight(0xffffff, 1.2); d.position.set(3, 5, 2); scena.add(d);
        scena.add(new THREE.GridHelper(2, 10, 0x334155, 0x1e293b));
        const ctrl = new OrbitControls(kamera, renderer.domElement); ctrl.enableDamping = true; ctrl.target.set(0, 0.4, 0);
        let zywy = true; let model: THREE.Object3D | null = null;
        new GLTFLoader().load(url, (g) => {
            if (!zywy) return;
            model = g.scene;
            const box = new THREE.Box3().setFromObject(model); const size = box.getSize(new THREE.Vector3()); const s = 1 / Math.max(size.x, size.y, size.z, 1e-6);
            model.scale.setScalar(s); const box2 = new THREE.Box3().setFromObject(model); const c = box2.getCenter(new THREE.Vector3()); model.position.sub(c); model.position.y += (box2.max.y - box2.min.y) / 2;
            let tri = 0; siatki.current = []; tekstury.current = [];
            
            model.traverse((o) => {
                const m = o as THREE.Mesh;
                if (!m.isMesh || !m.geometry) return;
                tri += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3;
                if (!(m.material as THREE.Material)?.type) m.material = new THREE.MeshStandardMaterial({ vertexColors: true });
                for (const mat of (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[]) {
                    const mapa = mat.map;
                    const img = mapa?.image as (CanvasImageSource & { width: number; height: number }) | undefined;
                    if (!mapa || !img?.width) continue;
                    const znana = tekstury.current.find((x) => x.mapa === mapa);
                    if (znana) { znana.maty.push(mat); continue; }
                    const plotno = document.createElement('canvas'); plotno.width = img.width; plotno.height = img.height;
                    const ctx = plotno.getContext('2d', { willReadFrequently: true }); if (!ctx) continue;
                    ctx.drawImage(img, 0, 0);
                    const tex = new THREE.CanvasTexture(plotno);
                    tex.flipY = mapa.flipY; tex.colorSpace = mapa.colorSpace; tex.wrapS = mapa.wrapS; tex.wrapT = mapa.wrapT; tex.channel = mapa.channel;
                    tekstury.current.push({ mapa, maty: [mat], orig: ctx.getImageData(0, 0, img.width, img.height), plotno, tex });
                }
                const c = m.geometry.getAttribute('color') as Atrybut | undefined;
                if (c && c.itemSize >= 3) {
                    const orig = new Float32Array(c.count * 3);
                    for (let v = 0; v < c.count; v++) { orig[v * 3] = c.getX(v); orig[v * 3 + 1] = c.getY(v); orig[v * 3 + 2] = c.getZ(v); }
                    m.geometry.computeBoundingBox();
                    siatki.current.push({ attr: c, orig, poz: m.geometry.getAttribute('position') as Atrybut, box: m.geometry.boundingBox!.clone() });
                }
            });
            setWczytano((n) => n + 1);
            setInfo(`${Math.round(tri)} trójkątów · ${size.x.toFixed(2)}×${size.y.toFixed(2)}×${size.z.toFixed(2)}`);
            scena.add(model);
            (window as unknown as { __podglad?: unknown }).__podglad = { model, kamera, ctrl };   // do podglądu z konsoli / testów
        }, undefined, (e) => setInfo(`nie wczytałem GLB: ${(e as Error).message ?? e}`));
        const petla = () => { if (!zywy) return; ctrl.update(); if (model) model.rotation.y += 0.002; renderer.render(scena, kamera); requestAnimationFrame(petla); };
        petla();
        return () => { zywy = false; siatki.current = []; for (const t of tekstury.current) t.tex.dispose(); tekstury.current = []; ctrl.dispose(); zwolnijScene(scena, renderer); el.innerHTML = ''; };
    }, [url]);
    // 🎨 kolor tekstur na żywo (bryły z Meshy) — po chwili spokoju suwaka, bo tekstura 2K to 4 mln pikseli
    useEffect(() => {
        if (!tekstury.current.length) return;
        const t = setTimeout(() => {
            for (const x of tekstury.current) {
                const ctx = x.plotno.getContext('2d'); if (!ctx) continue;
                if (!kolor || bezZmian(kolor)) { ctx.putImageData(x.orig, 0, 0); }
                else { const d = new ImageData(new Uint8ClampedArray(x.orig.data), x.orig.width, x.orig.height); przekolorujPiksele(d.data, kolor); ctx.putImageData(d, 0, 0); }
                x.tex.needsUpdate = true;
                if (x.maty[0].map !== x.tex) { for (const m of x.maty) { m.map = x.tex; m.needsUpdate = true; } x.mapa.dispose(); }   // tekstura z GLB zwolniona z karty — płótno ją zastępuje
            }
        }, 180);
        return () => clearTimeout(t);
    }, [kolor, wczytano]);
    // 🎨 kolor na żywo (ta sama matematyka co most) + 🔍 fragment podświetlony na różowo
    useEffect(() => {
        for (const s of siatki.current) {
            const k = kolor && !bezZmian(kolor) ? przekoloruj(s.orig, kolor) : Float32Array.from(s.orig);
            if (swiatlo) {
                const { min, max } = s.box, b = swiatlo.pudelko;
                const lx = [min.x + b.x0 * (max.x - min.x), min.x + b.x1 * (max.x - min.x)];
                const ly = [min.y + b.y0 * (max.y - min.y), min.y + b.y1 * (max.y - min.y)];
                const lz = [min.z + (b.z0 ?? 0) * (max.z - min.z), min.z + (b.z1 ?? 1) * (max.z - min.z)];
                const barwa = (swiatlo.kolor && zHex(swiatlo.kolor)) || [1, 0.75, 0.2];
                for (let v = 0; v < k.length / 3; v++) {
                    const x = s.poz.getX(v), y = s.poz.getY(v), z = s.poz.getZ(v);
                    if (x < lx[0] || x > lx[1] || y < ly[0] || y > ly[1] || z < lz[0] || z > lz[1]) continue;
                    if (jasnoscSrgb(k[v * 3], k[v * 3 + 1], k[v * 3 + 2]) < swiatlo.prog) continue;
                    k[v * 3] = barwa[0]; k[v * 3 + 1] = barwa[1]; k[v * 3 + 2] = barwa[2];
                }
            }
            if (fragment) {
                const { min, max } = s.box;
                const lx = [min.x + fragment.x0 * (max.x - min.x), min.x + fragment.x1 * (max.x - min.x)];
                const ly = [min.y + fragment.y0 * (max.y - min.y), min.y + fragment.y1 * (max.y - min.y)];
                for (let v = 0; v < k.length / 3; v++) {
                    const x = s.poz.getX(v), y = s.poz.getY(v);
                    if (x >= lx[0] && x <= lx[1] && y >= ly[0] && y <= ly[1]) { k[v * 3] = k[v * 3] * 0.45 + 0.5; k[v * 3 + 1] *= 0.45; k[v * 3 + 2] = k[v * 3 + 2] * 0.45 + 0.5; }
                }
            }
            for (let v = 0; v < s.attr.count; v++) s.attr.setXYZ(v, k[v * 3], k[v * 3 + 1], k[v * 3 + 2]);
            if ('isInterleavedBufferAttribute' in s.attr && s.attr.isInterleavedBufferAttribute) s.attr.data.needsUpdate = true; else (s.attr as THREE.BufferAttribute).needsUpdate = true;
        }
    }, [kolor, fragment, swiatlo, wczytano]);
    return <div className="relative h-80 w-full overflow-hidden rounded-xl border border-slate-800 bg-black/40"><div ref={ref} className="h-full w-full" />{!url && <p className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">Wybierz asset z biblioteki, żeby obejrzeć GLB.</p>}{info && <p className="absolute bottom-1 left-2 font-mono text-[10px] text-slate-400">{info}</p>}</div>;
}

export default function Assety3D() {
    const [stan, setStan] = useState<StanAssetow | null>(null);
    const [assety, setAssety] = useState<Asset3D[]>([]);
    const [zadania, setZadania] = useState<ZadanieAssetu[]>([]);
    const [biezace, setBiezace] = useState<ZadanieAssetu | null>(null);
    const [gry, setGry] = useState<ProjektGry[]>([]);
    const [wybrany, setWybrany] = useState<Asset3D | null>(null);
    const [tekst, setTekst] = useState('');
    const [nazwa, setNazwa] = useState('');
    const [projekt, setProjekt] = useState('');
    const [sciany, setSciany] = useState(8000);
    const [rozdz, setRozdz] = useState(512);
    const [blad, setBlad] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [wysylam, setWysylam] = useState(false);
    const plikRef = useRef<HTMLInputElement>(null);
    // 🎨🔍 poprawki wybranej bryły — podgląd na żywo, zapis = NOWA wersja obok starej
    const [kolor, setKolor] = useState<UstawieniaKoloru>(KOLOR_ZERO);
    const [wycinekFr, setWycinekFr] = useState<Wycinek | null>(null);
    const [sylwetka, setSylwetka] = useState<Sylwetka | null>(null);
    const [scianyFr, setScianyFr] = useState(40000);
    const [scianyReszty, setScianyReszty] = useState(15000);
    const [poprawiam, setPoprawiam] = useState(false);
    // ✨ świecące oko — osobne zaznaczenie, próg jasności, barwa (pusta = kolor oka), moc
    const [wycinekOka, setWycinekOka] = useState<Wycinek | null>(null);
    const [progOka, setProgOka] = useState(50);
    const [kolorOka, setKolorOka] = useState<string>('');
    const [mocOka, setMocOka] = useState(6);
    // Głębokość: zaznaczenie na obrazie przebija bryłę na wylot; TRELLIS.2 potrafi przenieść poświatę oka
    // na potylicę (kot TeOgochi, 2026-10-08) — „przód” bierze tylko przednią część (+Z), „tył” tylną.
    const [glebiaOka, setGlebiaOka] = useState<'cala' | 'przod' | 'tyl'>('przod');
    // ☁️ chmura (Meshy): rodzaj, ustawienia, wycena (koszt i saldo PRZED wysłaniem), zadanie w tle
    const [chmuraKlucz, setChmuraKlucz] = useState<boolean | null>(null);
    const [rodzajChmury, setRodzajChmury] = useState<'retekstura' | 'remesh' | 'obraz3d' | 'rig' | 'akcje'>('retekstura');
    // 🧊 Image-to-3D (Meshy 7.1 / 6 lite) i 🦴 rig postaci (chód + bieg gratis, akcje z biblioteki po 3 kr.)
    const [modelI3d, setModelI3d] = useState<'latest' | 'meshy-6-lite'>('latest');
    const [pozaI3d, setPozaI3d] = useState<'' | 'a-pose' | 't-pose'>('');
    const [wzrost, setWzrost] = useState(1.7);
    const [akcje, setAkcje] = useState<number[]>([]);
    const [biblioteka, setBiblioteka] = useState<AkcjaMeshy[] | null>(null);
    const [kategoriaAkcji, setKategoriaAkcji] = useState('');
    const [szukajAkcji, setSzukajAkcji] = useState('');
    const [bladBiblioteki, setBladBiblioteki] = useState<string | null>(null);
    const [dobieram, setDobieram] = useState<string | null>(null);
    // 🎛️ auto: zestaw akcji z biblioteki (≤ 10) — zaznacza je i pokazuje na liście; Suweren może jeszcze zmienić
    const auto = async (zestaw: string) => {
        if (!wybrany) return;
        setDobieram(zestaw); setBladBiblioteki(null);
        try {
            const a = await zestawAkcji(wybrany.id, zestaw);
            if (!a.length) setBladBiblioteki('Ten zestaw nie ma już nowych akcji dla tej bryły.');
            setAkcje(a.map((x) => x.id)); setKategoriaAkcji(''); setSzukajAkcji(''); setWycenaCh(null);
            setBiblioteka((b) => [...a, ...(b ?? []).filter((x) => !a.some((y) => y.id === x.id))]);
        } catch (e) { setBladBiblioteki((e as Error).message); } finally { setDobieram(null); }
    };
    const [stylChmury, setStylChmury] = useState('');
    const [rozdzChmury, setRozdzChmury] = useState<'2k' | '4k' | '8k'>('2k');
    const [pbrChmury, setPbrChmury] = useState(false);
    const [scianyChmury, setScianyChmury] = useState(30000);
    const [topologiaChmury, setTopologiaChmury] = useState<'triangle' | 'quad'>('triangle');
    const [wycenaCh, setWycenaCh] = useState<WycenaChmury | null>(null);
    const [zadanieCh, setZadanieCh] = useState<ZadanieChmury | null>(null);
    const [patrzy, setPatrzy] = useState(false);
    const [bladStylu, setBladStylu] = useState<string | null>(null);
    // 🏷️ Zwiadowca: kody rabatowe Meshy (ostatni zwiad z mostu; nowe szukanie = wyszukiwanie w sieci przez API Claude, grosze)
    const [promocje, setPromocje] = useState<ZwiadPromocji | null>(null);
    const [szukamPromocji, setSzukamPromocji] = useState(false);
    const [bladPromocji, setBladPromocji] = useState<string | null>(null);
    // Klucz bywa udostępniany mostowi w trakcie (Hub → Kibel) — sprawdzamy też po powrocie do okna, bez przeładowania strony.
    useEffect(() => {
        const sprawdz = () => { stanChmury().then((s) => setChmuraKlucz(s.maKlucz)).catch(() => setChmuraKlucz(null)); };
        sprawdz();
        addEventListener('focus', sprawdz);
        return () => removeEventListener('focus', sprawdz);
    }, []);
    useEffect(() => { zwiadyPromocji().then((z) => setPromocje(z.find((x) => /meshy/i.test(x.usluga)) ?? null)).catch(() => {}); }, []);
    useEffect(() => { setWycenaCh(null); }, [wybrany?.id, rodzajChmury, stylChmury, rozdzChmury, pbrChmury, scianyChmury, topologiaChmury]);
    const zlecenieChmury = (): ZlecenieChmury => rodzajChmury === 'retekstura' ? { rodzaj: 'retekstura', styl: stylChmury, rozdzielczosc: rozdzChmury, pbr: pbrChmury }
        : rodzajChmury === 'obraz3d' ? { rodzaj: 'obraz3d', model: modelI3d, rozdzielczosc: modelI3d === 'meshy-6-lite' ? '2k' : rozdzChmury, pbr: pbrChmury, poza: pozaI3d }
            : rodzajChmury === 'rig' ? { rodzaj: 'rig', wzrost, akcje }
                : rodzajChmury === 'akcje' ? { rodzaj: 'akcje', akcje }
                : { rodzaj: 'remesh', sciany: scianyChmury, topologia: topologiaChmury };
    const opisZleceniaChmury = (): string => rodzajChmury === 'retekstura' ? `Retekstura ${rozdzChmury}${pbrChmury ? ' + PBR' : ''}`
        : rodzajChmury === 'obraz3d' ? `Image-to-3D (${modelI3d === 'latest' ? 'Meshy 7.1' : 'Meshy 6 lite'}, tekstury ${modelI3d === 'meshy-6-lite' ? '2k' : rozdzChmury}${pozaI3d ? `, ${pozaI3d}` : ''}) z obrazu bryły`
            : rodzajChmury === 'rig' ? `Rig postaci ${wzrost} m + chód i bieg${akcje.length ? ` + ${akcje.length} akcji z biblioteki` : ''}`
                : rodzajChmury === 'akcje' ? `${akcje.length} akcji z biblioteki na gotowym rigu (kolejna paczka ruchów)`
                : `Remesh ${scianyChmury.toLocaleString('pl-PL')} ścian (${topologiaChmury === 'quad' ? 'czworokąty' : 'trójkąty'})`;
    useEffect(() => {
        if ((rodzajChmury !== 'rig' && rodzajChmury !== 'akcje') || !chmuraKlucz) return;
        const t = setTimeout(() => { akcjeMeshy(kategoriaAkcji, szukajAkcji).then((a) => { setBiblioteka(a); setBladBiblioteki(null); }).catch((e) => setBladBiblioteki((e as Error).message)); }, 300);
        return () => clearTimeout(t);
    }, [rodzajChmury, chmuraKlucz, kategoriaAkcji, szukajAkcji]);
    useEffect(() => {
        setKolor(KOLOR_ZERO); setWycinekFr(null); setSylwetka(null); setWycinekOka(null);
        if (wybrany?.stan === 'gotowe') sylwetkaBryly(wybrany.id).then(setSylwetka).catch(() => setSylwetka(null));
    }, [wybrany?.id, wybrany?.stan]);
    const pudelkoFr: Pudelko | null = wycinekFr && sylwetka ? wycinekNaPudelko(wycinekFr, sylwetka) : null;
    const GLEBIE = { cala: { z0: 0, z1: 1 }, przod: { z0: 0.55, z1: 1 }, tyl: { z0: 0, z1: 0.45 } } as const;
    const pudelkoOka: Pudelko | null = wycinekOka && sylwetka ? { ...wycinekNaPudelko(wycinekOka, sylwetka), ...GLEBIE[glebiaOka] } : null;
    const podgladOka: PodgladSwiatla | null = pudelkoOka ? { pudelko: pudelkoOka, prog: progOka / 100, kolor: kolorOka || null } : null;

    const odswiez = useCallback(async () => {
        try { const d = await listaAssetow(); setAssety(d.assety); setZadania(d.zadania); const trwa = d.zadania.find((z) => z.stan === 'trwa'); if (trwa) setBiezace(await zadanieAssetu(trwa.id)); else setBiezace((b) => (b && b.stan === 'trwa' ? null : b)); } catch (e) { setBlad((e as Error).message); }
    }, []);
    useEffect(() => { void odswiez(); stanAssetow().then(setStan).catch(() => setStan(null)); pobierzGry().then(setGry).catch(() => setGry([])); }, [odswiez]);
    useEffect(() => { if (!biezace || biezace.stan !== 'trwa') return; const t = setInterval(async () => { try { const z = await zadanieAssetu(biezace.id); setBiezace(z); if (z.stan !== 'trwa') { await odswiez(); stanAssetow().then(setStan).catch(() => {}); } } catch { /* most chwilowo */ } }, 5000); return () => clearInterval(t); }, [biezace, odswiez]);

    const zlec = async (plik?: File) => {
        setBlad(null); setWysylam(true);
        try {
            const p = { nazwa: nazwa || undefined, projekt: projekt || null, sciany, rozdzielczosc: rozdz };
            const w = plik ? await generujZeZdjecia(plik, { ...p, opis: tekst || undefined }) : await generujZTekstu({ tekst, ...p });
            setBiezace(await zadanieAssetu(w.zadanie)); setTekst(''); setNazwa(''); await odswiez();
        } catch (e) { setBlad((e as Error).message); } finally { setWysylam(false); if (plikRef.current) plikRef.current.value = ''; }
    };
    const dodajDoGry = async (a: Asset3D, gra: string) => { try { await doGry(a.id, gra); await odswiez(); } catch (e) { setBlad((e as Error).message); } };
    // 🏛️ Na Stół: stado (Pionek, Paleta, Kodeks) ocenia bryłę i pisze lepszy opis; po ratyfikacji powstaje nowa wersja.
    const doStolu = async (a: Asset3D) => {
        const uwagi = window.prompt(`Co poprawić w „${a.nazwa}”? (puste = niech stado oceni samo)`, '');
        if (uwagi === null) return;
        setBlad(null);
        try { const d = await naStol(a.id, uwagi); setInfo(`🏛️ „${d.karta.tytul}” leży na Stole — przyjmij ją w Katedrze (Stół / StoL), a po ratyfikacji Zlecenia Stada policzą nową wersję.`); }
        catch (e) { setBlad((e as Error).message); }
    };
    // ✨ Upiększ lokalnie — ta sama bryła z tego samego źródła (opis, nazwa, obraz/wycinek przechodzą same), gęściej.
    const upiekszaj = async (a: Asset3D) => {
        const sciany = window.prompt(`✨ Upiększ „${a.nazwa}” lokalnie: rozdzielczość 1024 i więcej trójkątów (stara bryła zostaje).\nIle ścian? (8000 = jak było, 30000 = gęsto, 60000 = bardzo gęsto)`, '30000');
        if (sciany === null) return;
        setBlad(null);
        try { await upiekszLokalnie(a.id, { rozdzielczosc: 1024, sciany: Number(sciany) || 30000 }); setInfo(`✨ „${a.nazwa}” liczy się od nowa w 1024 — nowa bryła pojawi się obok (kilka minut, jeden asset naraz).`); void odswiez(); }
        catch (e) { setBlad((e as Error).message); }
    };
    const wSkladnicy = async (a: Asset3D) => {
        setBlad(null);
        try { const d = await doSkladnicy(a.id); setInfo(d.nowy ? `📦 „${a.nazwa}” w Składnicy Katedry (bryły) — Story i inne moduły ją widzą.` : `📦 „${a.nazwa}” już była w Składnicy — dołożone brakujące pliki.`); }
        catch (e) { setBlad((e as Error).message); }
    };
    const poNowej = async (n: Asset3D, opis: string) => {
        await odswiez();
        setWybrany(n);
        setInfo(opis);
    };
    const zapiszKolor = async () => {
        if (!wybrany) return;
        setBlad(null); setPoprawiam(true);
        try { const n = await przekolorujBryle(wybrany.id, kolor); await poNowej(n, `🎨 Nowa wersja „${n.id}” z poprawionym kolorem — stara bryła została. Do gry wyślij tę, która Ci się podoba.`); }
        catch (e) { setBlad((e as Error).message); } finally { setPoprawiam(false); }
    };
    const zageszcz = async () => {
        if (!wybrany || !pudelkoFr) return;
        setBlad(null); setPoprawiam(true);
        try {
            const n = await zageszczFragment(wybrany.id, { fragment: pudelkoFr, scianyFragmentu: scianyFr, sciany: scianyFr + scianyReszty });
            const f = n.siatka?.fragment;
            await poNowej(n, `🔍 Nowa wersja „${n.id}”: fragment ${f?.trojkaty.toLocaleString('pl-PL') ?? '?'} ścian, reszta ${f?.reszta.toLocaleString('pl-PL') ?? '?'}${f?.ograniczony ? ` — master miał w tym miejscu tylko ${f.wMasterze.toLocaleString('pl-PL')}, więcej się nie da (gęstszy master: „✨ Upiększ lokalnie” w 1024)` : ''}.`);
        } catch (e) { setBlad((e as Error).message); } finally { setPoprawiam(false); }
    };
    const zaswiecOko = async () => {
        if (!wybrany || !pudelkoOka) return;
        setBlad(null); setPoprawiam(true);
        try {
            const n = await zaswiec(wybrany.id, { fragment: pudelkoOka, prog: progOka / 100, kolor: kolorOka || null, moc: mocOka });
            const sw = n.siatka?.swiatlo;
            await poNowej(n, `✨ Nowa wersja „${n.id}”: świeci ${sw?.trojkaty.toLocaleString('pl-PL') ?? '?'} ścian, barwa ${sw?.kolor ?? '?'}, moc ${sw?.moc ?? mocOka}. W grze materiał świeci sam, a „Do gry” mówi Kodeksowi, gdzie postawić światło (nocą mocniej).`);
            setWycinekOka(null);
        } catch (e) { setBlad((e as Error).message); } finally { setPoprawiam(false); }
    };
    const wycenChmury = async () => {
        if (!wybrany) return;
        setBlad(null); setPoprawiam(true);
        try { setWycenaCh(await wycenChmure(wybrany.id, zlecenieChmury())); } catch (e) { setBlad((e as Error).message); } finally { setPoprawiam(false); }
    };
    // Styl retekstury: puste pole wypełnia się opisem wybranej bryły (bez modelu); „👁️ ze zdjęcia” pyta oczy Katedry.
    useEffect(() => {
        if (wybrany && !stylChmury.trim()) setStylChmury(stylZOpisu(wybrany));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wybrany?.id]);
    const stylZObrazu = async () => {
        if (!wybrany) return;
        setPatrzy(true); setBladStylu(null);
        try { const r = await stylZeZdjecia(wybrany.id); setStylChmury(r.styl); setWycenaCh(null); }
        catch (e) { setBladStylu(e instanceof Error ? e.message : String(e)); }
        finally { setPatrzy(false); }
    };
    const szukajKodowMeshy = async () => {
        setSzukamPromocji(true); setBladPromocji(null);
        try { setPromocje(await szukajPromocji('Meshy (meshy.ai, API do brył 3D)')); }
        catch (e) { setBladPromocji(e instanceof Error ? e.message : String(e)); }
        finally { setSzukamPromocji(false); }
    };
    const wyslijDoChmury = async () => {
        if (!wybrany || !wycenaCh) return;
        if (!window.confirm(`☁️ Wysłać „${wybrany.nazwa}” do Meshy?\n\n${opisZleceniaChmury()}\nKoszt: ${wycenaCh.kredyty} kredytów (≈ $${wycenaCh.usdOkolo}) — saldo ${wycenaCh.saldo}.\nBryła (${wycenaCh.mb} MB) wyjdzie z Katedry do chmury Meshy. Wynik wróci jako nowa wersja, stara zostaje.`)) return;
        setBlad(null);
        try {
            const z = await zlecChmure(wybrany.id, zlecenieChmury(), wycenaCh.kredyty);
            setZadanieCh(z); setWycenaCh(null);
            setInfo(`☁️ Meshy liczy (${wycenaCh.kredyty} kredytów) — nowa wersja pojawi się sama w bibliotece.`);
        } catch (e) { setBlad((e as Error).message); }
    };
    useEffect(() => {
        if (!zadanieCh || zadanieCh.stan === 'gotowe' || zadanieCh.stan === 'blad') return;
        const t = setInterval(async () => {
            try {
                const z = await zadanieChmury(zadanieCh.id); setZadanieCh(z);
                if (z.stan === 'gotowe' && z.asset) { await odswiez(); const d = await listaAssetow(); const n = d.assety.find((a) => a.id === z.asset); if (n) setWybrany(n); setInfo(`☁️ Gotowe: nowa wersja „${z.asset}” z Meshy (${z.kredyty} kredytów).`); }
                if (z.stan === 'blad') setBlad(`☁️ Meshy: ${z.blad}`);
            } catch { /* most chwilowo */ }
        }, 5000);
        return () => clearInterval(t);
    }, [zadanieCh, odswiez]);
    const usun = async (a: Asset3D) => { if (!window.confirm(`Usunąć asset „${a.nazwa}" z biblioteki? (kopie w grach zostają)`)) return; try { await usunAsset(a.id); if (wybrany?.id === a.id) setWybrany(null); await odswiez(); } catch (e) { setBlad((e as Error).message); } };

    const trwa = biezace?.stan === 'trwa';
    return (
        <div className="space-y-4">
            <header className="flex items-center gap-3">
                <Box className="text-tgs-primary" size={22} />
                <div>
                    <h2 className="text-lg font-bold">Assety 3D</h2>
                    <p className="text-xs text-slate-400">Opis albo zdjęcie → obraz (FLUX.2 klein) → siatka z kolorami (TRELLIS.2, MIT) → GLB. Wszystko lokalnie na ComfyUI. „Do gry" kładzie plik w public/assety/ i Kodeks go widzi.</p>
                </div>
                <button onClick={() => { void odswiez(); stanAssetow().then(setStan).catch(() => {}); }} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-800" title="Odśwież"><RefreshCw size={16} /></button>
            </header>
            {stan && !stan.gotowe && <p className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-2 text-sm text-amber-200">Silnik niegotowy: {stan.braki.join(' · ')}</p>}
            {blad && <p className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-2 text-sm text-rose-200">{blad}</p>}
            {info && <p className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-4 py-2 text-sm text-emerald-200">{info} <button onClick={() => setInfo(null)} className="ml-2 text-emerald-400/70 hover:text-emerald-200">✕</button></p>}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_380px]">
                <aside className="space-y-3">
                    <div className="space-y-2 rounded-xl border border-slate-800 bg-tgs-panel/60 p-3">
                        <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500"><Wand2 size={12} /> Nowy asset</p>
                        <textarea value={tekst} onChange={(e) => setTekst(e.target.value)} rows={3} placeholder={'Opis po polsku, np. „kamienny golem porośnięty mchem, zielone oczy" (przy zdjęciu: opcjonalny opis)'} className="w-full resize-none rounded-lg border border-slate-700 bg-black/40 px-3 py-2 text-xs outline-none focus:border-tgs-primary/60" />
                        <input value={nazwa} onChange={(e) => setNazwa(e.target.value)} placeholder="Nazwa pliku (np. golem)" className="w-full rounded-lg border border-slate-700 bg-black/40 px-3 py-1.5 text-xs outline-none focus:border-tgs-primary/60" />
                        <div className="grid grid-cols-2 gap-2">
                            <label className="text-[10px] text-slate-500">Ścian<select value={sciany} onChange={(e) => setSciany(Number(e.target.value))} className="mt-0.5 w-full rounded-lg border border-slate-700 bg-black/40 px-2 py-1 text-xs">{[2000, 4000, 8000, 15000, 30000].map((n) => <option key={n} value={n}>{n.toLocaleString('pl-PL')}</option>)}</select></label>
                            <label className="text-[10px] text-slate-500">Rozdzielczość<select value={rozdz} onChange={(e) => setRozdz(Number(e.target.value))} className="mt-0.5 w-full rounded-lg border border-slate-700 bg-black/40 px-2 py-1 text-xs">{[512, 1024, 1536].map((n) => <option key={n} value={n}>{n}{n === 512 ? ' (szybko, ~7 min)' : n === 1024 ? ' (dokładniej, ~13 min, VRAM na styk)' : ' (ryzyko VRAM)'}</option>)}</select></label>
                        </div>
                        <label className="text-[10px] text-slate-500">Od razu do gry<select value={projekt} onChange={(e) => setProjekt(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-700 bg-black/40 px-2 py-1 text-xs"><option value="">— tylko biblioteka —</option>{gry.map((g) => <option key={g.id} value={g.id}>{g.nazwa}</option>)}</select></label>
                        <button onClick={() => void zlec()} disabled={wysylam || trwa || tekst.trim().length < 3 || !stan?.gotowe} className="flex w-full items-center justify-center gap-1 rounded-lg bg-tgs-primary/80 py-2 text-sm font-semibold text-black hover:bg-tgs-primary disabled:opacity-40">{wysylam ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Z tekstu</button>
                        <label className={`flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg border border-slate-700 py-2 text-sm hover:border-tgs-primary/40 ${wysylam || trwa || !stan?.gotowe ? 'pointer-events-none opacity-40' : ''}`}><Upload size={14} /> Ze zdjęcia<input ref={plikRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void zlec(f); }} /></label>
                        <p className="text-[10px] leading-snug text-slate-500">Jeden asset naraz (6 GB VRAM). Nie odpalaj w tym czasie renderów w Story.</p>
                        <p className="text-[10px] leading-snug text-amber-300/80">Zdjęcie: JEDEN obiekt albo jedna postać na spokojnym tle. Cała scena (koncert, tłum, kilka osób, plakat z napisami) daje bryłę-kolaż — TRELLIS.2 nie wie, co jest „tym” obiektem.</p>
                    </div>
                    {biezace && (
                        <div className={`space-y-1 rounded-xl border p-3 text-xs ${biezace.stan === 'trwa' ? 'border-cyan-500/40 bg-cyan-950/20' : biezace.stan === 'gotowe' ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-rose-500/40 bg-rose-950/20'}`}>
                            <p className="flex items-center gap-2 font-semibold">{biezace.stan === 'trwa' && <Loader2 size={12} className="animate-spin" />}{biezace.asset} · {biezace.etap}{biezace.sekundyEtapu ? ` · ${biezace.sekundyEtapu} s` : ''}</p>
                            <div className="max-h-32 space-y-0.5 overflow-y-auto font-mono text-[10px] text-slate-400">{(biezace.kroki ?? []).map((k, i) => <p key={i}>{new Date(k.kiedy).toLocaleTimeString('pl-PL')} {k.tekst}</p>)}</div>
                        </div>
                    )}
                    {stan && <p className="px-1 text-[10px] text-slate-500">{stan.silnik} · ComfyUI {stan.comfy ? 'żyje' : 'śpi'}</p>}
                </aside>

                <section className="min-w-0">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {assety.length === 0 && zadania.length === 0 && <p className="col-span-full rounded-xl border border-slate-800 bg-tgs-panel/60 p-6 text-center text-sm text-slate-500">Biblioteka pusta. Opisz pierwszy asset albo wrzuć zdjęcie.</p>}
                        {assety.map((a) => (
                            <div key={a.id} onClick={() => setWybrany(a)} className={`cursor-pointer space-y-1 rounded-xl border p-2 ${wybrany?.id === a.id ? 'border-tgs-primary/50 bg-slate-800' : 'border-slate-800 bg-tgs-panel/60 hover:border-slate-600'}`}>
                                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-black/40">
                                    {a.stan === 'trwa' ? <Loader2 className="animate-spin text-slate-500" /> : <img src={adresPliku(a.id, 'obraz.png')} alt={a.nazwa} className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                                </div>
                                <p className="truncate text-sm font-semibold">{a.nazwa} <span className={`font-mono text-[10px] ${a.stan === 'gotowe' ? 'text-emerald-300' : a.stan === 'blad' ? 'text-rose-300' : 'text-cyan-300'}`}>{a.stan}</span></p>
                                <p className="line-clamp-2 text-[11px] text-slate-400">{a.opis}</p>
                                <p className="font-mono text-[10px] text-slate-500">{a.zrodlo === 'tekst' ? <Wand2 size={10} className="mr-1 inline" /> : <ImageIcon size={10} className="mr-1 inline" />}{a.czasy?.razem ? `${a.czasy.razem} s` : ''}{a.czasy?.['3d'] ? ` (3D ${a.czasy['3d']} s)` : ''}{a.rozmiarGlb ? ` · ${(a.rozmiarGlb / 1e6).toFixed(1)} MB` : ''}{a.wGrach?.length ? ` · w: ${a.wGrach.join(', ')}` : ''}</p>
                                {a.blad && <p className="text-[10px] text-rose-300">{a.blad}</p>}
                                <div className="flex items-center gap-1">
                                    {a.stan === 'gotowe' && <select defaultValue="" onClick={(e) => e.stopPropagation()} onChange={(e) => { if (e.target.value) { void dodajDoGry(a, e.target.value); e.target.value = ''; } }} className="min-w-0 flex-1 rounded-md border border-slate-700 bg-black/40 px-1 py-1 text-[11px]"><option value="">→ do gry…</option>{gry.map((g) => <option key={g.id} value={g.id}>{g.nazwa}</option>)}</select>}
                                    {a.stan === 'gotowe' && <button onClick={(e) => { e.stopPropagation(); void upiekszaj(a); }} className="rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-fuchsia-300" title="✨ Upiększ lokalnie — ta sama bryła w 1024, więcej trójkątów (stara zostaje)"><Sparkles size={14} /></button>}
                                    {a.stan === 'gotowe' && <button onClick={(e) => { e.stopPropagation(); void doStolu(a); }} className="rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-amber-300" title="Na Stół — stado ulepszy bryłę (nowa wersja po ratyfikacji)"><Landmark size={14} /></button>}
                                    {a.stan === 'gotowe' && <button onClick={(e) => { e.stopPropagation(); void wSkladnicy(a); }} className="rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-sky-300" title="Do Składnicy Katedry (wspólne bryły)"><Package size={14} /></button>}
                                    <button onClick={(e) => { e.stopPropagation(); void usun(a); }} className="rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-rose-300" title="Usuń z biblioteki"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <aside className="space-y-2">
                    <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500"><Gamepad2 size={12} /> Podgląd GLB {wybrany ? `· ${wybrany.nazwa}` : ''}</p>
                    <PodgladGlb url={wybrany && wybrany.stan === 'gotowe' ? adresPliku(wybrany.id, 'model.glb', Date.parse(wybrany.utworzono) + (wybrany.rozmiarGlb ?? 0)) : null} kolor={kolor} fragment={pudelkoFr} swiatlo={podgladOka} />
                    {wybrany?.poprawki?.length ? <p className="text-[10px] text-slate-500">Wersja z poprawkami: {wybrany.poprawki.map(opisPoprawki).join(' → ')}{wybrany.ulepsza ? ` (z ${wybrany.ulepsza})` : ''}</p> : null}
                    {wybrany?.tekstury && <p className="rounded-lg border border-sky-700/40 bg-sky-950/30 p-2 text-[11px] text-sky-200">☁️ Wersja z chmury ({wybrany.chmura?.usluga} · {wybrany.chmura?.rodzaj}) ma tekstury — 🎨 kolor zmienisz suwakami niżej (liczy się na teksturach, też w ruchach riga); fragment i oko działają na wersji sprzed chmury ({wybrany.ulepsza}).</p>}
                    {wybrany?.stan === 'gotowe' && (
                        <div className="space-y-1.5 rounded-xl border border-slate-800 bg-tgs-panel/60 p-3">
                            <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500"><Palette size={12} /> Kolor bryły · podgląd na żywo{wybrany.tekstury ? ' · tekstury' : ''}</p>
                            {([['czern', 'Podnieś czerń', 100, 0], ['jasnosc', 'Jasność', 100, -100], ['kontrast', 'Kontrast', 100, -100], ['nasycenie', 'Nasycenie', 100, -100], ['odcien', 'Odcień', 180, -180]] as const).map(([k, etykieta, zakres, od]) => (
                                <label key={k} className="flex items-center gap-2 text-[11px] text-slate-400">
                                    <span className="w-20">{etykieta}</span>
                                    <input type="range" min={od} max={zakres} step={1} value={k === 'odcien' ? kolor.odcien : Math.round(kolor[k] * 100)} onChange={(e) => { const v = Number(e.target.value); setKolor((o) => ({ ...o, [k]: k === 'odcien' ? v : v / 100 })); }} className="min-w-0 flex-1 accent-fuchsia-400" />
                                    <span className="w-9 text-right font-mono text-[10px]">{k === 'odcien' ? `${kolor.odcien}°` : Math.round(kolor[k] * 100)}</span>
                                </label>
                            ))}
                            <label className="flex items-center gap-2 text-[11px] text-slate-400"><input type="checkbox" checked={kolor.auto} onChange={(e) => setKolor((o) => ({ ...o, auto: e.target.checked }))} /> Auto-poziomy (rozciągnij ciemne barwy na pełny zakres)</label>
                            <div className="flex gap-2">
                                <button onClick={() => setKolor(KOLOR_ZERO)} disabled={bezZmian(kolor) || poprawiam} className="rounded-lg border border-slate-700 px-2 py-1 text-xs hover:border-slate-500 disabled:opacity-40">Wyzeruj</button>
                                <button onClick={() => void zapiszKolor()} disabled={bezZmian(kolor) || poprawiam} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-fuchsia-500/80 py-1 text-xs font-semibold text-black hover:bg-fuchsia-400 disabled:opacity-40">{poprawiam ? <Loader2 size={12} className="animate-spin" /> : <Palette size={12} />} Zapisz jako nową wersję</button>
                            </div>
                        </div>
                    )}
                    {wybrany?.stan === 'gotowe' && !wybrany.tekstury && (
                        <div className="space-y-1.5 rounded-xl border border-slate-800 bg-tgs-panel/60 p-3">
                            <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500"><ScanSearch size={12} /> Gęściej we fragmencie</p>
                            <p className="text-[10px] leading-snug text-slate-500">Zaznacz myszą na obrazie fragment (np. głowę) — na bryle zaświeci na różowo. Fragment dostaje własny budżet ścian, reszta swój; szew zostaje spięty. Fragment obejmuje całą głębokość bryły.</p>
                            <ZaznaczWycinek src={adresPliku(wybrany.id, 'obraz.png')} wycinek={wycinekFr} onZmiana={setWycinekFr} />
                            {sylwetka && !sylwetka.pewna && <p className="text-[10px] text-amber-300/80">Nie rozpoznałem sylwetki na obrazie (tło nie jest białe) — zaznaczenie liczę względem całego obrazu, może być przesunięte.</p>}
                            <div className="grid grid-cols-2 gap-2">
                                <label className="text-[10px] text-slate-500">Ścian fragmentu<select value={scianyFr} onChange={(e) => setScianyFr(Number(e.target.value))} className="mt-0.5 w-full rounded-lg border border-slate-700 bg-black/40 px-2 py-1 text-xs">{[20000, 40000, 60000, 100000].map((n) => <option key={n} value={n}>{n.toLocaleString('pl-PL')}</option>)}</select></label>
                                <label className="text-[10px] text-slate-500">Ścian reszty<select value={scianyReszty} onChange={(e) => setScianyReszty(Number(e.target.value))} className="mt-0.5 w-full rounded-lg border border-slate-700 bg-black/40 px-2 py-1 text-xs">{[4000, 8000, 15000, 30000].map((n) => <option key={n} value={n}>{n.toLocaleString('pl-PL')}</option>)}</select></label>
                            </div>
                            <div className="flex gap-2">
                                {wycinekFr && <button onClick={() => setWycinekFr(null)} className="rounded-lg border border-slate-700 px-2 py-1 text-xs hover:border-slate-500" title="Wyczyść zaznaczenie"><X size={12} /></button>}
                                <button onClick={() => void zageszcz()} disabled={!pudelkoFr || poprawiam} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-fuchsia-400/60 py-1 text-xs text-fuchsia-200 hover:bg-fuchsia-500/10 disabled:opacity-40">{poprawiam ? <Loader2 size={12} className="animate-spin" /> : <ScanSearch size={12} />} Zagęść fragment → nowa wersja</button>
                            </div>
                            {wybrany.siatka?.fragment && <p className="font-mono text-[10px] text-slate-400">ta wersja: fragment {wybrany.siatka.fragment.trojkaty.toLocaleString('pl-PL')} ścian (w masterze {wybrany.siatka.fragment.wMasterze.toLocaleString('pl-PL')}), reszta {wybrany.siatka.fragment.reszta.toLocaleString('pl-PL')}</p>}
                        </div>
                    )}
                    {wybrany?.stan === 'gotowe' && (
                        <div className="space-y-1.5 rounded-xl border border-sky-800/60 bg-tgs-panel/60 p-3">
                            <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500"><Cloud size={12} /> Dopracuj w chmurze · Meshy</p>
                            {chmuraKlucz === false && <p className="text-[11px] text-amber-300/90">Brak klucza Meshy w moście — Hub → TeO Kibel → wklej klucz <code>msy_…</code> → „🔗 Udostępnij mostowi”. API Meshy wymaga płatnego planu (Pro: 1000 kredytów / $20).</p>}
                            <div className="flex gap-2 text-[11px]">
                                {(['retekstura', 'remesh', 'obraz3d', 'rig', 'akcje'] as const).map((r) => <button key={r} onClick={() => { setRodzajChmury(r); setWycenaCh(null); }} title={{ retekstura: 'nowe tekstury z opisu stylu', remesh: 'nowa topologia (ściany)', obraz3d: 'nowa bryła z obrazu tej bryły — Meshy zamiast TRELLIS (tekstury, lepsza geometria)', rig: 'szkielet postaci humanoidalnej + chód, bieg i akcje z biblioteki → zakładka 6 Ruch', akcje: 'kolejna paczka akcji (≤ 10, 3 kr./akcja) na bryle, która JUŻ ma rig — bez ponownego rigowania' }[r]} className={`rounded-lg border px-2 py-1 ${rodzajChmury === r ? 'border-sky-400 text-sky-200' : 'border-slate-700 text-slate-400'}`}>{{ retekstura: '🎨 Retekstura', remesh: '🔺 Remesh', obraz3d: '🧊 Image-to-3D', rig: '🦴 Rig + ruchy', akcje: '🎞️ Akcje na rigu' }[r]}</button>)}
                            </div>
                            {rodzajChmury === 'obraz3d' ? (
                                <div className="space-y-1 text-[11px] text-slate-400">
                                    <p className="text-[10px] leading-snug text-slate-500">Obraz, z którego powstała ta bryła → Meshy liczy nową bryłę z teksturami (chmurowa alternatywa TRELLIS — dla brył-bohaterów gry, filmu, fashion). Wynik = nowa wersja obok starej.</p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <select value={modelI3d} onChange={(e) => { setModelI3d(e.target.value as 'latest' | 'meshy-6-lite'); setWycenaCh(null); }} className="rounded border border-slate-700 bg-black/40 px-1 py-0.5"><option value="latest">Meshy 7.1 (30 kr. 2K/4K, 35 kr. 8K)</option><option value="meshy-6-lite">Meshy 6 lite (15 kr., 2K)</option></select>
                                        {modelI3d === 'latest' && <select value={rozdzChmury} onChange={(e) => { setRozdzChmury(e.target.value as '2k' | '4k' | '8k'); setWycenaCh(null); }} className="rounded border border-slate-700 bg-black/40 px-1 py-0.5"><option value="2k">tekstury 2K</option><option value="4k">tekstury 4K</option><option value="8k">tekstury 8K</option></select>}
                                        <select value={pozaI3d} onChange={(e) => setPozaI3d(e.target.value as '' | 'a-pose' | 't-pose')} title="Postać pod rig: A-poza / T-poza ułatwia szkielet" className="rounded border border-slate-700 bg-black/40 px-1 py-0.5"><option value="">poza jak na obrazie</option><option value="a-pose">A-poza (pod rig)</option><option value="t-pose">T-poza (pod rig)</option></select>
                                        <label className="flex items-center gap-1"><input type="checkbox" checked={pbrChmury} onChange={(e) => setPbrChmury(e.target.checked)} /> PBR</label>
                                    </div>
                                </div>
                            ) : rodzajChmury === 'rig' || rodzajChmury === 'akcje' ? (
                                <div className="space-y-1.5 text-[11px] text-slate-400">
                                    {rodzajChmury === 'akcje' ? (wybrany.chmura?.rodzaj !== 'rig'
                                        ? <p className="text-[11px] text-amber-300/90">🎞️ Akcje dokłada się do wersji, która JUŻ ma rig z Meshy — wybierz bryłę po „🦴 Rig + ruchy”.</p>
                                        : <p className="text-[10px] leading-snug text-slate-500">Kolejna paczka ruchów na tym samym szkielecie (bez ponownego rigowania): ≤ 10 akcji po 3 kr. → nowy plik ruchu „akcje2”, „akcje3”… w zakładce „6 Ruch”. Tak zbierzesz więcej niż 10.</p>)
                                    : !wybrany.tekstury
                                        ? <p className="text-[11px] text-amber-300/90">🦴 Rig potrzebuje bryły z TEKSTURAMI (wersja z chmury). Najpierw „🎨 Retekstura” albo „🧊 Image-to-3D” tej bryły, potem wybierz nową wersję i wróć tutaj.</p>
                                        : <p className="text-[10px] leading-snug text-slate-500">Postać humanoidalna (dwie nogi, ręce), twarzą w stronę +Z. Rig = 5 kr. i daje gratis CHÓD i BIEG; akcje z biblioteki po 3 kr. (≤ 10, jeden plik). Ruchy lądują w zakładce „6 Ruch” jak ruchy z Blendera — „Do gry” z animacją.</p>}
                                    {rodzajChmury === 'rig' && <label className="flex items-center gap-2"><span className="w-16">Wzrost</span><input type="range" min={0.3} max={3} step={0.05} value={wzrost} onChange={(e) => { setWzrost(Number(e.target.value)); setWycenaCh(null); }} className="min-w-0 flex-1 accent-sky-400" /><span className="w-12 text-right font-mono text-[10px]">{wzrost.toFixed(2)} m</span></label>}
                                    <div className="flex flex-wrap items-center gap-1">
                                        <span className="text-[10px] text-slate-500">🎛️ auto:</span>
                                        {Object.entries(ZESTAWY_AKCJI).map(([k, n]) => <button key={k} onClick={() => void auto(k)} disabled={!!dobieram || !chmuraKlucz} title="Dobierz do 10 akcji z biblioteki (bez tych, które bryła już ma) — możesz potem zmienić" className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] hover:border-sky-400 disabled:opacity-40">{dobieram === k ? '…' : n}</button>)}
                                        {akcje.length > 0 && <button onClick={() => { setAkcje([]); setWycenaCh(null); }} className="text-[10px] text-slate-500 hover:text-slate-300">✕ wyczyść</button>}
                                    </div>
                                    <div className="flex gap-1.5">
                                        <select value={kategoriaAkcji} onChange={(e) => setKategoriaAkcji(e.target.value)} className="rounded border border-slate-700 bg-black/40 px-1 py-0.5"><option value="">wszystkie akcje</option><option value="WalkAndRun">chód i bieg</option><option value="BodyMovements">ruchy ciała</option><option value="DailyActions">codzienne</option><option value="Fighting">walka</option><option value="Dancing">taniec</option></select>
                                        <input value={szukajAkcji} onChange={(e) => setSzukajAkcji(e.target.value)} placeholder="szukaj (np. idle, attack, wave)" className="min-w-0 flex-1 rounded border border-slate-700 bg-black/40 px-2 py-0.5 outline-none" />
                                    </div>
                                    {bladBiblioteki && <p className="text-[10px] text-amber-300">⚠ {bladBiblioteki}</p>}
                                    <div className="max-h-36 space-y-0.5 overflow-y-auto pr-1">
                                        {(biblioteka ?? []).slice(0, 120).map((a) => (
                                            <label key={a.id} className="flex items-center gap-1.5 text-[11px] text-slate-300" title={`${a.kategoria} · ${a.podkategoria} · #${a.id}`}>
                                                <input type="checkbox" checked={akcje.includes(a.id)} disabled={!akcje.includes(a.id) && akcje.length >= 10} onChange={(e) => { setAkcje((x) => (e.target.checked ? [...x, a.id] : x.filter((y) => y !== a.id))); setWycenaCh(null); }} />
                                                <span className="truncate">{a.nazwa}</span>{a.podglad && <a href={a.podglad} target="_blank" rel="noreferrer" className="ml-auto text-[10px] text-sky-400 hover:underline">podgląd</a>}
                                            </label>
                                        ))}
                                        {biblioteka && biblioteka.length === 0 && <p className="text-[10px] text-slate-500">Nic nie pasuje.</p>}
                                    </div>
                                    <p className="text-[10px] text-slate-500">Wybrane akcje: {akcje.length}/10 · koszt {(rodzajChmury === 'rig' ? 5 : 0) + 3 * akcje.length} kr.{rodzajChmury === 'rig' ? ' Więcej niż 10 — po rigu „🎞️ Akcje na rigu”.' : ''}</p>
                                </div>
                            ) : rodzajChmury === 'retekstura' ? (<>
                                <div className="flex gap-1.5">
                                    <textarea value={stylChmury} onChange={(e) => setStylChmury(e.target.value)} rows={3} maxLength={800} placeholder="Styl tekstur, np. „czarna sierść mieniąca się jak opal, świecące bursztynowe środkowe oko”" className="min-w-0 flex-1 resize-none rounded-lg border border-slate-700 bg-black/40 px-2 py-1 text-[11px] outline-none" />
                                    <div className="flex flex-col gap-1">
                                        <button onClick={() => void stylZObrazu()} disabled={patrzy || !wybrany} title="Oczy Katedry (model widzący, lokalnie) opiszą materiały i barwy z obrazu bryły — po angielsku. Zajmuje kartę graficzną na chwilę." className="whitespace-nowrap rounded-lg border border-slate-700 px-2 py-1 text-[10px] hover:border-sky-400 disabled:opacity-40">{patrzy ? <Loader2 size={11} className="inline animate-spin" /> : '👁️'} ze zdjęcia</button>
                                        <button onClick={() => { if (wybrany) { setStylChmury(stylZOpisu(wybrany)); setWycenaCh(null); } }} disabled={!wybrany} title="Wpisz opis bryły i jej poprawki (świecące oko) — bez modelu" className="whitespace-nowrap rounded-lg border border-slate-700 px-2 py-1 text-[10px] hover:border-sky-400 disabled:opacity-40">📝 z opisu</button>
                                    </div>
                                </div>
                                {bladStylu && <p className="text-[10px] text-amber-300">⚠ {bladStylu}</p>}
                                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                    <select value={rozdzChmury} onChange={(e) => setRozdzChmury(e.target.value as '2k' | '4k' | '8k')} className="rounded border border-slate-700 bg-black/40 px-1 py-0.5"><option value="2k">2K (10 kr.)</option><option value="4k">4K (10 kr.)</option><option value="8k">8K (15 kr.)</option></select>
                                    <label className="flex items-center gap-1"><input type="checkbox" checked={pbrChmury} onChange={(e) => setPbrChmury(e.target.checked)} /> PBR (metal, chropowatość, normalne)</label>
                                </div>
                            </>) : (
                                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                    <select value={scianyChmury} onChange={(e) => setScianyChmury(Number(e.target.value))} className="rounded border border-slate-700 bg-black/40 px-1 py-0.5">{[5000, 15000, 30000, 60000, 100000].map((n) => <option key={n} value={n}>{n.toLocaleString('pl-PL')} ścian</option>)}</select>
                                    <select value={topologiaChmury} onChange={(e) => setTopologiaChmury(e.target.value as 'triangle' | 'quad')} className="rounded border border-slate-700 bg-black/40 px-1 py-0.5"><option value="triangle">trójkąty</option><option value="quad">czworokąty</option></select>
                                    <span>5 kredytów</span>
                                </div>
                            )}
                            {!wycenaCh && (chmuraKlucz === null ? <p className="text-[10px] text-amber-300/90">Most nie odpowiada o stan chmury — sprawdź, czy Katedra działa.</p>
                                : rodzajChmury === 'retekstura' && stylChmury.trim().length < 3 && chmuraKlucz ? <p className="text-[10px] text-slate-400">✍️ Opisz styl tekstur (min. 3 znaki), wtedy „💰 Wyceń” się odblokuje.</p> : null)}
                            {wycenaCh && <p className={`text-[11px] ${wycenaCh.wystarczy && !wycenaCh.zaDuzy ? 'text-emerald-300' : 'text-amber-300'}`}>💰 {wycenaCh.kredyty} kredytów (≈ ${wycenaCh.usdOkolo}) · saldo Meshy {wycenaCh.saldo}{!wycenaCh.wystarczy ? ' — za mało' : ''} · plik {wycenaCh.mb} MB{wycenaCh.zaDuzy ? ' — za duży, najpierw uprość' : ''}</p>}
                            <div className="flex gap-2">
                                <button onClick={() => void wycenChmury()} disabled={!chmuraKlucz || poprawiam || (rodzajChmury === 'retekstura' && stylChmury.trim().length < 3) || (rodzajChmury === 'rig' && !wybrany.tekstury)} className="rounded-lg border border-slate-700 px-2 py-1 text-xs hover:border-sky-400 disabled:opacity-40">💰 Wyceń</button>
                                <button onClick={() => void wyslijDoChmury()} disabled={!wycenaCh || !wycenaCh.wystarczy || wycenaCh.zaDuzy || (!!zadanieCh && zadanieCh.stan !== 'gotowe' && zadanieCh.stan !== 'blad')} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-sky-600/70 py-1 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-40"><Cloud size={12} /> {wycenaCh ? `Wyślij za ${wycenaCh.kredyty} kredytów` : 'Najpierw wyceń'}</button>
                            </div>
                            {zadanieCh && zadanieCh.stan !== 'gotowe' && <p className="font-mono text-[10px] text-sky-300">{zadanieCh.stan === 'blad' ? `⚠ ${zadanieCh.blad}` : `☁️ ${zadanieCh.stan} · ${zadanieCh.postep}%`}</p>}
                            {zadanieCh?.stan === 'gotowe' && <p className="font-mono text-[10px] text-emerald-300">✓ gotowe → {zadanieCh.asset}{zadanieCh.ruchy?.length ? ` · ruchy: ${zadanieCh.ruchy.join(', ')} (zakładka 6 Ruch)` : ''} · {zadanieCh.kredyty} kr.{zadanieCh.uwagi?.length ? ` · ⚠ ${zadanieCh.uwagi.join('; ')}` : ''}</p>}
                            <p className="text-[10px] leading-snug text-slate-500">Bryła wychodzi z Katedry do Meshy dopiero po „Wyślij” i potwierdzeniu kwoty. Wynik ma tekstury i wraca jako nowa wersja obok starej.</p>
                            <div className="space-y-1 border-t border-slate-800 pt-1.5">
                                <button onClick={() => void szukajKodowMeshy()} disabled={szukamPromocji} className="flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-1 text-[11px] hover:border-amber-300 disabled:opacity-40">{szukamPromocji ? <Loader2 size={11} className="animate-spin" /> : '🏷️'} Zwiadowca: szukaj kodów Meshy</button>
                                {bladPromocji && <p className="text-[10px] text-amber-300">⚠ {bladPromocji}</p>}
                                {promocje && (<>
                                    <p className="text-[10px] text-slate-500">{new Date(promocje.kiedy).toLocaleString('pl-PL')} · {promocje.koszt.wyszukan} wyszukań (≈ ${promocje.koszt.usdWyszukiwania} + tokeny){promocje.odrzucone.length ? ` · ${promocje.odrzucone.length} odrzucone bez źródła` : ''}</p>
                                    {promocje.znalezione.length === 0 && <p className="text-[11px] text-slate-400">Nic ze źródłem. {promocje.podsumowanie}</p>}
                                    {promocje.znalezione.map((z, i) => (
                                        <div key={i} className="rounded-lg border border-slate-800 bg-black/30 px-2 py-1 text-[11px]">
                                            <p className="text-slate-200">{z.kod ? <code className="mr-1 rounded bg-amber-500/20 px-1 text-amber-200">{z.kod}</code> : null}{z.rabat ? <b className="mr-1 text-emerald-300">{z.rabat}</b> : null}{z.opis}</p>
                                            <p className="text-[10px] text-slate-500">{z.pewnosc === 'oficjalne' ? '✅ oficjalne' : z.pewnosc === 'forum' ? '💬 forum' : '🧾 agregator'}{z.data || z.wiekStrony ? ` · ${z.data ?? z.wiekStrony}` : ''}{z.uwagi ? ` · ${z.uwagi}` : ''} · <a href={z.zrodlo} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">{z.tytulZrodla ?? 'źródło'}</a></p>
                                        </div>
                                    ))}
                                    <p className="text-[10px] leading-snug text-slate-500">{promocje.uwaga}</p>
                                </>)}
                            </div>
                        </div>
                    )}
                    {wybrany?.stan === 'gotowe' && !wybrany.tekstury && (
                        <div className="space-y-1.5 rounded-xl border border-slate-800 bg-tgs-panel/60 p-3">
                            <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500"><Eye size={12} /> Świecące oko</p>
                            <p className="text-[10px] leading-snug text-slate-500">Zaznacz na obrazie samo oko (z małym marginesem). Świeci tylko to, co jaśniejsze niż próg — ciemne futro wokół zostaje. Na bryle zobaczysz, co zaświeci.</p>
                            <ZaznaczWycinek src={adresPliku(wybrany.id, 'obraz.png')} wycinek={wycinekOka} onZmiana={setWycinekOka} />
                            <label className="flex items-center gap-2 text-[11px] text-slate-400"><span className="w-20">Próg jasności</span><input type="range" min={0} max={95} step={1} value={progOka} onChange={(e) => setProgOka(Number(e.target.value))} className="min-w-0 flex-1 accent-amber-300" /><span className="w-9 text-right font-mono text-[10px]">{progOka}</span></label>
                            <label className="flex items-center gap-2 text-[11px] text-slate-400"><span className="w-20">Głębokość</span>
                                <select value={glebiaOka} onChange={(e) => setGlebiaOka(e.target.value as 'cala' | 'przod' | 'tyl')} className="flex-1 rounded-lg border border-slate-700 bg-black/40 px-2 py-0.5 text-[11px]"><option value="przod">przód bryły (twarz)</option><option value="tyl">tył bryły</option><option value="cala">na wylot</option></select>
                            </label>
                            <label className="flex items-center gap-2 text-[11px] text-slate-400"><span className="w-20">Moc</span><input type="range" min={1} max={20} step={1} value={mocOka} onChange={(e) => setMocOka(Number(e.target.value))} className="min-w-0 flex-1 accent-amber-300" /><span className="w-9 text-right font-mono text-[10px]">{mocOka}</span></label>
                            <label className="flex items-center gap-2 text-[11px] text-slate-400"><span className="w-20">Barwa</span>
                                <input type="checkbox" checked={!!kolorOka} onChange={(e) => setKolorOka(e.target.checked ? '#ffd23f' : '')} /> własna
                                {kolorOka ? <input type="color" value={kolorOka} onChange={(e) => setKolorOka(e.target.value)} className="h-5 w-10 cursor-pointer rounded border border-slate-700 bg-transparent" /> : <span className="text-[10px] text-slate-500">(kolor oka z bryły)</span>}
                            </label>
                            <div className="flex gap-2">
                                {wycinekOka && <button onClick={() => setWycinekOka(null)} className="rounded-lg border border-slate-700 px-2 py-1 text-xs hover:border-slate-500" title="Wyczyść zaznaczenie"><X size={12} /></button>}
                                <button onClick={() => void zaswiecOko()} disabled={!pudelkoOka || poprawiam} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-amber-300/60 py-1 text-xs text-amber-200 hover:bg-amber-400/10 disabled:opacity-40">{poprawiam ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />} Zaświeć → nowa wersja</button>
                            </div>
                            {wybrany.siatka?.swiatlo && <p className="font-mono text-[10px] text-slate-400">ta wersja świeci: {wybrany.siatka.swiatlo.trojkaty.toLocaleString('pl-PL')} ścian, {wybrany.siatka.swiatlo.kolor}, moc {wybrany.siatka.swiatlo.moc}</p>}
                        </div>
                    )}
                    {wybrany?.promptObrazu && <p className="text-[10px] leading-snug text-slate-500">prompt: {wybrany.promptObrazu}</p>}
                </aside>
            </div>
        </div>
    );
}
