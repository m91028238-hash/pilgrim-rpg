import * as THREE from 'three';
import { mergeGeometries } from '../vendor/addons/utils/BufferGeometryUtils.js?v=5';
import { fbm, mulberry, distToPolyline, sstep, lerp, clamp, hash2 } from './util.js?v=5';
import { CardLayer, cardMaterial, cross2, cross3, coverCell, planBoundaries, addTreeWind, bakeTreeImpostors, impostorMaterial, wind, T as FT } from './foliage.js?v=5';

export const WORLD = 600, HALF = 300, WATER = -0.55;
// Camino route (x,z). North is -z.
export const PATH = [[-262, 240], [-228, 214], [-200, 190], [-168, 156], [-136, 122], [-104, 92], [-78, 70], [-46, 44], [-10, 22], [28, 2], [60, -22], [92, -58], [124, -98], [152, -132], [176, -160], [196, -184], [212, -206]];
export const RIVER = [[-300, -30], [-230, -5], [-160, 30], [-110, 60], [-80, 92], [-60, 140], [-30, 200], [0, 300]];
export const ZONES = [ // flatten areas
  { k: 'start', x: -200, z: 190, r: 46 }, { k: 'hamlet', x: 62, z: -26, r: 42 }, { k: 'town', x: 196, z: -192, r: 72 },
  { k: 'camp', x: -212, z: -92, r: 26 }, { k: 'chapel', x: -40, z: -172, r: 18 }, { k: 'farm', x: -246, z: 140, r: 28 },
];
export const PLACES = {
  start: { x: -200, z: 196, label: 'San Roque' }, shrine_start: { x: -186, z: 178, label: 'Village Shrine' }, notice: { x: -207, z: 176, label: 'Notice Board' },
  bench: { x: -216, z: 186, label: 'Workbench' }, campfire: { x: -211, z: 191, label: 'Campfire' }, poor_1: { x: -184, z: 200, label: 'Old Tomás' },
  shrine_river: { x: -114, z: 108, label: 'River Shrine' }, bridge: { x: -92, z: 80, label: 'Old Bridge' },
  hamlet: { x: 62, z: -26, label: 'Villafranca' }, hamlet_church: { x: 76, z: -42, label: 'Villafranca Church' }, shrine_forest: { x: 18, z: -52, label: 'Forest Shrine' },
  forest: { x: -60, z: -110, label: 'Wolf Woods' }, chapel: { x: -40, z: -172, label: 'Ruined Chapel' }, chapel_chest: { x: -40, z: -175, label: 'Chapel Reliquary' },
  hills: { x: -220, z: -40, label: 'Western Hills' }, shrine_hill: { x: -170, z: -30, label: 'Hill Shrine' }, bandit_camp: { x: -212, z: -92, label: 'Bandit Camp' },
  lost_pilgrim: { x: -150, z: -160, label: 'Lost Pilgrim' }, town: { x: 196, z: -184, label: 'Santiago' }, shrine_town: { x: 170, z: -160, label: 'Town Shrine' },
  market: { x: 190, z: -176, label: 'Market' }, cathedral: { x: 212, z: -222, label: 'Cathedral of Santiago' }, priest: { x: 206, z: -206, label: 'Father Anselm' },
  region2: { x: 286, z: -214, label: 'Region 2 (coming soon)' },
};
const zoneH = {};
function baseH(x, z) {
  let h = (fbm(x * 0.0055 + 11, z * 0.0055 - 7, 4) - 0.5) * 22 + (fbm(x * 0.02, z * 0.02, 3) - 0.5) * 4;
  h += sstep(-110, -270, x) * 26 * fbm(x * 0.011 + 3, z * 0.011, 3) * sstep(120, -40, z); // western hills
  const e = Math.max(Math.abs(x), Math.abs(z)); h += sstep(255, 300, e) * 34; // bounding ridges
  return h;
}
for (const zn of ZONES) zoneH[zn.k] = Math.max(1.2, baseH(zn.x, zn.z));
export function heightAt(x, z) {
  let h = baseH(x, z);
  const p = distToPolyline(x, z, PATH).d; h = lerp(h, Math.max(h * 0.6, 0.9), (1 - sstep(3, 12, p)) * 0.6);
  for (const zn of ZONES) { const d = Math.hypot(x - zn.x, z - zn.z); if (d < zn.r) h = lerp(h, zoneH[zn.k], 1 - sstep(zn.r * 0.62, zn.r, d)); }
  const r = distToPolyline(x, z, RIVER).d;
  if (r < 16) h = lerp(h, Math.min(h, -2.0), 1 - sstep(5, 16, r));
  return h;
}
export function splatAt(x, z, h, slope) { // path, rock, cobble, forest
  const p = distToPolyline(x, z, PATH).d;
  let path = 1 - sstep(1.6, 3.4, p + (hash2(x | 0, z | 0) - 0.5) * 0.8);
  let rock = clamp(sstep(0.45, 0.8, slope) + sstep(14, 22, h) * 0.8, 0, 1);
  let cob = 0; for (const k of ['town', 'hamlet', 'start']) { const zn = ZONES.find(q => q.k === k); const d = Math.hypot(x - zn.x, z - zn.z); cob = Math.max(cob, 1 - sstep(zn.r * (k === 'town' ? 0.55 : 0.32), zn.r * (k === 'town' ? 0.62 : 0.4), d)); }
  const r = distToPolyline(x, z, RIVER).d; rock = Math.max(rock, (1 - sstep(4, 8, r)) * 0.8);
  let forest = 1 - sstep(70, 110, Math.hypot(x + 60, z + 115)); forest = Math.max(forest, (1 - sstep(10, 22, Math.hypot(x + 212, z + 92))) * 0.9);
  forest *= (1 - path); cob = Math.max(cob, 0); path *= (1 - cob);
  const s = path + rock + cob + forest; const k = s > 1 ? 1 / s : 1;
  return [path * k, rock * k, cob * k, forest * k];
}
// convert possibly-quantized attributes to float & bake matrix
function bakeGeo(mesh, m) {
  const g = new THREE.BufferGeometry();
  for (const n of ['position', 'normal', 'uv', 'color']) {
    let a = mesh.geometry.attributes[n]; if (!a) { if (n === 'color' && mesh.material && mesh.material.vertexColors) { const c = new Float32Array(mesh.geometry.attributes.position.count * 3).fill(1); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); continue; } if (n === 'uv') { g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(mesh.geometry.attributes.position.count * 2), 2)); } continue; }
    const isz = n === 'color' ? 3 : a.itemSize; const arr = new Float32Array(a.count * isz);
    for (let i = 0; i < a.count; i++) for (let c = 0; c < isz; c++) arr[i * isz + c] = a.getComponent(i, c);
    g.setAttribute(n, new THREE.BufferAttribute(arr, isz));
  }
  if (mesh.geometry.index) g.setIndex(Array.from(mesh.geometry.index.array)); else g.setIndex(null);
  if (!g.index) { const idx = []; for (let i = 0; i < g.attributes.position.count; i++) idx.push(i); g.setIndex(idx); }
  g.applyMatrix4(m); if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}
