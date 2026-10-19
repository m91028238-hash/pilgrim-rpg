// Enterable interiors: built lazily at remote coordinates (x > IX) and swapped in with a short fade.
import * as THREE from 'three';
import { kitPieces, Batch, M4 } from './world.js?v=4';
import { loadInterior } from './assets.js?v=4';
import { makeHuman } from './human.js?v=4';
import { makeHat, makeWeapon, attachWeapon } from './gear.js?v=4';
import { NPC } from './actors.js?v=4';
import { Flames, dustMotes } from './fx.js?v=4';

export const IX = 900; // anything beyond x = IX is interior space
const SLOT = { cathedral: 0, church_vf: 1, inn_sr: 2, inn_st: 3, shop_st: 4, house_sr1: 5, house_sr2: 6, house_st: 7 };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- procedural textures ----------
function canvasTex(w, h, draw, srgb = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const GLASS = {
  blue: ['#1f4aa8', '#2a5cc8', '#16357a', '#3c78d8'], red: ['#a8182a', '#c8322a', '#7a1020', '#d85a2a'], gold: ['#d8a020', '#e8c040', '#b07818', '#f0d870'], green: ['#2a7a3a', '#3a9a4a', '#1e5a2a'], violet: ['#5a2a8a', '#7a3aa8'], white: ['#e8e0c8', '#f4ecd8'],
};
/** stained-glass lancet: coloured cells, lead lines, motif ('cross','shell','lily','star','rose') */
function stainedGlass(motif, seed = 1, rose = false) {
  return canvasTex(rose ? 256 : 128, 256, (g, W, H) => {
    let s = seed * 9301 + 49297; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const pal = motif === 'lily' ? [...GLASS.blue, ...GLASS.white, GLASS.gold[0]] : motif === 'shell' ? [...GLASS.blue, ...GLASS.gold] : motif === 'cross' ? [...GLASS.red, ...GLASS.blue, GLASS.gold[1]] : [...GLASS.blue, ...GLASS.red, ...GLASS.gold, ...GLASS.green, ...GLASS.violet];
    g.save(); g.beginPath();
    if (rose) g.arc(W / 2, H / 2, W / 2 - 2, 0, 7); else { g.moveTo(4, H); g.lineTo(4, W / 2); g.quadraticCurveTo(4, 4, W / 2, 2); g.quadraticCurveTo(W - 4, 4, W - 4, W / 2); g.lineTo(W - 4, H); g.closePath(); }
    g.clip();
    if (rose) { // radial petals
      const cx = W / 2, cy = H / 2; for (let ring = 4; ring >= 1; ring--) { const R = ring * W / 8; const n = ring * 6; for (let i = 0; i < n; i++) { const a0 = i / n * 6.283, a1 = (i + 1) / n * 6.283; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a0, a1); g.closePath(); g.fillStyle = pal[(i + ring) % pal.length]; g.fill(); } }
      g.strokeStyle = '#1a1410'; g.lineWidth = 3; for (let ring = 1; ring <= 4; ring++) { g.beginPath(); g.arc(cx, cy, ring * W / 8, 0, 7); g.stroke(); } for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283; g.beginPath(); g.moveTo(cx + Math.cos(a) * W / 8, cy + Math.sin(a) * W / 8); g.lineTo(cx + Math.cos(a) * W / 2, cy + Math.sin(a) * W / 2); g.stroke(); }
      g.fillStyle = '#f0d060'; g.beginPath(); g.arc(cx, cy, W / 10, 0, 7); g.fill(); g.fillStyle = '#c8202a'; g.fillRect(cx - 4, cy - 18, 8, 36); g.fillRect(cx - 14, cy - 8, 28, 8);
    } else {
      for (let y = 0; y < H; y += 16) for (let x = 0; x < W; x += 16) { g.fillStyle = pal[Math.floor(rnd() * pal.length)]; g.fillRect(x, y, 16, 16); }
      // border band
      g.lineWidth = 10; g.strokeStyle = GLASS.gold[2]; g.strokeRect(10, 10, W - 20, H - 20);
      const cx = W / 2, cy = H * 0.52; g.fillStyle = '#efe6cc';
      if (motif === 'cross') { g.fillStyle = '#f0d060'; g.fillRect(cx - 7, cy - 52, 14, 110); g.fillRect(cx - 34, cy - 26, 68, 14); }
      else if (motif === 'shell') { g.fillStyle = '#f4ecd0'; g.beginPath(); g.moveTo(cx, cy + 40); for (let i = 0; i <= 8; i++) { const a = Math.PI * (1.1 + i * 0.1); g.lineTo(cx + Math.cos(a) * 42, cy + 10 + Math.sin(a) * 50); } g.closePath(); g.fill(); g.strokeStyle = '#b08840'; g.lineWidth = 2; for (let i = 0; i <= 8; i++) { const a = Math.PI * (1.1 + i * 0.1); g.beginPath(); g.moveTo(cx, cy + 40); g.lineTo(cx + Math.cos(a) * 40, cy + 10 + Math.sin(a) * 48); g.stroke(); } }
      else if (motif === 'lily') { g.strokeStyle = '#3a8a3a'; g.lineWidth = 5; g.beginPath(); g.moveTo(cx, cy + 70); g.lineTo(cx, cy - 20); g.stroke(); g.fillStyle = '#f8f4e8'; for (const [dx, dy] of [[0, -40], [-18, -24], [18, -24]]) { g.beginPath(); g.ellipse(cx + dx, cy + dy, 9, 20, dx * 0.04, 0, 7); g.fill(); } g.fillStyle = '#f0c020'; g.beginPath(); g.arc(cx, cy - 26, 5, 0, 7); g.fill(); }
      else { g.fillStyle = '#f8e070'; g.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, r = i % 2 ? 14 : 36; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); g.fill(); }
      g.strokeStyle = '#1a1410'; g.lineWidth = 2.5; for (let y = 0; y < H; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } for (let x = 0; x < W; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      g.lineWidth = 6; g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, H); g.stroke(); g.beginPath(); g.moveTo(0, H * 0.33); g.lineTo(W, H * 0.33); g.stroke(); g.beginPath(); g.moveTo(0, H * 0.7); g.lineTo(W, H * 0.7); g.stroke();
    }
    g.restore(); g.lineWidth = 7; g.strokeStyle = '#2a2016'; g.beginPath(); if (rose) g.arc(W / 2, H / 2, W / 2 - 4, 0, 7); else { g.moveTo(4, H); g.lineTo(4, W / 2); g.quadraticCurveTo(4, 4, W / 2, 2); g.quadraticCurveTo(W - 4, 4, W - 4, W / 2); g.lineTo(W - 4, H); } g.stroke();
  });
}
const shaftTex = () => canvasTex(64, 128, (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); const gx = g.createLinearGradient(0, 0, W, 0); gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.25, 'rgba(0,0,0,0)'); gx.addColorStop(0.75, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = gx; g.fillRect(0, 0, W, H); }, false);
const plaqueTex = () => canvasTex(128, 48, (g, W, H) => { g.fillStyle = '#e8dcc0'; g.fillRect(0, 0, W, H); g.fillStyle = '#3a2a1a'; g.font = 'bold 30px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('INRI', W / 2, H / 2 + 2); });

// world-space UVs for a geometry already placed in room-local coordinates
function wuv(g, s = 2) { const p = g.attributes.position, n = g.attributes.normal; const uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)); let u, v; if (ay > ax && ay > az) { u = p.getX(i); v = p.getZ(i); } else if (ax > az) { u = p.getZ(i); v = p.getY(i); } else { u = p.getX(i); v = p.getY(i); } uv[i * 2] = u / s; uv[i * 2 + 1] = v / s; } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g; }

