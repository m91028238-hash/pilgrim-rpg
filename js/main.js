import * as THREE from '../vendor/three.module.min.js';
import {
  ITEMS, SKILLS, RECIPES, MAIN_QUEST, SIDE_TEMPLATES, SHOPS, ENEMY_TYPES,
  LANDMARKS, itemCount, skillCount
} from './data.js';
import { createWorld, heightAt, WORLD_SIZE, getLandmark } from './world.js';
import { createPilgrim, applyGearVisuals, placeOnTerrain } from './player.js';

const SAVE_KEY = 'pr_save_v1';
const BEST_KEY = 'pr_best';
const LVL_KEY = 'pr_lvl';
const VERSION = 1;

// ——— State ———
const state = {
  playing: false,
  hp: 100, maxHp: 100,
  stamina: 100, maxStamina: 100,
  hunger: 100, maxHunger: 100,
  faith: 50, maxFaith: 100,
  coins: 25, xp: 0, level: 1, skillPts: 0,
  inv: {}, equip: { weapon: 'stick', hat: null, cloak: 'rag_cloak', body: 'tunic', boots: 'sandals', trinket: 'scallop_shell' },
  skills: {},
  bagSlots: 24,
  mainQuest: 0,
  sideQuests: [],
  bounties: [],
  flags: {},
  shrine: { x: 8, z: 28 },
  killCounts: {},
  gatherCounts: {},
  litShrines: {},
  openedChests: {},
  dayT: 0.3, // 0-1
  time: 0,
};

function invCount(id) { return state.inv[id] || 0; }
function invAdd(id, n = 1) {
  const used = Object.values(state.inv).reduce((a, b) => a + b, 0);
  if (used + n > state.bagSlots && !state.inv[id]) {
    toast('Bag full');
    return false;
  }
  state.inv[id] = (state.inv[id] || 0) + n;
  return true;
}
function invTake(id, n = 1) {
  if (invCount(id) < n) return false;
  state.inv[id] -= n;
  if (state.inv[id] <= 0) delete state.inv[id];
  return true;
}

function xpToLevel(lv) { return Math.floor(40 + lv * 35 + lv * lv * 4); }
function addXp(n) {
  const bonus = 1 + (ITEMS[state.equip.trinket]?.xpBonus || 0);
  state.xp += Math.floor(n * bonus);
  while (state.level < 50 && state.xp >= xpToLevel(state.level)) {
    state.xp -= xpToLevel(state.level);
    state.level++;
    state.skillPts++;
    state.maxHp += 5;
    state.hp = Math.min(state.maxHp, state.hp + 20);
    toast(`Level ${state.level}! +1 skill point`);
    localStorage.setItem(LVL_KEY, String(state.level));
    const best = Math.max(+localStorage.getItem(BEST_KEY) || 0, state.level);
    localStorage.setItem(BEST_KEY, String(best));
  }
  updateHUD();
}

function skillRank(id) { return state.skills[id] || 0; }
function recalcStats() {
  state.maxHp = 100 + state.level * 5 + skillRank('iron_will') * 10 + (ITEMS[state.equip.trinket]?.hpBonus || 0);
  state.maxStamina = 100 + skillRank('endurance') * 8;
  state.maxFaith = 100 + skillRank('deep_faith') * 8;
  state.bagSlots = 24 + skillRank('pack_mule') * 4;
  for (const k of Object.keys(state.equip)) {
    const it = ITEMS[state.equip[k]];
    if (it?.slots) state.bagSlots += it.slots;
  }
  // bag items
  for (const [id, n] of Object.entries(state.inv)) {
    if (ITEMS[id]?.cat === 'bag') state.bagSlots += (ITEMS[id].slots || 0) * n;
  }
}

function getAtk() {
  let a = 5 + (ITEMS[state.equip.weapon]?.atk || 0) + skillRank('steady_hand') * 0.05 * (5 + (ITEMS[state.equip.weapon]?.atk || 0));
  return Math.floor(a);
}
function getDef() {
  let d = 0;
  for (const slot of ['hat', 'cloak', 'body', 'boots', 'trinket']) {
    d += ITEMS[state.equip[slot]]?.def || 0;
  }
  return d + skillRank('swordless') * 2;
}
function getSpeed() {
  let s = 2.4;
  s *= 1 + skillRank('walker') * 0.04;
  for (const slot of ['boots', 'trinket']) s += ITEMS[state.equip[slot]]?.speed || 0;
  return s;
}
function getFaithBonus() {
  let f = 0;
  for (const slot of Object.keys(state.equip)) f += ITEMS[state.equip[slot]]?.faithBonus || 0;
  return f;
}

// ——— Three.js setup ———
const canvas = document.createElement('canvas');
canvas.id = 'c';
document.body.prepend(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87aacc);
scene.fog = new THREE.FogExp2(0x87aacc, 0.008);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.3, 180);
const sun = new THREE.DirectionalLight(0xfff0d0, 1.1);
sun.position.set(40, 60, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 120;
sun.shadow.camera.left = sun.shadow.camera.bottom = -40;
sun.shadow.camera.right = sun.shadow.camera.top = 40;
scene.add(sun);
scene.add(new THREE.AmbientLight(0x6688aa, 0.45));
const hemi = new THREE.HemisphereLight(0x87aacc, 0x3d5c34, 0.35);
scene.add(hemi);

const world = createWorld(scene);
const pilgrim = createPilgrim();
scene.add(pilgrim);
placeOnTerrain(pilgrim, 0, 40);
applyGearVisuals(pilgrim, state.equip);

// Camera follow
const camTarget = new THREE.Vector3();
const camPos = new THREE.Vector3(0, 8, 12);
let camYaw = 0, camPitch = 0.35;
let camDragging = false, lastTX = 0, lastTY = 0;

// Enemies
const enemies = [];
const enemyGroup = new THREE.Group();
scene.add(enemyGroup);

function makeEnemyMesh(type) {
  const def = ENEMY_TYPES[type];
  const g = new THREE.Group();
  if (type === 'wolf' || type === 'boar') {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35 * def.scale, 0.6 * def.scale, 3, 6),
      new THREE.MeshLambertMaterial({ color: def.color })
    );
    body.rotation.z = Math.PI / 2;
    body.position.y = 0.45;
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.28 * def.scale, 6, 4),
      new THREE.MeshLambertMaterial({ color: def.color })
    );
    head.position.set(0.5 * def.scale, 0.5, 0);
    g.add(head);
  } else if (type === 'demon') {
    const body = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 1.8, 5),
      new THREE.MeshLambertMaterial({ color: def.color, transparent: true, opacity: 0.85 })
    );
    body.position.y = 1;
    g.add(body);
  } else {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 0.9, 3, 6),
      new THREE.MeshLambertMaterial({ color: def.color })
    );
    body.position.y = 1.1;
    body.castShadow = true;
    g.add(body);
  }
  return g;
}