/** Get pieces from a kit glb: name -> [{geo, mat}] baked to the piece's local space */
export function kitPieces(gltf) {
  const out = {}; gltf.scene.updateMatrixWorld(true);
  for (const w of gltf.scene.children) {
    const inv = new THREE.Matrix4().copy(w.matrixWorld).invert(); const list = [];
    w.traverse(o => { if (o.isMesh) { const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld); list.push({ geo: bakeGeo(o, m), mat: o.material }); } });
    out[w.name] = list;
  }
  return out;
}
// Batch builder: collects transformed pieces and merges by material
export class Batch {
  constructor() { this.byMat = new Map(); }
  add(list, matrix, matOverride) { for (const p of list) { const mat = matOverride || p.mat; let a = this.byMat.get(mat); if (!a) this.byMat.set(mat, a = []); const g = p.geo.clone(); g.applyMatrix4(matrix); a.push(g); } }
  addGeo(geo, mat) { let a = this.byMat.get(mat); if (!a) this.byMat.set(mat, a = []); a.push(geo); }
  build(group, { cast = true, receive = true } = {}) {
    for (const [mat, geos] of this.byMat) { const g = mergeGeometries(geos, false); if (!g) continue; g.computeBoundingSphere(); const m = new THREE.Mesh(g, mat); m.castShadow = cast; m.receiveShadow = receive; m.matrixAutoUpdate = false; group.add(m); }
    this.byMat.clear();
  }
}
export const M4 = (x, y, z, ry = 0, s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(s, s, s));

