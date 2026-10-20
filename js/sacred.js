// Sacred art built from simple solids (no game-character models): polychrome statues,
// Galician cruceiros, Stations of the Cross plaques and religious habits for clergy NPCs.
import * as THREE from 'three';

const V2 = (a) => a.map(p => new THREE.Vector2(p[0], p[1]));
const cache = {};
const mat = (k, o) => cache[k] || (cache[k] = new THREE.MeshStandardMaterial(o));
const P = { // polychrome "estofado" paint on wood
  gold: () => mat('gold', { color: 0xd4a640, metalness: 0.85, roughness: 0.32 }),
  skin: () => mat('skin', { color: 0xe6c3a0, roughness: 0.6 }),
  blue: () => mat('blue', { color: 0x1f3f8c, roughness: 0.55, side: THREE.DoubleSide }),
  white: () => mat('white', { color: 0xf3eee2, roughness: 0.6, side: THREE.DoubleSide }),
  rose: () => mat('rose', { color: 0xe8d8cc, roughness: 0.6 }),
  brown: () => mat('brown', { color: 0x6b4a2c, roughness: 0.75, side: THREE.DoubleSide }),
  brownD: () => mat('brownD', { color: 0x4c3420, roughness: 0.8, side: THREE.DoubleSide }),
  green: () => mat('green', { color: 0x3b5a44, roughness: 0.65 }),
  hair: () => mat('hair', { color: 0x3a2616, roughness: 0.8 }),
  ivory: () => mat('ivory', { color: 0xf1e7d2, roughness: 0.5 }),
  red: () => mat('redbook', { color: 0x8a1e1e, roughness: 0.6 }),
  gourd: () => mat('gourd', { color: 0xb98a3e, roughness: 0.6 }),
  wood: () => mat('staff', { color: 0x5a3c22, roughness: 0.8 }),
};
const lathe = (pts, seg = 20, ps = 0, pl = Math.PI * 2) => new THREE.LatheGeometry(V2(pts), seg, ps, pl);
function mesh(g, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; return o; }