function spawnEnemy(type, x, z, lvlBoost = 0) {
  const def = ENEMY_TYPES[type];
  if (!def) return;
  const dist = Math.hypot(x, z - 40);
  const areaLvl = Math.floor(dist / 80) + lvlBoost;
  const pl = state.level;
  const lv = Math.max(1, areaLvl + Math.floor(pl * 0.3));
  const mesh = makeEnemyMesh(type);
  placeOnTerrain(mesh, x, z);
  enemyGroup.add(mesh);
  const e = {
    type, mesh, x, z,
    hp: def.hp * (1 + lv * 0.15),
    maxHp: def.hp * (1 + lv * 0.15),
    atk: def.atk * (1 + lv * 0.12),
    speed: def.speed,
    xp: Math.floor(def.xp * (1 + lv * 0.1)),
    coin: def.coin + lv,
    lv, cd: 0, alive: true, aggro: false,
    holyOnly: !!def.holyOnly,
  };
  enemies.push(e);
  return e;
}

let enemiesPopulated = false;
function populateEnemies() {
  if (enemiesPopulated) return;
  enemiesPopulated = true;
  // Wolves in forest
  for (let i = 0; i < 8; i++) spawnEnemy('wolf', 120 + (Math.random() - 0.5) * 60, -100 + (Math.random() - 0.5) * 60);
  for (let i = 0; i < 6; i++) spawnEnemy('boar', -40 + (Math.random() - 0.5) * 100, -60 + (Math.random() - 0.5) * 80);
  for (let i = 0; i < 5; i++) spawnEnemy('bandit', -180 + (Math.random() - 0.5) * 40, 40 + (Math.random() - 0.5) * 40);
  spawnEnemy('bandit_chief', -178, 44, 2);
  // roaming
  for (let i = 0; i < 10; i++) {
    const x = (Math.random() - 0.5) * 500, z = (Math.random() - 0.5) * 500;
    if (Math.hypot(x, z - 40) < 50) continue;
    spawnEnemy(Math.random() > 0.5 ? 'wolf' : 'boar', x, z);
  }
}

function spawnNightDemons() {
  const existing = enemies.filter(e => e.alive && e.type === 'demon').length;
  if (existing >= 6) return;
  for (let i = existing; i < 5; i++) {
    const ang = Math.random() * 6.28;
    const dist = 25 + Math.random() * 40;
    const x = pilgrim.position.x + Math.cos(ang) * dist;
    const z = pilgrim.position.z + Math.sin(ang) * dist;
    spawnEnemy('demon', x, z, 1);
  }
}

// ——— Input ———
const keys = {};
const joy = { active: false, dx: 0, dy: 0, id: null };
let sprinting = false, blocking = false, attackCd = 0;

window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyE') tryInteract();
  if (e.code === 'KeyF' || e.code === 'Space') doAttack();
  if (e.code === 'KeyQ') blocking = true;
  if (e.code === 'ShiftLeft') sprinting = true;
  if (e.code === 'KeyB' || e.code === 'Tab') { e.preventDefault(); openPanel('bag'); }
});
window.addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.code === 'KeyQ') blocking = false;
  if (e.code === 'ShiftLeft') sprinting = false;
});

// Joystick
const joyZone = document.getElementById('joy-zone');
const joyStick = document.getElementById('joy-stick');
const joyBase = document.getElementById('joy-base');
function joyPos(x, y) {
  const r = 40;
  const len = Math.hypot(x, y) || 1;
  const cx = Math.max(-r, Math.min(r, x));
  const cy = Math.max(-r, Math.min(r, y));
  const cl = Math.hypot(cx, cy);
  joy.dx = cl > 2 ? cx / r : 0;
  joy.dy = cl > 2 ? cy / r : 0;
  joyStick.style.transform = `translate(${cx}px,${cy}px)`;
}
joyZone.addEventListener('touchstart', e => {
  const t = e.changedTouches[0];
  joy.active = true; joy.id = t.identifier;
  const rect = joyBase.getBoundingClientRect();
  joy._ox = rect.left + rect.width / 2;
  joy._oy = rect.top + rect.height / 2;
  joyPos(t.clientX - joy._ox, t.clientY - joy._oy);
  e.preventDefault();
}, { passive: false });
joyZone.addEventListener('touchmove', e => {
  for (const t of e.changedTouches) {
    if (t.identifier === joy.id) {
      joyPos(t.clientX - joy._ox, t.clientY - joy._oy);
      e.preventDefault();
    }
  }
}, { passive: false });
function endJoy(e) {
  for (const t of e.changedTouches) {
    if (t.identifier === joy.id) {
      joy.active = false; joy.id = null; joy.dx = joy.dy = 0;
      joyStick.style.transform = '';
    }
  }
}
joyZone.addEventListener('touchend', endJoy);
joyZone.addEventListener('touchcancel', endJoy);

// Camera drag (right half)
let camTouchId = null;
window.addEventListener('touchstart', e => {
  for (const t of e.changedTouches) {
    if (t.clientX > innerWidth * 0.48 && t.target.closest('#btn-zone, #panel, #title, .abtn')) continue;
    if (t.clientX > innerWidth * 0.48 && camTouchId === null) {
      camTouchId = t.identifier; camDragging = true;
      lastTX = t.clientX; lastTY = t.clientY;
    }
  }
}, { passive: true });
window.addEventListener('touchmove', e => {
  for (const t of e.changedTouches) {
    if (t.identifier === camTouchId) {
      camYaw -= (t.clientX - lastTX) * 0.005;
      camPitch = Math.max(0.15, Math.min(0.85, camPitch + (t.clientY - lastTY) * 0.004));
      lastTX = t.clientX; lastTY = t.clientY;
    }
  }
}, { passive: true });
window.addEventListener('touchend', e => {
  for (const t of e.changedTouches) if (t.identifier === camTouchId) { camTouchId = null; camDragging = false; }
});
window.addEventListener('mousedown', e => {
  if (e.button === 2 || e.clientX > innerWidth * 0.5) {
    camDragging = true; lastTX = e.clientX; lastTY = e.clientY;
  }
});
window.addEventListener('mousemove', e => {
  if (camDragging) {
    camYaw -= (e.clientX - lastTX) * 0.005;
    camPitch = Math.max(0.15, Math.min(0.85, camPitch + (e.clientY - lastTY) * 0.004));
    lastTX = e.clientX; lastTY = e.clientY;
  }
});
window.addEventListener('mouseup', () => { camDragging = false; });
window.addEventListener('contextmenu', e => e.preventDefault());