export class Interiors {
  constructor(G) { this.G = G; this.built = {}; this.inside = null; this.busy = false; this.flames = new Flames(600); G.scene.add(this.flames.mesh); this.updaters = []; }
  prefetch() { return loadInterior().then(I => { if (!this.I) { this.I = I; this.kit = kitPieces(I.props); this.box = {}; for (const [k, list] of Object.entries(this.kit)) { const b = new THREE.Box3(); for (const p of list) { p.geo.computeBoundingBox(); b.union(p.geo.boundingBox); } this.box[k] = b; } this.mats(); } return I; }); }
  mats() {
    const t = this.I.tex; const M = (o) => new THREE.MeshStandardMaterial(o);
    this.M = {
      stone: M({ map: t.sandstone_d, normalMap: t.sandstone_n, roughness: 0.92, color: 0xf0e4d2 }),
      stoneDark: M({ map: t.sandstone_d, normalMap: t.sandstone_n, roughness: 0.9, color: 0xb8a894 }),
      vault: M({ map: t.sandstone_d, normalMap: t.sandstone_n, roughness: 0.95, color: 0xe2d6c2, side: THREE.BackSide }),
      floor: M({ map: t.monfloor_d, normalMap: t.monfloor_n, roughness: 0.62, color: 0xe8e0d4 }),
      wood: M({ map: t.woodfloor_d, normalMap: t.woodfloor_n, roughness: 0.78, color: 0xe0d0bc }),
      timber: M({ map: t.woodfloor_d, roughness: 0.85, color: 0x7a5a40 }),
      pew: M({ map: t.woodfloor_d, roughness: 0.6, color: 0x8a6448 }),
      plaster: M({ color: 0xece2d0, roughness: 0.96, normalMap: t.sandstone_n, normalScale: new THREE.Vector2(0.25, 0.25) }),
      gold: M({ color: 0xd8ac4c, metalness: 0.92, roughness: 0.28, envMapIntensity: 1.4 }),
      silver: M({ color: 0xd0d4da, metalness: 0.95, roughness: 0.25 }),
      iron: M({ color: 0x2a2826, metalness: 0.7, roughness: 0.5 }),
      linen: M({ color: 0xf4f0e6, roughness: 1 }), red: M({ color: 0x8a1818, roughness: 0.9 }), crimson: M({ color: 0x6a1020, roughness: 0.85 }),
      wax: M({ color: 0xf6f0de, roughness: 0.55, emissive: 0x302010 }),
      ivory: M({ color: 0xdcc8a6, roughness: 0.5 }), darkwood: M({ color: 0x3a2618, roughness: 0.7, map: t.woodfloor_d }),
      hearth: M({ color: 0x1a1210, roughness: 1 }), rug: M({ color: 0x7a3a2a, roughness: 1 }),
    };
  }
  // ------------------------------------------------------------------ enter / exit
  async enter(id) {
    const G = this.G; if (this.busy || this.inside) return; const door = G.world.doors.find(d => d.id === id); if (!door) return;
    this.busy = true; const fade = document.getElementById('fade'); fade.classList.add('on'); G.audio.click?.();
    try { await Promise.all([this.prefetch(), new Promise(r => setTimeout(r, 300))]); if (!this.built[id]) this.build(id, door); }
    catch (e) { console.warn(e); fade.classList.remove('on'); this.busy = false; G.ui.toast('Could not open the door — try again'); return; }
    const R = this.built[id]; this.inside = R; G.inside = R; R.group.visible = true;
    const P = G.player; P.pos.set(R.O.x + R.spawn.x, 0, R.O.z + R.spawn.z); P.vel.set(0, 0, 0); P.yaw = Math.PI; G.cam.yaw = 0; G.cam.pitch = 0.18; G.camTgt = null; G.cam.curD = null; P.lock = null;
    G.setInterior(true, R);
    setTimeout(() => { fade.classList.remove('on'); this.busy = false; }, 60);
    if (R.hint && !G.S.flags['hint_' + id]) { G.S.flags['hint_' + id] = 1; setTimeout(() => G.ui.toast(R.hint), 700); }
  }
  exit() {
    const G = this.G; const R = this.inside; if (!R || this.busy) return; this.busy = true; const fade = document.getElementById('fade'); fade.classList.add('on');
    setTimeout(() => { const d = R.door; const P = G.player; P.pos.set(d.x + Math.sin(d.rot) * 0.4, 0, d.z + Math.cos(d.rot) * 0.4); P.pos.y = G.groundAt(P.pos.x, P.pos.z); P.vel.set(0, 0, 0); P.yaw = d.rot; G.cam.yaw = d.rot + Math.PI; G.camTgt = null; G.cam.curD = null;
      R.group.visible = false; this.inside = null; G.inside = null; G.setInterior(false); setTimeout(() => { fade.classList.remove('on'); this.busy = false; }, 60); }, 300);
  }
  update(dt, t) { if (!this.inside) return; for (const u of this.inside.updaters) u(dt, t); }
  // ------------------------------------------------------------------ build helpers
  build(id, door) {
    const G = this.G; const O = V3(1000 + SLOT[id] * 140, 0, 0); const group = new THREE.Group(); group.position.copy(O); G.scene.add(group);
    const B = new Batch(); const R = { id, door, O, group, B, updaters: [], lamps: [], spawn: V3(0, 0, 0), interactives: [], name: door.name, npcs: [] };
    const self = this, M = this.M, col = G.col, kit = this.kit, vk = G.world.kit;
    const ctx = R.ctx = {
      box(w, h, d, x, y, z, mat, ry = 0, s = 2) { const g = new THREE.BoxGeometry(w, h, d); g.applyMatrix4(M4(x, y + h / 2, z, ry)); wuv(g, s); B.addGeo(g, mat); return g; },
      geo(g, mat) { B.addGeo(g, mat); },
      solid(x, z, hw, hd, top = 20, ry = 0) { col.addBox(O.x + x, O.z + z, hw, hd, ry, top, 'interior'); },
      prop(name, x, y, z, ry = 0, s = 1, collide = false, pad = 0) { const list = kit[name]; if (!list) return null; const b = self.box[name]; const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
        const m = M4(x, y, z, ry, s).multiply(new THREE.Matrix4().makeTranslation(-cx, -b.min.y, -cz)); B.add(list, m);
        if (collide) col.addBox(O.x + x, O.z + z, (b.max.x - b.min.x) * s / 2 + pad, (b.max.z - b.min.z) * s / 2 + pad, ry, y + (b.max.y - b.min.y) * s, 'prop');
        return { w: (b.max.x - b.min.x) * s, h: (b.max.y - b.min.y) * s, d: (b.max.z - b.min.z) * s }; },
      vprop(name, mtx) { if (vk[name]) B.add(vk[name], mtx); },
      flame(x, y, z, size = 0.05) { return self.flames.add(O.x + x, y, O.z + z, size); },
      light(x, y, z, power = 8, color = 0xffa850) { const l = { x: O.x + x, y, z: O.z + z, inner: true, power, color: new THREE.Color(color), always: true }; R.lamps.push(l); G.world.lamps.push(l); return l; },
      interact(o) { const it = { ...o, x: O.x + o.x, z: O.z + o.z }; G.world.interactives.push(it); R.interactives.push(it); return it; },
      add(obj) { group.add(obj); return obj; },
      candle(x, y, z, h = 0.3, r = 0.03) { const g = new THREE.CylinderGeometry(r, r, h, 8); g.translate(x, y + h / 2, z); B.addGeo(g, M.wax); return ctx.flame(x, y + h + 0.01, z, r * 1.6 + 0.02); },
      candlestick(x, y, z, s = 1) { const g = new THREE.LatheGeometry([[0, 0], [0.12, 0], [0.12, 0.03], [0.04, 0.08], [0.03, 0.35], [0.06, 0.4], [0.07, 0.44], [0, 0.45]].map(p => new THREE.Vector2(p[0] * s, p[1] * s)), 12); g.translate(x, y, z); B.addGeo(g, M.gold); return ctx.candle(x, y + 0.45 * s, z, 0.32 * s, 0.028 * s); },
      chandelier(x, y, z, r = 0.9, n = 8) { const ring = new THREE.TorusGeometry(r, 0.035, 6, 32); ring.rotateX(Math.PI / 2); ring.translate(x, y, z); B.addGeo(ring, M.iron); const ch = new THREE.CylinderGeometry(0.015, 0.015, 30, 4); ch.translate(x, y + 15, z); B.addGeo(ch, M.iron);
        for (let i = 0; i < 4; i++) { const a = i / 4 * 6.283; const c = new THREE.CylinderGeometry(0.012, 0.012, r * 1.3, 4); c.rotateZ(0.75); c.rotateY(a); c.translate(x + Math.cos(a) * r * 0.45, y + r * 0.45, z - Math.sin(a) * r * 0.45); B.addGeo(c, M.iron); }
        for (let i = 0; i < n; i++) { const a = i / n * 6.283; ctx.candle(x + Math.cos(a) * r, y + 0.02, z + Math.sin(a) * r, 0.2, 0.025); } },
      window(x, y, z, w, h, ry, motif, seed, day = 1.6) { const tex = stainedGlass(motif, seed); const m = new THREE.MeshBasicMaterial({ map: tex, transparent: false, alphaTest: 0.1, side: THREE.DoubleSide, fog: false }); m.color.setScalar(day); m.userData.day = day; R.glass = R.glass || []; R.glass.push(m); const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y + h / 2, z); p.rotation.y = ry; group.add(p); return { tex, mat: m }; },
      rose(x, y, z, r, ry, day = 1.6) { const tex = stainedGlass('rose', 7, true); const m = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.1, fog: false }); m.color.setScalar(day); m.userData.day = day; (R.glass = R.glass || []).push(m); const p = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), m); p.position.set(x, y, z); p.rotation.y = ry; group.add(p); return { tex, mat: m }; },
      /** volumetric-looking light shaft from a window rect along dir to the floor, with coloured pool */
      shaft(cx, cy, cz, w, h, dir, color = 0xfff0d0, tex = null, op = 0.11) {
        self._sh = self._sh || shaftTex(); const L = (cy - 0.02) / -dir.y; const end = V3(cx + dir.x * L, 0.02, cz + dir.z * L);
        const mk = (axis) => { // quad from window line (along axis) to floor line
          const a = V3(cx, cy, cz).addScaledVector(axis, -0.5), b = V3(cx, cy, cz).addScaledVector(axis, 0.5); const c = b.clone().addScaledVector(dir, L), d = a.clone().addScaledVector(dir, L);
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); return g; };
        const mat = new THREE.MeshBasicMaterial({ map: self._sh, color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }); mat.userData.op = op; (R.shafts = R.shafts || []).push(mat);
        const horiz = Math.abs(dir.x) > Math.abs(dir.z) ? V3(0, 0, w) : V3(w, 0, 0); const vert = V3(0, h, 0);
        group.add(new THREE.Mesh(mk(horiz), mat)); group.add(new THREE.Mesh(mk(vert.clone().multiplyScalar(0.8)), mat));
        if (tex) { const pm = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }); pm.userData.op = 0.38; R.shafts.push(pm); const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), pm); pool.rotation.x = -Math.PI / 2; pool.position.copy(end); pool.position.y = 0.025;
          const stretch = 1 / Math.max(0.35, -dir.y); pool.scale.set(Math.abs(dir.x) > Math.abs(dir.z) ? h * stretch * 0.8 : w * 1.1, Math.abs(dir.x) > Math.abs(dir.z) ? w * 1.1 : h * stretch * 0.8, 1); if (Math.abs(dir.x) > Math.abs(dir.z)) pool.rotation.z = Math.PI / 2; group.add(pool); }
        return end; },
      /** shell of a room: floor, 4 walls (door gap at +z), ceiling. walls collide. */
      room(W, D, H, { wall = M.plaster, floor = M.wood, ceil = M.plaster, beams = false, doorW = 1.6, doorH = 2.5, wallS = 2.5, floorS = 2, vault = 0 } = {}) {
        const fl = new THREE.PlaneGeometry(W, D); fl.rotateX(-Math.PI / 2); wuv(fl, floorS); B.addGeo(fl, floor);
        const wh = vault ? H - W / 2 : H; const T = 0.4;
        ctx.box(W + T * 2, wh, T, 0, 0, -D / 2 - T / 2, wall, 0, wallS); // back
        ctx.box(T, wh, D, -W / 2 - T / 2, 0, 0, wall, 0, wallS); ctx.box(T, wh, D, W / 2 + T / 2, 0, 0, wall, 0, wallS);
        const side = (W - doorW) / 2; ctx.box(side, wh, T, -W / 2 + side / 2, 0, D / 2 + T / 2, wall, 0, wallS); ctx.box(side, wh, T, W / 2 - side / 2, 0, D / 2 + T / 2, wall, 0, wallS); ctx.box(doorW, wh - doorH, T, 0, doorH, D / 2 + T / 2, wall, 0, wallS);
        ctx.solid(0, -D / 2 - 0.2, W / 2 + 0.4, 0.3); ctx.solid(0, D / 2 + 0.2, W / 2 + 0.4, 0.3); ctx.solid(-W / 2 - 0.2, 0, 0.3, D / 2 + 0.4); ctx.solid(W / 2 + 0.2, 0, 0.3, D / 2 + 0.4);
        if (vault) { const r = W / 2; const v = new THREE.CylinderGeometry(r, r, D + T * 2, 28, 1, true, -Math.PI / 2, Math.PI); v.rotateX(-Math.PI / 2); v.translate(0, wh, 0); wuv(v, wallS); B.addGeo(v, M.vault);
          for (const zz of [-D / 2 - 0.01, D / 2 + 0.01]) { const cg = new THREE.CircleGeometry(r + T, 28, 0, Math.PI); if (zz > 0) cg.rotateY(Math.PI); cg.translate(0, wh, zz); wuv(cg, wallS); B.addGeo(cg, wall); } }
        else { const c = new THREE.PlaneGeometry(W, D); c.rotateX(Math.PI / 2); c.translate(0, H, 0); wuv(c, wallS); B.addGeo(c, ceil);
          if (beams) for (let x = -W / 2 + 1; x < W / 2; x += 2) ctx.box(0.22, 0.26, D, x, H - 0.26, 0, M.timber, 0, 1.5); }
        // door leaf and frame on the inside of the entrance
        ctx.vprop('DoorFrame_Round_WoodDark', M4(0, 0, D / 2 - 0.02, Math.PI, 1.15)); ctx.vprop('Door_1_Round', M4(0, 0, D / 2 + 0.06, Math.PI, 1.06).multiply(M4(-0.53, 0, 0)));
        R.spawn.set(0, 0, D / 2 - 1.6); R.H = H; R.W = W; R.D = D;
        ctx.interact({ type: 'door_out', x: 0, z: D / 2 - 0.9, r: 1.7, label: `Leave ${door.name}`, short: 'Exit' });
      },
      pews(x0, x1, z0, z1, step = 1.3) { for (let z = z0; z >= z1; z -= step) for (const s of [-1, 1]) { const a = s * x0, b = s * x1; const cx = (a + b) / 2, L = Math.abs(b - a);
        ctx.box(L, 0.06, 0.44, cx, 0.42, z, M.pew, 0, 1.4); ctx.box(L, 0.62, 0.06, cx, 0.5, z + 0.25, M.pew, 0, 1.4); ctx.box(L + 0.02, 0.05, 0.1, cx, 1.1, z + 0.25, M.pew, 0, 1.4); ctx.box(L, 0.1, 0.14, cx, 0.12, z - 0.42, M.pew, 0, 1.4);
        for (const e of [a, b]) ctx.box(0.08, 1.0, 0.62, e, 0, z + 0.02, M.pew, 0, 1.4); ctx.solid(cx, z - 0.05, L / 2 + 0.04, 0.42, 1.2); } },
      statue(kind, x, y, z, ry, s = 1.12) { const h = self.statue(kind); h.position.set(x, y, z); h.rotation.y = ry; h.scale.setScalar(s); group.add(h); return h; },
      pedestal(x, z, h = 1.1, w = 0.8) { ctx.box(w + 0.2, 0.15, w + 0.2, x, 0, z, M.stoneDark, 0, 1.5); ctx.box(w, h - 0.3, w, x, 0.15, z, M.stone, 0, 1.5); ctx.box(w + 0.2, 0.15, w + 0.2, x, h - 0.15, z, M.stoneDark, 0, 1.5); ctx.solid(x, z, w / 2 + 0.1, w / 2 + 0.1, h + 2); return h; },
      votive(x, z, ry = 0, rows = 3, cols = 7) { const g = M4(x, 0, z, ry); const add = (geo) => { geo.applyMatrix4(g); B.addGeo(geo, M.iron); };
        const st = []; for (let r = 0; r < rows; r++) { const b = new THREE.BoxGeometry(cols * 0.14 + 0.1, 0.03, 0.16); b.translate(0, 0.75 + r * 0.16, -r * 0.14); add(b); }
        for (const sx of [-1, 1]) { const l = new THREE.BoxGeometry(0.04, 1.2, 0.04); l.translate(sx * (cols * 0.07 + 0.05), 0.6, -0.15); add(l); } ctx.solid(x, z, cols * 0.07 + 0.15, 0.35, 1.3, ry);
        const flames = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const p = V3(-cols * 0.07 + 0.07 + c * 0.14, 0.77 + r * 0.16, -r * 0.14).applyMatrix4(g); const cup = new THREE.CylinderGeometry(0.035, 0.03, 0.06, 8); cup.translate(p.x, p.y + 0.03, p.z); B.addGeo(cup, (r + c) % 3 ? M.red : M.wax); const i = self.flames.add(O.x + p.x, p.y + 0.07, O.z + p.z, 0.035); flames.push(i); if ((r * cols + c) % 3 === 2) self.flames.hide(i, true); }
        return flames; },
      kneeler(x, z, ry) { const g = M4(x, 0, z, ry); for (const [w, h, d, px, py, pz, m] of [[0.9, 0.12, 0.3, 0, 0, 0.2, M.crimson], [0.9, 0.06, 0.32, 0, 0.12, 0.2, M.red], [0.08, 0.9, 0.08, -0.4, 0, -0.1, M.pew], [0.08, 0.9, 0.08, 0.4, 0, -0.1, M.pew], [0.95, 0.05, 0.32, 0, 0.9, -0.1, M.pew]]) { const b = new THREE.BoxGeometry(w, h, d); b.translate(px, py + h / 2, pz); b.applyMatrix4(g); wuv(b, 1.4); B.addGeo(b, m); } ctx.solid(x, z, 0.5, 0.2, 1.0, ry); },
      tabernacle(x, y, z, s = 1) { ctx.box(0.7 * s, 0.75 * s, 0.55 * s, x, y, z, M.gold, 0, 1); const roof = new THREE.ConeGeometry(0.5 * s, 0.35 * s, 4); roof.rotateY(Math.PI / 4); roof.translate(x, y + 0.92 * s, z); B.addGeo(roof, M.gold); ctx.box(0.36 * s, 0.46 * s, 0.02, x, y + 0.14 * s, z + 0.28 * s, M.crimson, 0, 1);
        ctx.box(0.04 * s, 0.22 * s, 0.03, x, y + 1.08 * s, z, M.gold, 0, 1); ctx.box(0.14 * s, 0.04 * s, 0.03, x, y + 1.22 * s, z, M.gold, 0, 1); ctx.box(0.05 * s, 0.05 * s, 0.03, x + 0.1 * s, y + 0.36 * s, z + 0.29 * s, M.gold, 0, 1); },
      sanctuaryLamp(x, y, z) { const ch = new THREE.CylinderGeometry(0.008, 0.008, 30, 4); ch.translate(x, y + 15.3, z); B.addGeo(ch, M.gold); const cup = new THREE.LatheGeometry([[0, 0], [0.1, 0.02], [0.14, 0.12], [0.12, 0.26], [0.0, 0.26]].map(p => new THREE.Vector2(p[0], p[1])), 12); cup.translate(x, y, z); B.addGeo(cup, M.gold);
        const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.16, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2a1a).multiplyScalar(2.2) })); glass.position.set(x, y + 0.32, z); group.add(glass); ctx.light(x, y + 0.4, z, 2.5, 0xff3020); ctx.flame(x, y + 0.36, z, 0.03);
        R.updaters.push((dt, t) => { glass.material.color.setRGB(2.2 + Math.sin(t * 9) * 0.25, 0.25, 0.12); }); },
      crucifix(x, y, z, s = 1, ry = 0) { // wooden cross with a carved corpus, head bowed
        const g = M4(x, y, z, ry, s); const b1 = new THREE.BoxGeometry(0.22, 4.2, 0.14); b1.translate(0, 2.1, 0); b1.applyMatrix4(g); wuv(b1, 1.2); B.addGeo(b1, M.darkwood); const b2 = new THREE.BoxGeometry(2.3, 0.2, 0.14); b2.translate(0, 3.15, 0); b2.applyMatrix4(g); wuv(b2, 1.2); B.addGeo(b2, M.darkwood);
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.16), new THREE.MeshStandardMaterial({ map: self._pq || (self._pq = plaqueTex()), roughness: 0.8 })); pl.position.set(0, 3.68, 0.08); const cg = new THREE.Group(); cg.add(pl);
        const c = self.corpus(); c.position.set(0, 1.42, 0.12); c.scale.setScalar(0.92); cg.add(c); cg.position.set(x, y, z); cg.rotation.y = ry; cg.scale.setScalar(s); group.add(cg); return cg; },
      font(x, z) { const g = new THREE.LatheGeometry([[0, 0], [0.28, 0], [0.3, 0.06], [0.12, 0.12], [0.1, 0.75], [0.3, 0.8], [0.42, 0.95], [0.44, 1.02], [0.36, 1.02], [0.3, 0.9], [0, 0.88]].map(p => new THREE.Vector2(p[0], p[1])), 16); g.translate(x, 0, z); B.addGeo(g, M.stone); const w = new THREE.Mesh(new THREE.CircleGeometry(0.35, 16), new THREE.MeshStandardMaterial({ color: 0x9ab8c0, roughness: 0.05, metalness: 0.3 })); w.rotation.x = -Math.PI / 2; w.position.set(x, 0.97, z); group.add(w); ctx.solid(x, z, 0.45, 0.45, 1.2); },
    };
    const builders = { cathedral: buildCathedral, church: buildChurch, inn: buildInn, shop: buildShop, house: buildHouse };
    builders[door.kind](ctx, R, M, id, this);
    B.build(group, { cast: true, receive: true }); group.traverse(o => { if (o.isMesh && o.material && (o.material.side === THREE.BackSide || o.material.blending === THREE.AdditiveBlending)) o.castShadow = false; });
    for (const n of R.npcs) n.interior = id;
    group.visible = false; this.built[id] = R; return R;
  }
  // ------------------------------------------------------------------ figures
  baseBody(sex = 'm') { const src = this.G.A[sex === 'f' ? 'human_f' : 'human_m'].scene; let geo = null; src.traverse(o => { if (o.isSkinnedMesh && /hero|Retopology/i.test(o.name + (o.parent?.name || '')) && !/Eye|brow/i.test(o.name)) geo = geo || o.geometry; }); return geo; }
  pose(h, clip, t = 0.3) { const mx = new THREE.AnimationMixer(h); const c = this.G.A.clips[clip]; if (c) { mx.clipAction(c).play(); mx.update(t); } h.updateMatrixWorld(true); return mx; }
  aim(bone, target) { // rotate bone (in world space) so that its child points along target dir
    const child = bone.children.find(c => c.isBone); if (!child) return; bone.updateWorldMatrix(true, true);
    const a = V3().setFromMatrixPosition(bone.matrixWorld), b = V3().setFromMatrixPosition(child.matrixWorld); const cur = b.sub(a).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(cur, target.clone().normalize()); const pq = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    bone.quaternion.premultiply(pq.clone().invert().multiply(q).multiply(pq)); bone.updateWorldMatrix(false, true); }
  turn(bone, axis, ang) { bone.updateWorldMatrix(true, false); const pq = bone.parent.getWorldQuaternion(new THREE.Quaternion()); const q = new THREE.Quaternion().setFromAxisAngle(axis, ang); bone.quaternion.premultiply(pq.clone().invert().multiply(q).multiply(pq)); bone.updateWorldMatrix(false, true); }
  corpus() {
    const h = makeHuman(this.G.A, { sex: 'm', outfit: 'Peasant', hair: ['Hair_Long', 'Hair_Beard'], hairTint: 0x4a3020 }); const ud = h.userData, b = ud.bones;
    const body = this.baseBody('m'); h.traverse(o => { if (o.isSkinnedMesh && /hero|Retopology/i.test(o.name + (o.parent?.name || '')) && !/Eye|brow/i.test(o.name)) { o.geometry = body; } });
    h.traverse(o => { if (o.isMesh) { if (/Peasant/.test(ud.outfit) && (o.userData.group || o.parent?.userData?.group) === ud.outfit) o.visible = false; if (o.material) { o.material = /Hair|brow/i.test(o.material.name) ? this.M.darkwood : /Eye/.test(o.material.name) ? this.M.darkwood : this.M.ivory; } } });
    for (const g of Object.keys(ud.parts)) if (g === ud.outfit) for (const m of ud.parts[g]) m.visible = false;
    h.updateMatrixWorld(true); const up = V3(0, 1, 0);
    // arms raised a little above horizontal; head bowed to the right; knees softly bent
    this.aim(b.upperarm_l, V3(1, 0.22, 0)); this.aim(b.lowerarm_l, V3(1, 0.26, 0)); this.aim(b.upperarm_r, V3(-1, 0.22, 0)); this.aim(b.lowerarm_r, V3(-1, 0.26, 0));
    if (b.hand_l) this.aim(b.hand_l, V3(1, 0.3, 0)); if (b.hand_r) this.aim(b.hand_r, V3(-1, 0.3, 0));
    this.aim(b.thigh_l, V3(0.03, -1, 0.12)); this.aim(b.calf_l, V3(0.0, -1, -0.08)); this.aim(b.thigh_r, V3(-0.03, -1, 0.12)); this.aim(b.calf_r, V3(-0.01, -1, -0.08));
    this.turn(b.Head, V3(1, 0, 0), 0.42); this.turn(b.Head, V3(0, 0, 1), 0.28); if (b.neck_01) this.turn(b.neck_01, V3(1, 0, 0), 0.12);
    // loincloth
    const lc = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.2, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0xf0e8d8, roughness: 0.9, side: THREE.DoubleSide })); h.updateMatrixWorld(true); const pp = V3().setFromMatrixPosition(b.pelvis.matrixWorld); const lcg = new THREE.Group(); lcg.add(lc); lcg.position.copy(pp).add(V3(0, -0.06, 0.0)); lcg.scale.set(1, 1, 0.75); h.add(lcg); b.pelvis.attach(lcg);
    h.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } }); return h;
  }
  statue(kind) {
    const A = this.G.A; const stone = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.0 });
    if (kind === 'mary') {
      const h = makeHuman(A, { sex: 'f', outfit: 'Ranger', hair: ['Hair_Long'], hairTint: 0x4a3020 }); const ud = h.userData;
      const blue = stone(0x2a4a8e), cream = stone(0xeee4d0), skin = stone(0xe8d4bc);
      h.traverse(o => { if (!o.isMesh || !o.material) return; const n = o.name; if (/Eye/.test(o.material.name)) return; o.material = /Hood|Body|Acc|Pauldron/.test(n) ? blue : /Hair|brow/i.test(o.material.name) ? stone(0x4a3020) : /Regular|hero|Retopology|Arms_2/i.test(n + o.material.name) ? skin : cream; });
      this.pose(h, 'Idle_Loop', 0.2); const b = ud.bones; h.updateMatrixWorld(true);
      this.aim(b.lowerarm_l, V3(0.5, -0.35, 0.8)); this.aim(b.lowerarm_r, V3(-0.5, -0.35, 0.8)); this.turn(b.Head, V3(1, 0, 0), 0.2);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.012, 6, 28), this.M.gold); halo.position.set(0, 0.16, -0.1); b.Head.add(halo); halo.scale.setScalar(1 / Math.max(1e-3, b.Head.getWorldScale(V3()).x));
      for (let i = 0; i < 12; i++) { const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.018), this.M.gold); const a = i / 12 * 6.283; st.position.set(Math.cos(a) * 0.17, Math.sin(a) * 0.17, 0); halo.add(st); }
      h.traverse(o => { if (o.isMesh) o.castShadow = true; }); return h;
    }
    // St James the Greater as pilgrim: hat with scallop, staff with gourd, brown cloak
    const h = makeHuman(A, { sex: 'm', outfit: 'Ranger', hair: ['Hair_Long', 'Hair_Beard'], hairTint: 0x3a2818 }); const ud = h.userData, b = ud.bones;
    const cloak = stone(0x6a4a2e), tunic = stone(0x8a2a24), skin = stone(0xe0c8a8);
    h.traverse(o => { if (!o.isMesh || !o.material) return; const n = o.name; if (/Eye/.test(o.material.name)) return; o.material = /Hood/.test(n) ? cloak : /Body|Acc|Pauldron/.test(n) ? cloak : /Hair|brow/i.test(o.material.name) ? stone(0x3a2818) : /Regular|hero|Retopology|Arms_2/i.test(n + o.material.name) ? skin : tunic; if (/Hood/.test(n)) o.visible = false; });
    this.pose(h, 'Idle_Loop', 0.2); h.updateMatrixWorld(true);
    const hat = makeHat('pilgrim_hat'); hat.traverse(o => { if (o.isMesh) o.material = o.material.color && o.material.color.r > 0.8 ? o.material : stone(0x4a3626); }); hat.position.set(0, 0.2, 0.01); b.Head.add(hat);
    const st = makeWeapon('st_james_staff'); attachWeapon(b.hand_r, st);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 28), this.M.gold); halo.position.set(0, 0.2, -0.14); b.Head.add(halo);
    h.traverse(o => { if (o.isMesh) o.castShadow = true; }); return h;
  }
  npc(R, def) { const G = this.G; const d = { ...def, x: R.O.x + def.x, z: R.O.z + def.z }; const n = new NPC(G, d); n.interior = R.id; G.npcs.push(n); R.npcs.push(n); return n; }
}

