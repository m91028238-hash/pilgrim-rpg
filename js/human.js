import * as THREE from 'three';
import { clone as skClone } from '../vendor/addons/utils/SkeletonUtils.js?v=8';
import { neutralise } from './gear.js?v=8';

/** Build a skinned human from the composed Quaternius glb.
 *  opts: { sex:'m'|'f', outfit:'Peasant'|'Ranger', hair:'Hair_Beard'|..., tints:{cloth:hex, skin:hex}, demon:bool } */
const HAIR = [0x3a2a1e, 0x2a1e16, 0x5a4030, 0x6a6058, 0x1e1814, 0x4a3422];
export function makeHuman(A, opts = {}) {
  const sex = opts.sex || 'm';
  const src = A[sex === 'f' ? 'human_f' : 'human_m'];
  const root = skClone(src.scene);
  const pre = sex === 'f' ? 'Female_' : 'Male_';
  const outfit = pre + (opts.outfit || 'Peasant');
  const hairs = new Set([].concat(opts.hair || (sex === 'f' ? 'Hair_Buns' : 'Hair_SimpleParted')).concat(sex === 'f' ? ['Eyebrows_Female'] : ['Eyebrows_Regular']));
  const parts = {};
  root.traverse(o => {
    const g = groupOf(o);
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false;
      const isBase = g === 'Base';
      let vis = isBase || g === outfit || hairs.has(g);
      o.visible = vis;
      if (o.material) {
        o.material = o.material.clone();
        o.material.envMapIntensity = 0.8;
        if (/^(Hair_|Eyebrows)/.test(g || '')) o.material.color.setHex(opts.hairTint ?? HAIR[Math.floor(Math.random() * HAIR.length)]);
        if (opts.tints && g === outfit && opts.tints.cloth != null && !/Regular/.test(o.material.name)) { neutralise(o.material); o.material.color.setHex(/Belt|Bracer|Feet|Boot/.test(o.name) ? 0x4a3628 : opts.tints.cloth).lerp(new THREE.Color(0xffffff), 0.15); }
        if (opts.demon) { o.material.color.setHex(0x0d0612); o.material.emissive = new THREE.Color(0x2a0838); o.material.roughness = 0.35; o.material.metalness = 0.2; o.material.transparent = true; o.material.opacity = 0.92; }
      }
      (parts[g] ||= []).push(o);
    }
  });
  // keep only head/neck of the base body so it never pokes through clothing
  for (const o of parts.Base || []) if (o.isSkinnedMesh && /hero|Retopology/i.test(o.name + (o.parent?.name || '')) && !/Eye|brow/i.test(o.name)) o.geometry = trimmed(o, sex);
  root.userData.parts = parts; root.userData.outfit = outfit;
  const bones = {}; root.traverse(o => { if (o.isBone) bones[o.name] = o; });
  root.userData.bones = bones;
  return root;
}
const _trim = {};
function trimmed(mesh, sex) {
  if (_trim[sex]) return _trim[sex];
  const g = mesh.geometry, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, bones = mesh.skeleton.bones;
  const keep = new Set(bones.map((b, i) => /^(Head|neck_01)$/.test(b.name) ? i : -1).filter(i => i >= 0));
  const dom = new Uint8Array(si.count);
  for (let v = 0; v < si.count; v++) { let best = -1, bi = 0; for (let c = 0; c < 4; c++) { const w = sw.getComponent(v, c); if (w > best) { best = w; bi = si.getComponent(v, c); } } dom[v] = keep.has(bi) ? 1 : 0; }
  const idx = g.index.array, out = [];
  for (let i = 0; i < idx.length; i += 3) if (dom[idx[i]] && dom[idx[i + 1]] && dom[idx[i + 2]]) out.push(idx[i], idx[i + 1], idx[i + 2]);
  const ng = g.clone(); ng.setIndex(out); return (_trim[sex] = ng);
}
function groupOf(o) { while (o) { if (o.userData && o.userData.group) return o.userData.group; o = o.parent; } return null; }

/** Simple animation controller with crossfades */
export class Animator {
  constructor(obj, clips, map) {
    this.mixer = new THREE.AnimationMixer(obj); this.actions = {}; this.cur = null; this.map = map;
    const used = new Set(); for (const [k, name] of Object.entries(map)) { const c = clips[name]; if (c) { this.actions[k] = this.mixer.clipAction(used.has(name) ? c.clone() : c); used.add(name); } }
    this.mixer.addEventListener('finished', e => { if (this.onFinish) this.onFinish(e.action); });
  }
  play(k, { fade = 0.18, once = false, speed = 1, force = false } = {}) {
    const a = this.actions[k]; if (!a) return null;
    if (this.cur === a && !force) { a.timeScale = speed; return a; }
    a.reset(); a.timeScale = speed; a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity); a.clampWhenFinished = once;
    a.enabled = true; a.setEffectiveWeight(1);
    if (this.cur) a.crossFadeFrom(this.cur, fade, false); a.play();
    this.cur = a; this.curKey = k; return a;
  }
  update(dt) { this.mixer.update(dt); }
}

