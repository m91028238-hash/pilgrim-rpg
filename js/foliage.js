// Foliage: alpha-card ground cover from a baked atlas, hedgerows, dry-stone walls, tree impostors and wind.
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/addons/utils/BufferGeometryUtils.js?v=4';
import { mulberry, fbm, hash2, distToPolyline } from './util.js?v=4';

// atlas tiles (4x4): [width m, height m]
export const TILES = [[0.9, 0.55], [1.0, 0.85], [0.9, 0.55], [0.9, 0.55], [0.9, 0.6], [0.9, 0.7], [1.0, 0.6], [1.1, 0.55], [0.8, 0.9], [1.0, 0.5], [2.2, 1.4], [2.2, 1.4], [1.2, 0.9], [0.9, 0.55], [1.0, 0.6], [1.0, 0.95]];
export const T = { tuft: 0, tall: 1, dandelion: 2, celandine: 3, periwinkle: 4, poppy: 5, fern: 6, fern2: 7, nettle: 8, weed: 9, hedgeA: 10, hedgeB: 11, bush: 12, daisy: 13, meadow: 14, dry: 15 };

/** crossed quads, base at y=0, 1x1, up-facing normals (soft, even lighting like real grass) */
function crossGeo(planes = 2) {
  const gs = [];
  for (let i = 0; i < planes; i++) { const g = new THREE.PlaneGeometry(1, 1, 1, 2); g.translate(0, 0.5, 0); g.rotateY(i * Math.PI / planes); gs.push(g); }
  const g = mergeGeometries(gs); const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  return g;
}
const NORMAL_BEGIN_NOFLIP = () => THREE.ShaderChunk.normal_fragment_begin.replaceAll('normal *= faceDirection;', '').replaceAll('normal = normal * faceDirection;', '');

/** Shared wind uniform */
export const wind = { value: 0 };

/** Card material: atlas lookup by per-instance tile, wind sway by height, distance shrink */
export function cardMaterial(map, { tiles = 4, far = 30, sway = 1, flipNormal = false } = {}) {
  const m = new THREE.MeshLambertMaterial({ map, alphaTest: 0.45, side: THREE.DoubleSide });
  const uFar = { value: far };
  m.userData.uFar = uFar;
  m.onBeforeCompile = sh => {
    sh.uniforms.uWind = wind; sh.uniforms.uFar = uFar;
    sh.vertexShader = `attribute float iTile;\nuniform float uWind, uFar;\n` + sh.vertexShader
      .replace('#include <uv_vertex>', `#include <uv_vertex>
        vMapUv = (vec2(mod(iTile, ${tiles}.0), ${tiles - 1}.0 - floor(iTile / ${tiles}.0)) + mix(vec2(0.006), vec2(0.994), uv)) / ${tiles}.0;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 ip = instanceMatrix[3];
        float dc = distance(ip.xz, cameraPosition.xz);
        float fade = 1.0 - smoothstep(uFar * 0.72, uFar, dc);
        float hh = max(position.y, 0.0);
        float gust = sin(uWind * 1.1 + ip.x * 0.05 + ip.z * 0.04) * 0.5 + 0.5;
        float sw = sin(uWind * 2.3 + ip.x * 0.37 + ip.z * 0.29) * (0.6 + gust * 0.8) + sin(uWind * 5.1 + ip.x * 1.3) * 0.18;
        transformed.x += sw * 0.16 * hh * hh * ${sway.toFixed(2)};
        transformed.z += cos(uWind * 1.7 + ip.z * 0.33) * 0.07 * hh * ${sway.toFixed(2)};
        transformed.y *= fade; transformed.xz *= mix(0.25, 1.0, fade);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', NORMAL_BEGIN_NOFLIP());
  };
  m.customProgramCacheKey = () => 'card' + tiles + sway + flipNormal;
  return m;
}

/** Instanced card layer with tile attribute and colour */
export class CardLayer {
  constructor(geo, mat, cap) {
    const g = geo.clone(); this.tile = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1); g.setAttribute('iTile', this.tile);
    this.mesh = new THREE.InstancedMesh(g, mat, cap); this.mesh.count = 0; this.mesh.frustumCulled = false;
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3);
    this.cap = cap; this.n = 0; this.d = new THREE.Object3D(); this.c = new THREE.Color();
  }
  reset() { this.n = 0; }
  add(x, y, z, tile, s, ry, col, sx = 1, sz = 1, wh = null) {
    if (this.n >= this.cap) return false; const [w, h] = wh || TILES[tile] || [1, 1]; const d = this.d;
    d.position.set(x, y, z); d.rotation.set(0, ry, 0); d.scale.set(w * s * sx, h * s, w * s * sz); d.updateMatrix();
    this.mesh.setMatrixAt(this.n, d.matrix); this.tile.array[this.n] = tile; this.mesh.setColorAt(this.n, this.c.setRGB(col[0], col[1], col[2])); this.n++; return true;
  }
  commit() { const m = this.mesh; m.count = this.n; m.instanceMatrix.needsUpdate = true; this.tile.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); }
}

/** Wind sway on 3D tree materials (leaves move more than trunks) */
export function addTreeWind(mat, amt = 1) {
  const m = mat.clone(); m.onBeforeCompile = sh => {
    sh.uniforms.uWind = wind;
    sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
      vec4 tp = instanceMatrix[3];
      #else
      vec4 tp = vec4(0.0);
      #endif
      float th = max(position.y - 1.2, 0.0);
      float tsw = sin(uWind * 1.3 + tp.x * 0.11 + tp.z * 0.07) + sin(uWind * 2.9 + tp.z * 0.2) * 0.3;
      transformed.x += tsw * 0.012 * th * th * ${amt.toFixed(2)};
      transformed.z += cos(uWind * 1.1 + tp.x * 0.09) * 0.008 * th * th * ${amt.toFixed(2)};
      transformed += normal * sin(uWind * 6.0 + position.x * 3.0 + position.y * 2.0) * 0.015 * min(th, 1.0);`);
  };
  m.customProgramCacheKey = () => 'treewind' + amt; return m;
}