/** scallop shell (fan with ribs), facing +z, ~1 unit wide */
export function scallopGeo() {
  const sh = new THREE.Shape(); sh.moveTo(0, 0); const n = 9; for (let i = 0; i <= n * 2; i++) { const a = Math.PI * (0.08 + 0.84 * i / (n * 2)); const r = i % 2 ? 0.46 : 0.5; sh.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.95); } sh.lineTo(0, 0);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 }); g.rotateZ(Math.PI); g.translate(0, 0.45, 0); return g;
}
function halo(g, y, r = 0.1, stars = false) {
  const t = mesh(new THREE.TorusGeometry(r, 0.006, 5, 28), P.gold(), 0, y, -0.05); g.add(t);
  if (stars) for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; const s = mesh(new THREE.OctahedronGeometry(0.012), P.gold(), Math.cos(a) * r, y + Math.sin(a) * r, -0.05); g.add(s); }
}
/** Our Lady (Immaculate Conception style): white veil, blue mantle, cream gown, hands joined, crown of 12 stars. Height ~1.0. */
export function statueMary() {
  const g = new THREE.Group();
  g.add(mesh(lathe([[0, 0], [0.2, 0], [0.21, 0.03], [0.17, 0.06], [0, 0.06]], 16), P.gold()));
  g.add(mesh(lathe([[0, 0.06], [0.17, 0.06], [0.155, 0.2], [0.125, 0.45], [0.105, 0.62], [0.098, 0.72], [0.085, 0.79], [0.045, 0.83], [0.03, 0.85], [0, 0.85]], 22), P.rose()));
  // mantle: open at the front, falls from the shoulders and wraps forward at the hips
  g.add(mesh(lathe([[0.05, 0.84], [0.1, 0.81], [0.118, 0.74], [0.13, 0.6], [0.15, 0.4], [0.175, 0.2], [0.19, 0.08], [0.185, 0.065]], 26, Math.PI * 0.2, Math.PI * 1.6), P.blue()));
  { const hem = mesh(new THREE.TorusGeometry(0.183, 0.008, 4, 30, Math.PI * 1.6), P.gold(), 0, 0.075, 0); hem.rotation.set(Math.PI / 2, 0, Math.PI * 0.7); g.add(hem); }
  g.add(mesh(new THREE.SphereGeometry(0.058, 16, 12), P.skin(), 0, 0.905, 0.004));
  g.add(mesh(lathe([[0, 0.985], [0.035, 0.975], [0.064, 0.94], [0.072, 0.89], [0.08, 0.84], [0.1, 0.8], [0.098, 0.79]], 20, Math.PI * 0.27, Math.PI * 1.46), P.white()));
  // forearms (sleeves) and joined hands at the breast
  for (const s of [-1, 1]) { const a = mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.15, 8), P.rose(), s * 0.055, 0.655, 0.07); a.rotation.set(1.1, 0, s * 0.9); g.add(a); }
  const hd = mesh(new THREE.BoxGeometry(0.035, 0.07, 0.03), P.skin(), 0, 0.69, 0.115); hd.rotation.x = -0.35; g.add(hd);
  halo(g, 0.93, 0.105, true);
  // crescent moon under her feet (Rev 12:1)
  const moon = mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 20, Math.PI), P.gold(), 0, 0.085, 0.07); moon.rotation.set(-Math.PI / 2 + 0.2, 0, Math.PI); g.add(moon);
  return g;
}
/** St James the Greater as a pilgrim (Santiago Peregrino). Height ~1.0 (staff ~1.15). */
export function statueJames() {
  const g = new THREE.Group();
  g.add(mesh(lathe([[0, 0], [0.2, 0], [0.21, 0.03], [0.17, 0.06], [0, 0.06]], 16), P.gold()));
  g.add(mesh(lathe([[0, 0.06], [0.15, 0.06], [0.14, 0.2], [0.125, 0.45], [0.115, 0.62], [0.11, 0.72], [0.09, 0.79], [0.045, 0.83], [0.03, 0.85], [0, 0.85]], 22), P.green()));
  g.add(mesh(lathe([[0.06, 0.82], [0.11, 0.79], [0.13, 0.7], [0.145, 0.5], [0.165, 0.25], [0.18, 0.1], [0.175, 0.085]], 26, Math.PI * 0.22, Math.PI * 1.56), P.brown()));
  g.add(mesh(lathe([[0.04, 0.84], [0.12, 0.8], [0.16, 0.72], [0.165, 0.69], [0.155, 0.685]], 24), P.brownD())); // esclavina (short shoulder cape)
  const sc = mesh(scallopGeo(), P.ivory(), 0.0, 0.725, 0.15); sc.scale.setScalar(0.07); sc.rotation.x = -0.3; g.add(sc);
  g.add(mesh(new THREE.SphereGeometry(0.056, 16, 12), P.skin(), 0, 0.9, 0.0));
  const hair = mesh(new THREE.SphereGeometry(0.06, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), P.hair(), 0, 0.905, -0.008); g.add(hair);
  const beard = mesh(new THREE.ConeGeometry(0.045, 0.09, 10), P.hair(), 0, 0.84, 0.03); beard.rotation.x = Math.PI + 0.25; g.add(beard);
  // wide-brimmed pilgrim hat, brim turned up at the front with a scallop shell
  g.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 24), P.brownD(), 0, 0.948, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.06, 16), P.brownD(), 0, 0.98, 0));
  const up = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 24, 1, false, -0.7, 1.4), P.brownD(), 0, 0.99, 0.11); up.rotation.x = -1.2; up.position.set(0, 0.995, 0.06); g.add(up);
  const hs = mesh(scallopGeo(), P.ivory(), 0, 0.985, 0.13); hs.scale.setScalar(0.055); g.add(hs);
  halo(g, 0.93, 0.13);
  // right hand: the pilgrim's staff (bordón) with the gourd; left hand: the Gospel book
  const st = mesh(new THREE.CylinderGeometry(0.009, 0.011, 1.12, 8), P.wood(), 0.15, 0.62, 0.07); g.add(st);
  g.add(mesh(new THREE.SphereGeometry(0.018, 8, 6), P.wood(), 0.15, 1.18, 0.07));
  g.add(mesh(new THREE.SphereGeometry(0.03, 10, 8), P.gourd(), 0.172, 0.94, 0.07)); g.add(mesh(new THREE.SphereGeometry(0.022, 10, 8), P.gourd(), 0.172, 0.985, 0.07));
  const ra = mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.16, 8), P.green(), 0.12, 0.66, 0.05); ra.rotation.set(0.9, 0, -0.6); g.add(ra); g.add(mesh(new THREE.SphereGeometry(0.022, 8, 6), P.skin(), 0.15, 0.69, 0.07));
  const la = mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.15, 8), P.green(), -0.1, 0.62, 0.06); la.rotation.set(1.2, 0, 0.5); g.add(la);
  const bk = mesh(new THREE.BoxGeometry(0.08, 0.1, 0.025), P.red(), -0.11, 0.64, 0.11); bk.rotation.set(-0.5, 0.2, 0); g.add(bk);
  return g;
}
/** small corpus for a wayside cruceiro (stone relief), ~0.5 tall */
function reliefCorpus(m) {
  const g = new THREE.Group();
  const b = mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.26, 8), m, 0, 0.2, 0); g.add(b);
  const l = mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.22, 6), m, 0, 0.0, 0); g.add(l);
  const arm = mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.5, 6), m, 0, 0.33, 0); arm.rotation.z = Math.PI / 2; g.add(arm);
  g.add(mesh(new THREE.SphereGeometry(0.034, 8, 6), m, 0.008, 0.37, 0.01));
  return g;
}
/** Galician cruceiro: stepped platform, pedestal, octagonal shaft, capital, cross with Christ (front) and Our Lady (back). Facing +z. */
export function cruceiro(stoneMat, h = 1) {
  const g = new THREE.Group(); const add = (geo, y) => { const o = mesh(geo, stoneMat, 0, y, 0); o.receiveShadow = true; g.add(o); return o; };
  add(new THREE.BoxGeometry(1.9, 0.36, 1.9), 0.05); add(new THREE.BoxGeometry(1.35, 0.26, 1.35), 0.36); add(new THREE.BoxGeometry(0.62, 0.55, 0.62), 0.765);
  add(new THREE.CylinderGeometry(0.12 * h, 0.15 * h, 2.5 * h, 8), 1.04 + 1.25 * h);
  add(lathe([[0, 0], [0.15, 0], [0.17, 0.05], [0.26, 0.2], [0.27, 0.27], [0, 0.27]], 8), 1.04 + 2.5 * h);
  const cy = 1.04 + 2.5 * h + 0.27; const cr = new THREE.Group(); cr.position.y = cy; g.add(cr);
  const v = mesh(new THREE.BoxGeometry(0.13, 1.0, 0.11), stoneMat, 0, 0.5, 0), hz = mesh(new THREE.BoxGeometry(0.72, 0.12, 0.11), stoneMat, 0, 0.7, 0); cr.add(v); cr.add(hz);
  for (const [x, y] of [[0, 1.02], [0.38, 0.7], [-0.38, 0.7]]) cr.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), stoneMat, x, y, 0)); // flowered (fleury) ends
  const c = reliefCorpus(stoneMat); c.position.set(0, 0.36, 0.075); cr.add(c);
  const m = new THREE.Group(); m.add(mesh(new THREE.ConeGeometry(0.07, 0.3, 8), stoneMat, 0, 0.15, 0)); m.add(mesh(new THREE.SphereGeometry(0.035, 8, 6), stoneMat, 0, 0.33, 0)); m.position.set(0, 0.3, -0.075); cr.add(m);
  g.userData.top = cy + 1.1; return g;
}
const SN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV'];
let stTex = null;
/** Stations of the Cross atlas (7 x 2): carved and painted plaques with cross and Roman numeral */
export function stationsTexture() {
  if (stTex) return stTex; const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d'); const cw = 1024 / 7, ch = 256;
  for (let i = 0; i < 14; i++) { const x = (i % 7) * cw, y = Math.floor(i / 7) * ch;
    g.fillStyle = '#5a3a1e'; g.fillRect(x, y, cw, ch); g.fillStyle = '#c9a04a'; g.fillRect(x + 6, y + 6, cw - 12, ch - 12); g.fillStyle = '#efe2c4'; g.fillRect(x + 14, y + 14, cw - 28, ch - 28);
    // simple painted scene: hill, figure carrying the cross
    const gr = g.createLinearGradient(0, y + 20, 0, y + ch - 60); gr.addColorStop(0, '#b9c8d6'); gr.addColorStop(1, '#e8d8b0'); g.fillStyle = gr; g.fillRect(x + 20, y + 20, cw - 40, ch - 90);
    g.fillStyle = '#8a7a58'; g.beginPath(); g.moveTo(x + 20, y + ch - 70); g.quadraticCurveTo(x + cw / 2, y + ch - 130 - (i % 3) * 8, x + cw - 20, y + ch - 70); g.fill();
    g.strokeStyle = '#3a2a1a'; g.lineWidth = 6; g.lineCap = 'round'; const fx = x + cw * (0.35 + (i % 4) * 0.08), fy = y + ch - 115;
    g.beginPath(); g.moveTo(fx - 22, fy - 52); g.lineTo(fx + 24, fy + 6); g.moveTo(fx - 18, fy - 24); g.lineTo(fx + 4, fy - 40); g.stroke();
    g.fillStyle = '#7a1e1e'; g.beginPath(); g.moveTo(fx - 8, fy - 30); g.lineTo(fx + 8, fy - 30); g.lineTo(fx + 12, fy + 10); g.lineTo(fx - 12, fy + 10); g.fill(); g.fillStyle = '#d8b48a'; g.beginPath(); g.arc(fx, fy - 38, 7, 0, 7); g.fill();
    g.fillStyle = '#3a2a1a'; g.font = 'bold 34px Georgia, serif'; g.textAlign = 'center'; g.fillText(SN[i], x + cw / 2, y + ch - 28);
  }
  stTex = new THREE.CanvasTexture(c); stTex.colorSpace = THREE.SRGBColorSpace; stTex.anisotropy = 4; return stTex;
}
export function stationGeo(i, w = 0.42, h = 0.6) { const g = new THREE.PlaneGeometry(w, h); const uv = g.attributes.uv; const u0 = (i % 7) / 7, v0 = 1 - (Math.floor(i / 7) + 1) / 2; for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) / 7, v0 + uv.getY(k) / 2); return g; }

