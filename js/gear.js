import * as THREE from 'three';
import { ITEMS } from './data.js?v=8';
// Procedural, attachable pilgrim gear. Visible tiers by rarity.
const RCOL = { common: 0x6b4a2e, uncommon: 0x4f3520, rare: 0x3a3f46, epic: 0x6a5a8a, legendary: 0xd8b25a, blessed: 0xe8d6a0 };
const HAT = { common: 0x7a6a50, uncommon: 0x5a4430, rare: 0x3b2c22, epic: 0x40304a, legendary: 0x2a2018, blessed: 0x6a5236 };
export const CLOTH = { common: 0x9a8a72, uncommon: 0x7a5a3a, rare: 0x4a5560, epic: 0x6f6f78, legendary: 0x8a2e2a, blessed: 0xe6dcc4 };
export const CLOAK = { common: 0x6a6a5e, uncommon: 0x5a4a38, rare: 0x2f3e52, epic: 0x463058, legendary: 0x7a1e1e, blessed: 0xd8cfb8 };
const metal = new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: 0.9, roughness: 0.35 });
const gold = new THREE.MeshStandardMaterial({ color: 0xd0a650, metalness: 0.95, roughness: 0.25 });
const shellMat = new THREE.MeshStandardMaterial({ color: 0xefe4cc, roughness: 0.6 });
function shell(scale = 1) { // scallop: fan of ribs
  const g = new THREE.Group(); const base = new THREE.Mesh(new THREE.SphereGeometry(0.06 * scale, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), shellMat); base.scale.set(1, 0.35, 1); g.add(base);
  for (let i = 0; i < 7; i++) { const rib = new THREE.Mesh(new THREE.BoxGeometry(0.008 * scale, 0.012 * scale, 0.06 * scale), shellMat); const a = -0.9 + i * 0.3; rib.position.set(Math.sin(a) * 0.03 * scale, 0.015 * scale, Math.cos(a) * 0.03 * scale); rib.rotation.y = a; g.add(rib); }
  return g;
}
export function makeHat(id) {
  const it = ITEMS[id]; const c = HAT[it?.r] ?? 0x5a4430; const mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });
  const g = new THREE.Group(); const brimR = id === 'cloth_hat' ? 0.13 : 0.24;
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(brimR, brimR, 0.012, 24), mat); g.add(brim);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.115, 0.11, 18), mat); crown.position.y = 0.06; g.add(crown);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.117, 0.117, 0.025, 18), it?.r === 'blessed' || it?.r === 'legendary' ? gold : new THREE.MeshStandardMaterial({ color: 0x2a2018 })); band.position.y = 0.02; g.add(band);
  if (id !== 'cloth_hat') { const s = shell(1.2); s.rotation.x = -1.2; s.position.set(0, 0.07, 0.115); g.add(s); }
  return g;
}
export function makeWeapon(id) {
  const it = ITEMS[id] || ITEMS.stick; const blade = /sword|blade|knife/.test(id);
  const g = new THREE.Group(); const woodC = RCOL[it.r] ?? 0x6b4a2e;
  if (blade) {
    const len = id === 'wood_knife' ? 0.3 : 0.75; const bm = id === 'silver_blade' ? new THREE.MeshStandardMaterial({ color: 0xdfe6ee, metalness: 1, roughness: 0.15 }) : id === 'wood_knife' ? new THREE.MeshStandardMaterial({ color: 0x8a6a46 }) : metal;
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.045, len, 0.01), bm); b.position.y = len / 2 + 0.1; g.add(b);
    const gu = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.03), id === 'silver_blade' ? gold : metal); gu.position.y = 0.09; g.add(gu);
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 8), new THREE.MeshStandardMaterial({ color: 0x3a2618 })); g.add(h);
  } else {
    const L = id === 'stick' ? 1.35 : 1.65; const mat = new THREE.MeshStandardMaterial({ color: woodC, roughness: 0.75, metalness: it.r === 'legendary' ? 0.3 : 0 });
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, L, 8), mat); s.position.y = L * 0.28; g.add(s);
    if (/iron|blessed|crook|james/.test(id)) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.02, 0.12, 8), id === 'iron_staff' ? metal : gold); f.position.y = L * 0.28 - L / 2; g.add(f); const t = f.clone(); t.position.y = L * 0.28 + L / 2 - 0.06; g.add(t); }
    if (id !== 'stick') { // gourd hung near top — the classic pilgrim staff
      const gourd = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshStandardMaterial({ color: 0xb08a4a, roughness: 0.6 })); gourd.scale.set(1, 1.3, 1); gourd.position.set(0.04, L * 0.28 + L / 2 - 0.3, 0); g.add(gourd);
    }
    if (id === 'pilgrim_crook' || id === 'st_james_staff') { const hook = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.016, 6, 12, Math.PI), mat); hook.position.y = L * 0.28 + L / 2 + 0.05; g.add(hook); }
    if (id === 'blessed_staff' || id === 'st_james_staff') { const cx = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.12, 0.014), gold); cx.position.y = L * 0.28 + L / 2 + 0.07; const cy = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.014, 0.014), gold); cy.position.y = L * 0.28 + L / 2 + 0.09; g.add(cx, cy); }
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
/** Attach gear to a human built by makeHuman */
export function dressPilgrim(h, equip) {
  const ud = h.userData; const b = ud.bones;
  for (const k of ['_hat', '_wpn']) if (ud[k]) { ud[k].parent?.remove(ud[k]); ud[k] = null; }
  const hasCloak = !!equip.cloak; const sex = /Female/.test(ud.outfit) ? 'Female_' : 'Male_';
  const show = (grp, v) => (ud.parts[grp] || []).forEach(m => m.visible = v);
  show(sex + 'Peasant', !hasCloak); show(sex + 'Ranger', hasCloak);
  const body = ITEMS[equip.body], cloak = ITEMS[equip.cloak], boots = ITEMS[equip.boots];
  const tint = (grp, hex, filter) => (ud.parts[grp] || []).forEach(m => { if (/Regular/.test(m.material.name)) return; if (filter && !filter(m)) return; neutralise(m.material); m.material.color.setHex(hex).lerp(new THREE.Color(0xffffff), 0.12); });
  tint(sex + 'Peasant', CLOTH[body?.r] ?? 0xb0a080);
  if (hasCloak) { tint(sex + 'Ranger', CLOAK[cloak.r], m => /Body$|Hood|Arms_1|Pauldron/.test(m.name)); tint(sex + 'Ranger', CLOTH[body?.r] ?? 0x8a7a62, m => /Legs/.test(m.name)); tint(sex + 'Ranger', 0x5a4030, m => /Belt|Bracer/.test(m.name)); }
  const bootC = boots ? ({ common: 0x9a8064, uncommon: 0x6a4a30, rare: 0x3a2a20, blessed: 0x8a6a3a })[boots.r] ?? 0x5a4030 : 0xb09070;
  for (const g of [sex + 'Peasant', sex + 'Ranger']) (ud.parts[g] || []).forEach(m => { if (/Feet|Boot/.test(m.name)) { neutralise(m.material); m.material.color.setHex(bootC); } });
  // hood hidden when wearing a hat
  (ud.parts[sex + 'Ranger'] || []).forEach(m => { if (/Hood/.test(m.name)) m.visible = hasCloak && !equip.hat; });
  if (equip.hat && b.Head) { const hat = makeHat(equip.hat); hat.position.set(0, 0.2, 0.01); hat.rotation.x = -0.12; b.Head.add(hat); ud._hat = hat; }
  if (b.hand_r) { const w = makeWeapon(equip.weapon || 'stick'); attachWeapon(b.hand_r, w); ud._wpn = w; }
}