// =====================================================================================
function churchCommon(c, R, M, I, opt) {
  const { W, D, H, colZ, winZ, platZ, big } = opt; const Hs = H - W / 2;
  c.room(W, D, H, { wall: M.stone, floor: M.floor, vault: 1, wallS: 2.6, floorS: big ? 2.6 : 2.2, doorW: big ? 2.4 : 1.8, doorH: big ? 3.4 : 2.6 });
  // central runner carpet
  { const za = D / 2 - 1.2, zb = platZ + 0.7; c.box(1.6, 0.012, za - zb, 0, 0, (za + zb) / 2, M.red, 0, 2); }
  // sanctuary platform with step
  const pz0 = -D / 2, pz1 = platZ; const ph = big ? 0.6 : 0.45; c.box(W, ph, pz1 - pz0, 0, 0, (pz0 + pz1) / 2, M.floor, 0, 2.2); c.box(W - 1.0, ph / 2, 0.7, 0, 0, pz1 + 0.35, M.stoneDark, 0, 2);
  I.G.col.addSurface(R.O.x, R.O.z + (pz0 + pz1) / 2, W / 2, (pz1 - pz0) / 2, 0, ph); I.G.col.addSurface(R.O.x, R.O.z + pz1 + 0.35, W / 2 - 0.5, 0.35, 0, ph / 2);
  // columns + transverse ribs
  const cx = W / 2 - (big ? 1.6 : 0.35), cr = big ? 0.42 : 0.28;
  for (const z of colZ) for (const s of [-1, 1]) { const g = new THREE.CylinderGeometry(cr, cr * 1.06, Hs, 14); g.translate(s * cx, Hs / 2, z); wuv(g, 1.6); c.geo(g, M.stone); c.box(cr * 2.6, 0.35, cr * 2.6, s * cx, 0, z, M.stoneDark, 0, 1.6); c.box(cr * 2.8, 0.3, cr * 2.8, s * cx, Hs - 0.3, z, M.stoneDark, 0, 1.6); c.solid(s * cx, z, cr + 0.12, cr + 0.12, 20); }
  for (const z of colZ) { const rib = new THREE.TorusGeometry(W / 2 - 0.08, big ? 0.24 : 0.16, 6, 28, Math.PI); rib.translate(0, Hs, z); c.geo(rib, M.stoneDark); }
  // longitudinal cornice where the vault springs
  for (const s of [-1, 1]) c.box(0.3, 0.25, D, s * (W / 2 - 0.15), Hs - 0.25, 0, M.stoneDark, 0, 2);
  // windows (both sides) with shafts from the sunny side (+x)
  const sun = V3(-0.62, -0.72, -0.22).normalize(); const motifs = ['cross', 'shell', 'lily', 'star']; const wh = big ? 3.4 : 2.3, ww = big ? 1.3 : 0.9, wy = big ? 3.0 : 1.9;
  winZ.forEach((z, i) => { for (const s of [-1, 1]) { const w = c.window(s * (W / 2 - 0.02), wy, z, ww, wh, s > 0 ? -Math.PI / 2 : Math.PI / 2, motifs[(i + (s > 0 ? 0 : 2)) % 4], i * 3 + (s > 0 ? 1 : 2)); c.box(ww + 0.3, 0.16, 0.3, s * (W / 2 - 0.12), wy - 0.16, z, M.stoneDark, Math.PI / 2, 1.4);
    if (s > 0) c.shaft(W / 2 - 0.05, wy + wh * 0.5, z, ww * 0.9, wh * 0.9, sun, 0xffe6c0, w.tex, big ? 0.1 : 0.12); } });
  // rose window over the door, shaft down the nave
  const rr = big ? 2.4 : 1.15, ry = big ? Hs + W / 2 * 0.45 : Hs + 1.6; const rose = c.rose(0, ry, D / 2 - 0.02, rr, Math.PI); c.shaft(0, ry, D / 2 - 0.1, rr * 1.4, rr * 1.4, V3(0, -0.42, -1).normalize(), 0xfff0dc, rose.tex, big ? 0.07 : 0.09);
  // dust motes in the light
  c.add(dustMotes(new THREE.Box3(V3(-W / 2 + 0.5, 0.5, -D / 2 + 2), V3(W / 2 - 0.5, Hs + 1, D / 2 - 1)), big ? 160 : 80));
  return { Hs, ph };
}

