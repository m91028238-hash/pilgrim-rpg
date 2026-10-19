// Ambient effects: candle flames (instanced billboards), chimney smoke, birds, dust motes.
import * as THREE from 'three';
const time = { value: 0 };
export function tickFx(t) { time.value = t; }

/** Instanced flickering flames. add() returns index; setVisible per index via scale 0 */
export class Flames {
  constructor(cap = 256) {
    const g = new THREE.InstancedBufferGeometry(); const q = new THREE.PlaneGeometry(1, 1); q.translate(0, 0.5, 0);
    g.index = q.index; g.attributes.position = q.attributes.position; g.attributes.uv = q.attributes.uv;
    this.pos = new Float32Array(cap * 4); this.ia = new THREE.InstancedBufferAttribute(this.pos, 4); g.setAttribute('iPos', this.ia); g.instanceCount = 0;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uT: time, uBright: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec4 iPos; uniform float uT; varying vec2 vUv; varying float vF;
        void main(){ vUv = uv; float ph = fract(iPos.w) * 40.0; float s = iPos.w >= 1.0 ? floor(iPos.w) * 0.01 : 0.05;
          float fl = 0.85 + 0.15 * sin(uT * 13.0 + ph) + 0.08 * sin(uT * 29.0 + ph * 1.7); vF = fl;
          vec3 camR = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
          vec3 p = iPos.xyz + camR * position.x * s * 1.0 + vec3(0.0, 1.0, 0.0) * position.y * s * 2.4 * fl;
          p.x += sin(uT * 7.0 + ph) * 0.06 * s * position.y; p.z += cos(uT * 6.0 + ph) * 0.06 * s * position.y;
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
      fragmentShader: `varying vec2 vUv; varying float vF; uniform float uBright;
        void main(){ vec2 c = vUv - vec2(0.5, 0.32); c.y *= c.y > 0.0 ? 0.55 : 1.4; float d = length(c) * 2.0;
          float core = smoothstep(0.42, 0.0, d); float glow = smoothstep(1.0, 0.1, d) * 0.35;
          vec3 col = mix(vec3(1.0, 0.45, 0.1), vec3(1.0, 0.92, 0.7), core) * (core * 1.6 + glow) * vF * uBright;
          gl_FragColor = vec4(col, 1.0); }`,
    });
    this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 5; this.n = 0; this.cap = cap;
  }
  /** size in metres (0.03 tealight .. 0.3 hearth fire) */
  add(x, y, z, size = 0.05) { if (this.n >= this.cap) return -1; const i = this.n++; this.pos.set([x, y, z, Math.max(1, Math.round(size * 100)) + Math.random() * 0.99], i * 4); this.mesh.geometry.instanceCount = this.n; this.ia.needsUpdate = true; return i; }
  hide(i, on = false) { const w = this.pos[i * 4 + 3]; this.pos[i * 4 + 1] += on ? 1000 : -1000; this.ia.needsUpdate = true; }
}

/** Chimney smoke: soft rising puffs, fully animated in the vertex shader */
export function chimneySmoke(points, per = 10) {
  const n = points.length * per; const pos = new Float32Array(n * 3), seed = new Float32Array(n);
  points.forEach((p, i) => { for (let k = 0; k < per; k++) { const j = i * per + k; pos.set([p.x, p.y, p.z], j * 3); seed[j] = k / per + Math.random() * 0.05 + i * 0.37; } });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: time, uDay: { value: 1 }, uScale: { value: innerHeight / 2 } }, transparent: true, depthWrite: false,
    vertexShader: `attribute float seed; uniform float uT, uScale; varying float vA;
      void main(){ float t = fract(uT * 0.09 + seed); vec3 p = position + vec3(t * 2.6 + sin(seed * 31.0 + uT * 0.7) * 0.35 * t, t * 7.0, t * 1.2 + cos(seed * 17.0) * 0.4 * t);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; float sz = 0.7 + t * 3.2;
        gl_PointSize = sz * uScale / -mv.z; vA = (1.0 - t) * smoothstep(0.0, 0.12, t) * (1.0 - smoothstep(60.0, 110.0, -mv.z)); }`,
    fragmentShader: `varying float vA; uniform float uDay; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c) * 2.0; float a = smoothstep(1.0, 0.2, d) * vA * 0.32;
      gl_FragColor = vec4(mix(vec3(0.28), vec3(0.78, 0.76, 0.74), uDay), a); }`,
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 4; return pts;
}

