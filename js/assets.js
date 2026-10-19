import * as THREE from 'three';
import { GLTFLoader } from '../vendor/addons/loaders/GLTFLoader.js?v=4';
import { RGBELoader } from '../vendor/addons/loaders/RGBELoader.js?v=4';
import { MeshoptDecoder } from '../vendor/addons/libs/meshopt_decoder.module.js?v=4';

export const V = 4; // asset cache-bust
const MANIFEST = [
  ['human_m', 'assets/human_m.glb', 1.5], ['human_f', 'assets/human_f.glb', 1.4], ['anims', 'assets/anims.glb', 1.1],
  ['village', 'assets/village.glb', 1.2], ['nature', 'assets/nature.glb', 1.6], ['wolf', 'assets/wolf.glb', 0.3],
  ['boar', 'assets/boar.glb', 0.03], ['cow', 'assets/cow.glb', 0.3],
];
const TEX = ['grass', 'path', 'rock', 'cobble', 'forest', 'drystone'];

export async function loadAll(onProgress = () => {}) {
  const mgr = new THREE.LoadingManager();
  const gl = new GLTFLoader(mgr); gl.setMeshoptDecoder(MeshoptDecoder);
  const tl = new THREE.TextureLoader(mgr);
  const total = MANIFEST.reduce((a, m) => a + m[2], 0) + 1.8 + 1.4 + 0.5;
  const done = {}; const report = () => onProgress(Math.min(1, Object.values(done).reduce((a, b) => a + b, 0) / total));
  const out = { tex: {} };
  const jobs = MANIFEST.map(([k, url, mb]) => new Promise((res, rej) => gl.load(url + '?v=' + V, g => { out[k] = g; done[k] = mb; report(); res(); },
    e => { if (e.total) { done[k] = mb * e.loaded / e.total; report(); } }, rej)));
  for (const t of TEX) for (const s of ['d', 'n']) jobs.push(new Promise((res, rej) => tl.load(`assets/tex/${t}_${s}.jpg?v=${V}`, tx => {
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.anisotropy = 4; if (s === 'd') tx.colorSpace = THREE.SRGBColorSpace;
    out.tex[t + '_' + s] = tx; done['t' + t + s] = 0.15; report(); res();
  }, undefined, rej)));
  jobs.push(new Promise((res, rej) => tl.load(`assets/tex/foliage.webp?v=${V}`, tx => { tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 2; out.tex.foliage = tx; done.fol = 0.5; report(); res(); }, undefined, rej)));
  jobs.push(new Promise((res, rej) => new RGBELoader(mgr).load('assets/env/sky_1k.hdr?v=' + V, h => { h.mapping = THREE.EquirectangularReflectionMapping; out.hdr = h; done.hdr = 1.4; report(); res(); }, undefined, rej)));
  await Promise.all(jobs);
  out.clips = {}; for (const c of out.anims.animations) out.clips[c.name] = c;
  for (const k of ['wolf', 'boar', 'cow']) out[k].clipMap = Object.fromEntries(out[k].animations.map(c => [c.name, c]));
  return out;
}

/** Interior assets (furniture kit + stone/wood textures) are fetched lazily, after the world is up */
let _interior = null;
export function loadInterior() {
  if (_interior) return _interior;
  const gl = new GLTFLoader(); gl.setMeshoptDecoder(MeshoptDecoder); const tl = new THREE.TextureLoader(); const out = { tex: {} };
  const jobs = [new Promise((res, rej) => gl.load('assets/props.glb?v=' + V, g => { out.props = g; res(); }, undefined, rej))];
  for (const t of ['sandstone', 'monfloor', 'woodfloor']) for (const s of ['d', 'n']) jobs.push(new Promise((res, rej) => tl.load(`assets/tex/${t}_${s}.jpg?v=${V}`, tx => { tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.anisotropy = 4; if (s === 'd') tx.colorSpace = THREE.SRGBColorSpace; out.tex[t + '_' + s] = tx; res(); }, undefined, rej)));
  _interior = Promise.all(jobs).then(() => out).catch(e => { _interior = null; throw e; });
  return _interior;
}