function buildCathedral(c, R, M, id, I) {
  const W = 16, D = 40, H = 15; const colZ = [14, 8, 2, -4, -10], winZ = [11, 5, -1, -7]; const platZ = -13.4;
  const { Hs, ph } = churchCommon(c, R, M, I, { W, D, H, colZ, winZ, platZ, big: true });
  // altar
  const az = -16.2; c.box(3.2, 1.0, 1.15, 0, ph, az, M.stone, 0, 1.4); c.box(3.42, 0.05, 1.3, 0, ph + 1.0, az, M.linen, 0, 1); c.box(3.42, 0.55, 0.02, 0, ph + 0.5, az + 0.66, M.linen, 0, 1); c.box(3.42, 0.08, 0.025, 0, ph + 0.5, az + 0.665, M.gold, 0, 1); c.box(0.5, 0.5, 0.025, 0, ph + 0.52, az + 0.675, M.gold, 0, 1);
  c.solid(0, az, 1.75, 0.7, 3); for (const x of [-1.3, -0.85, -0.45, 0.45, 0.85, 1.3]) c.candlestick(x, ph + 1.03, az - 0.4, 1.1); c.light(0, ph + 1.8, az, 9, 0xffb060);
  // tabernacle on a gilded pedestal and the sanctuary lamp
  c.box(1.4, 1.2, 0.9, 0, ph, -18.6, M.stone, 0, 1.4); c.box(1.5, 0.08, 1.0, 0, ph + 1.2, -18.6, M.gold, 0, 1); c.tabernacle(0, ph + 1.28, -18.6, 1.1); c.solid(0, -18.6, 0.75, 0.5, 4); c.sanctuaryLamp(1.6, ph + 2.4, -17.6);
  // gilded retablo against the apse with St James in the central niche
  const rz = -19.75; c.box(10, 0.5, 0.5, 0, ph + 2.4, rz, M.gold, 0, 1); c.box(10.4, 0.5, 0.7, 0, ph + 9.8, rz, M.gold, 0, 1); for (const x of [-4.8, -2.2, 2.2, 4.8]) { const g = new THREE.CylinderGeometry(0.22, 0.22, 7.0, 12); g.translate(x, ph + 6.3, rz + 0.15); c.geo(g, M.gold); }
  for (const [x, w] of [[-3.5, 2.2], [0, 4.0], [3.5, 2.2]]) c.box(w, 7.0, 0.1, x, ph + 2.9, rz - 0.18, M.crimson, 0, 1); c.box(2.4, 0.18, 0.9, 0, ph + 4.1, rz + 0.3, M.gold, 0, 1);
  c.statue('james', 0, ph + 4.28, rz + 0.35, 0, 1.25);
  for (const x of [-3.5, 3.5]) { c.box(1.2, 0.12, 0.6, x, ph + 4.0, rz + 0.25, M.gold, 0, 1); c.candlestick(x - 0.3, ph + 4.12, rz + 0.3, 1.0); c.candlestick(x + 0.3, ph + 4.12, rz + 0.3, 1.0); }
  // crucifix hanging above the altar
  const cr = c.crucifix(0, ph + 4.6, az + 0.2, 1.05); for (const s of [-1, 1]) { const ch = new THREE.CylinderGeometry(0.01, 0.01, H, 4); ch.translate(s * 1.05, ph + 4.6 + 3.3 + H / 2, az + 0.2); c.geo(ch, M.iron); }
  // altar rail with kneeling place
  for (const s of [-1, 1]) { const x0 = s * 1.1, x1 = s * 6.0; const cx2 = (x0 + x1) / 2, L = Math.abs(x1 - x0); c.box(L, 0.08, 0.2, cx2, 0.9, platZ + 0.85, M.stone, 0, 1.4); c.box(L, 0.12, 0.3, cx2, 0, platZ + 0.85, M.stone, 0, 1.4); for (let x = Math.min(x0, x1) + 0.15; x < Math.max(x0, x1); x += 0.3) { const g = new THREE.LatheGeometry([[0, 0], [0.06, 0], [0.04, 0.2], [0.07, 0.4], [0.035, 0.65], [0.05, 0.78], [0, 0.78]].map(p => new THREE.Vector2(p[0], p[1])), 8); g.translate(x, 0.12, platZ + 0.85); c.geo(g, M.stone); } c.solid(cx2, platZ + 0.85, L / 2, 0.18, 1.2); c.box(L, 0.12, 0.32, cx2, 0, platZ + 1.25, M.crimson, 0, 1); }
  c.interact({ type: 'kneel', key: 'cathedral', x: 0, z: platZ + 1.7, r: 1.8, label: 'Kneel before the altar — pray', short: 'Pray', face: Math.PI });
  // flanking candle stands
  for (const s of [-1, 1]) { const g = new THREE.LatheGeometry([[0, 0], [0.25, 0], [0.22, 0.06], [0.06, 0.15], [0.05, 1.5], [0.12, 1.55], [0.14, 1.62], [0, 1.62]].map(p => new THREE.Vector2(p[0], p[1])), 12); g.translate(s * 2.5, ph, -15.2); c.geo(g, M.gold); c.candle(s * 2.5, ph + 1.62, -15.2, 0.6, 0.05); c.solid(s * 2.5, -15.2, 0.3, 0.3, 3); }
  // pews
  c.pews(1.2, 4.6, 9.5, -8.5, 1.3);
  // Our Lady's side chapel (left), with votive candles and a kneeler
  c.pedestal(-7.15, -1, 1.2, 0.85); c.statue('mary', -7.15, 1.2, -1, Math.PI / 2, 1.18); const vf = c.votive(-6.4, 1.3, Math.PI / 2, 3, 6); c.kneeler(-5.4, -1, Math.PI / 2 * -1 + Math.PI);
  c.light(-6.4, 1.2, 1.3, 4, 0xffa040); c.light(-7.0, 3.2, -1, 3.5, 0xffd8a0);
  c.interact({ type: 'kneel', key: 'mary', x: -4.8, z: -1, r: 1.5, label: 'Kneel before Our Lady — pray', short: 'Pray', face: -Math.PI / 2 });
  c.interact({ type: 'votive', x: -5.7, z: 1.3, r: 1.3, label: 'Light a votive candle (1 coin)', short: 'Candle', flames: vf });
  // confessional (left, near the door)
  confessional(c, M, -7.35, 11, Math.PI / 2); c.interact({ type: 'confess', x: -6.0, z: 11, r: 1.5, label: 'Confessional — make a confession', short: 'Confess' });
  // holy water fonts by the door
  c.font(-2.6, 17.8); c.font(2.6, 17.8); c.interact({ type: 'church', x: 2.6, z: 17.0, r: 1.5, label: 'Holy water font — bless water', short: 'Bless' }); c.interact({ type: 'church', x: -2.6, z: 17.0, r: 1.5, label: 'Holy water font — bless water', short: 'Bless' });
  // chandeliers + banners
  for (const z of [6, -4]) { c.chandelier(0, 7.5, z, 1.2, 10); c.light(0, 7.2, z, 10, 0xffb060); }
  // Botafumeiro: the great censer, swinging slowly across the nave
  const bot = new THREE.Group(); const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 8.5, 5), new THREE.MeshStandardMaterial({ color: 0xc8b090, roughness: 1 })); rope.position.y = -4.25; bot.add(rope);
  const cen = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.12, 0.02], [0.3, 0.2], [0.34, 0.45], [0.26, 0.7], [0.12, 0.85], [0.05, 0.95], [0, 0.95]].map(p => new THREE.Vector2(p[0], p[1])), 16), M.silver); cen.position.y = -9.4; bot.add(cen); bot.position.set(0, H - 0.6, -10.6); c.add(bot);
  R.updaters.push((dt, t) => { bot.rotation.x = Math.sin(t * 0.55) * 0.42; });
  // pilgrims at prayer
  const pil = [[2.6, 2.75, 0x5a4a3a, 'm'], [-3.0, -1.15, 0x3a4a5a, 'f'], [3.4, -5.05, 0x6a5040, 'm']];
  pil.forEach(([x, z, cl, sx], i) => I.npc(R, { id: 'cat_pil' + i, name: 'Pilgrim', x, z, yaw: Math.PI, idle: 'sit', yOff: 0.06, look: { sex: sx, outfit: 'Peasant', hair: sx === 'f' ? ['Hair_Long'] : ['Hair_SimpleParted', 'Hair_Beard'], tints: { cloth: cl } }, talk: G => ({ t: ['(whispers) We walked from León. I have no words left — only thanks.', '(quietly) Light a candle for my mother, if you can.', '(smiles) The Botafumeiro! I never thought I would see it.'][i], c: [{ t: 'Peace be with you.' }] }) }));
  I.npc(R, { id: 'cat_sacristan', name: 'Sacristan', x: -6.0, z: 2.6, yaw: Math.PI / 2 * -1, idle: 'fold', look: { sex: 'm', outfit: 'Ranger', hair: ['Hair_Buzzed'], tints: { cloth: 0x1a1a1e } }, extra: o => o.traverse(m => { if (m.isMesh && /Hood/.test(m.name)) m.visible = false; }), talk: G => ({ t: "Welcome, pilgrim. Kneel at the rail when you are ready — the Apostle has waited for you. The confessional is open by the door.", c: [{ t: 'Thank you.' }] }) });
  R.hint = 'Inside the Cathedral: kneel at the altar rail to pray.';
  R.fog = [0x2a2018, 24, 110]; R.exposure = 1.0;
}

