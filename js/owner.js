// Private OWNER MODE (Michael only). Activated per device with ?owner=<code>, ?owner=off disables.
// Owner play uses its own save slot (pr_save_owner) so normal saves are never touched, and the save
// carries owner:true / leaderboard:false so any future leaderboard ignores it.
import { ITEMS, SKILLS, RECIPES } from './data.js?v=7';
import { PLACES, WATER, heightAt } from './world.js?v=7';
import { groundY } from './actors.js?v=7';

const CODE = 'mk7731', KEY = 'pr_owner';
export const OWNER_SAVE = 'pr_save_owner', OWNER_LVL = 50, OWNER_COIN = 999999;
let toastMsg = null;
// runs once at module load, before the game reads its save
(function activate() {
  try {
    const u = new URL(location.href); const v = u.searchParams.get('owner'); if (v == null) return;
    if (v === CODE) { localStorage.setItem(KEY, '1'); toastMsg = 'Owner mode on'; }
    else if (v === 'off') { localStorage.removeItem(KEY); toastMsg = 'Owner mode off'; }
    u.searchParams.delete('owner'); history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
  } catch (e) { }
})();
export const isOwner = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };
export const ownerToast = () => toastMsg;

// sensible stacks: 40 materials, 20 food/medicine, 10 sacramentals & candles, 2 of each gear piece/tool, 1 quest item / bag
function stackFor(id, it) {
  if (it.cat === 'mat') return 40;
  if (it.cat === 'consumable') return /food|heal/.test(it.use || '') ? 20 : 10;
  if (it.cat === 'quest' || it.cat === 'bag') return 1;
  return 2;
}
/** give the owner everything: all items, max level, all skills, unlimited coin; flags the save */
export function applyOwner(G) {
  const S = G.S; S.owner = true; S.leaderboard = false;
  for (const [id, it] of Object.entries(ITEMS)) S.inv[id] = Math.max(S.inv[id] || 0, stackFor(id, it));
  for (const sk of SKILLS) S.skills[sk.id] = sk.max;
  S.lvl = Math.max(S.lvl, OWNER_LVL); S.xp = 0; S.sp = 0; S.totalXp = Math.max(S.totalXp || 0, 9999999); S.score = 9999999;
  S.recipes = RECIPES.map(r => r.id); S.coin = OWNER_COIN;
  S.flags.mapAll = 1; S.visited = Object.keys(PLACES).filter(k => k !== 'region2');
  S.hp = G.maxHp(); S.stamina = G.maxSt(); S.faith = G.maxFaith();
}
/** per frame: unlimited health, stamina, faith and coin */
export function ownerTick(G) { const S = G.S; S.hp = G.maxHp(); S.stamina = G.maxSt(); S.faith = G.maxFaith(); if (S.coin < OWNER_COIN) S.coin = OWNER_COIN; }

/** named fast-travel destinations: villages, churches, shrines, cathedral and quest givers */
export function travelPlaces(G) {
  const out = [];
  for (const [k, p] of Object.entries(PLACES)) { if (k === 'region2' || k === 'chapel_chest' || k === 'poor_1' || k === 'priest') continue; out.push({ key: k, x: p.x, z: p.z, label: p.label, kind: /shrine/.test(k) ? 'Shrine' : /church|cathedral|chapel/.test(k) ? 'Church' : /start|hamlet|town/.test(k) ? 'Village' : 'Place' }); }
  const M = G.missions, seen = new Set();
  if (M) for (const m of Object.values(M.byId || {})) { const n = G.npcById(m.giver); if (!n || seen.has(m.giver)) continue; seen.add(m.giver); out.push({ key: 'q_' + m.giver, x: n.pos.x, z: n.pos.z, label: `${n.def?.name || n.name || m.giver} — ${m.name}`, kind: 'Quest' }); }
  const ord = { Village: 0, Church: 1, Shrine: 2, Quest: 3, Place: 4 }; return out.sort((a, b) => ord[a.kind] - ord[b.kind]);
}
/** a spot on dry ground, clear of every wall/prop collider, near (x,z) */
export function safeSpot(G, x, z) {
  const ok = (px, pz) => { if (Math.abs(px) > 280 || Math.abs(pz) > 280) return false; const h = heightAt(px, pz); if (h < WATER + 0.35) return false; const y = groundY(G, px, pz); if (y > h + 0.05) return false; return !G.col.pointBlocked(px, y + 0.1, pz, 0.55); };
  for (let r = 0; r <= 24; r += 0.75) { const n = r === 0 ? 1 : Math.ceil(r * 5); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (ok(px, pz)) return { x: px, z: pz }; } }
  return { x, z };
}
/** short fade, leave any interior, put the player on the ground */
export function fastTravel(G, x, z, label) {
  const fade = document.getElementById('fade'); fade.classList.add('on'); G.ui.closePanel?.(); G.ui.closeDialog?.();
  return new Promise(res => setTimeout(() => {
    if (G.inside) { const R = G.inside; R.group.visible = false; G.interiors.inside = null; G.inside = null; G.setInterior(false); }
    const s = safeSpot(G, x, z); const P = G.player; P.pos.set(s.x, groundY(G, s.x, s.z), s.z); P.vel?.set(0, 0, 0); P.act = null; P.lock = null;
    G.camTgt = null; G.cam.curD = null; for (const f of Object.values(G.missions?.followers || {})) f.pos?.set(s.x + 1, groundY(G, s.x + 1, s.z + 1), s.z + 1);
    G.save(); setTimeout(() => fade.classList.remove('on'), 80); G.ui.toast(label ? `Travelled to ${label}` : 'Travelled');
    res(s);
  }, 300));
}