export function buildWorld(scene, A, Q, col, renderer) {
  const group = new THREE.Group(); scene.add(group);
  const kit = kitPieces(A.village), nat = kitPieces(A.nature);
  const interactives = [], lamps = [], nodes = [], updaters = [], chimneys = [], doors = [];
  const rng = mulberry(1234);

  // ---------- Terrain ----------
  const seg = Q.terrainSeg;
  const tg = new THREE.PlaneGeometry(WORLD, WORLD, seg, seg); tg.rotateX(-Math.PI / 2);
  const pos = tg.attributes.position; const n = pos.count; const spl = new Float32Array(n * 4); const uv = tg.attributes.uv;
  for (let i = 0; i < n; i++) { const x = pos.getX(i), z = pos.getZ(i); pos.setY(i, heightAt(x, z)); uv.setXY(i, x / 4.5, z / 4.5); }
  tg.computeVertexNormals();
  const nor = tg.attributes.normal;
  for (let i = 0; i < n; i++) { const s = splatAt(pos.getX(i), pos.getZ(i), pos.getY(i), 1 - nor.getY(i) * 1.0 + 0.0); spl.set(s, i * 4); }
  tg.setAttribute('splat', new THREE.BufferAttribute(spl, 4));
  const T = A.tex;
  const tmat = new THREE.MeshStandardMaterial({ map: T.grass_d, normalMap: Q.level > 0 ? T.grass_n : null, roughness: 0.95, metalness: 0, normalScale: new THREE.Vector2(0.8, 0.8) });
  tmat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { tPath: { value: T.path_d }, tRock: { value: T.rock_d }, tCob: { value: T.cobble_d }, tFor: { value: T.forest_d } });
    sh.vertexShader = 'attribute vec4 splat;\nvarying vec4 vSplat;\n' + sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvSplat = splat;');
    sh.fragmentShader = 'uniform sampler2D tPath,tRock,tCob,tFor;\nvarying vec4 vSplat;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
      vec2 tuv = vMapUv;
      vec4 g = mix(texture2D(map, tuv), texture2D(map, tuv*0.21+0.3), 0.45);
      vec4 pth = texture2D(tPath, tuv*0.7); vec4 rk = mix(texture2D(tRock, tuv*0.5), texture2D(tRock, tuv*0.13), 0.4);
      vec4 cb = mix(texture2D(tCob, tuv*1.5), g, 0.12); vec4 fr = texture2D(tFor, tuv*0.6);
      float gs = clamp(1.0 - vSplat.x - vSplat.y - vSplat.z - vSplat.w, 0.0, 1.0);
      vec4 sampledDiffuseColor = g*gs + pth*vSplat.x + rk*vSplat.y + cb*vSplat.z + fr*vSplat.w;
      diffuseColor *= sampledDiffuseColor;`);
  };
  const terrain = new THREE.Mesh(tg, tmat); terrain.receiveShadow = true; group.add(terrain);

  // ---------- Water ribbon ----------
  {
    const pts = []; for (let i = 0; i < RIVER.length - 1; i++) { const [ax, az] = RIVER[i], [bx, bz] = RIVER[i + 1]; const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / 6); for (let s = 0; s < steps; s++) pts.push([lerp(ax, bx, s / steps), lerp(az, bz, s / steps)]); }
    pts.push(RIVER[RIVER.length - 1]);
    const v = [], idx = [], uvs = [];
    pts.forEach((p, i) => { const q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)]; let dx = q[0] - o[0], dz = q[1] - o[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; const w = 15;
      v.push(p[0] - dz * w, WATER, p[1] + dx * w, p[0] + dz * w, WATER, p[1] - dx * w); uvs.push(0, i * 0.5, 3, i * 0.5); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); wg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); wg.setIndex(idx); wg.computeVertexNormals();
    const wn = T.rock_n.clone(); wn.wrapS = wn.wrapT = THREE.RepeatWrapping; wn.repeat.set(2, 2);
    const wmat = new THREE.MeshStandardMaterial({ color: 0x2c4d55, roughness: 0.06, metalness: 0.3, transparent: true, opacity: 0.84, normalMap: wn, normalScale: new THREE.Vector2(0.25, 0.25) });
    const water = new THREE.Mesh(wg, wmat); water.renderOrder = 2; group.add(water);
    updaters.push(dt => { wn.offset.y -= dt * 0.05; wn.offset.x += dt * 0.01; });
  }

  // ---------- Buildings ----------
  const B = new Batch();
  const WALL = { plaster: ['Wall_Plaster_Straight', 'Wall_Plaster_Window_Wide_Round', 'Wall_Plaster_Door_Round', 'Wall_Plaster_WoodGrid'], brick: ['Wall_UnevenBrick_Straight', 'Wall_UnevenBrick_Window_Thin_Round', 'Wall_UnevenBrick_Door_Round', 'Wall_UnevenBrick_Window_Wide_Round'] };
  const ROOF = { '2x2': 'Roof_RoundTiles_4x4', '3x3': 'Roof_RoundTiles_6x6', '3x4': 'Roof_RoundTiles_6x8', '4x4': 'Roof_RoundTiles_8x8', '4x6': 'Roof_RoundTiles_8x12' };
  /** house: centre x,z; rot; wu,du wall units (2m); floors; style; door side front(+z local) */
  function house(x, z, rot, wu, du, floors = 1, style = 'plaster', opts = {}) {
    const y0 = (opts.y ?? heightAt(x, z)) - 0.12; const W = wu * 2, D = du * 2;
    const base = M4(x, y0, z, rot); const r = mulberry((x * 13 + z * 7) | 0);
    const sides = [[0, D / 2, 0, wu], [W / 2, 0, Math.PI / 2, du], [0, -D / 2, Math.PI, wu], [-W / 2, 0, -Math.PI / 2, du]];
    for (let f = 0; f < floors; f++) {
      const st = f === 0 ? style : (opts.upper || style); const set = WALL[st];
      sides.forEach(([sx, sz, sr, cnt], si) => {
        for (let i = 0; i < cnt; i++) {
          const off = -cnt + 1 + i * 2; const lx = sx + Math.cos(sr) * off, lz = sz - Math.sin(sr) * off;
          let piece = set[0];
          if (f === 0 && si === 0 && i === Math.floor(cnt / 2)) piece = set[2];
          else if (r() < (f ? 0.55 : 0.35)) piece = r() < 0.5 ? set[1] : set[3];
          if (opts.solid) piece = (f === 0 && si === 0 && i === Math.floor(cnt / 2)) ? set[2] : (r() < 0.3 ? set[1] : set[0]);
          B.add(kit[piece], base.clone().multiply(M4(lx, f * 3, lz, sr + Math.PI)));
        }
      });
      for (const [cx, cz, cr] of [[W / 2, D / 2, 0], [W / 2, -D / 2, Math.PI / 2], [-W / 2, -D / 2, Math.PI], [-W / 2, D / 2, -Math.PI / 2]]) B.add(kit['Corner_Exterior_Wood'], base.clone().multiply(M4(cx, f * 3, cz, cr)));
    }
    if (!opts.noRoof) { const rk = ROOF[`${Math.min(wu, du)}x${Math.max(wu, du)}`] || ROOF['3x3']; const rr = wu > du ? Math.PI / 2 : 0; B.add(kit[rk], base.clone().multiply(M4(0, floors * 3, 0, rr))); if ((r() < 0.6 || opts.enter) && !opts.noChimney) { B.add(kit['Prop_Chimney'], base.clone().multiply(M4(W / 2 - 1, floors * 3 + 0.5, -D / 4, 0))); chimneys.push(new THREE.Vector3(W / 2 - 1, floors * 3 + 2.6, -D / 4).applyMatrix4(base)); } }
    // door leaf in the doorway (front wall, middle unit)
    { const off = -wu + 1 + Math.floor(wu / 2) * 2; B.add(kit['Door_1_Round'], base.clone().multiply(M4(off, 0, D / 2, Math.PI)).multiply(M4(-0.53, 0, -0.11))); }
    if (opts.floorTop) B.add(kit['Floor_Brick'], base.clone().multiply(M4(0, floors * 3, 0)));
    col.addBox(x, z, W / 2 + 0.25, D / 2 + 0.25, rot, y0 + floors * 3 + 6, 'building');
    const off0 = -wu + 1 + Math.floor(wu / 2) * 2; // door is centred on the middle wall unit
    const door = new THREE.Vector3(off0, 0, D / 2 + 1.4).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot).add(new THREE.Vector3(x, 0, z));
    if (opts.enter) { const e = opts.enter; doors.push({ ...e, x: door.x, z: door.z, rot }); interactives.push({ type: 'door', id: e.id, x: door.x, z: door.z, r: 2.1, label: `Enter ${e.name}`, short: 'Enter' }); }
    return { x, z, rot, W, D, y0, door };
  }
  function tower(x, z, rot, floors, opts = {}) {
    const y0 = (opts.y ?? heightAt(x, z)) - 0.12; const base = M4(x, y0, z, rot);
    for (let f = 0; f < floors; f++) {
      const top = f === floors - 1;
      [[0, 2, 0], [2, 0, Math.PI / 2], [0, -2, Math.PI], [-2, 0, -Math.PI / 2]].forEach(([sx, sz, sr]) => {
        for (const off of [-1, 1]) { const lx = sx + Math.cos(sr) * off, lz = sz - Math.sin(sr) * off; B.add(kit[top ? 'Wall_Arch' : (f % 2 ? 'Wall_UnevenBrick_Window_Thin_Round' : 'Wall_UnevenBrick_Straight')], base.clone().multiply(M4(lx, f * 3, lz, sr + (top ? 0 : Math.PI)))); }
      });
      for (const [cx, cz, cr] of [[2, 2, 0], [2, -2, Math.PI / 2], [-2, -2, Math.PI], [-2, 2, -Math.PI / 2]]) B.add(kit['Corner_Exterior_Brick'], base.clone().multiply(M4(cx, f * 3, cz, cr)));
    }
    B.add(kit['Roof_Tower_RoundTiles'], base.clone().multiply(M4(0, floors * 3, 0)));
    B.add(kit['Floor_UnevenBrick'], base.clone().multiply(M4(0, (floors - 1) * 3, 0, 0, 2)));
    // bell
    const bell = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.55, 0], [0.5, 0.15], [0.38, 0.6], [0.3, 0.95], [0.12, 1.05], [0, 1.05]].map(p => new THREE.Vector2(p[0], p[1])), 14), new THREE.MeshStandardMaterial({ color: 0xa07a3a, metalness: 0.85, roughness: 0.35 }));
    bell.position.set(x, y0 + (floors - 1) * 3 + 1.0, z); group.add(bell);
    cross(x, y0 + floors * 3 + 6.7, z, 0.9, rot);
    col.addBox(x, z, 2.3, 2.3, rot, y0 + floors * 3 + 8, 'building');
    return bell;
  }
  const stoneMat = new THREE.MeshStandardMaterial({ map: T.rock_d, normalMap: T.rock_n, roughness: 0.9, color: 0xc8c0b4 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xc9a04a, metalness: 0.9, roughness: 0.3 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.85 });
  function boxGeo(w, h, d, x, y, z, ry = 0) { const g = new THREE.BoxGeometry(w, h, d); g.applyMatrix4(M4(x, y, z, ry)); return g; }
  function cross(x, y, z, s, ry = 0, mat = goldMat) { B.addGeo(boxGeo(0.14 * s, 1.6 * s, 0.14 * s, x, y + 0.8 * s, z, ry), mat); B.addGeo(boxGeo(0.9 * s, 0.14 * s, 0.14 * s, x, y + 1.1 * s, z, ry), mat); }
  function waysideCross(x, z) { const y = heightAt(x, z); B.addGeo(boxGeo(1.0, 0.5, 1.0, x, y + 0.2, z), stoneMat); B.addGeo(boxGeo(0.3, 2.6, 0.3, x, y + 1.6, z), stoneMat); B.addGeo(boxGeo(1.3, 0.28, 0.28, x, y + 2.3, z), stoneMat); col.addCircle(x, z, 0.65, y + 3); }
  // Camino bollard with scallop tile
  const shellTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#1d4f9c'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#f2c20f'; g.lineWidth = 7; g.lineCap = 'round'; for (let i = 0; i < 9; i++) { const a = Math.PI * (0.12 + i * 0.095); g.beginPath(); g.moveTo(28, 64); g.lineTo(28 + Math.cos(a - Math.PI / 2) * 0 + Math.sin(a) * 80, 64 - Math.cos(a) * 80 * 0.9); g.stroke(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const shellMat = new THREE.MeshStandardMaterial({ map: shellTex, roughness: 0.5 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0xd8d2c6, roughness: 0.95, map: T.rock_d });
  function marker(x, z, ry) { const y = heightAt(x, z); B.addGeo(boxGeo(0.45, 1.1, 0.3, x, y + 0.55, z, ry), concrete); B.addGeo(boxGeo(0.38, 0.38, 0.02, 0, 0, 0).applyMatrix4(M4(x + Math.sin(ry) * 0.16, y + 0.86, z + Math.cos(ry) * 0.16, ry)), shellMat); col.addCircle(x, z, 0.35, y + 1.2); }
  function shrine(key, x, z) {
    const y = heightAt(x, z); B.addGeo(boxGeo(2.2, 0.35, 1.6, x, y + 0.15, z), stoneMat); B.addGeo(boxGeo(0.7, 1.1, 0.5, x, y + 0.85, z - 0.4), stoneMat); cross(x, y + 1.35, z - 0.4, 0.8, 0, stoneMat);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc070 })); flame.position.set(x + 0.45, y + 0.62, z + 0.1); flame.visible = false; group.add(flame);
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.25, 8), new THREE.MeshStandardMaterial({ color: 0xf2eee0 })); candle.position.set(x + 0.45, y + 0.45, z + 0.1); group.add(candle);
    col.addBox(x, z, 1.1, 0.8, 0, y + 2); interactives.push({ type: 'shrine', key, x, z: z + 1.3, r: 2.6, label: 'Shrine — rest & save', flame }); lamps.push({ x: x + 0.45, y: y + 0.7, z: z + 0.1, flame, always: false });
  }
  function lamp(x, z) { const y = heightAt(x, z); B.addGeo(boxGeo(0.14, 2.6, 0.14, x, y + 1.3, z), woodMat); B.addGeo(boxGeo(0.6, 0.1, 0.1, x + 0.25, y + 2.55, z), woodMat);
    const g = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), new THREE.MeshStandardMaterial({ color: 0x332211, emissive: 0xffa040, emissiveIntensity: 0.2 })); g.position.set(x + 0.48, y + 2.3, z); group.add(g); lamps.push({ x: x + 0.48, y: y + 2.3, z, mesh: g, always: true }); col.addCircle(x, z, 0.25, y + 3); }
  function stall(x, z, ry, color, key, label) {
    const y = heightAt(x, z); const m = M4(x, y, z, ry);
    for (const [px, pz] of [[-1.4, -0.8], [1.4, -0.8], [-1.4, 0.8], [1.4, 0.8]]) B.addGeo(boxGeo(0.1, 2.4, 0.1, px, 1.2, pz).applyMatrix4(m), woodMat);
    B.addGeo(boxGeo(3, 0.12, 1.4, 0, 0.9, 0.2).applyMatrix4(m), woodMat);
    const cl = new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide }); const cg = new THREE.PlaneGeometry(3.3, 2.0); cg.rotateX(-Math.PI / 2 + 0.25); cg.translate(0, 2.4, 0); B.addGeo(cg.applyMatrix4(m), cl);
    B.add(kit['Prop_Crate'], m.clone().multiply(M4(1.9, 0, -0.5, 0.3, 0.7)));
    col.addBox(x, z, 1.6, 1.0, ry, y + 3);
    const front = new THREE.Vector3(0, 0, 2.0).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
    return { x: x + front.x, z: z + front.z, npcX: x - front.x * 0.4, npcZ: z - front.z * 0.4, ry };
  }
  function tent(x, z, ry, color = 0x6b5a44) { const y = heightAt(x, z); const g = new THREE.ConeGeometry(2.4, 2.8, 4, 1, true); g.rotateY(Math.PI / 4); g.applyMatrix4(M4(x, y + 1.4, z, ry)); B.addGeo(g, new THREE.MeshStandardMaterial({ color, roughness: 1, side: THREE.DoubleSide, map: T.forest_d })); col.addCircle(x, z, 1.8, y + 3); }

  // San Roque (start)
  house(-222, 168, 0.1, 3, 3, 1, 'plaster', { enter: { id: 'house_sr1', kind: 'house', name: "Marta's cottage" } }); house(-180, 162, -0.15, 3, 4, 2, 'brick', { upper: 'plaster' }); house(-226, 206, Math.PI - 0.1, 3, 3, 1, 'plaster');
  house(-174, 214, Math.PI + 0.2, 2, 3, 1, 'brick', { enter: { id: 'house_sr2', kind: 'house', name: "the shepherd's house" } }); house(-198, 222, Math.PI, 3, 3, 2, 'plaster', { enter: { id: 'inn_sr', kind: 'inn', name: 'the San Roque albergue' } });
  shrine('shrine_start', -186, 176);
  lamp(-196, 184); lamp(-205, 200);
  // Notice board
  { const [x, z] = [-207, 175]; const y = heightAt(x, z); B.addGeo(boxGeo(0.15, 2.4, 0.15, x - 0.9, y + 1.2, z), woodMat); B.addGeo(boxGeo(0.15, 2.4, 0.15, x + 0.9, y + 1.2, z), woodMat); B.addGeo(boxGeo(2.1, 1.2, 0.08, x, y + 1.6, z), new THREE.MeshStandardMaterial({ color: 0x8a6a46, map: T.forest_d }));
    for (let i = 0; i < 5; i++) B.addGeo(boxGeo(0.35, 0.45, 0.02, x - 0.7 + i * 0.35, y + 1.6 + (i % 2) * 0.15, z + 0.06), new THREE.MeshStandardMaterial({ color: 0xe8dcc0 }));
    col.addBox(x, z, 1.1, 0.25, 0, y + 3); interactives.push({ type: 'notice', x, z: z + 1.3, r: 2.4, label: 'Notice board — bounties' }); }
  // Workbench + campfire
  { const [x, z] = [-216, 186]; const y = heightAt(x, z); B.addGeo(boxGeo(2.0, 0.12, 0.9, x, y + 0.85, z), woodMat); for (const [a, b] of [[-0.85, -0.35], [0.85, -0.35], [-0.85, 0.35], [0.85, 0.35]]) B.addGeo(boxGeo(0.1, 0.85, 0.1, x + a, y + 0.42, z + b), woodMat);
    col.addBox(x, z, 1.05, 0.5, 0, y + 1.2); interactives.push({ type: 'bench', x, z: z + 1.2, r: 2.2, label: 'Workbench — craft' }); }
  function campfire(x, z, key) { const y = heightAt(x, z); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; B.addGeo(boxGeo(0.3, 0.2, 0.25, x + Math.cos(a) * 0.6, y + 0.1, z + Math.sin(a) * 0.6, a), stoneMat); }
    for (let i = 0; i < 3; i++) B.addGeo(boxGeo(0.12, 0.12, 1.0, x, y + 0.15, z, i * 1.05), woodMat);
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 7), new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.85 })); fire.position.set(x, y + 0.5, z); group.add(fire);
    updaters.push((dt, t) => { fire.scale.set(1 + Math.sin(t * 13) * 0.08, 1 + Math.sin(t * 9 + 1) * 0.15, 1); });
    lamps.push({ x, y: y + 0.8, z, fire, always: true, strong: true }); col.addCircle(x, z, 0.8, y + 1); if (key) interactives.push({ type: 'campfire', x, z, r: 2.4, label: 'Campfire — cook' }); }
  campfire(-211, 192, 'cf1');
  // farm with fences
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const x = -246 + Math.cos(a) * 14, z = 140 + Math.sin(a) * 10; B.add(kit['Prop_WoodenFence_Single'], M4(x, heightAt(x, z), z, -a + Math.PI / 2, 1.3)); }
  B.add(kit['Prop_Wagon'], M4(-232, heightAt(-232, 158), 158, 0.6)); col.addBox(-232, 158, 1.1, 2.2, 0.6, 5);

  // River shrine & bridge
  shrine('shrine_river', -114, 106);
  { // bridge across river at crossing near (-92,80) aligned with path direction
    const bx = -91, bz = 81, dir = Math.atan2(-104 - -78, 92 - 70); const ry = Math.atan2(26, -22); // along path
    const len = 30, w = 4.4; const deckY = 1.25; const m = M4(bx, 0, bz, ry);
    B.addGeo(boxGeo(w, 0.6, len, 0, deckY - 0.3, 0).applyMatrix4(m), stoneMat);
    B.addGeo(boxGeo(0.4, 0.8, len, -w / 2 + 0.2, deckY + 0.4, 0).applyMatrix4(m), stoneMat); B.addGeo(boxGeo(0.4, 0.8, len, w / 2 - 0.2, deckY + 0.4, 0).applyMatrix4(m), stoneMat);
    for (const pz of [-6, 6]) B.addGeo(boxGeo(w, 3.2, 2.2, 0, deckY - 1.9, pz).applyMatrix4(m), stoneMat);
    col.addSurface(bx, bz, w / 2, len / 2, ry, deckY);
    const off = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
    for (const s of [-1, 1]) col.addBox(bx + off.x * s * (w / 2 - 0.1), bz + off.z * s * (w / 2 - 0.1), 0.25, len / 2 - 2.5, ry, deckY + 1.2);
  }

  // Villafranca hamlet
  const hc = house(76, -44, 0.6, 4, 6, 2, 'brick', { solid: true, noChimney: true, upper: 'brick', enter: { id: 'church_vf', kind: 'church', name: 'Villafranca Church' } });
  const bell1 = tower(76 + Math.cos(0.6) * -6.4 + Math.sin(0.6) * 7.5, -44 - Math.sin(0.6) * -6.4 + Math.cos(0.6) * 7.5, 0.6, 5);
  house(44, -10, 0.9, 3, 3, 1, 'plaster'); house(48, -46, 0.4, 3, 4, 2, 'plaster'); house(80, -6, 0.75, 2, 3, 1, 'brick'); house(34, -34, 1.2, 2, 2, 1, 'plaster');
  shrine('shrine_forest', 18, -50); lamp(60, -18); lamp(70, -30);

  // Santiago town
  let fountainPos = null; const benches = [];
  const cat = { x: 212, z: -224, ry: 0.0 };
  const nave = house(cat.x, cat.z - 4, cat.ry, 4, 6, 3, 'brick', { solid: true, noChimney: true, upper: 'brick', enter: { id: 'cathedral', kind: 'cathedral', name: 'the Cathedral' } });
  house(cat.x, cat.z - 16, cat.ry, 4, 6, 3, 'brick', { solid: true, noChimney: true, upper: 'brick', y: nave.y0 + 0.12 });
  tower(cat.x - 6.4, cat.z + 3.6, 0, 6, { y: nave.y0 + 0.12 }); const bell2 = tower(cat.x + 6.4, cat.z + 3.6, 0, 6, { y: nave.y0 + 0.12 });
  cross(cat.x, nave.y0 + 9 + 5.5, cat.z - 4, 1.4);
  const townHouses = [[168, -206, 0.2, 3, 4, 2], [170, -186, 1.57, 3, 3, 2], [178, -232, 0.1, 3, 3, 2], [240, -200, -1.57, 3, 4, 2], [238, -178, -1.4, 3, 3, 2], [224, -160, 3.0, 4, 4, 2], [196, -150, 3.1, 3, 4, 2], [244, -228, -1.2, 3, 3, 1], [160, -168, 1.3, 2, 3, 1], [180, -148, 2.8, 3, 3, 2]];
  const ENTER = { '170,-186': { id: 'house_st', kind: 'house', name: 'the townhouse' }, '224,-160': { id: 'inn_st', kind: 'inn', name: 'the Posada del Camino' }, '196,-150': { id: 'shop_st', kind: 'shop', name: 'the general store' } };
  for (const h of townHouses) house(h[0], h[1], h[2], h[3], h[4], h[5], hash2(h[0] | 0, h[1] | 0) > 0.5 ? 'plaster' : 'brick', { upper: 'plaster', enter: ENTER[h[0] + ',' + h[1]] });
  // Praza: fountain, stone cruceiro, benches
  { const fx = 200, fz = -196, fy = heightAt(fx, fz); const lathe = (pts, seg = 20) => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg);
    const basin = lathe([[0, 0], [1.9, 0], [2.0, 0.1], [2.0, 0.62], [1.78, 0.62], [1.78, 0.25], [0, 0.25]], 28); basin.translate(fx, fy - 0.05, fz); B.addGeo(basin, stoneMat);
    const col1 = lathe([[0, 0], [0.32, 0], [0.22, 0.3], [0.18, 1.2], [0.7, 1.35], [0.72, 1.5], [0.12, 1.55], [0.1, 2.1], [0.2, 2.2], [0, 2.35]], 16); col1.translate(fx, fy, fz); B.addGeo(col1, stoneMat);
    const wmat = new THREE.MeshStandardMaterial({ color: 0x3a6070, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.8 }); const wd = new THREE.Mesh(new THREE.CircleGeometry(1.78, 28), wmat); wd.rotation.x = -Math.PI / 2; wd.position.set(fx, fy + 0.5, fz); group.add(wd);
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.6, 1.0, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xcfe6f0, transparent: true, opacity: 0.35, depthWrite: false })); sp.position.set(fx, fy + 1.0, fz); group.add(sp); updaters.push((dt, t) => { sp.material.opacity = 0.28 + Math.sin(t * 9) * 0.06; sp.rotation.y = t; });
    col.addCircle(fx, fz, 2.05, fy + 1); fountainPos = { x: fx, z: fz };
    // cruceiro
    const cx2 = 222, cz2 = -204, cy = heightAt(cx2, cz2); B.addGeo(boxGeo(2.2, 0.3, 2.2, cx2, cy + 0.1, cz2), stoneMat); B.addGeo(boxGeo(1.6, 0.3, 1.6, cx2, cy + 0.4, cz2), stoneMat); B.addGeo(boxGeo(1.0, 0.3, 1.0, cx2, cy + 0.7, cz2), stoneMat);
    const shaft = new THREE.CylinderGeometry(0.16, 0.2, 3.6, 8); shaft.translate(cx2, cy + 2.6, cz2); B.addGeo(shaft, stoneMat); B.addGeo(boxGeo(0.4, 0.25, 0.4, cx2, cy + 4.5, cz2), stoneMat); cross(cx2, cy + 4.6, cz2, 0.75, 0, stoneMat); col.addBox(cx2, cz2, 1.1, 1.1, 0, cy + 5);
    // benches round the square
    for (const [bx, bz, br] of [[194, -202, 0.8], [206, -190, 3.6], [193, -190, 2.3], [208, -201, -0.8], [216, -196, 1.57], [186, -196, 1.57]]) { const by = heightAt(bx, bz); const m = M4(bx, by, bz, br); B.addGeo(boxGeo(2.0, 0.1, 0.5, 0, 0.46, 0).applyMatrix4(m), woodMat); B.addGeo(boxGeo(2.0, 0.45, 0.08, 0, 0.78, -0.24).applyMatrix4(m), woodMat); for (const sx of [-0.85, 0.85]) B.addGeo(boxGeo(0.12, 0.46, 0.45, sx, 0.23, 0).applyMatrix4(m), stoneMat); col.addBox(bx, bz, 1.0, 0.3, br, by + 0.6); benches.push({ x: bx, z: bz, ry: br, y: by }); }
  }
  const smith = house(222, -182, -1.57, 3, 3, 1, 'brick'); campfire(216, -186, null);
  const stalls = { merchant: stall(186, -184, 0.3, 0x8a2e2a), apothecary: stall(196, -172, 2.8, 0x2e5a3a), tailor: stall(180, -198, 1.3, 0x3a3f7a), church: stall(200, -205, 0.1, 0xc9b88a) };
  stalls.blacksmith = { x: smith.door.x, z: smith.door.z, npcX: smith.door.x + 1.2, npcZ: smith.door.z, ry: -1.57 };
  for (const [k, s] of Object.entries(stalls)) interactives.push({ type: 'shop', shop: k, x: s.x, z: s.z, r: 2.4, label: { merchant: 'Merchant', apothecary: 'Apothecary', tailor: 'Tailor', church: 'Church shop', blacksmith: 'Blacksmith' }[k] });
  interactives.push({ type: 'forge', x: 216, z: -189, r: 2.2, label: 'Forge — smelt' });
  interactives.push({ type: 'church', x: 205, z: -206, r: 2.2, label: 'Holy water font' });
  shrine('shrine_town', 170, -158); lamp(190, -190); lamp(205, -180); lamp(184, -166); lamp(210, -200);
  B.add(kit['Prop_Wagon'], M4(226, heightAt(226, -195), -195, 1.2)); col.addBox(226, -195, 1.1, 2.2, 1.2, 5);

  // Bandit camp
  for (const [x, z, r] of [[-218, -96, 0.3], [-204, -100, 1.2], [-214, -82, 2.4], [-200, -86, 0.8]]) tent(x, z, r, 0x5a4a38);
  campfire(-210, -91, 'camp');
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; if (a > 0.2 && a < 0.75) continue; const x = -211 + Math.cos(a) * 19, z = -91 + Math.sin(a) * 19; B.add(kit['Prop_WoodenFence_Single'], M4(x, heightAt(x, z), z, -a + Math.PI / 2, 1.6)); col.addBox(x, z, 1.6, 0.2, -a + Math.PI / 2, heightAt(x, z) + 1.4); }
  interactives.push({ type: 'chest', key: 'bandit_chest', x: -206, z: -96, r: 2, label: 'Bandit chest', loot: ['iron_ingot', 'cloth', 'coin'] });
  // Ruined chapel (roofless brick)
  { const x = -40, z = -172; const y0 = heightAt(x, z) - 0.12; const base = M4(x, y0, z, 0.3); const r = mulberry(77);
    const W = 8, D = 12; const sides = [[0, D / 2, 0, 4], [W / 2, 0, Math.PI / 2, 6], [0, -D / 2, Math.PI, 4], [-W / 2, 0, -Math.PI / 2, 6]];
    sides.forEach(([sx, sz, sr, cnt], si) => { for (let i = 0; i < cnt; i++) { if (r() < 0.22 && !(si === 0)) continue; const off = -cnt + 1 + i * 2; const lx = sx + Math.cos(sr) * off, lz = sz - Math.sin(sr) * off; const p = si === 0 && i === 1 ? 'Wall_UnevenBrick_Door_Round' : (si === 0 && i === 2 ? 'Wall_UnevenBrick_Door_Round' : 'Wall_UnevenBrick_Window_Thin_Round'); B.add(kit[p], base.clone().multiply(M4(lx, 0, lz, sr + Math.PI))); if (r() < 0.4) B.add(kit['Wall_UnevenBrick_Straight'], base.clone().multiply(M4(lx, 3, lz, sr + Math.PI))); } });
    // walls as colliders (thin boxes), leaving door gap on front
    const c = Math.cos(0.3), s = Math.sin(0.3); const P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    let [ax, az] = P(0, -D / 2); col.addBox(ax, az, W / 2, 0.3, 0.3, y0 + 4); [ax, az] = P(W / 2, 0); col.addBox(ax, az, 0.3, D / 2, 0.3, y0 + 4); [ax, az] = P(-W / 2, 0); col.addBox(ax, az, 0.3, D / 2, 0.3, y0 + 4);
    [ax, az] = P(-3, D / 2); col.addBox(ax, az, 1, 0.3, 0.3, y0 + 4); [ax, az] = P(3, D / 2); col.addBox(ax, az, 1, 0.3, 0.3, y0 + 4);
    B.addGeo(boxGeo(1.6, 1.0, 0.8, 0, 0.5, -4.6).applyMatrix4(base), stoneMat);
    const [kx, kz] = P(0, -3.4); interactives.push({ type: 'chest', key: 'chapel_chest', x: kx, z: kz, r: 2, label: 'Reliquary chest', needsKey: 'chapel_key', loot: ['blessed_hat', 'silver_rosary', 'relic_fragment', 'coin'] });
    const [ex, ez] = P(5, 9); nodes.push({ type: 'chapel_key', x: ex, z: ez, once: true });
  }
  // Region 2 sign (east edge) — informational only
  { const x = 286, z = -212, y = heightAt(x, z); B.addGeo(boxGeo(0.2, 3, 0.2, x, y + 1.5, z), woodMat); B.addGeo(boxGeo(0.12, 1.0, 2.6, x + 0.1, y + 2.6, z), woodMat); col.addCircle(x, z, 0.4, y + 3);
    interactives.push({ type: 'sign', x: x - 1.5, z, r: 3, label: 'Signpost', text: 'Region 2: coming soon' }); }
  // Wayside crosses & scallop markers along the Camino
  { let acc = 0, mk = 0; for (let i = 0; i < PATH.length - 1; i++) { const [ax, az] = PATH[i], [bx, bz] = PATH[i + 1]; const L = Math.hypot(bx - ax, bz - az); const ry = Math.atan2(bx - ax, bz - az);
    for (let s = 0; s < L; s += 2) { acc += 2; const x = lerp(ax, bx, s / L), z = lerp(az, bz, s / L); const nx = Math.cos(ry), nz = -Math.sin(ry);
      if (acc - mk > 38) { mk = acc; const busy = [...ZONES].some(zn => Math.hypot(x - zn.x, z - zn.z) < zn.r * 0.7) || distToPolyline(x, z, RIVER).d < 18; if (!busy) { if ((mk / 38 | 0) % 4 === 0) waysideCross(x + nx * 4, z + nz * 4); else marker(x + nx * 3, z + nz * 3, ry + Math.PI / 2); } } } } }
  B.build(group);

  // ---------- Vegetation ----------
  const treeTypes = Q.level === 0 ? ['Pine_1', 'CommonTree_3', 'Pine_2'] : ['Pine_1', 'Pine_2', 'Pine_3', 'CommonTree_1', 'CommonTree_2', 'CommonTree_3'];
  const trees = []; // {x,z,y,t,s,r}
  function okSpot(x, z, clear = 6) { if (Math.abs(x) > 280 || Math.abs(z) > 280) return false; if (distToPolyline(x, z, PATH).d < clear) return false; if (distToPolyline(x, z, RIVER).d < 13) return false; for (const zn of ZONES) if (Math.hypot(x - zn.x, z - zn.z) < zn.r * 0.85) return false; if (col.pointBlocked(x, 0, z, 2.5)) return false; return true; }
  const nTrees = Q.trees;
  for (let i = 0; i < nTrees * 4 && trees.length < nTrees; i++) {
    const inWood = i % 3 !== 0; let x, z;
    if (inWood) { const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * 105; x = -60 + Math.cos(a) * d; z = -115 + Math.sin(a) * d; } else { x = (rng() - 0.5) * 560; z = (rng() - 0.5) * 560; if (rng() < 0.5 && fbm(x * 0.01, z * 0.01) < 0.5) continue; }
    if (!okSpot(x, z)) continue; const y = heightAt(x, z); if (y < WATER + 0.5) continue;
    const t = inWood && rng() < 0.7 ? Math.floor(rng() * 3) : Math.floor(rng() * treeTypes.length);
    trees.push({ x, z, y, t: t % treeTypes.length, s: 0.8 + rng() * 0.55, r: rng() * 6.28 });
  }
  for (const tr of trees) col.addCircle(tr.x, tr.z, 0.45 * tr.s, tr.y + 6, 'tree');
  // near: real models (instanced, rebuilt as player moves, swaying in the wind); far: baked billboard impostors
  const nearMeshes = treeTypes.map(name => nat[name].map(p => { const m = new THREE.InstancedMesh(p.geo, addTreeWind(p.mat, /Pine/.test(name) ? 0.6 : 1), 160); m.castShadow = true; m.receiveShadow = false; m.count = 0; m.frustumCulled = false; group.add(m); return m; }));
  const impBake = bakeTreeImpostors(renderer, nat, treeTypes);
  const impLayer = new CardLayer(cross2(), impostorMaterial(impBake.texture, impBake.cols, impBake.rows), trees.length); group.add(impLayer.mesh); impLayer.mesh.receiveShadow = false;
  // Rocks (static instanced)
  const rockTypes = ['Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3'];
  const rocks = []; for (let i = 0; i < 900 && rocks.length < Q.rocks; i++) { const x = (rng() - 0.5) * 560, z = (rng() - 0.5) * 560; const hy = heightAt(x, z); const hillsy = x < -110 || rng() < 0.4; if (!hillsy || !okSpot(x, z, 4)) continue; rocks.push({ x, z, y: hy, t: i % 3, s: 0.7 + rng() * 1.4, r: rng() * 6 }); }
  const dummy = new THREE.Object3D();
  rockTypes.forEach((name, ti) => { const list = rocks.filter(r => r.t === ti); for (const p of nat[name]) { const m = new THREE.InstancedMesh(p.geo, p.mat, list.length); list.forEach((r, i) => { dummy.position.set(r.x, r.y - 0.2, r.z); dummy.rotation.set(0, r.r, 0); dummy.scale.setScalar(r.s); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); }); m.castShadow = true; m.receiveShadow = true; group.add(m); } });
  for (const r of rocks) col.addCircle(r.x, r.z, 1.3 * r.s, r.y + 1.6 * r.s, 'rock');
  // ground cover near player: alpha cards from the baked foliage atlas (one instanced draw)
  const fTex = A.tex.foliage; const cardMat = cardMaterial(fTex, { far: Q.grassDist });
  const dens = [0.42, 0.72, 1.0][Q.level]; const cap = [700, 2000, 3800][Q.level];
  const cover = new CardLayer(cross2(), cardMat, cap); cover.mesh.receiveShadow = true; group.add(cover.mesh);
  const cellCache = new Map(); const cctx = { heightAt, splatAt, WATER, dens, blocked: (x, y, z) => col.pointBlocked(x, y, z, 0.6) };
  // hedgerows (cards) and dry-stone walls (merged mesh) — static
  const plan = planBoundaries({ PATH, RIVER, ZONES, heightAt, WATER, blocked: (x, z) => col.pointBlocked(x, heightAt(x, z), z, 1.2) });
  let nHedge = 0; for (const h of plan.hedges) nHedge += h.length * 3;
  const hedgeMat = cardMaterial(fTex, { far: 400, sway: 0.25 });
  const hedge = new CardLayer(cross3(), hedgeMat, nHedge + 8); hedge.mesh.castShadow = Q.level > 0; hedge.mesh.receiveShadow = true;
  for (const run of plan.hedges) {
    for (let i = 0; i < run.length; i++) { const [x, z] = run[i]; const q = run[Math.min(i + 1, run.length - 1)], o = run[Math.max(i - 1, 0)]; const ry = Math.atan2(q[0] - o[0], q[1] - o[1]) + Math.PI / 2; const y = heightAt(x, z) - 0.08; const k = hash2(x * 7 | 0, z * 7 | 0);
      const g = [0.66 + k * 0.12, 0.98, 0.5 + k * 0.1];
      hedge.add(x, y, z, k < 0.5 ? FT.hedgeA : FT.hedgeB, 1.0 + k * 0.25, ry, g, 1, 0.5);
      hedge.add(x + Math.sin(ry) * 0.2, y, z + Math.cos(ry) * 0.2, k < 0.5 ? FT.hedgeB : FT.hedgeA, 0.85 + k * 0.2, ry + 0.25, [g[0] * 0.92, g[1] * 0.95, g[2] * 0.9], 1, 0.4);
      if (i % 3 === 0) hedge.add(x, y, z, FT.bush, 1.3 + k * 0.4, ry + k * 3, [0.6, 0.92, 0.48]);
    }
    for (let i = 0; i < run.length - 1; i += 2) { const [x, z] = run[i], [x2, z2] = run[Math.min(i + 2, run.length - 1)]; const L = Math.hypot(x2 - x, z2 - z); if (L < 0.1) continue; col.addBox((x + x2) / 2, (z + z2) / 2, 0.55, L / 2 + 0.3, Math.atan2(x2 - x, z2 - z), heightAt(x, z) + 1.3, 'hedge'); }
  }
  hedge.commit(); group.add(hedge.mesh);
  { const dmap = A.tex.drystone_d, nmap = A.tex.drystone_n; const wmat = new THREE.MeshStandardMaterial({ map: dmap, normalMap: Q.level > 0 ? nmap : null, roughness: 0.95, color: 0xd8d0c4 }); const WB = new Batch();
    for (const run of plan.walls) for (let i = 0; i < run.length - 1; i++) { const [x, z] = run[i], [x2, z2] = run[i + 1]; const L = Math.hypot(x2 - x, z2 - z) + 0.12; const ry = Math.atan2(x2 - x, z2 - z); const mx = (x + x2) / 2, mz = (z + z2) / 2; const y = heightAt(mx, mz); const hh = 0.8 + hash2(mx | 0, mz | 0) * 0.25;
      const g = new THREE.BoxGeometry(0.62, hh, L, 1, 1, 1); g.translate(0, hh / 2 - 0.12, 0); // world-scaled UVs on the long faces
      const uvA = g.attributes.uv, pA = g.attributes.position, nA = g.attributes.normal; for (let v = 0; v < uvA.count; v++) { const nx = Math.abs(nA.getX(v)), nz = Math.abs(nA.getZ(v)); const u = nx > 0.5 ? pA.getZ(v) : nz > 0.5 ? pA.getX(v) : pA.getX(v); const w = nA.getY(v) > 0.5 ? pA.getZ(v) : pA.getY(v); uvA.setXY(v, (u + i * L) / 1.6, w / 1.6); }
      g.applyMatrix4(M4(mx, y, mz, ry)); WB.addGeo(g, wmat); col.addBox(mx, mz, 0.36, L / 2, ry, y + hh, 'wall'); }
    WB.build(group, { cast: true, receive: true }); }
  let lastCell = '', lastTreeCell = '';
  function refreshVeg(px, pz, force) {
    const cell = Math.floor(px / 6) + ',' + Math.floor(pz / 6); if (cell === lastCell && !force) return; lastCell = cell;
    // trees (re-sorted every 12 m)
    const tcell = Math.floor(px / 12) + ',' + Math.floor(pz / 12);
    if (tcell !== lastTreeCell || force) { lastTreeCell = tcell;
      const near = [], R = Q.treeNear, R2 = Q.viewDist * 1.15; impLayer.reset();
      for (const t of trees) { const d = Math.hypot(t.x - px, t.z - pz); if (d < R) near.push(t); else if (d < R2) { const inf = impBake.info[t.t]; const k = hash2(t.x | 0, t.z | 0); impLayer.add(t.x, t.y - 0.2, t.z, t.t, t.s, t.r, [0.86 + k * 0.18, 0.9 + k * 0.12, 0.86 + k * 0.1], 1, 1, [inf.w, inf.h]); } }
      impLayer.commit();
      nearMeshes.forEach((ms, ti) => { const list = near.filter(t => t.t === ti).slice(0, 160); for (const m of ms) { list.forEach((t, i) => { dummy.position.set(t.x, t.y - 0.15, t.z); dummy.rotation.set(0, t.r, 0); dummy.scale.setScalar(t.s); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); }); m.count = list.length; m.instanceMatrix.needsUpdate = true; } });
    }
    // ground cover (per-cell recipes are cached)
    const GR = Q.grassDist; const cx = Math.floor(px / 6), cz = Math.floor(pz / 6); const span = Math.ceil(GR / 6); cover.reset();
    const cells = []; for (let i = -span; i <= span; i++) for (let j = -span; j <= span; j++) { const dd = Math.hypot(i, j) * 6; if (dd <= GR + 3) cells.push([dd, cx + i, cz + j]); }
    cells.sort((a, b) => a[0] - b[0]);
    for (const [, gx, gz] of cells) { const key = gx + ',' + gz; let L = cellCache.get(key); if (!L) { L = coverCell(gx, gz, cctx); cellCache.set(key, L); if (cellCache.size > 900) cellCache.delete(cellCache.keys().next().value); }
      for (const c of L) if (!cover.add(c[0], c[1], c[2], c[3], c[4], c[5], c[6])) break; }
    cover.commit();
  }
  // ---------- Gather nodes (herbs, berries, wood, stone, ore, wax hives, cloth bundles, fishing spots) ----------
  const nodeDefs = [['herb', 60, 'Plant_1'], ['berry', 45, 'Bush_Common_Flowers'], ['wood', 50, null], ['stone', 40, 'Pebble_Round_1'], ['iron_ore', 22, 'Rock_Medium_3'], ['wax', 14, null], ['cloth', 14, null], ['fish', 14, null], ['oak_wood', 16, null], ['mushroom', 0, null]];
  const nodeMats = { wood: woodMat, wax: new THREE.MeshStandardMaterial({ color: 0xd8b04a, roughness: 0.6 }), cloth: new THREE.MeshStandardMaterial({ color: 0xc8bca0, roughness: 1 }), fish: new THREE.MeshStandardMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.0 }) };
  for (const [type, cnt, model] of nodeDefs) {
    let made = 0; for (let i = 0; i < cnt * 30 && made < cnt; i++) {
      let x, z;
      if (type === 'fish') { const seg = RIVER[1 + (i % (RIVER.length - 2))]; x = seg[0] + (rng() - 0.5) * 40; z = seg[1] + (rng() - 0.5) * 40; if (distToPolyline(x, z, RIVER).d > 11 || distToPolyline(x, z, RIVER).d < 7) continue; }
      else if (type === 'iron_ore') { x = -150 - rng() * 120; z = -150 + rng() * 220; }
      else if (type === 'oak_wood') { const a = rng() * 6.28, d = rng() * 90; x = -60 + Math.cos(a) * d; z = -115 + Math.sin(a) * d; }
      else { x = (rng() - 0.5) * 520; z = (rng() - 0.5) * 520; }
      if (type !== 'fish' && !okSpot(x, z, 3)) continue; const y = heightAt(x, z); if (type !== 'fish' && y < WATER + 0.4) continue;
      let mesh;
      if (model) { const pc = nat[model]; mesh = new THREE.Group(); for (const p of pc) { const mm = new THREE.Mesh(p.geo, p.mat); mm.castShadow = true; mesh.add(mm); } mesh.scale.setScalar(type === 'iron_ore' ? 0.55 : type === 'stone' ? 1.6 : 0.9); if (type === 'iron_ore') mesh.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.setHex(0x6a5a5a); o.material.metalness = 0.5; } }); }
      else if (type === 'wood' || type === 'oak_wood') { mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 1.6, 7), type === 'oak_wood' ? new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.9 }) : woodMat); mesh.rotation.z = Math.PI / 2; mesh.rotation.y = rng() * 3; mesh.position.y = 0.2; const g = new THREE.Group(); g.add(mesh); mesh.castShadow = true; mesh = g; }
      else if (type === 'wax') { mesh = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.7, 9), nodeMats.wax); b.position.y = 1.05; const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 0.12), woodMat); post.position.y = 0.4; mesh.add(b, post); }
      else if (type === 'cloth') { mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 0), nodeMats.cloth); mesh.scale.set(1.2, 0.7, 1); mesh.position.y = 0.2; const g = new THREE.Group(); g.add(mesh); mesh = g; }
      else if (type === 'fish') { mesh = new THREE.Group(); const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.65, 20), new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.35 })); ring.rotation.x = -Math.PI / 2; ring.position.y = WATER - y + 0.03; mesh.add(ring); updaters.push((dt, t) => { const s = 1 + ((t * 0.6 + x) % 1) * 0.8; ring.scale.set(s, s, s); ring.material.opacity = 0.35 * (1 - ((t * 0.6 + x) % 1)); }); }
      mesh.position.set(x, y, z); group.add(mesh); nodes.push({ type, x, z, mesh, respawn: 0 }); made++;
    }
  }
  for (const n of nodes) if (n.type === 'chapel_key') { const g = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 12), goldMat); const y = heightAt(n.x, n.z); g.position.set(n.x, y + 0.35, n.z); group.add(g); n.mesh = g; updaters.push((dt, t) => { g.rotation.y = t * 2; }); }

  return {
    group, terrain, interactives, nodes, lamps, bells: [bell1, bell2], stalls, trees, chimneys, doors, benches, fountainPos, kit,
    update(dt, t, px, pz) { wind.value = t; for (const u of updaters) u(dt, t); refreshVeg(px, pz); },
    refreshVeg: () => refreshVeg(0, 0, true),
  };
}