function buildChurch(c, R, M, id, I) {
  const W = 10, D = 22, H = 9.2; const colZ = [6.5, 1.5, -3.5], winZ = [4, -1, -6]; const platZ = -7.4;
  const { Hs, ph } = churchCommon(c, R, M, I, { W, D, H, colZ, winZ, platZ, big: false });
  const az = -9.0; c.box(2.4, 0.98, 1.0, 0, ph, az, M.stone, 0, 1.4); c.box(2.6, 0.05, 1.12, 0, ph + 0.98, az, M.linen, 0, 1); c.box(2.6, 0.5, 0.02, 0, ph + 0.48, az + 0.57, M.linen, 0, 1); c.box(0.36, 0.36, 0.025, 0, ph + 0.55, az + 0.585, M.gold, 0, 1); c.solid(0, az, 1.3, 0.6, 3);
  for (const x of [-0.9, -0.5, 0.5, 0.9]) c.candlestick(x, ph + 1.01, az - 0.3, 1.0); c.light(0, ph + 1.7, az + 0.3, 7, 0xffb060);
  c.box(1.2, 1.1, 0.6, 0, ph, -10.6, M.stone, 0, 1.4); c.tabernacle(0, ph + 1.1, -10.6, 0.9); c.solid(0, -10.6, 0.65, 0.35, 3); c.sanctuaryLamp(1.3, ph + 2.0, -10.0);
  c.crucifix(0, ph + 2.15, -10.92, 0.95);
  // statues on pedestals either side of the sanctuary
  c.pedestal(-3.8, -6.3, 1.0, 0.75); c.statue('mary', -3.8, 1.0, -6.3, 0.35, 1.1); c.pedestal(3.8, -6.3, 1.0, 0.75); c.statue('james', 3.8, 1.0, -6.3, -0.35, 1.1);
  const vf = c.votive(-4.3, -4.7, Math.PI / 2, 3, 5); c.light(-4.0, 1.4, -4.7, 4, 0xffa040);
  c.kneeler(0, -5.9, 0); c.interact({ type: 'kneel', key: 'church_vf', x: 0, z: -5.2, r: 1.5, label: 'Kneel and pray', short: 'Pray', face: Math.PI });
  c.interact({ type: 'votive', x: -3.6, z: -4.7, r: 1.2, label: 'Light a votive candle (1 coin)', short: 'Candle', flames: vf });
  c.pews(0.9, 3.4, 5.0, -3.6, 1.3);
  confessional(c, M, -4.45, 8.2, Math.PI / 2); c.interact({ type: 'confess', x: -3.2, z: 8.2, r: 1.4, label: 'Confessional — make a confession', short: 'Confess' });
  c.font(2.4, 9.6); c.interact({ type: 'church', x: 2.4, z: 8.9, r: 1.4, label: 'Holy water font — bless water', short: 'Bless' });
  c.chandelier(0, 5.2, 1.5, 0.8, 8); c.light(0, 5.0, 1.5, 8, 0xffb060);
  I.npc(R, { id: 'vf_pil0', name: 'Old woman', x: -2.0, z: 1.15, yaw: Math.PI, idle: 'sit', yOff: 0.06, look: { sex: 'f', outfit: 'Peasant', hair: ['Hair_Buns'], tints: { cloth: 0x2a2a30 } }, talk: G => ({ t: '(softly) Every morning for sixty years. He listens, you know.', c: [{ t: 'God bless you.' }] }) });
  R.hint = 'Villafranca Church: kneel to pray, confess, or bless water at the font.';
  R.fog = [0x2a2018, 16, 60]; R.exposure = 1.0;
}