/** Outfit textures/vertex colours are strongly hued (the Ranger set is green); desaturate them so a tint shows its true colour */
export function neutralise(mat) {
  if (mat.userData.neutral) return; mat.userData.neutral = true;
  mat.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <map_fragment>', `#ifdef USE_MAP
        vec4 sampledDiffuseColor = texture2D( map, vMapUv ); float lumT = dot(sampledDiffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
        sampledDiffuseColor.rgb = vec3(clamp(lumT * 1.9, 0.0, 1.2)); diffuseColor *= sampledDiffuseColor;
        #endif`)
      .replace('#include <color_fragment>', `#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
        float lumC = dot(vColor.rgb, vec3(0.2126, 0.7152, 0.0722)); diffuseColor.rgb *= vec3(clamp(lumC * 1.9, 0.0, 1.2));
        #endif`);
  };
  mat.customProgramCacheKey = () => 'neutral'; mat.needsUpdate = true;
}
/** Weapon grips: 0 = walking staff (upright), 1 = fighting grip (along the fist, like a sword) */
const _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);
export function attachWeapon(hand, w) {
  w.position.set(0.0, 0.085, 0.025); w.rotation.set(-0.695, -0.04, -2.988); hand.add(w);
  const walk = { p: w.position.clone(), q: w.quaternion.clone() };
  // the fist's long axis runs from the little finger to the index knuckle; a hilt (or staff) lies along it
  const idx = hand.children.find(c => /^index_01/.test(c.name)), pky = hand.children.find(c => /^pinky_01/.test(c.name)), mid = hand.children.find(c => /^middle_01/.test(c.name));
  let fight = walk;
  if (idx && pky && mid) { const axis = idx.position.clone().sub(pky.position).normalize(); const palm = mid.position.clone().multiplyScalar(0.55); const thumb = hand.children.find(c => /^thumb_01/.test(c.name));
    const q = new THREE.Quaternion().setFromUnitVectors(_up, axis); fight = { p: palm.add(thumb ? thumb.position.clone().multiplyScalar(0.15) : new THREE.Vector3()), q }; }
  w.userData.grip = { walk, fight, k: 0 };
}
export function setGrip(w, target, dt) { const g = w.userData.grip; if (!g) return; const k = g.k + Math.sign(target - g.k) * Math.min(Math.abs(target - g.k), dt * 7); if (k === g.k && dt > 0) return; g.k = k; const e = k * k * (3 - 2 * k); w.position.lerpVectors(g.walk.p, g.fight.p, e); w.quaternion.slerpQuaternions(g.walk.q, g.fight.q, e); }