/** Flocks of birds circling; wings flap in the vertex shader */
export class Birds {
  constructor(scene, n = 24) {
    const g = new THREE.BufferGeometry(); // body + two wings (triangles), wing tips flagged by uv.x
    const v = [0, 0, 0.18, 0, 0, -0.16, -0.05, 0, 0,   0, 0, 0.18, 0.05, 0, 0, 0, 0, -0.16,   0, 0, 0.06, -0.42, 0, -0.04, 0, 0, -0.08,   0, 0, 0.06, 0, 0, -0.08, 0.42, 0, -0.04];
    const f = [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1]; g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setAttribute('tip', new THREE.Float32BufferAttribute(f, 1));
    const mat = new THREE.MeshBasicMaterial({ color: 0x2a2622, side: THREE.DoubleSide });
    mat.onBeforeCompile = sh => { sh.uniforms.uT = time; sh.vertexShader = 'attribute float tip; uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float ph = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.3; transformed.y += tip * sin(uT * 11.0 + ph) * 0.3; transformed.y -= (1.0 - tip) * abs(position.x) * 0.0;`); };
    this.mesh = new THREE.InstancedMesh(g, mat, n); this.mesh.frustumCulled = false; scene.add(this.mesh);
    this.b = []; for (let i = 0; i < n; i++) this.b.push({ f: i % 3, a: Math.random() * 6.28, r: 6 + Math.random() * 9, h: Math.random() * 5, sp: 0.25 + Math.random() * 0.15, s: 0.9 + Math.random() * 0.5 });
    this.fl = [0, 1, 2].map(i => ({ x: 0, z: 0, y: 30, a: i * 2.1, R: 40 + i * 15 })); this.d = new THREE.Object3D();
  }
  update(dt, P, show) {
    this.mesh.visible = show; if (!show) return;
    this.fl.forEach((f, i) => { f.a += dt * (0.03 + i * 0.01); f.x = P.x + Math.cos(f.a) * f.R; f.z = P.z + Math.sin(f.a) * f.R; f.y = P.y + 22 + i * 7; });
    this.b.forEach((b, i) => { b.a += dt * b.sp * (b.f % 2 ? 1 : -1); const F = this.fl[b.f]; const x = F.x + Math.cos(b.a) * b.r, z = F.z + Math.sin(b.a) * b.r, y = F.y + b.h + Math.sin(b.a * 3) * 0.6;
      const d = this.d; d.position.set(x, y, z); const tx = -Math.sin(b.a) * (b.f % 2 ? 1 : -1), tz = Math.cos(b.a) * (b.f % 2 ? 1 : -1); d.rotation.set(0, Math.atan2(tx, tz), (b.f % 2 ? 0.25 : -0.25)); d.scale.setScalar(b.s * 1.6); d.updateMatrix(); this.mesh.setMatrixAt(i, d.matrix); });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/** Dust motes drifting in a box (light shafts) */
export function dustMotes(box, n = 80, color = 0xfff2d0) {
  const pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) pos.set([box.min.x + Math.random() * (box.max.x - box.min.x), box.min.y + Math.random() * (box.max.y - box.min.y), box.min.z + Math.random() * (box.max.z - box.min.z)], i * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.ShaderMaterial({ uniforms: { uT: time, uC: { value: new THREE.Color(color) }, uScale: { value: innerHeight / 2 }, uA: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uT, uScale; varying float vA; void main(){ vec3 p = position; float s = float(gl_VertexID) * 1.37; p += vec3(sin(uT * 0.21 + s) * 0.5, sin(uT * 0.13 + s * 2.1) * 0.6, cos(uT * 0.17 + s) * 0.5);
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = 0.03 * uScale / -mv.z + 1.0; vA = 0.5 + 0.5 * sin(uT * 0.9 + s * 3.0); }`,
    fragmentShader: `uniform vec3 uC; uniform float uA; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; gl_FragColor = vec4(uC * smoothstep(1.0, 0.0, d) * vA * 0.5 * uA, 1.0); }` });
  const p = new THREE.Points(g, mat); p.frustumCulled = false; return p;
}
