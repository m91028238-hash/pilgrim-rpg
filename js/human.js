import * as THREE from 'three';
import { clone as skClone } from '../vendor/addons/utils/SkeletonUtils.js?v=5';
import { neutralise } from './gear.js?v=5';

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
    for (const [k, name] of Object.entries(map)) { const c = clips[name]; if (c) this.actions[k] = this.mixer.clipAction(c); }
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