document.getElementById('btn-attack').addEventListener('touchstart', e => { e.preventDefault(); doAttack(); }, { passive: false });
document.getElementById('btn-block').addEventListener('touchstart', e => { e.preventDefault(); blocking = true; doPrayOrBlock(); document.getElementById('btn-block').classList.add('on'); }, { passive: false });
document.getElementById('btn-block').addEventListener('touchend', () => { blocking = false; document.getElementById('btn-block').classList.remove('on'); });
document.getElementById('btn-interact').addEventListener('touchstart', e => { e.preventDefault(); tryInteract(); }, { passive: false });
document.getElementById('btn-sprint').addEventListener('touchstart', e => { e.preventDefault(); sprinting = true; document.getElementById('btn-sprint').classList.add('on'); }, { passive: false });
document.getElementById('btn-sprint').addEventListener('touchend', () => { sprinting = false; document.getElementById('btn-sprint').classList.remove('on'); });
document.getElementById('btn-bag').addEventListener('touchstart', e => { e.preventDefault(); openPanel('bag'); }, { passive: false });
// click fallbacks
document.getElementById('btn-attack').addEventListener('click', doAttack);
document.getElementById('btn-interact').addEventListener('click', tryInteract);
document.getElementById('btn-bag').addEventListener('click', () => openPanel('bag'));
document.getElementById('btn-block').addEventListener('mousedown', () => { blocking = true; doPrayOrBlock(); });
document.getElementById('btn-block').addEventListener('mouseup', () => { blocking = false; });
document.getElementById('btn-sprint').addEventListener('mousedown', () => { sprinting = true; });
document.getElementById('btn-sprint').addEventListener('mouseup', () => { sprinting = false; });

document.getElementById('panel-close').addEventListener('click', () => {
  document.getElementById('panel').classList.add('hidden');
});

// ——— Combat ———
function doAttack() {
  if (!state.playing || attackCd > 0) return;
  attackCd = 0.45;
  const range = 2.4;
  let hit = false;
  for (const e of enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.mesh.position.x - pilgrim.position.x, e.mesh.position.z - pilgrim.position.z);
    if (d < range) {
      if (e.holyOnly) {
        toast('Only prayer or holy water harms shadows');
        continue;
      }
      let dmg = getAtk();
      e.hp -= dmg;
      e.aggro = true;
      hit = true;
      flashEnemy(e);
      if (e.hp <= 0) killEnemy(e);
    }
  }
  // swing anim
  const st = pilgrim.userData.staff;
  st.rotation.z = -0.8;
  setTimeout(() => { st.rotation.z = 0; }, 200);
}

function doPrayOrBlock() {
  if (!state.playing) return;
  // If near demons and have faith, cast out
  const nearDemon = enemies.find(e => e.alive && e.holyOnly && Math.hypot(e.mesh.position.x - pilgrim.position.x, e.mesh.position.z - pilgrim.position.z) < 4);
  if (nearDemon && state.faith >= 15) {
    state.faith -= 15;
    let dmg = 25 + skillRank('exorcist') * 8 + getFaithBonus() + skillRank('st_michael') * 8;
    nearDemon.hp -= dmg;
    flashEnemy(nearDemon);
    toast('Prayer!');
    if (nearDemon.hp <= 0) killEnemy(nearDemon);
    // heal prayer
    state.hp = Math.min(state.maxHp, state.hp + 5 + skillRank('healing_prayer') * 8);
    updateHUD();
  }
}

function useHolyWater() {
  if (!invTake('holy_water')) { toast('No holy water'); return; }
  let any = false;
  for (const e of enemies) {
    if (!e.alive || !e.holyOnly) continue;
    const d = Math.hypot(e.mesh.position.x - pilgrim.position.x, e.mesh.position.z - pilgrim.position.z);
    if (d < 6) {
      e.hp -= 40 + skillRank('exorcist') * 10;
      flashEnemy(e);
      any = true;
      if (e.hp <= 0) killEnemy(e);
    }
  }
  toast(any ? 'Holy water!' : 'No shadows nearby');
}

function flashEnemy(e) {
  e.mesh.traverse(c => {
    if (c.material) {
      const o = c.material.color.getHex();
      c.material.color.setHex(0xffffff);
      setTimeout(() => c.material.color.setHex(o), 80);
    }
  });
}

function killEnemy(e) {
  e.alive = false;
  e.mesh.visible = false;
  addXp(e.xp);
  const coinBonus = 1 + skillRank('scallop_luck') * 0.08;
  state.coins += Math.floor(e.coin * coinBonus);
  state.killCounts[e.type] = (state.killCounts[e.type] || 0) + 1;
  const def = ENEMY_TYPES[e.type];
  if (def?.drop) {
    for (const [item, chance] of Object.entries(def.drop)) {
      if (item === 'bandit_token' || Math.random() < chance) {
        if (item === 'bandit_token') invAdd('bandit_token', 1);
        else if (ITEMS[item]) invAdd(item, 1);
      }
    }
  }
  toast(`${def.name} defeated`);
  progressQuests('kill', e.type);
  updateHUD();
  // respawn later
  setTimeout(() => {
    if (!e.mesh.parent) return;
    const ang = Math.random() * 6;
    e.x += Math.cos(ang) * 30;
    e.z += Math.sin(ang) * 30;
    e.hp = e.maxHp;
    e.alive = true;
    e.aggro = false;
    e.mesh.visible = true;
    placeOnTerrain(e.mesh, e.x, e.z);
  }, 45000 + Math.random() * 30000);
}