// ---------------------------------------------------------------------------------------------
// Prayer pose (v6): hands joined at the breast, head bowed; optionally kneeling upright.
// Applied procedurally on top of the idle clip (no spell-casting gestures).
const _q0 = new THREE.Quaternion(), _q1 = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();
function aimW(bone, dir, w) {
  const child = bone.children.find(c => c.isBone); if (!child) return; bone.updateWorldMatrix(true, true);
  _a.setFromMatrixPosition(bone.matrixWorld); _b.setFromMatrixPosition(child.matrixWorld).sub(_a).normalize();
  _q1.setFromUnitVectors(_b, _d.copy(dir).normalize()); bone.parent.getWorldQuaternion(_pq);
  _q0.copy(bone.quaternion); bone.quaternion.premultiply(_pq.clone().invert().multiply(_q1).multiply(_pq)); _q1.copy(bone.quaternion);
  bone.quaternion.copy(_q0).slerp(_q1, w); bone.updateWorldMatrix(false, true);
}
function turnW(bone, axis, ang) { bone.updateWorldMatrix(true, false); bone.parent.getWorldQuaternion(_pq); _q1.setFromAxisAngle(axis, ang); bone.quaternion.premultiply(_pq.clone().invert().multiply(_q1).multiply(_pq)); bone.updateWorldMatrix(false, true); }
export function prayPose(obj, w, kneel = false) {
  const b = obj.userData.bones; if (!b || !b.upperarm_l || w <= 0.001) return; obj.updateMatrixWorld(true);
  const yaw = obj.rotation.y, F = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), L = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)), U = new THREE.Vector3(0, 1, 0);
  if (kneel && b.pelvis) { // lower the hips and fold the legs: knees on the ground, shins back
    const pel = b.pelvis; const ud = pel.userData; if (ud.kSet && pel.position.equals(ud.kSet)) pel.position.copy(ud.kPre); ud.kPre = pel.position.clone(); pel.updateWorldMatrix(true, false); const wp = new THREE.Vector3().setFromMatrixPosition(pel.matrixWorld); const sc = obj.scale.y || 1;
    wp.y -= 0.43 * sc * w; pel.parent.updateWorldMatrix(true, false); pel.position.copy(pel.parent.worldToLocal(wp)); ud.kSet = pel.position.clone(); pel.updateWorldMatrix(false, true);
    for (const s of ['l', 'r']) { const sd = s === 'l' ? 1 : -1;
      if (b['thigh_' + s]) aimW(b['thigh_' + s], _c.copy(U).multiplyScalar(-1).addScaledVector(F, 0.1).addScaledVector(L, 0.06 * sd), w);
      if (b['calf_' + s]) aimW(b['calf_' + s], _c.copy(F).multiplyScalar(-1).addScaledVector(U, -0.1), w);
      if (b['foot_' + s]) aimW(b['foot_' + s], _c.copy(F).multiplyScalar(-0.45).addScaledVector(U, -0.9), w); }
  }
  if (b.spine_03) { b.spine_03.updateWorldMatrix(true, false); }
  const chest = new THREE.Vector3().setFromMatrixPosition((b.spine_03 || b.spine_02).matrixWorld).addScaledVector(F, 0.26 * (obj.scale.y || 1)).addScaledVector(U, 0.02);
  for (const s of ['l', 'r']) { const sd = s === 'l' ? 1 : -1; const ua = b['upperarm_' + s], la = b['lowerarm_' + s], hd = b['hand_' + s]; if (!ua || !la) continue;
    aimW(ua, _c.copy(U).multiplyScalar(-0.86).addScaledVector(F, 0.4).addScaledVector(L, 0.16 * sd), w);
    la.updateWorldMatrix(true, false); const el = new THREE.Vector3().setFromMatrixPosition(la.matrixWorld); aimW(la, chest.clone().addScaledVector(L, 0.035 * sd).sub(el), w);
    if (hd) aimW(hd, _c.copy(U).multiplyScalar(0.8).addScaledVector(F, 0.45).addScaledVector(L, -0.12 * sd), w); }
  if (b.Head) turnW(b.Head, L, 0.32 * w);
}