function confessional(c, M, x, z, ry) { const g = M4(x, 0, z, ry); const add = (w, h, d, px, py, pz, m) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(px, py + h / 2, pz); b.applyMatrix4(g); wuv(b, 1.4); c.geo(b, m); };
  add(2.6, 0.1, 1.2, 0, 0, 0, M.darkwood); add(2.7, 0.14, 1.3, 0, 2.5, 0, M.darkwood); add(2.6, 2.5, 0.08, 0, 0, -0.56, M.darkwood); for (const sx of [-1.3, -0.42, 0.42, 1.3]) add(0.08, 2.5, 1.2, sx, 0, 0, M.darkwood);
  add(0.8, 2.3, 0.05, 0, 0.1, 0.58, M.darkwood); add(0.78, 1.6, 0.03, -0.86, 0.6, 0.58, M.crimson); add(0.78, 1.6, 0.03, 0.86, 0.6, 0.58, M.crimson); add(0.06, 0.4, 0.06, 0, 2.64, 0, M.gold); add(0.24, 0.06, 0.06, 0, 2.78, 0, M.gold);
  c.solid(x, z, ry ? 0.65 : 1.35, ry ? 1.35 : 0.65, 3); }

function buildInn(c, R, M, id, I) {
  const big = id === 'inn_st'; const W = big ? 13 : 12, D = big ? 11 : 10, H = 3.6;
  c.room(W, D, H, { wall: M.plaster, floor: M.wood, beams: true, wallS: 3 });
  for (const x of [-W / 2 + 0.15, W / 2 - 0.15]) for (const z of [-D / 4, D / 4]) c.box(0.26, H, 0.26, x, 0, z, M.timber, 0, 1.5);
  // hearth
  const hx = -W / 2 + 0.55; c.box(0.9, 2.2, 2.6, hx, 0, -1, M.stoneDark, 0, 1.2); c.box(0.5, 1.0, 1.4, hx + 0.25, 0.2, -1, M.hearth, 0, 1); c.box(1.1, 0.14, 2.9, hx + 0.1, 2.2, -1, M.timber, 0, 1); c.box(0.6, H - 2.3, 1.4, hx - 0.1, 2.3, -1, M.stoneDark, 0, 1.2);
  for (const dz of [-0.3, 0, 0.3]) { const lg = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 6); lg.rotateZ(Math.PI / 2); lg.rotateY(dz * 2); lg.translate(hx + 0.4, 0.3, -1 + dz); c.geo(lg, M.timber); }
  c.flame(hx + 0.42, 0.32, -1.15, 0.22); c.flame(hx + 0.42, 0.32, -0.8, 0.18); c.flame(hx + 0.45, 0.3, -1.0, 0.26); const fl = c.light(hx + 1.1, 0.9, -1, 12, 0xff8a30); c.solid(hx, -1, 0.5, 1.35, 3);
  // bar counter, shelves and barrels
  const bx = W / 2 - 2.4, bz = -D / 2 + 2.0; c.box(3.4, 1.05, 0.65, bx, 0, bz, M.timber, 0, 1.2); c.box(3.5, 0.06, 0.75, bx, 1.05, bz, M.darkwood, 0, 1); c.solid(bx, bz, 1.75, 0.38, 1.3);
  c.prop('Shelf_Small_Bottles', bx, 1.2, -D / 2 + 0.25, 0, 1.0); c.prop('Shelf_Small_Bottles', bx - 1.4, 1.5, -D / 2 + 0.25, 0, 1.0); c.prop('Barrel', W / 2 - 0.6, 0, -D / 2 + 0.7, 0, 0.9, true); c.prop('Barrel', W / 2 - 0.6, 0, -D / 2 + 1.7, 1, 0.9, true);
  c.prop('Mug', bx - 0.8, 1.11, bz, 0, 1); c.prop('Bottle_1', bx + 0.6, 1.11, bz, 0, 1); c.prop('Mug', bx + 0.2, 1.11, bz + 0.1, 0, 1);
  // tables with benches
  const tables = big ? [[-1.6, 1.6], [2.2, 1.8], [-1.4, -2.4]] : [[-1.4, 1.4], [2.0, 2.0]];
  for (const [tx, tz] of tables) { const t = c.prop('Table_Large', tx, 0, tz, 0, 0.75, true); c.prop('Bench', tx, 0, tz - 0.95, 0, 0.72, true); c.prop('Bench', tx, 0, tz + 0.95, Math.PI, 0.72, true); c.prop('Mug', tx - 0.4, 0.8, tz, 0, 1); c.prop('Table_Plate', tx + 0.3, 0.8, tz, 0, 1); c.candle(tx, 0.82, tz + 0.15, 0.16, 0.03); }
  if (!big) { c.prop('Bed_Twin1', W / 2 - 1.2, 0, D / 2 - 2.0, -Math.PI / 2, 0.9, true); c.prop('Bed_Twin2', W / 2 - 1.2, 0, D / 2 - 4.0, -Math.PI / 2, 0.9, true); c.prop('Chest_Wood', W / 2 - 0.5, 0, D / 2 - 3.0, -Math.PI / 2, 0.8, true); }
  else { c.prop('Stair_Interior_Simple', W / 2 - 1.2, 0, D / 2 - 2.6, Math.PI, 1, true); c.prop('Crate_Wooden', -W / 2 + 0.7, 0, D / 2 - 1.4, 0.3, 0.8, true); }
  c.prop('Lantern_Wall', -W / 2 + 0.25, 2.0, 2.6, Math.PI / 2, 1); c.flame(-W / 2 + 0.45, 2.2, 2.6, 0.04); c.prop('Lantern_Wall', W / 2 - 0.25, 2.0, 0.4, -Math.PI / 2, 1); c.flame(W / 2 - 0.45, 2.2, 0.4, 0.04);
  c.chandelier(0.5, 2.6, 0.2, 0.6, 6); c.light(0.5, 2.4, 0.2, 7, 0xffb060); c.light(bx, 2.2, bz + 0.5, 5, 0xffb060);
  // a small crucifix over the door, as in any Galician house
  c.box(0.05, 0.4, 0.04, 0, 2.75, D / 2 - 0.05, M.darkwood, 0, 1); c.box(0.24, 0.05, 0.04, 0, 3.0, D / 2 - 0.05, M.darkwood, 0, 1);
  // windows
  for (const z of [-D / 4, D / 4]) houseWindow(c, R, M, W / 2, 1.2, z, -1);
  const keeper = I.npc(R, { id: id + '_keeper', name: big ? 'Doña Rosa' : 'Hospitalero Xan', x: bx, z: bz - 0.9, yaw: 0, idle: 'idle', look: big ? { sex: 'f', outfit: 'Peasant', hair: ['Hair_Buns'], tints: { cloth: 0x6a3a2a } } : { sex: 'm', outfit: 'Peasant', hair: ['Hair_SimpleParted', 'Hair_Beard'], tints: { cloth: 0x4a4a3a } },
    talk: G => ({ t: big ? 'Welcome to the Posada del Camino. A hot supper and a soft bed for the road-weary.' : 'Welcome to the albergue! Pilgrims sleep here for a donation. Mind the snorers.', c: [{ t: `Rest for the night (${big ? 6 : 3} coin)`, f: () => G.innRest(big ? 6 : 3) }, { t: 'Just looking around.' }] }) });
  I.npc(R, { id: id + '_guest', name: 'Pilgrim', x: tables[0][0] + 0.3, z: tables[0][1] - 0.95, yaw: 0, idle: 'sit', yOff: 0.03, look: { sex: 'm', outfit: 'Ranger', hair: ['Hair_Buzzed', 'Hair_Beard'], tints: { cloth: 0x5a5040 } }, extra: o => o.traverse(m => { if (m.isMesh && /Hood/.test(m.name)) m.visible = false; }), talk: G => ({ t: ['Eat while it is hot — tomorrow is a long stage.', 'They say the cathedral censer flies over the pilgrims like a comet.'][big ? 1 : 0], c: [{ t: 'Buen Camino.' }] }) });
  R.hint = big ? 'Talk to Doña Rosa to rest for the night.' : 'Talk to the hospitalero to rest for the night.';
  R.fog = [0x1e1610, 14, 40]; R.exposure = 1.0;
}