// ——— Interact / gather ———
function nearestInteractive(range = 3) {
  let best = null, bd = range;
  for (const it of world.interactives) {
    const d = Math.hypot(it.x - pilgrim.position.x, it.z - pilgrim.position.z);
    if (d < bd) { bd = d; best = it; }
  }
  return best;
}
function nearestNode(range = 2.5) {
  let best = null, bd = range;
  for (const n of world.nodes) {
    if (n.respawn > state.time) continue;
    if (!n.mesh.visible) continue;
    const d = Math.hypot(n.x - pilgrim.position.x, n.z - pilgrim.position.z);
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}

function tryInteract() {
  if (!state.playing) return;
  const n = nearestNode();
  if (n) { gatherNode(n); return; }
  const it = nearestInteractive();
  if (!it) { toast('Nothing here'); return; }
  if (it.type === 'shrine') useShrine(it);
  else if (it.type === 'bench') openPanel('craft', 'bench');
  else if (it.type === 'campfire') openPanel('craft', 'campfire');
  else if (it.type === 'forge') openPanel('craft', 'forge');
  else if (it.type === 'church') openPanel('craft', 'church');
  else if (it.type === 'shop') openPanel('shop', it.shop);
  else if (it.type === 'notice') openPanel('quests');
  else if (it.type === 'chest') openChest(it);
  else if (it.type === 'cathedral') visitCathedral(it);
  else if (it.type === 'npc') talkNpc(it);
  else if (it.type === 'sign') toast(it.text);
  else if (it.type === 'chapel') toast('Ruined chapel');
}

function gatherNode(n) {
  const yieldBonus = 1 + skillRank('forager') * 0.1;
  let id = n.type;
  let qty = Math.random() < yieldBonus - 1 ? 2 : 1;
  if (id === 'wood' && invCount('hatchet')) qty++;
  if (id === 'stone' && invCount('pickaxe')) qty++;
  if (id === 'iron_ore' && invCount('pickaxe')) qty++;
  if (id === 'fish' && !invCount('fishing_rod')) { toast('Need a fishing rod'); return; }
  if (id === 'herb' && invCount('sickle')) qty++;
  if (id === 'chapel_key') { invAdd('chapel_key', 1); n.mesh.visible = false; n.respawn = Infinity; toast('Chapel Key'); return; }
  if (!ITEMS[id]) return;
  if (!invAdd(id, qty)) return;
  n.mesh.visible = false;
  n.respawn = state.time + 25 + Math.random() * 20;
  state.gatherCounts[id] = (state.gatherCounts[id] || 0) + qty;
  toast(`+${qty} ${ITEMS[id].name}`);
  progressQuests('gather', id, qty);
  if (id === 'berry') {
    // can also eat raw - skip
  }
  addXp(3);
}

function useShrine(it) {
  state.shrine = { x: it.x, z: it.z };
  const heal = 40 + skillRank('shrine_keeper') * 15;
  const faith = 30 + skillRank('shrine_keeper') * 10;
  state.hp = Math.min(state.maxHp, state.hp + heal);
  state.faith = Math.min(state.maxFaith, state.faith + faith);
  state.stamina = state.maxStamina;
  state.hunger = Math.min(state.maxHunger, state.hunger + 15);
  toast('Rested at shrine');
  progressQuests('visit_shrine', it.key);
  saveGame();
  updateHUD();
}

function openChest(it) {
  if (state.openedChests[it.key]) { toast('Already empty'); return; }
  if (it.needsKey && !invCount(it.needsKey)) {
    toast(`Needs ${ITEMS[it.needsKey]?.name || 'key'}`);
    return;
  }
  if (it.needsKey) invTake(it.needsKey);
  state.openedChests[it.key] = true;
  const loot = it.loot || ['coin'];
  for (const L of loot) {
    if (L === 'coin') { state.coins += 15 + Math.floor(Math.random() * 30); toast('+coins'); }
    else if (ITEMS[L]) { invAdd(L, 1); toast(`Found ${ITEMS[L].name}`); }
  }
  if (it.key === 'chapel_chest') progressQuests('visit', 'chapel_chest');
  if (it.key === 'bandit_chest' && !invCount('bandit_token')) invAdd('bandit_token', 1);
  updateHUD();
}

function visitCathedral() {
  progressQuests('visit', 'cathedral');
  state.flags.cathedral = true;
  toast('Santiago Cathedral');
  if (state.mainQuest >= 10) {
    state.faith = Math.min(state.maxFaith, state.faith + 40);
    progressQuests('pray_cathedral');
    toast('You pray at the high altar');
  }
}

function talkNpc(it) {
  if (it.npc === 'priest') {
    toast('Priest: Peace be with you, pilgrim.');
    progressQuests('talk', 'priest');
    openPanel('shop', 'church');
  } else if (it.npc === 'poor_1') {
    if (invTake('bread')) {
      toast('Thank you, pilgrim.');
      addXp(20 + skillRank('almsgiver') * 5);
      progressQuests('deliver', 'poor_1');
      progressQuests('deliver_item', 'bread');
    } else toast('The beggar looks hungry. (Need bread)');
  } else if (it.npc === 'lost_pilgrim') {
    toast('Lost pilgrim: Please lead me toward town!');
    state.flags.escort = true;
    progressQuests('rescue');
  }
}

// ——— Quests ———
function currentMain() {
  return MAIN_QUEST[state.mainQuest] || null;
}

function progressQuests(kind, arg, qty = 1) {
  const mq = currentMain();
  if (mq) {
    let done = false;
    if (mq.obj === 'visit_shrine' && kind === 'visit_shrine' && arg === mq.target) done = true;
    if (mq.obj === 'have_item' && invCount(mq.item) > 0) done = true;
    if (mq.obj === 'deliver' && kind === 'deliver' && arg === mq.npc) done = true;
    if (mq.obj === 'visit' && kind === 'visit' && arg === mq.target) done = true;
    if (mq.obj === 'talk' && kind === 'talk' && arg === mq.npc) done = true;
    if (mq.obj === 'light_shrines' && kind === 'light') {
      state.flags.litCount = Object.keys(state.litShrines).length;
      if (state.flags.litCount >= (mq.count || 3)) done = true;
    }
    if (mq.obj === 'kill' && kind === 'kill' && arg === mq.enemy) {
      state.flags.mqKills = (state.flags.mqKills || 0) + 1;
      if (state.flags.mqKills >= (mq.count || 1)) done = true;
    }
    if (mq.obj === 'pray_cathedral' && kind === 'pray_cathedral') done = true;
    // also check have_item periodically
    if (mq.obj === 'have_item' && invCount(mq.item) > 0) done = true;
    if (done) completeMain();
  }
  // side quests
  for (const sq of state.sideQuests) {
    if (sq.done) continue;
    if (sq.obj === 'kill' && kind === 'kill' && arg === sq.enemy) {
      sq.progress = (sq.progress || 0) + 1;
      if (sq.progress >= sq.n) completeSide(sq);
    }
    if (sq.obj === 'gather' && kind === 'gather' && arg === sq.item) {
      sq.progress = (sq.progress || 0) + qty;
      if (sq.progress >= sq.n) completeSide(sq);
    }
    if (sq.obj === 'deliver' && kind === 'deliver_item' && arg === sq.item) completeSide(sq);
    if (sq.obj === 'light_one' && kind === 'light') completeSide(sq);
    if (sq.obj === 'rescue' && kind === 'rescue') completeSide(sq);
    if (sq.obj === 'escort' && kind === 'escort') completeSide(sq);
  }
  updateQuestPanel();
}

function completeMain() {
  const mq = currentMain();
  if (!mq) return;
  addXp(mq.xp);
  state.coins += mq.coin;
  toast(`Quest: ${mq.name} complete`);
  state.mainQuest++;
  state.flags.mqKills = 0;
  if (state.mainQuest >= MAIN_QUEST.length) toast('Main pilgrimage complete — free to roam');
  updateQuestPanel();
  saveGame();
}

function completeSide(sq) {
  sq.done = true;
  addXp(sq.xp);
  state.coins += sq.coin;
  toast(`Done: ${sq.name}`);
  updateHUD();
}

function generateBounties() {
  state.bounties = [];
  const pool = SIDE_TEMPLATES.filter(t => state.level >= t.minLvl);
  for (let i = 0; i < 4; i++) {
    const t = pool[Math.floor(Math.random() * pool.length)];
    if (!t) continue;
    const n = Array.isArray(t.n) ? t.n[0] + Math.floor(Math.random() * (t.n[1] - t.n[0] + 1)) : 1;
    state.bounties.push({
      id: t.id + '_' + Date.now() + i,
      name: t.name,
      desc: (t.desc || '').replace('{n}', n),
      obj: t.obj, enemy: t.enemy, item: t.item, n,
      xp: t.xp + state.level * 3, coin: t.coin + state.level * 2,
      minLvl: t.minLvl, progress: 0, done: false,
    });
  }
}

function acceptBounty(b) {
  if (state.level < b.minLvl) {
    toast(`Reach level ${b.minLvl} to take this quest`);
    return;
  }
  if (state.sideQuests.filter(q => !q.done).length >= 5) {
    toast('Too many active side quests');
    return;
  }
  state.sideQuests.push({ ...b, progress: 0, done: false });
  state.bounties = state.bounties.filter(x => x.id !== b.id);
  toast(`Accepted: ${b.name}`);
  updateQuestPanel();
}

// ——— UI ———
function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

function updateHUD() {
  recalcStats();
  document.getElementById('hp-fill').style.transform = `scaleX(${state.hp / state.maxHp})`;
  document.getElementById('st-fill').style.transform = `scaleX(${state.stamina / state.maxStamina})`;
  document.getElementById('fd-fill').style.transform = `scaleX(${state.hunger / state.maxHunger})`;
  document.getElementById('fa-fill').style.transform = `scaleX(${state.faith / state.maxFaith})`;
  document.getElementById('hp-txt').textContent = Math.ceil(state.hp);
  document.getElementById('coins').textContent = '◈ ' + state.coins;
  document.getElementById('lvl').textContent = 'Lv ' + state.level;
  applyGearVisuals(pilgrim, state.equip);
}

function updateQuestPanel() {
  const mq = currentMain();
  const activeSide = state.sideQuests.find(q => !q.done);
  let title = '', desc = '', target = null;
  if (mq) {
    title = mq.name;
    desc = mq.desc;
    if (mq.target) target = getLandmark(mq.target);
    if (mq.obj === 'have_item') desc += ` (${invCount(mq.item)}/1)`;
    if (mq.obj === 'kill') desc += ` (${state.flags.mqKills || 0}/${mq.count})`;
    if (mq.obj === 'light_shrines') desc += ` (${Object.keys(state.litShrines).length}/${mq.count})`;
  } else if (activeSide) {
    title = activeSide.name;
    desc = activeSide.desc + (activeSide.n ? ` (${activeSide.progress || 0}/${activeSide.n})` : '');
  } else {
    title = 'Free roam';
    desc = 'Check the notice board for bounties';
    target = getLandmark('notice');
  }
  document.getElementById('q-title').textContent = title;
  document.getElementById('q-desc').textContent = desc;
  // arrow
  if (target) {
    const dx = target.x - pilgrim.position.x;
    const dz = target.z - pilgrim.position.z;
    const ang = Math.atan2(dx, dz) - camYaw;
    document.getElementById('q-arrow').style.transform = `rotate(${ang}rad)`;
    document.getElementById('q-arrow').textContent = '↑';
  } else {
    document.getElementById('q-arrow').textContent = '·';
  }
}

let panelMode = 'bag', panelArg = null;
function openPanel(mode, arg) {
  panelMode = mode; panelArg = arg;
  const panel = document.getElementById('panel');
  panel.classList.remove('hidden');
  const tabs = document.getElementById('panel-tabs');
  const body = document.getElementById('panel-body');
  const title = document.getElementById('panel-title');
  tabs.innerHTML = '';
  if (mode === 'bag' || mode === 'skills' || mode === 'equip') {
    title.textContent = 'Pilgrim';
    [['bag', 'Bag'], ['equip', 'Gear'], ['skills', 'Skills'], ['craft', 'Craft']].forEach(([m, l]) => {
      const b = document.createElement('button');
      b.textContent = l; if (m === mode || (mode === 'equip' && m === 'equip')) b.className = 'on';
      if (mode === 'bag' && m === 'bag') b.className = 'on';
      b.onclick = () => openPanel(m === 'craft' ? 'craft' : m, m === 'craft' ? 'hand' : null);
      tabs.appendChild(b);
    });
    if (mode === 'skills') renderSkills(body);
    else if (mode === 'equip') renderEquip(body);
    else renderBag(body);
  } else if (mode === 'craft') {
    title.textContent = 'Crafting';
    renderCraft(body, arg || 'hand');
  } else if (mode === 'shop') {
    title.textContent = SHOPS[arg]?.name || 'Shop';
    renderShop(body, arg);
  } else if (mode === 'quests') {
    title.textContent = 'Notice Board';
    renderQuests(body);
  }
}

function rarClass(r) { return 'r-' + (r || 'common'); }

function renderBag(body) {
  body.innerHTML = '';
  const used = Object.values(state.inv).reduce((a, b) => a + b, 0);
  body.innerHTML = `<p style="font-size:.75rem;opacity:.7;margin-bottom:6px">Slots ${used}/${state.bagSlots} · Tap to use/equip</p>`;
  const entries = Object.entries(state.inv);
  if (!entries.length) { body.innerHTML += '<p style="opacity:.6">Empty</p>'; return; }
  for (const [id, n] of entries) {
    const it = ITEMS[id]; if (!it) continue;
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `<div class="item-ico">${it.ico}</div><div class="item-meta"><div class="n ${rarClass(it.r)}">${it.name} ×${n}</div><div class="d">${it.desc}</div></div>`;
    row.onclick = () => useItem(id);
    body.appendChild(row);
  }
}

function renderEquip(body) {
  body.innerHTML = '';
  const slots = ['weapon', 'hat', 'cloak', 'body', 'boots', 'trinket'];
  for (const slot of slots) {
    const eq = state.equip[slot];
    const it = eq ? ITEMS[eq] : null;
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `<div class="item-ico">${it ? it.ico : '·'}</div><div class="item-meta"><div class="n">${slot}: ${it ? it.name : '(empty)'}</div><div class="d">${it ? it.desc : 'Tap bag item to equip'}</div></div>`;
    if (eq) row.onclick = () => { invAdd(eq, 1); state.equip[slot] = null; updateHUD(); openPanel('equip'); };
    body.appendChild(row);
  }
  body.innerHTML += `<p style="margin-top:8px;font-size:.75rem">ATK ${getAtk()} · DEF ${getDef()} · SPD ${getSpeed().toFixed(2)}</p>`;
}

function renderSkills(body) {
  body.innerHTML = `<p style="font-size:.75rem;margin-bottom:6px">Skill points: ${state.skillPts}</p>`;
  for (const sk of SKILLS) {
    const r = skillRank(sk.id);
    const row = document.createElement('div');
    row.className = 'skill-row';
    row.innerHTML = `<div class="n">${sk.name} (${r}/${sk.max})</div><div class="d">${sk.desc}</div>`;
    const btn = document.createElement('button');
    btn.textContent = `Unlock ${sk.cost}pt`;
    btn.disabled = r >= sk.max || state.skillPts < sk.cost;
    btn.onclick = () => {
      if (state.skillPts < sk.cost || r >= sk.max) return;
      state.skillPts -= sk.cost;
      state.skills[sk.id] = r + 1;
      recalcStats();
      toast(`${sk.name} → ${r + 1}`);
      openPanel('skills');
      updateHUD();
    };
    row.appendChild(btn);
    body.appendChild(row);
  }
}

function renderCraft(body, at) {
  body.innerHTML = `<p style="font-size:.75rem;margin-bottom:6px">Station: ${at}</p>`;
  const list = RECIPES.filter(r => r.at.includes(at) || (at === 'hand' && r.at.includes('hand')));
  for (const r of list) {
    const out = ITEMS[r.out];
    if (!out) continue;
    const needStr = Object.entries(r.need).map(([id, n]) => `${ITEMS[id]?.name || id} ${invCount(id)}/${n}`).join(', ');
    const can = Object.entries(r.need).every(([id, n]) => invCount(id) >= n);
    const div = document.createElement('div');
    div.className = 'recipe';
    div.innerHTML = `<div class="${rarClass(out.r)}">${out.ico} ${out.name} ×${r.n}</div><div style="opacity:.7;font-size:.68rem">${needStr}</div>`;
    const btn = document.createElement('button');
    btn.textContent = 'Craft';
    btn.disabled = !can;
    btn.onclick = () => {
      for (const [id, n] of Object.entries(r.need)) if (!invTake(id, n)) return;
      invAdd(r.out, r.n);
      toast(`Crafted ${out.name}`);
      addXp(8);
      progressQuests('have_item');
      openPanel('craft', at);
      updateHUD();
    };
    div.appendChild(btn);
    body.appendChild(div);
  }
}

function renderShop(body, shopId) {
  const shop = SHOPS[shopId];
  if (!shop) return;
  const hag = 1 - skillRank('haggler') * 0.05;
  body.innerHTML = `<p style="font-size:.75rem;margin-bottom:6px">Your coins: ${state.coins}</p>`;
  for (const s of shop.stock) {
    const it = ITEMS[s.id]; if (!it) continue;
    const price = Math.max(1, Math.floor(s.price * hag));
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `<div class="item-ico">${it.ico}</div><div class="item-meta"><div class="n ${rarClass(it.r)}">${it.name}</div><div class="d">${it.desc}</div></div><span style="color:#ffd98a">${price}◈</span>`;
    row.onclick = () => {
      if (state.coins < price) { toast('Not enough coins'); return; }
      if (!invAdd(s.id, 1)) return;
      state.coins -= price;
      toast(`Bought ${it.name}`);
      updateHUD();
      openPanel('shop', shopId);
    };
    body.appendChild(row);
  }
}

function renderQuests(body) {
  body.innerHTML = '<p style="font-size:.8rem;color:#ffd98a;margin-bottom:4px">Main</p>';
  const mq = currentMain();
  if (mq) {
    const d = document.createElement('div');
    d.className = 'quest-row';
    d.innerHTML = `<div class="n">${mq.name}</div><div>${mq.desc}</div>`;
    body.appendChild(d);
  } else body.innerHTML += '<p style="font-size:.75rem;opacity:.7">Pilgrimage complete — free play</p>';

  body.innerHTML += '<p style="font-size:.8rem;color:#ffd98a;margin:10px 0 4px">Active side</p>';
  const active = state.sideQuests.filter(q => !q.done);
  if (!active.length) body.innerHTML += '<p style="font-size:.72rem;opacity:.6">None</p>';
  active.forEach(q => {
    const d = document.createElement('div');
    d.className = 'quest-row';
    d.innerHTML = `<div class="n">${q.name}</div><div>${q.desc} (${q.progress || 0}/${q.n || 1})</div>`;
    body.appendChild(d);
  });

  body.innerHTML += '<p style="font-size:.8rem;color:#ffd98a;margin:10px 0 4px">Bounties</p>';
  if (!state.bounties.length) generateBounties();
  state.bounties.forEach(b => {
    const d = document.createElement('div');
    d.className = 'quest-row' + (state.level < b.minLvl ? ' locked' : '');
    if (state.level < b.minLvl) d.dataset.lock = `Reach level ${b.minLvl} to take this quest`;
    d.innerHTML = `<div class="n">${b.name}</div><div>${b.desc} · ${b.xp}XP · ${b.coin}◈</div>`;
    d.onclick = () => { acceptBounty(b); openPanel('quests'); };
    body.appendChild(d);
  });
  const ref = document.createElement('button');
  ref.className = 'btn sm';
  ref.style.marginTop = '8px';
  ref.textContent = 'Refresh bounties';
  ref.onclick = () => { generateBounties(); openPanel('quests'); };
  body.appendChild(ref);
}

function useItem(id) {
  const it = ITEMS[id];
  if (!it) return;
  if (it.slot) {
    const prev = state.equip[it.slot];
    if (prev) invAdd(prev, 1);
    state.equip[it.slot] = id;
    invTake(id, 1);
    toast(`Equipped ${it.name}`);
    updateHUD();
    openPanel('bag');
    return;
  }
  if (it.cat === 'bag') {
    toast('Bag upgrade in inventory grants slots');
    return;
  }
  if (it.use === 'food') {
    invTake(id);
    let h = it.hunger || 0;
    if (skillRank('cook')) h = Math.floor(h * (1 + skillRank('cook') * 0.1));
    state.hunger = Math.min(state.maxHunger, state.hunger + h);
    if (it.hp) state.hp = Math.min(state.maxHp, state.hp + it.hp);
    if (it.faith) state.faith = Math.min(state.maxFaith, state.faith + it.faith);
    toast(`Ate ${it.name}`);
    updateHUD(); openPanel('bag');
  } else if (it.use === 'heal') {
    invTake(id);
    let h = it.hp || 0;
    h = Math.floor(h * (1 + skillRank('herbalist') * 0.15));
    state.hp = Math.min(state.maxHp, state.hp + h);
    toast(`Used ${it.name}`);
    updateHUD(); openPanel('bag');
  } else if (it.use === 'holy') {
    useHolyWater();
    openPanel('bag');
  } else if (it.use === 'faith') {
    invTake(id);
    state.faith = Math.min(state.maxFaith, state.faith + (it.faith || 0));
    toast(it.name); updateHUD(); openPanel('bag');
  } else if (it.use === 'candle' || it.use === 'oil') {
    const sh = nearestInteractive(4);
    if (sh && sh.type === 'shrine') {
      invTake(id);
      sh.lit = true;
      if (sh.flame) sh.flame.visible = true;
      state.litShrines[sh.key] = true;
      progressQuests('light', sh.key);
      toast('Shrine candle lit');
      openPanel('bag');
    } else toast('Use at a shrine');
  } else if (it.use === 'bell') {
    invTake(id);
    enemies.filter(e => e.alive && e.holyOnly).forEach(e => {
      if (Math.hypot(e.mesh.position.x - pilgrim.position.x, e.mesh.position.z - pilgrim.position.z) < 12) {
        e.hp -= 50; flashEnemy(e); if (e.hp <= 0) killEnemy(e);
      }
    });
    toast('Angelus rings');
    openPanel('bag');
  }
}

// ——— Save ———
function saveGame() {
  const data = {
    v: VERSION, ...state,
    px: pilgrim.position.x, pz: pilgrim.position.z, camYaw,
  };
  // don't save playing
  const { playing, ...rest } = data;
  localStorage.setItem(SAVE_KEY, JSON.stringify({ ...rest, inv: state.inv, equip: state.equip, skills: state.skills, sideQuests: state.sideQuests, bounties: state.bounties, flags: state.flags, litShrines: state.litShrines, openedChests: state.openedChests, killCounts: state.killCounts, gatherCounts: state.gatherCounts, shrine: state.shrine }));
  localStorage.setItem(LVL_KEY, String(state.level));
  const best = Math.max(+localStorage.getItem(BEST_KEY) || 0, state.level);
  localStorage.setItem(BEST_KEY, String(best));
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    Object.assign(state, {
      hp: d.hp, maxHp: d.maxHp, stamina: d.stamina, maxStamina: d.maxStamina,
      hunger: d.hunger, faith: d.faith, maxFaith: d.maxFaith,
      coins: d.coins, xp: d.xp, level: d.level, skillPts: d.skillPts,
      inv: d.inv || {}, equip: d.equip || state.equip, skills: d.skills || {},
      bagSlots: d.bagSlots || 24, mainQuest: d.mainQuest || 0,
      sideQuests: d.sideQuests || [], bounties: d.bounties || [],
      flags: d.flags || {}, shrine: d.shrine || state.shrine,
      killCounts: d.killCounts || {}, gatherCounts: d.gatherCounts || {},
      litShrines: d.litShrines || {}, openedChests: d.openedChests || {},
      dayT: d.dayT || 0.3,
    });
    placeOnTerrain(pilgrim, d.px || 0, d.pz || 40);
    camYaw = d.camYaw || 0;
    // restore lit flames
    for (const it of world.interactives) {
      if (it.type === 'shrine' && state.litShrines[it.key] && it.flame) {
        it.flame.visible = true; it.lit = true;
      }
    }
    return true;
  } catch (e) { return false; }
}

