/**
 * 🧹 Zwalnianie podglądu three.js (Suweren 2026-10-09: „dalej na tych 3D z Meshy jest ciemno”). `renderer.dispose()` nie
 * zwalnia tekstur ani geometrii brył i nie oddaje kontekstu WebGL — każde kliknięcie bryły zostawiało ją w pamięci karty
 * (tekstura Meshy 2K–8K), aż karta się zapchała, przeglądarka odebrała WebGL i studio czerniało.
 */
import * as THREE from 'three';

export function zwolnijScene(scena: THREE.Object3D, renderer: THREE.WebGLRenderer): void {
  scena.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry?.dispose();
    for (const mat of (Array.isArray(m.material) ? m.material : [m.material]) as THREE.Material[]) {
      if (!mat) continue;
      for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
      mat.dispose();
    }
  });
  renderer.dispose();
  renderer.forceContextLoss();   // oddaje kontekst WebGL od razu (Chrome trzyma ich ~16, potem gasi najstarsze)
}