/** Religious habit / cassock attached to a skinned NPC: kind 'cassock' (priest), 'nun', 'friar' */
export function dressReligious(obj, bones, kind) {
  const col = kind === 'friar' ? 0x5a4632 : 0x15151a; const robe = mat('robe' + kind, { color: col, roughness: 0.92, side: THREE.DoubleSide });
  const skirt = new THREE.Mesh(lathe([[0.13, 0.0], [0.16, -0.18], [0.2, -0.5], [0.24, -0.8], [0.26, -0.95], [0.255, -0.97]], 18), robe);
  // plain religious cloth: drop the ranger armour pieces and leather, flatten the outfit to one dyed wool
  obj.traverse(m => { if (!m.isMesh || !/_(Ranger|Peasant)_/.test(m.name)) return;
    if (/Pauldron|Bracer|Belt|Hood/.test(m.name)) { m.visible = false; return; }
    if (!m.visible) return; m.material = m.material.clone(); m.material.map = null; m.material.normalMap = null; m.material.metalness = 0; m.material.roughness = 0.93;
    m.material.color.setHex(/Feet/.test(m.name) ? 0x2a2018 : col); m.material.needsUpdate = true; });
  const pel = bones.pelvis; if (!pel) return;
  obj.updateMatrixWorld(true); const s = 1 / Math.max(1e-4, pel.getWorldScale(new THREE.Vector3()).y) * obj.scale.y;
  // build in character space, then re-parent to the pelvis so it follows the hips
  const g = new THREE.Group(); g.add(skirt); const hp = new THREE.Vector3().setFromMatrixPosition(pel.matrixWorld); obj.worldToLocal(hp);
  skirt.position.y = 0; g.position.set(0, hp.y + 0.05, 0); obj.add(g); g.updateMatrixWorld(true); pel.attach(g); void s;
  skirt.castShadow = true;
  if (kind === 'friar') { const cord = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.012, 5, 18), mat('cord', { color: 0xe8dcc0, roughness: 0.9 })); cord.rotation.x = Math.PI / 2; cord.position.y = 0.0; g.add(cord);
    const knot = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.45, 5), cord.material); knot.position.set(0.08, -0.24, 0.13); g.add(knot); }
  if (kind === 'cassock') { const col2 = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.062, 0.03, 14), mat('collar', { color: 0xf4f4f0, roughness: 0.5 })); const hb = bones.neck_01 || bones.Head; if (hb) { hb.updateMatrixWorld(true); const p = new THREE.Vector3().setFromMatrixPosition(hb.matrixWorld); obj.worldToLocal(p); col2.position.copy(p).add(new THREE.Vector3(0, 0.0, 0.005)); obj.add(col2); hb.attach(col2); } }
  if (kind === 'nun' && bones.Head) { const hb = bones.Head; hb.updateMatrixWorld(true); const p = new THREE.Vector3().setFromMatrixPosition(hb.matrixWorld); obj.worldToLocal(p);
    const vg = new THREE.Group(); vg.position.copy(p);
    vg.add(new THREE.Mesh(lathe([[0, 0.2], [0.07, 0.19], [0.115, 0.13], [0.125, 0.04], [0.14, -0.08], [0.2, -0.3], [0.21, -0.34]], 18, Math.PI * 0.28, Math.PI * 1.44), mat('veil', { color: 0x111114, roughness: 0.9, side: THREE.DoubleSide })));
    const coif = new THREE.Mesh(lathe([[0.108, 0.16], [0.118, 0.1], [0.12, 0.04], [0.112, -0.03], [0.1, -0.06]], 18, Math.PI * 0.25, Math.PI * 1.5), mat('coif', { color: 0xf2f0ea, roughness: 0.6, side: THREE.DoubleSide })); coif.scale.setScalar(0.97); vg.add(coif);
    const gimp = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.17, 0.12, 16, 1, true, -1.2, 2.4), coif.material); gimp.position.set(0, -0.12, 0.0); vg.add(gimp);
    obj.add(vg); hb.attach(vg);
    const cr = new THREE.Group(); const gm = mat('ncross', { color: 0xc9a04a, metalness: 0.8, roughness: 0.35 }); cr.add(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.07, 0.008), gm)); const t = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.012, 0.008), gm); t.position.y = 0.012; cr.add(t);
    const sp = bones.spine_03; if (sp) { sp.updateMatrixWorld(true); const q = new THREE.Vector3().setFromMatrixPosition(sp.matrixWorld); obj.worldToLocal(q); cr.position.copy(q).add(new THREE.Vector3(0, 0.05, 0.13)); obj.add(cr); sp.attach(cr); } }
  return g;
}