function newGame() {
  Object.assign(state, {
    hp: 100, maxHp: 100, stamina: 100, maxStamina: 100,
    hunger: 100, faith: 50, maxFaith: 100,
    coins: 25, xp: 0, level: 1, skillPts: 0,
    inv: { wood: 5, cloth: 3, herb: 2, berry: 4, stick: 1, bread: 2, candle: 2 },
    equip: { weapon: 'stick', hat: null, cloak: 'rag_cloak', body: 'tunic', boots: 'sandals', trinket: 'scallop_shell' },
    skills: {}, bagSlots: 24, mainQuest: 0, sideQuests: [], bounties: [],
    flags: {}, shrine: { x: 8, z: 28 }, killCounts: {}, gatherCounts: {},
    litShrines: {}, openedChests: {}, dayT: 0.3,
  });
  // remove equipped from needing inv
  placeOnTerrain(pilgrim, 0, 40);
  camYaw = 0;
  generateBounties();
  saveGame();
}

function die() {
  toast('You collapse… waking at the last shrine');
  state.coins = Math.max(0, state.coins - Math.floor(state.coins * 0.15));
  state.hp = state.maxHp * 0.6;
  state.stamina = state.maxStamina;
  state.hunger = Math.max(30, state.hunger);
  placeOnTerrain(pilgrim, state.shrine.x, state.shrine.z);
  saveGame();
  updateHUD();
}