function houseWindow(c, R, M, x, y, z, side) { const w = 1.1, h = 1.2; const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff2d8).multiplyScalar(1.5), fog: false }); m.userData.day = 1.5; m.userData.plain = true; (R.glass = R.glass || []).push(m); const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x + side * 0.02, y + h / 2, z); p.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2; R.group.add(p);
  c.box(0.12, 0.08, w + 0.2, x + side * 0.06, y - 0.08, z, M.timber, 0, 1); c.box(0.12, 0.08, w + 0.2, x + side * 0.06, y + h, z, M.timber, 0, 1); c.box(0.1, h, 0.06, x + side * 0.05, y, z, M.timber, 0, 1); c.box(0.1, 0.05, w, x + side * 0.05, y + h / 2, z, M.timber, 0, 1);
  c.shaft(x + side * 0.05, y + h / 2, z, w * 0.9, h * 0.9, V3(-side * 0.7, -0.6, -0.2).normalize(), 0xfff0d8, null, 0.06); }

function buildShop(c, R, M, id, I) {
  const W = 9, D = 8, H = 3.4; c.room(W, D, H, { wall: M.plaster, floor: M.wood, beams: true, wallS: 3 });
  const cz = -1.4; c.box(4.6, 1.0, 0.7, 0, 0, cz, M.timber, 0, 1.2); c.box(4.7, 0.06, 0.8, 0, 1.0, cz, M.darkwood, 0, 1); c.solid(0, cz, 2.35, 0.4, 1.3);
  c.prop('Coin_Pile', 1.4, 1.06, cz, 0, 1); c.prop('Scroll_1', -0.4, 1.06, cz, 0.3, 1); c.prop('Potion_1', -1.6, 1.06, cz, 0, 1); c.candle(0.6, 1.06, cz - 0.1, 0.14, 0.03);
  c.prop('Shelf_Simple', -2.4, 1.0, -D / 2 + 0.25, 0, 1.2); c.prop('Shelf_Simple', 0, 1.0, -D / 2 + 0.25, 0, 1.2); c.prop('Shelf_Small_Bottles', 2.4, 1.1, -D / 2 + 0.25, 0, 1.2);
  c.prop('Pot_1', -2.8, 1.12, -D / 2 + 0.3, 0, 1); c.prop('Vase_2', -2.0, 1.12, -D / 2 + 0.3, 0, 1); c.prop('BookGroup_Medium_1', 0, 1.12, -D / 2 + 0.3, 0, 1); c.prop('Bottle_1', 0.6, 1.12, -D / 2 + 0.3, 0, 1);
  c.prop('Barrel_Apples', -W / 2 + 0.7, 0, -0.2, 0, 0.9, true); c.prop('FarmCrate_Apple', -W / 2 + 0.7, 0, 1.1, 0.2, 0.9, true); c.prop('Crate_Wooden', W / 2 - 0.7, 0, 1.6, 0.4, 0.9, true); c.prop('Bag', W / 2 - 0.7, 0, 0.4, 0, 1, true); c.prop('Pouch_Large', W / 2 - 1.3, 0, 2.6, 0, 1);
  c.prop('Peg_Rack', -W / 2 + 0.15, 1.6, 2.6, Math.PI / 2, 1); c.prop('Rope_1', W / 2 - 0.4, 0, -0.6, 0, 1); c.prop('Cauldron', -W / 2 + 0.8, 0, 2.6, 0, 0.8, true);
  c.box(0.05, 0.4, 0.04, 0, 2.6, D / 2 - 0.05, M.darkwood, 0, 1); c.box(0.24, 0.05, 0.04, 0, 2.85, D / 2 - 0.05, M.darkwood, 0, 1);
  c.chandelier(0, 2.5, 0.4, 0.55, 6); c.light(0, 2.3, 0.4, 7, 0xffb060); c.light(0, 2.0, cz - 0.8, 4, 0xffb060);
  houseWindow(c, R, M, -W / 2, 1.2, -1.6, 1); houseWindow(c, R, M, W / 2, 1.2, -1.6, -1);
  I.npc(R, { id: 'shopkeeper', name: 'Rui the grocer', x: 0, z: cz - 0.9, yaw: 0, idle: 'idle', look: { sex: 'm', outfit: 'Peasant', hair: ['Hair_Buzzed', 'Hair_Beard'], tints: { cloth: 0x5a3a24 } }, talk: G => ({ t: 'Good day! Bread, rope, oil, all you need for the last stages. Have a look.', c: [{ t: 'Show me your wares', f: () => { G.ui.openShop('merchant'); } }, { t: 'Goodbye' }] }) });
  c.interact({ type: 'shop', shop: 'merchant', x: 0, z: cz + 0.9, r: 1.4, label: 'Counter — browse wares', short: 'Shop' });
  R.fog = [0x1e1610, 12, 36]; R.exposure = 1.0;
}

