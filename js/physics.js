// 2.5D collision: oriented boxes + circles on XZ plane with top heights; spatial hash.
const CELL = 16;
export class Colliders {
  constructor() { this.grid = new Map(); this.all = []; this.surfaces = []; }
  _cells(minx, minz, maxx, maxz, cb) { for (let i = Math.floor(minx / CELL); i <= Math.floor(maxx / CELL); i++) for (let j = Math.floor(minz / CELL); j <= Math.floor(maxz / CELL); j++) cb(i + ',' + j); }
  _add(c, r) { this.all.push(c); this._cells(c.x - r, c.z - r, c.x + r, c.z + r, k => { let a = this.grid.get(k); if (!a) this.grid.set(k, a = []); a.push(c); }); return c; }
  addBox(x, z, hw, hd, rot = 0, top = 10, tag) { const c = { type: 'box', x, z, hw, hd, rot, cos: Math.cos(rot), sin: Math.sin(rot), top, tag }; return this._add(c, Math.hypot(hw, hd)); }
  addCircle(x, z, r, top = 10, tag) { return this._add({ type: 'circle', x, z, r, top, tag }, r); }
  addSurface(x, z, hw, hd, rot, h) { this.surfaces.push({ x, z, hw, hd, cos: Math.cos(rot), sin: Math.sin(rot), h }); }
  surfaceAt(x, z) { let best = -1e9; for (const s of this.surfaces) { const dx = x - s.x, dz = z - s.z; const lx = dx * s.cos - dz * s.sin, lz = dx * s.sin + dz * s.cos; if (Math.abs(lx) < s.hw && Math.abs(lz) < s.hd) best = Math.max(best, s.h); } return best; }
  near(x, z, r) { const out = new Set(); this._cells(x - r, z - r, x + r, z + r, k => { const a = this.grid.get(k); if (a) for (const c of a) out.add(c); }); return out; }
  /** push a circle (x,z,r) out of colliders; y = feet height. returns {x,z,hit} */
  resolve(x, z, r, y = 0, iters = 2) {
    let hit = false;
    for (let it = 0; it < iters; it++) {
      for (const c of this.near(x, z, r + 2)) {
        if (y > c.top) continue;
        if (c.type === 'circle') {
          const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = c.r + r;
          if (d < m && d > 1e-5) { x = c.x + dx / d * m; z = c.z + dz / d * m; hit = true; }
        } else {
          const dx = x - c.x, dz = z - c.z;
          const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
          const qx = Math.max(-c.hw, Math.min(c.hw, lx)), qz = Math.max(-c.hd, Math.min(c.hd, lz));
          let ex = lx - qx, ez = lz - qz, d = Math.hypot(ex, ez);
          if (d < r) {
            let nlx, nlz;
            if (d > 1e-5) { nlx = qx + ex / d * r; nlz = qz + ez / d * r; }
            else { // inside: push along smallest axis
              const px = c.hw - Math.abs(lx), pz = c.hd - Math.abs(lz);
              if (px < pz) { nlx = Math.sign(lx || 1) * (c.hw + r); nlz = lz; } else { nlz = Math.sign(lz || 1) * (c.hd + r); nlx = lx; }
            }
            x = c.x + nlx * c.cos + nlz * c.sin; z = c.z - nlx * c.sin + nlz * c.cos; hit = true;
          }
        }
      }
    }
    return { x, z, hit };
  }
  pointBlocked(x, y, z, pad = 0.2) {
    for (const c of this.near(x, z, pad + 1)) {
      if (y > c.top) continue;
      if (c.type === 'circle') { if (Math.hypot(x - c.x, z - c.z) < c.r + pad) return true; }
      else { const dx = x - c.x, dz = z - c.z; const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos; if (Math.abs(lx) < c.hw + pad && Math.abs(lz) < c.hd + pad) return true; }
    }
    return false;
  }
  insideBox(x, z, c) { const dx = x - c.x, dz = z - c.z; const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos; return Math.abs(lx) < c.hw && Math.abs(lz) < c.hd; }
}