// ——— Day / night ———
function updateSky() {
  const t = state.dayT;
  const isNight = t < 0.22 || t > 0.78;
  if (isNight) {
    scene.background.setHex(0x0a1020);
    scene.fog.color.setHex(0x0a1020);
    scene.fog.density = 0.014;
    sun.intensity = 0.15;
    hemi.intensity = 0.15;
  } else {
    const dayAmt = 1 - Math.abs(t - 0.5) * 2;
    scene.background.setRGB(0.45 + dayAmt * 0.2, 0.55 + dayAmt * 0.25, 0.7 + dayAmt * 0.15);
    scene.fog.color.copy(scene.background);
    scene.fog.density = 0.008;
    sun.intensity = 0.5 + dayAmt * 0.7;
    hemi.intensity = 0.25 + dayAmt * 0.2;
  }
  const ang = t * Math.PI * 2;
  sun.position.set(Math.cos(ang) * 50, Math.sin(ang) * 60, 20);
  return isNight;
}

// ——— Minimap ———
const mm = document.getElementById('minimap');
const mmCtx = mm.getContext('2d');
function drawMinimap() {
  const ctx = mmCtx;
  ctx.fillStyle = '#1a3018';
  ctx.fillRect(0, 0, 96, 96);
  const scale = 96 / WORLD_SIZE;
  const px = pilgrim.position.x * scale + 48;
  const pz = pilgrim.position.z * scale + 48;
  // landmarks
  ctx.fillStyle = '#c9a86c';
  for (const k of Object.keys(LANDMARKS)) {
    const L = LANDMARKS[k];
    ctx.fillRect(L.x * scale + 48 - 1, L.z * scale + 48 - 1, 2, 2);
  }
  ctx.fillStyle = '#8cf';
  ctx.beginPath();
  ctx.arc(px, pz, 3, 0, 6.28);
  ctx.fill();
}