/** Bake side-view impostors of tree models into an atlas render target */
export function bakeTreeImpostors(renderer, nat, names) {
  const cols = 4, rows = 2, TW = 256, TH = 512, RT = new THREE.WebGLRenderTarget(TW * cols, TH * rows, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  const scene = new THREE.Scene(); scene.add(new THREE.AmbientLight(0xffffff, 1.35)); const dl = new THREE.DirectionalLight(0xffffff, 2.0); dl.position.set(0.4, 1, 0.8); scene.add(dl);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  const prev = { tm: renderer.toneMapping, rt: renderer.getRenderTarget(), cc: renderer.getClearColor(new THREE.Color()), ca: renderer.getClearAlpha(), sc: renderer.getScissorTest(), at: renderer.autoClear };
  renderer.toneMapping = THREE.NoToneMapping; renderer.setRenderTarget(RT); renderer.setClearColor(0x34502a, 0); renderer.autoClear = false; renderer.clear(); renderer.setScissorTest(true);
  const info = [];
  names.forEach((name, i) => {
    const g = new THREE.Group(); for (const p of nat[name]) { const mm = new THREE.Mesh(p.geo, p.mat); g.add(mm); } scene.add(g);
    const box = new THREE.Box3().setFromObject(g); const w = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 1.04, h = (box.max.y - Math.min(0, box.min.y)) * 1.02;
    const half = Math.max(w / 2, h / 4); // keep 1:2 aspect
    cam.left = -half; cam.right = half; cam.bottom = 0; cam.top = half * 4; cam.position.set((box.min.x + box.max.x) / 2, 0, 50); cam.lookAt((box.min.x + box.max.x) / 2, 0, 0); cam.updateProjectionMatrix();
    const c = i % cols, r = Math.floor(i / cols); const vx = c * TW, vy = (rows - 1 - r) * TH; renderer.setViewport(vx, vy, TW, TH); renderer.setScissor(vx, vy, TW, TH);
    renderer.render(scene, cam); scene.remove(g); info.push({ w: half * 2, h: half * 4 });
  });
  renderer.setScissorTest(prev.sc); renderer.setRenderTarget(prev.rt); renderer.toneMapping = prev.tm; renderer.setClearColor(prev.cc, prev.ca); renderer.autoClear = prev.at;
  renderer.setViewport(0, 0, renderer.domElement.width / renderer.getPixelRatio(), renderer.domElement.height / renderer.getPixelRatio());
  return { texture: RT.texture, info, cols, rows };
}

/** Impostor material: atlas (cols x rows), per-instance tile; leaves lit from above */
export function impostorMaterial(tex, cols, rows) {
  const m = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
  m.onBeforeCompile = sh => {
    sh.uniforms.uWind = wind;
    sh.vertexShader = 'attribute float iTile;\nuniform float uWind;\n' + sh.vertexShader
      .replace('#include <uv_vertex>', `#include <uv_vertex>
        vMapUv = (vec2(mod(iTile, ${cols}.0), ${rows - 1}.0 - floor(iTile / ${cols}.0)) + mix(vec2(0.004), vec2(0.996), uv)) / vec2(${cols}.0, ${rows}.0);`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 ip = instanceMatrix[3]; transformed.x += sin(uWind * 1.3 + ip.x * 0.11 + ip.z * 0.07) * 0.03 * position.y * position.y;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', NORMAL_BEGIN_NOFLIP());
  };
  m.customProgramCacheKey = () => 'imp' + cols + rows; return m;
}
export const cross2 = () => crossGeo(2);
export const cross3 = () => crossGeo(3);

/** Ground-cover recipe for a 6 m cell. Returns [[x,y,z,tile,scale,ry,col]] (cached by caller) */
export function coverCell(gx, gz, ctx) {
  const { heightAt, splatAt, WATER, dens, blocked } = ctx; const r = mulberry(gx * 92821 + gz * 68917 + 7); const out = [];
  const cx = gx * 6 + 3, cz = gz * 6 + 3; const h0 = heightAt(cx, cz); if (h0 < WATER + 0.2) return out;
  const s0 = splatAt(cx, cz, h0, 0); if (s0[2] > 0.85) return out; // town cobbles
  const forest = s0[3], hills = cx < -110 && h0 > 6;
  const patch = fbm(cx * 0.025 + 40, cz * 0.025 - 13, 2); const flowerKind = [T.poppy, T.daisy, T.celandine, T.periwinkle, T.dandelion][Math.floor(hash2(Math.floor(cx / 40), Math.floor(cz / 40)) * 5)];
  const nGrass = Math.round((forest > 0.5 ? 6 : 14) * dens), nTall = Math.round((hills ? 4 : 3) * dens), nFlower = patch > 0.56 ? Math.round(9 * dens) : (patch > 0.48 ? Math.round(2 * dens) : 0);
  const nFor = forest > 0.35 ? Math.round(7 * dens * forest) : 0;
  const put = (tile, n, sMin, sMax, colf, test) => { for (let k = 0; k < n; k++) { const x = gx * 6 + r() * 6, z = gz * 6 + r() * 6, a = r(), b = r(); const y = heightAt(x, z); if (y < WATER + 0.25) continue; const s = splatAt(x, z, y, 0); if (s[2] > 0.3 || s[0] > 0.55) continue; if (test && !test(s, x, z)) continue; if (blocked(x, y, z)) continue; out.push([x, y - 0.04, z, tile, sMin + a * (sMax - sMin), b * 6.283, colf(a, b, s)]); } };
  const gcol = (a, b, s) => { const dry = hills ? 0.25 : 0; return [0.82 + a * 0.2 + dry, 0.95 + b * 0.1, 0.62 + a * 0.12]; };
  put(hills && r() < 0.5 ? T.dry : T.tuft, nGrass, 0.75, 1.3, gcol);
  put(r() < 0.5 ? T.meadow : T.tuft, Math.round(nGrass * 0.35), 0.8, 1.2, gcol, s => s[3] < 0.5);
  put(hills ? T.dry : T.tall, nTall, 0.8, 1.35, gcol, s => s[0] < 0.25);
  // long grass along path verges
  put(T.tall, Math.round(4 * dens), 0.9, 1.4, gcol, s => s[0] > 0.04 && s[0] < 0.5);
  if (nFlower) put(flowerKind, nFlower, 0.8, 1.2, (a) => [1, 1, 1]);
  if (nFlower) put(T.dandelion, Math.round(nFlower * 0.3), 0.8, 1.1, () => [1, 1, 1]);
  if (nFor) { put(r() < 0.5 ? T.fern : T.fern2, nFor, 0.9, 1.6, (a) => [0.85 + a * 0.2, 1, 0.8]); put(T.nettle, Math.round(nFor * 0.3), 0.8, 1.3, () => [0.9, 1, 0.85]); put(T.weed, Math.round(nFor * 0.4), 0.8, 1.2, () => [0.9, 1, 0.85]); }
  if (!forest && r() < 0.18 * dens) put(T.bush, 1, 0.9, 1.4, (a) => [0.62 + a * 0.12, 0.95, 0.5], s => s[0] < 0.1);
  return out;
}

/** Plan hedgerows and dry-stone walls (static), following the Camino with gaps, plus field edges */
export function planBoundaries(ctx) {
  const { PATH, RIVER, ZONES, heightAt, WATER, blocked } = ctx; const rng = mulberry(4242);
  const hedges = [], walls = [];
  const okAt = (x, z) => { if (Math.abs(x) > 270 || Math.abs(z) > 270) return false; if (heightAt(x, z) < WATER + 0.5) return false; if (distToPolyline(x, z, RIVER).d < 16) return false; for (const zn of ZONES) if (Math.hypot(x - zn.x, z - zn.z) < zn.r * 0.92) return false; if (distToPolyline(x, z, PATH).d < 4.2) return false; return !blocked(x, z); };
  // along the Camino: alternating runs of hedge and wall on either side, 18-40 m long with gaps
  for (let i = 0; i < PATH.length - 1; i++) {
    const [ax, az] = PATH[i], [bx, bz] = PATH[i + 1]; const L = Math.hypot(bx - ax, bz - az); const dx = (bx - ax) / L, dz = (bz - az) / L; const nx = -dz, nz = dx;
    for (const side of [-1, 1]) {
      let s = 4 + rng() * 10;
      while (s < L - 6) {
        const len = 14 + rng() * 26, kind = rng() < 0.55 ? 'hedge' : 'wall', off = 5.2 + rng() * 1.6; const seg = [];
        for (let t = s; t < Math.min(L - 3, s + len); t += kind === 'hedge' ? 1.5 : 1.0) { const x = ax + dx * t + nx * off * side, z = az + dz * t + nz * off * side; if (!okAt(x, z)) { if (seg.length > 2) (kind === 'hedge' ? hedges : walls).push(seg.slice()); seg.length = 0; continue; } seg.push([x, z]); }
        if (seg.length > 2) (kind === 'hedge' ? hedges : walls).push(seg);
        s += len + 8 + rng() * 22;
      }
    }
  }
  // field edges near San Roque and Villafranca (rectangles with a gate gap)
  const field = (cx, cz, w, d, ry, kind) => { const c = Math.cos(ry), s = Math.sin(ry); const P = (lx, lz) => [cx + lx * c + lz * s, cz - lx * s + lz * c]; const edges = [[[-w, -d], [w, -d]], [[w, -d], [w, d]], [[w, d], [-w, d]], [[-w, d], [-w, -d]]];
    edges.forEach(([p, q], ei) => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]); const seg = []; for (let t = 0; t <= L; t += kind === 'hedge' ? 1.5 : 1.0) { const f = t / L; if (ei === 2 && Math.abs(f - 0.5) < 0.12) { if (seg.length > 2) (kind === 'hedge' ? hedges : walls).push(seg.slice()); seg.length = 0; continue; } const [x, z] = P(p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f); if (!okAt(x, z)) { if (seg.length > 2) (kind === 'hedge' ? hedges : walls).push(seg.slice()); seg.length = 0; continue; } seg.push([x, z]); } if (seg.length > 2) (kind === 'hedge' ? hedges : walls).push(seg); }); };
  field(-150, 205, 16, 11, 0.5, 'hedge'); field(-245, 105, 13, 10, -0.2, 'wall'); field(-120, 160, 12, 9, 0.9, 'wall'); field(30, 30, 14, 10, 0.6, 'hedge'); field(95, -15, 12, 9, 0.2, 'wall'); field(-20, 75, 13, 9, -0.4, 'hedge'); field(130, -60, 12, 10, 0.7, 'hedge');
  return { hedges, walls };
}