function buildHouse(c, R, M, id, I) {
  const W = 7, D = 7, H = 3.0; c.room(W, D, H, { wall: M.plaster, floor: M.wood, beams: true, wallS: 3 });
  c.box(2.4, 0.01, 1.6, 0.6, 0, 0.6, M.rug, 0, 1);
  c.prop('Bed_Twin1', -W / 2 + 1.1, 0, -D / 2 + 1.25, 0, 0.9, true); c.prop('Nightstand_Shelf', -W / 2 + 2.4, 0, -D / 2 + 0.4, 0, 0.9, true); c.candle(-W / 2 + 2.4, 0.66, -D / 2 + 0.4, 0.14, 0.03); c.light(-W / 2 + 2.4, 1.0, -D / 2 + 0.6, 3, 0xffb060);
  // small crucifix over the bed
  c.box(0.05, 0.42, 0.04, -W / 2 + 1.1, 1.6, -D / 2 + 0.05, M.darkwood, 0, 1); c.box(0.26, 0.05, 0.04, -W / 2 + 1.1, 1.88, -D / 2 + 0.05, M.darkwood, 0, 1);
  c.prop('Table_Large', 1.0, 0, 0.6, Math.PI / 2, 0.55, true); c.prop('Chair_1', 0.2, 0, 0.6, Math.PI / 2, 0.85, true); c.prop('Chair_1', 1.8, 0, 0.6, -Math.PI / 2, 0.85, true); c.prop('Mug', 1.0, 0.6, 0.4, 0, 1); c.candle(1.0, 0.6, 0.85, 0.14, 0.03);
  // hearth in the back-right corner
  const hx = W / 2 - 0.95, hz = -D / 2 + 0.55; c.box(1.7, 1.6, 0.8, hx, 0, hz, M.stoneDark, 0, 1.2); c.box(0.9, 0.7, 0.4, hx, 0.15, hz + 0.25, M.hearth, 0, 1); c.box(1.9, 0.12, 0.95, hx, 1.6, hz, M.timber, 0, 1); c.flame(hx, 0.22, hz + 0.3, 0.16); c.flame(hx + 0.15, 0.2, hz + 0.32, 0.12); c.light(hx, 0.8, hz + 1.0, 8, 0xff8a30); c.solid(hx, hz, 0.85, 0.45, 2);
  c.prop(id === 'house_st' ? 'Bookcase_2' : 'Cabinet', -W / 2 + 0.35, 0, 1.4, Math.PI / 2, 0.85, true); c.prop('Chest_Wood', -W / 2 + 1.0, 0, -D / 2 + 2.45, 0, 0.75, true);
  if (id === 'house_sr2') { c.prop('Barrel', W / 2 - 0.55, 0, 1.8, 0, 0.8, true); c.prop('Workbench', W / 2 - 0.6, 0, 0.0, -Math.PI / 2, 0.8, true); }
  else { c.prop('Shelf_Simple', W / 2 - 0.15, 1.2, 1.4, -Math.PI / 2, 1); c.prop('Pot_1', W / 2 - 0.3, 1.3, 1.4, 0, 1); c.prop('Vase_2', W / 2 - 0.3, 1.3, 1.0, 0, 1); }
  houseWindow(c, R, M, W / 2, 1.1, 0.2, -1); houseWindow(c, R, M, -W / 2, 1.1, -0.6, 1);
  if (id === 'house_sr1') I.npc(R, { id: 'house_cat_marta_mother', name: 'Grandmother Elvira', x: 1.8, z: 0.6, yaw: -Math.PI / 2, idle: 'sit', yOff: 0.0, look: { sex: 'f', outfit: 'Peasant', hair: ['Hair_Buns'], hairTint: 0x9a948c, tints: { cloth: 0x3a2e2a } }, talk: G => ({ t: 'Ah, a pilgrim! Sit, sit. When I was a girl we walked to Santiago barefoot. Say a prayer for me at the Apostle.', c: [{ t: 'I will.' }] }) });
  R.fog = [0x1e1610, 10, 30]; R.exposure = 1.0;
}