// ——— Loop ———
let last = performance.now();
let fpsA = 60, saveAcc = 0, hintAcc = 0;
const vel = new THREE.Vector2();

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  fpsA = fpsA * 0.95 + (1 / dt) * 0.05;
  document.getElementById('fps').textContent = Math.round(fpsA) + ' fps';

  if (!state.playing) {
    renderer.render(scene, camera);
    return;
  }

  state.time += dt;
  state.dayT = (state.dayT + dt / 480) % 1; // ~8 min full day
  const isNight = updateSky();
  if (isNight && Math.random() < dt * 0.15) spawnNightDemons();

  // movement
  let ix = joy.dx;
  let iy = -joy.dy;
  if (keys['KeyW'] || keys['ArrowUp']) iy += 1;
  if (keys['KeyS'] || keys['ArrowDown']) iy -= 1;
  if (keys['KeyA'] || keys['ArrowLeft']) ix -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) ix += 1;
  const il = Math.hypot(ix, iy);
  if (il > 1) { ix /= il; iy /= il; }

  let spd = getSpeed();
  if (sprinting && state.stamina > 0 && il > 0.1) {
    spd *= 1.55;
    state.stamina = Math.max(0, state.stamina - 22 * dt);
  } else {
    state.stamina = Math.min(state.maxStamina, state.stamina + 12 * dt);
  }
  // smoothing
  const targetVx = ix * spd;
  const targetVz = iy * spd;
  // camera-relative
  const cos = Math.cos(camYaw), sin = Math.sin(camYaw);
  const wx = targetVx * cos + targetVz * sin;
  const wz = -targetVx * sin + targetVz * cos;
  vel.x += (wx - vel.x) * Math.min(1, 8 * dt);
  vel.y += (wz - vel.y) * Math.min(1, 8 * dt);

  let nx = pilgrim.position.x + vel.x * dt;
  let nz = pilgrim.position.z + vel.y * dt;
  nx = Math.max(-WORLD_SIZE / 2 + 5, Math.min(WORLD_SIZE / 2 - 5, nx));
  nz = Math.max(-WORLD_SIZE / 2 + 5, Math.min(WORLD_SIZE / 2 - 5, nz));
  placeOnTerrain(pilgrim, nx, nz);
  if (il > 0.1) pilgrim.rotation.y = Math.atan2(vel.x, vel.y);

  // hunger / faith regen
  const hungerRate = (isNight && skillRank('night_watch') ? 0.4 : 0.7) * (1 - skillRank('night_watch') * 0.15);
  state.hunger = Math.max(0, state.hunger - hungerRate * dt);
  if (state.hunger <= 0) state.hp -= 2 * dt;
  if (skillRank('pilgrim_song') && il > 0.1) state.faith = Math.min(state.maxFaith, state.faith + skillRank('pilgrim_song') * 0.8 * dt);
  if (blocking) state.stamina = Math.max(0, state.stamina - 8 * dt);

  if (attackCd > 0) attackCd -= dt;
  if (state.hp <= 0) die();

  // enemies AI — limit active
  let active = 0;
  const px = pilgrim.position.x, pz = pilgrim.position.z;
  for (const e of enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.mesh.position.x - px, e.mesh.position.z - pz);
    if (d > 70) { e.mesh.visible = false; continue; }
    e.mesh.visible = true;
    if (++active > 18 && d > 25) continue;
    const notice = 12 - skillRank('quiet_step') * 2;
    if (d < notice) e.aggro = true;
    if (e.aggro && d > 0.5) {
      const dx = (px - e.mesh.position.x) / d;
      const dz = (pz - e.mesh.position.z) / d;
      const ex = e.mesh.position.x + dx * e.speed * dt;
      const ez = e.mesh.position.z + dz * e.speed * dt;
      placeOnTerrain(e.mesh, ex, ez);
      e.mesh.rotation.y = Math.atan2(dx, dz);
      if (d < 1.6) {
        e.cd -= dt;
        if (e.cd <= 0) {
          e.cd = 1.1;
          let dmg = e.atk - getDef() * 0.4;
          if (blocking && state.stamina > 5) {
            dmg *= 0.35 - skillRank('swordless') * 0.06;
            state.stamina -= 8;
          }
          state.hp -= Math.max(1, dmg);
          updateHUD();
        }
      }
    }
  }

  // escort check
  if (state.flags.escort) {
    if (Math.hypot(px - 200, pz - 200) < 30) {
      state.flags.escort = false;
      progressQuests('escort');
      toast('Escort arrived at town');
    }
  }

  // camera
  const camDist = 7;
  const ideal = new THREE.Vector3(
    px - Math.sin(camYaw) * camDist * Math.cos(camPitch),
    pilgrim.position.y + 3 + Math.sin(camPitch) * 6,
    pz - Math.cos(camYaw) * camDist * Math.cos(camPitch)
  );
  camPos.lerp(ideal, 1 - Math.pow(0.001, dt));
  camera.position.copy(camPos);
  camTarget.set(px, pilgrim.position.y + 1.4, pz);
  camera.lookAt(camTarget);
  sun.position.x = px + 30;
  sun.position.z = pz + 20;
  sun.target.position.set(px, 0, pz);
  sun.target.updateMatrixWorld();

  // nodes respawn
  for (const n of world.nodes) {
    if (!n.mesh.visible && n.respawn > 0 && state.time >= n.respawn) n.mesh.visible = true;
  }

  // interact hint
  hintAcc += dt;
  if (hintAcc > 0.25) {
    hintAcc = 0;
    const n = nearestNode(2.5) || nearestInteractive(3);
    const hint = document.getElementById('interact-hint');
    if (n) {
      hint.classList.remove('hidden');
      hint.textContent = n.type === 'shop' ? n.label : n.type === 'npc' ? n.label : n.type === 'shrine' ? 'Shrine' : n.label || n.type || n.key || 'Interact';
    } else hint.classList.add('hidden');
    updateQuestPanel();
    drawMinimap();
  }

  saveAcc += dt;
  if (saveAcc > 30) { saveAcc = 0; saveGame(); }

  // have_item check for main quest
  const mq = currentMain();
  if (mq?.obj === 'have_item' && invCount(mq.item) > 0) progressQuests('have_item');

  if (Math.floor(now / 500) !== Math.floor((now - dt * 1000) / 500)) updateHUD();

  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Title
const btnCont = document.getElementById('btn-continue');
const btnNew = document.getElementById('btn-new');
if (localStorage.getItem(SAVE_KEY)) btnCont.disabled = false;

function startPlay() {
  document.getElementById('title').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('btn-zone').classList.remove('hidden');
  document.getElementById('fps').classList.remove('hidden');
  state.playing = true;
  populateEnemies();
  updateHUD();
  updateQuestPanel();
  // light some world
  updateSky();
}

btnCont.addEventListener('click', () => {
  if (!loadGame()) newGame();
  startPlay();
});
btnNew.addEventListener('click', () => {
  newGame();
  startPlay();
});

// Export counts for debugging
console.info(`[Pilgrim] items=${itemCount()} skills=${skillCount()} mainQuests=${MAIN_QUEST.length} enemies=${Object.keys(ENEMY_TYPES).length}`);
