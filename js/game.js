import * as THREE from 'three';
import './post.js?v=8';
import { makeComposer } from './post.js?v=8';
import { Sky } from '../vendor/addons/objects/Sky.js?v=8';
import { loadAll } from './assets.js?v=8';
import { PRAYERS, MYSTERIES, MYSTERY_DAY } from './prayers.js?v=8';
import { buildWorld, PLACES, heightAt, splatAt, WATER, PATH, RIVER } from './world.js?v=8';
import { Colliders } from './physics.js?v=8';
import { Player, Enemy, NPC, Critter, groundY } from './actors.js?v=8';
import { Interiors, IX } from './interiors.js?v=8';
import { chimneySmoke, Birds, tickFx } from './fx.js?v=8';
import { makeHat, makeWeapon, attachWeapon } from './gear.js?v=8';
import { NPC_DEFS } from './npcs.js?v=8';
import { Missions, MISSION_NPCS } from './missions.js?v=8';
import { UI } from './ui.js?v=8';
import { Audio } from './audio.js?v=8';
import { isOwner, ownerToast, applyOwner, ownerTick, OWNER_SAVE } from './owner.js?v=8';
import { ITEMS, SKILLS, RECIPES, MAIN_QUEST, SIDE_TEMPLATES, ENEMY_TYPES } from './data.js?v=8';
import { distToPolyline, clamp, angDiff, mulberry, hash2, sstep, lerp } from './util.js?v=8';

const OWNER = isOwner(); const SAVE = OWNER ? OWNER_SAVE : 'pr_save_v3'; // owner mode keeps its own save slot
const QUAL = [
  { level: 0, pr: 1.0, shadow: 1024, shadowR: 22, terrainSeg: 120, trees: 650, treeNear: 34, viewDist: 120, rocks: 160, grass: 400, grassDist: 18, lights: 2, aa: false, plaza: 6, birds: 10, smoke: 6, bloom: false },
  { level: 1, pr: 1.25, shadow: 1024, shadowR: 30, terrainSeg: 160, trees: 900, treeNear: 48, viewDist: 160, rocks: 260, grass: 900, grassDist: 26, lights: 3, aa: true, plaza: 9, birds: 18, smoke: 8, bloom: false },
  { level: 2, pr: 1.5, shadow: 2048, shadowR: 40, terrainSeg: 200, trees: 1100, treeNear: 62, viewDist: 220, rocks: 360, grass: 1600, grassDist: 34, lights: 5, aa: true, plaza: 12, birds: 27, smoke: 10, bloom: true },
];
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
function autoQ() { const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4; if (isTouch) return (mem <= 3 || cores <= 4) ? 0 : 1; return 2; }
const RCOL = { common: 0xd0d0d0, uncommon: 0x5cd85c, rare: 0x4a8ae8, epic: 0xa66ae8, legendary: 0xf0902a, blessed: 0xf5d76a };
const RW = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'blessed'];
const SPAWNS = [
  { type: 'boar', x: -150, z: 150, r: 30, n: 3, lvl: 1 }, { type: 'boar', x: 10, z: 50, r: 30, n: 3, lvl: 2 },
  { type: 'wolf', x: -60, z: -110, r: 45, n: 5, lvl: 2 }, { type: 'wolf', x: -10, z: -150, r: 30, n: 3, lvl: 3 }, { type: 'wolf', x: 120, z: -40, r: 30, n: 3, lvl: 4, night: true },
  { type: 'bandit', x: -211, z: -91, r: 14, n: 4, lvl: 4 }, { type: 'bandit_chief', x: -210, z: -95, r: 6, n: 1, lvl: 5, respawn: 600 }, { type: 'bandit', x: -160, z: -60, r: 22, n: 2, lvl: 3 },
  { type: 'demon', x: -40, z: -172, r: 18, n: 3, lvl: 3, night: true }, { type: 'demon', x: -100, z: -10, r: 25, n: 2, lvl: 4, night: true }, { type: 'demon', x: 140, z: -100, r: 25, n: 2, lvl: 6, night: true },
];
const USE_ICONS = {
  use: '<svg viewBox="0 0 24 24"><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-1V4.5a1.5 1.5 0 0 1 3 0V11m0-.5V6a1.5 1.5 0 0 1 3 0v8c0 4-2.5 7-6.5 7-3 0-4.3-1.5-6-4.5L3 13.5a1.5 1.5 0 0 1 2.5-1.6L8 15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pick: '<svg viewBox="0 0 24 24"><path d="M5 10h14l-1.5 10h-11Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 10V7a3 3 0 0 1 6 0v3" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
  talk: '<svg viewBox="0 0 24 24"><path d="M4 5h16v10H10l-4 4v-4H4Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="8.5" cy="10" r="1.1" fill="currentColor"/><circle cx="12" cy="10" r="1.1" fill="currentColor"/><circle cx="15.5" cy="10" r="1.1" fill="currentColor"/></svg>',
  door: '<svg viewBox="0 0 24 24"><path d="M6 21V8a6 6 0 0 1 12 0v13Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="14.5" cy="14" r="1.1" fill="currentColor"/><path d="M3 21h18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  pray: '<svg viewBox="0 0 24 24"><path d="M12 2.5v19M6.5 8h11" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
};
const KILL_ZONE = { wolf: 'forest', boar: null, bandit: 'bandit_camp', bandit_chief: 'bandit_camp', demon: 'chapel' };

class Game {
  constructor() {
    this.isTouch = isTouch; document.body.classList.toggle('desktop', !isTouch);
    const stored = localStorage.getItem('pr_quality'); this.qLevel = stored != null ? +stored : autoQ(); this.Q = QUAL[this.qLevel];
    this.sens = +(localStorage.getItem('pr_sens') || 1); this.invY = localStorage.getItem('pr_invy') === '1'; this.showFps = false;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: this.Q.aa, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio, this.Q.pr)); r.setSize(innerWidth, innerHeight); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.85;
    r.shadowMap.enabled = true; r.shadowMap.type = this.Q.level === 2 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 900);
    this.audio = new Audio(); this.ui = new UI(this); this.state = 'loading';
    this.enemies = []; this.npcs = []; this.loot = []; this.tokens = new Set(); this.spawnState = SPAWNS.map(() => ({ alive: [], timer: 0 }));
    this.inp = { mx: 0, my: 0, sprint: false, block: false }; this.keys = {};
    this.cam = { yaw: 0, pitch: 0.28, dist: 4.2, shakeT: 0, shake(a) { this.shakeT = Math.max(this.shakeT, a); }, lastInput: 0 };
    const fit = () => { r.setSize(innerWidth, innerHeight); this.composer?.setSize(innerWidth, innerHeight); this.camera.aspect = innerWidth / innerHeight; this.baseFov = this.camera.aspect < 1 ? 72 : 58; this.camera.fov = this.baseFov + (this._fovK || 0); this.camera.updateProjectionMatrix(); }; addEventListener('resize', fit); fit();
    window.G = this; window.THREE = THREE;
  }
  async boot() {
    const A = this.A = await loadAll(p => this.ui.loading(p * 0.92));
    document.getElementById('lnote').textContent = 'Building the world…'; await new Promise(r => setTimeout(r, 30));
    this.col = new Colliders(); this.world = buildWorld(this.scene, A, this.Q, this.col, this.renderer); this.scene.add(this.world.group);
    this.setupLighting(); this.fx = new FX(this.scene); this.interiors = new Interiors(this);
    this.smoke = chimneySmoke(this.world.chimneys, this.Q.smoke); this.scene.add(this.smoke); this.birds = new Birds(this.scene, this.Q.birds);
    if (this.Q.bloom) { try { this.composer = await makeComposer(this.renderer, this.scene, this.camera); } catch (e) { console.warn('bloom off', e); } }
    this.load(); this.player = new Player(this); this.player.dress(this.S.equip);
    this.extraNodes(); this.spawnNPCs(); this.spawnPlaza(); this.ui.buildMapTex(); this.bindInput();
    const sp = this.S.pos; this.player.pos.set(sp.x, groundY(this, sp.x, sp.z), sp.z); this.player.yaw = this.S.yaw || 0; this.cam.yaw = this.player.yaw + Math.PI;
    this.ui.loading(1);
    // compile shaders before showing title
    this.updateSun(0); this.renderer.compile(this.scene, this.camera);
    this.state = 'title'; this.ui.showTitle(!!localStorage.getItem(SAVE), this.qLevel, { quality: v => this.setQuality(v), start: fresh => this.start(fresh) });
    this.clock = new THREE.Clock(); this.fpsAcc = [0, 0]; this.renderer.setAnimationLoop(() => this.frame());
    window.ready = true; if (ownerToast()) setTimeout(() => this.ui.toast(ownerToast(), 'gold'), 300);
  }
  setQuality(v) { localStorage.setItem('pr_quality', v); if (this.state === 'play') this.save(); location.reload(); }
  // ---------------- state ----------------
  fresh() { return { v: 4, lvl: 1, xp: 0, totalXp: 0, sp: 0, skills: {}, hp: 100, stamina: 200, faith: 40, coin: 25, inv: { bread: 2, bandage: 2 }, quick: ['bandage', 'bread'], equip: { weapon: 'stick', hat: null, cloak: null, body: 'tunic', boots: 'sandals', trinket: null }, mq: 0, mqProg: 0, side: [], board: [], boardDay: 0, flags: {}, opened: {}, pos: { x: -196, z: 192 }, yaw: 2.4, respawn: 'shrine_start', time: 0.33, day: 1, track: 'main', uid: 1 }; }
  load() {
    let S = null; try { S = JSON.parse(localStorage.getItem(SAVE)); } catch (e) { }
    if (!S) { try { const o = JSON.parse(localStorage.getItem('pr_save_v1')); if (o) { S = this.fresh(); S.lvl = o.level || 1; S.coin = o.coins || 25; S.sp = o.skillPts || 0; S.skills = o.skills || {}; for (const [k, n] of Object.entries(o.inv || {})) if (ITEMS[k]) S.inv[k] = n; for (const [k, v] of Object.entries(o.equip || {})) if (v && ITEMS[v]) S.equip[k] = v; } } catch (e) { } }
    this.S = Object.assign(this.fresh(), S || {}); this.hadSave = !!S;
    this.owner = OWNER; if (OWNER) applyOwner(this);
  }
  save() { const S = this.S; const w = this.wpos; S.pos = { x: w.x, z: w.z }; S.yaw = this.inside ? this.inside.door.rot : this.player.yaw; localStorage.setItem(SAVE, JSON.stringify(S)); if (this.owner || S.owner) return; /* owner scores never reach best/leaderboard */ localStorage.setItem('pr_lvl', String(S.lvl)); localStorage.setItem('pr_best', String(Math.max(+localStorage.getItem('pr_best') || 0, S.lvl))); }
  start(fresh) {
    this.audio.init(); if (fresh) { this.S = this.fresh(); if (this.owner) applyOwner(this); localStorage.removeItem(SAVE); this.player.dress(this.S.equip); this.player.pos.set(this.S.pos.x, groundY(this, this.S.pos.x, this.S.pos.z), this.S.pos.z); this.player.yaw = this.S.yaw; this.cam.yaw = this.S.yaw + Math.PI; for (const e of this.enemies) e.dispose(); this.enemies = []; this.spawnState = SPAWNS.map(() => ({ alive: [], timer: 0 })); }
    this.ui.hideTitle(); this.state = 'play'; this.cam.pitch = 0.26; this.cam.dist = 4.2;
    if (!isTouch) document.getElementById('keys').classList.remove('hidden');
    setTimeout(() => document.getElementById('keys').classList.add('hidden'), 12000);
    const mq = this.mq(); if (mq) setTimeout(() => this.ui.toast(mq.name + ': ' + mq.desc, 'gold'), 600);
    if (!this.S.flags.hintMove) { this.S.flags.hintMove = 1; setTimeout(() => this.ui.toast(isTouch ? 'Jogging by default · tap Walk to stroll, tap Sprint to run (tap again to stop)' : 'Jogging by default · hold Shift to sprint, Z toggles walking', '', 4200), 3600); }
    setTimeout(() => this.interiors.prefetch().catch(() => { }), 6000);
    if (this.missions) { if (fresh) for (const id of Object.keys(this.missions.spawned).concat(Object.keys(this.missions.pickups), Object.keys(this.missions.followers))) this.missions.cleanup(id); this.missions.restore(); }
    if (this.owner) document.getElementById('ownerBadge')?.classList.remove('hidden');
    this.checkHave(); this.save();
  }
  // ---------------- derived stats ----------------
  skill(id) { return this.S.skills[id] || 0; }
  eqSum(k) { let s = 0; for (const id of Object.values(this.S.equip)) if (id && ITEMS[id][k]) s += ITEMS[id][k]; return s; }
  maxHp() { return 90 + this.S.lvl * 10 + this.skill('iron_will') * 10 + this.eqSum('hpBonus'); }
  maxSt() { return 200 + this.skill('endurance') * 16; } // doubled pool (v4)
  maxFaith() { return 50 + this.skill('deep_faith') * 8 + this.eqSum('faithBonus'); }
  atk() { return (4 + (ITEMS[this.S.equip.weapon]?.atk || 2) + this.S.lvl * 1.2) * (1 + this.skill('steady_hand') * 0.05); }
  def() { return this.eqSum('def'); }
  speedMul() { return 1 + this.skill('walker') * 0.04 + this.eqSum('speed'); }
  xpNeed() { return 60 + this.S.lvl * 45; }
  slotsMax() { if (this.owner) return 999; return 20 + this.skill('pack_mule') * 4 + Math.max(0, ...Object.keys(this.S.inv).filter(k => this.S.inv[k] && ITEMS[k].slots).map(k => ITEMS[k].slots)); }
  slotsUsed() { return Object.values(this.S.inv).filter(n => n > 0).length; }
  coinStr() { return this.owner ? '∞' : String(this.S.coin); }
  price(p) { return Math.max(1, Math.round(p * (1 - this.skill('haggler') * 0.05))); }
  sellPrice(id) { const base = { common: 2, uncommon: 6, rare: 18, epic: 40, legendary: 80, blessed: 60 }[ITEMS[id].r] || 2; return base; }
  get isNight() { return this.S.time < 0.23 || this.S.time > 0.77; }
  // ---------------- inventory ----------------
  has(id, n = 1) { return (this.S.inv[id] || 0) >= n; }
  give(id, n = 1, quiet) { const S = this.S; if (!ITEMS[id]) return; if (!S.inv[id] && this.slotsUsed() >= this.slotsMax()) { this.ui.toast('Pack is full'); return false; } S.inv[id] = (S.inv[id] || 0) + n; if (!quiet) this.ui.toast(`+${n} ${ITEMS[id].name}`, RW.indexOf(ITEMS[id].r) >= 2 ? 'gold' : ''); this.audio.pickup(); this.checkHave(); return true; }
  take(id, n = 1) { const S = this.S; S.inv[id] = (S.inv[id] || 0) - n; if (S.inv[id] <= 0) delete S.inv[id]; }
  equip(id) { const it = ITEMS[id]; if (!it?.slot) return; const S = this.S; const old = S.equip[it.slot]; this.take(id, 1); if (old) S.inv[old] = (S.inv[old] || 0) + 1; S.equip[it.slot] = id; this.player.dress(S.equip); this.ui.toast(`Equipped ${it.name}`); S.hp = Math.min(S.hp, this.maxHp()); }
  unequip(slot) { const S = this.S; const id = S.equip[slot]; if (!id) return; S.inv[id] = (S.inv[id] || 0) + 1; S.equip[slot] = null; this.player.dress(S.equip); }
  useItem(id) {
    const it = ITEMS[id]; const S = this.S; if (!it?.use || !this.has(id)) return;
    if (it.use === 'food' || it.use === 'heal') { const heal = (it.hp || 0) * (it.use === 'heal' ? 1 + this.skill('herbalist') * 0.15 : 1) + (it.hunger || 0) * 0.6 * (1 + this.skill('cook') * 0.1); S.hp = Math.min(this.maxHp(), S.hp + heal); if (it.faith) S.faith = Math.min(this.maxFaith(), S.faith + it.faith); this.player.doAnim('eat', 0.9); this.ui.toast(`${it.name}: +${Math.round(heal)} HP`, 'good'); }
    else if (it.use === 'faith') { S.faith = Math.min(this.maxFaith(), S.faith + it.faith); this.ui.toast((id === 'blessing_scroll' ? 'You pray the Pilgrim\'s Prayer. ' : '') + '+' + it.faith + ' faith', 'good'); }
    else if (it.use === 'holy') { this.holyBurst(); }
    else if (it.use === 'candle') { const sh = this.nearInteractive('shrine', 4); if (!sh) { this.ui.toast('Light it at a shrine'); return; } this.lightShrine(sh); }
    else if (it.use === 'bell') { this.ui.toast('You ring the Angelus and pray: "The Angel of the Lord declared unto Mary…" The shadows flee.'); this.audio.bell(0); for (const e of this.enemies) if (e.alive && e.type === 'demon' && e.pos.distanceTo(this.player.pos) < 30) e.hurt(999, { x: 0, z: 0 }); }
    else if (it.use === 'oil') { S.flags.oil = 1; this.ui.toast('You fill the shrine lamp with oil: your next rest restores twice as much'); }
    else return;
    this.take(id, 1);
  }
  useQuick(i) { const id = this.S.quick[i]; if (!id) { this.ui.openPanel('inv'); return; } if (!this.has(id)) { this.ui.toast(`No ${ITEMS[id].name} left`); return; } this.useItem(id); }
  craftCount(id) { return (this.S.inv[id] || 0) + (Object.values(this.S.equip).includes(id) && !this.S.inv[id] ? 1 : 0); }
  craft(rid) {
    const r = RECIPES.find(x => x.id === rid); const S = this.S; for (const [k, n] of Object.entries(r.need)) if (this.craftCount(k) < n) return;
    for (const [k, n] of Object.entries(r.need)) { const inInv = Math.min(S.inv[k] || 0, n); if (inInv) this.take(k, inInv); if (inInv < n) { for (const s in S.equip) if (S.equip[s] === k) S.equip[s] = null; } }
    this.give(r.out, r.n); this.audio.click(); const it = ITEMS[r.out]; if (it.slot && !S.equip[it.slot]) this.equip(r.out);
    else if (it.slot && (it.atk || 0) + (it.def || 0) > (ITEMS[S.equip[it.slot]]?.atk || 0) + (ITEMS[S.equip[it.slot]]?.def || 0)) this.equip(r.out);
    this.player.dress(S.equip);
  }
  buy(id, p) { if (this.S.coin < p) return; if (this.give(id, 1) === false) return; this.S.coin -= p; this.audio.coin(); }
  sell(id) { if (!this.has(id)) return; this.take(id, 1); this.S.coin += this.sellPrice(id); this.audio.coin(); }
  learn(id) { const s = SKILLS.find(x => x.id === id); const S = this.S; if ((S.skills[id] || 0) >= s.max || S.sp < s.cost) return; S.sp -= s.cost; S.skills[id] = (S.skills[id] || 0) + 1; this.ui.toast(`${s.name} ${S.skills[id]}`, 'gold'); }
  addXp(n) { const S = this.S; n = Math.round(n * (1 + this.eqSum('xpBonus'))); S.xp += n; S.totalXp += n; while (S.xp >= this.xpNeed()) { S.xp -= this.xpNeed(); S.lvl++; S.sp++; S.hp = this.maxHp(); S.faith = this.maxFaith(); this.ui.toast(`Level ${S.lvl} — a skill point to spend`, 'gold'); this.audio.level(); this.fx.ring(this.player.pos, 0xffe08a); } }
  // ---------------- quests ----------------
  mq() { return MAIN_QUEST[this.S.mq] || null; }
  mqProgText() { const q = this.mq(); if (!q) return ''; if (q.obj === 'kill') return `${this.S.mqProg}/${q.count}`; return ''; }
  completeMain() {
    const q = this.mq(); if (!q) return; this.addXp(q.xp); this.S.coin += q.coin; this.ui.toast(`✓ ${q.name}  +${q.xp} XP · ${q.coin} coin`, 'gold'); this.audio.level();
    this.S.mq++; this.S.mqProg = 0; const n = this.mq();
    if (q.id === 'mq12') { this.give('compostela', 1); this.S.flags.finished = 1; setTimeout(() => this.ui.toast('Pilgrimage complete. The road east opens in Region 2.', 'gold'), 2600); }
    if (n) setTimeout(() => this.ui.toast(`${n.name}: ${n.desc}`), 1400); this.checkHave(); this.save();
  }
  event(type, d = {}) {
    const q = this.mq(), S = this.S; this.missions?.onEvent(type, d);
    if (q) {
      if (type === 'visit_shrine' && q.obj === 'visit_shrine' && d.key === q.target) this.completeMain();
      else if (type === 'deliver' && q.obj === 'deliver' && d.npc === q.npc && d.item === q.item) this.completeMain();
      else if (type === 'talk' && q.obj === 'talk' && d.npc === q.npc) this.completeMain();
      else if (type === 'kill' && q.obj === 'kill' && d.enemy === q.enemy) { S.mqProg++; if (S.mqProg >= q.count) this.completeMain(); else this.ui.toast(`${q.name}: ${S.mqProg}/${q.count}`); }
      else if (type === 'open' && q.obj === 'visit' && d.key === q.target) this.completeMain();
      else if (type === 'pray_cathedral' && q.obj === 'pray_cathedral') this.completeMain();
    }
    for (const s of S.side) { if (s.done) continue; let inc = 0;
      if (type === 'kill' && s.obj === 'kill' && s.enemy === d.enemy) inc = 1;
      if (type === 'gain' && s.obj === 'gather' && s.item === d.item) inc = d.n;
      if (type === 'deliver' && s.obj === 'deliver' && d.item === 'bread') inc = 1;
      if (type === 'light' && s.obj === 'light_one') inc = 1;
      if (type === 'rescue' && s.obj === 'rescue') inc = 1;
      if (type === 'escort' && s.obj === 'escort') inc = 1;
      if (inc) { s.prog = Math.min(s.n, s.prog + inc); if (s.prog >= s.n) { s.done = true; if (s.giver === 'board') this.turnIn(s); else this.ui.toast(`✓ ${s.name} — return to ${this.giverName(s.giver)}`, 'good'); } else this.ui.toast(`${s.name}: ${s.prog}/${s.n}`); }
    }
  }
  checkHave() { const q = this.mq(); if (q && q.obj === 'have_item' && (this.has(q.item) || Object.values(this.S.equip).includes(q.item))) setTimeout(() => { if (this.mq() === q) this.completeMain(); }, 300); }
  makeSide(tid, seed = Math.random()) { const t = SIDE_TEMPLATES.find(x => x.id === tid); const n = t.n ? Math.round(t.n[0] + (t.n[1] - t.n[0]) * seed) : 1; const scale = 1 + (n - (t.n ? t.n[0] : 1)) * 0.12; return { uid: 'q' + (this.S.uid++), tid, name: t.name, desc: t.desc.replace('{n}', n), obj: t.obj, enemy: t.enemy, item: t.item, n, prog: 0, xp: Math.round(t.xp * scale * (1 + this.S.lvl * 0.08)), coin: Math.round(t.coin * scale), done: false }; }
  offerFor(npc, pool) { const ok = pool.filter(id => SIDE_TEMPLATES.find(t => t.id === id).minLvl <= this.S.lvl + 1); if (!ok.length) return null; const i = Math.floor(hash2(this.S.day * 7 + npc.length, this.S.uid) * ok.length); const off = this.makeSide(ok[i], hash2(this.S.day, npc.length)); this.S.uid--; return off; }
  acceptSide(q, giver) { if (this.S.side.length >= 6) { this.ui.toast('Too many tasks — finish or drop one'); return; } q.uid = 'q' + (this.S.uid++); q.giver = giver; this.S.side.push(q); this.S.track = q.uid; this.ui.toast(`Task: ${q.name}`, 'good');
    if (q.obj === 'gather' && this.has(q.item)) { } if (q.obj === 'escort') this.spawnEscort(); if (q.obj === 'rescue') { const l = this.npcById('luis'); l.obj.visible = true; l.hidden = false; } }
  turnIn(q) { const S = this.S; S.side = S.side.filter(x => x !== q); if (q.obj === 'gather' && q.giver !== 'board' && this.has(q.item)) this.take(q.item, Math.min(q.n, S.inv[q.item])); this.addXp(q.xp * (q.obj === 'deliver' || q.giver === 'poor_1' ? 1 + this.skill('almsgiver') * 0.15 : 1)); S.coin += q.coin; this.ui.toast(`✓ ${q.name}  +${q.xp} XP · ${q.coin} coin`, 'gold'); this.audio.coin(); if (S.track === q.uid) S.track = 'main'; if (q.obj === 'rescue') { const l = this.npcById('luis'); l.follow = false; } this.save(); }
  giverName(id) { return id === 'board' ? 'the notice board' : (NPC_DEFS.find(d => d.id === id)?.name || this.npcById(id)?.name || id); }
  npcById(id) { return this.npcs.find(n => n.id === id); }
  boardOffers() { const S = this.S; if (S.boardDay !== S.day || !S.board.length) { S.boardDay = S.day; const rng = mulberry(S.day * 131 + S.lvl); const ok = SIDE_TEMPLATES.filter(t => t.minLvl <= S.lvl + 1 && !['find_pilgrim', 'escort', 'deliver_bread'].includes(t.id) || t.id === 'escort' && S.lvl >= 3); S.board = []; const used = new Set(); for (let i = 0; i < 12 && S.board.length < 3; i++) { const t = ok[Math.floor(rng() * ok.length)]; if (used.has(t.id)) continue; used.add(t.id); const q = this.makeSide(t.id, rng()); this.S.uid--; S.board.push(q); } } return S.board; }
  openBoard(title = 'Notice board') {
    const offers = this.boardOffers(); const c = offers.map(q => ({ t: `${q.name} — ${q.desc} (+${q.xp} XP, ${q.coin}c)`, f: () => { this.acceptSide({ ...q }, 'board'); this.S.board = this.S.board.filter(x => x !== q); } }));
    c.push({ t: 'Leave' }); this.ui.dialog(title, offers.length ? 'Bounties pay on completion. New notices are pinned each dawn.' : 'Nothing new today. Come back after dawn.', c);
  }
  spawnEscort() { const d = { id: 'escortee', name: 'Pilgrim Sofía', x: this.player.pos.x + 1.5, z: this.player.pos.z + 1.5, look: { sex: 'f', outfit: 'Ranger', hair: ['Hair_Long'], tints: { cloth: 0x6a4a5a } }, talk: () => ({ t: 'Lead on — Santiago is east, along the shells.', c: [{ t: 'Stay close.' }] }) }; const n = new NPC(this, d); n.follow = true; n.obj.traverse(m => { if (m.isMesh && /Hood/.test(m.name)) m.visible = false; }); this.npcs.push(n); this.escortee = n; }
  trackTarget() {
    const S = this.S; const P = this.player.pos; const M = this.missions;
    if (M && S.track?.startsWith('m:')) { const r = M.target(S.track.slice(2)); if (r) return r; S.track = 'main'; }
    if (M && S.track?.startsWith('g:')) { const m = M.byId[S.track.slice(2)]; const n = m && !M.isActive(m.id) && !M.isDone(m.id) && this.npcById(m.giver); if (n) return { name: m.name, obj: `Talk to ${n.name} to start this mission`, pos: n.pos, place: m.area }; S.track = M.isActive(S.track.slice(2)) ? 'm:' + S.track.slice(2) : 'main'; }
    let q = S.track !== 'main' ? S.side.find(s => s.uid === S.track) : null;
    if (!q && S.track === 'main' && this.mq()) { const m = this.mq(); let pos = PLACES[m.target] || (m.enemy === 'demon' ? PLACES.chapel : null);
      if (m.npc) { const n = this.npcById(m.npc); if (n) pos = n.pos; } return { name: m.name, obj: m.desc + (m.obj === 'kill' ? ` (${S.mqProg}/${m.count})` : ''), pos }; }
    if (!q) q = S.side[0]; if (!q) { const a = M?.activeIds()[0]; if (a) { S.track = 'm:' + a; return M.target(a); } return M?.suggestTarget() || { name: 'Free roam', obj: 'Check the notice board in San Roque or ask the town guard for bounties.', pos: PLACES.notice }; }
    let pos = null;
    if (q.done) pos = q.giver === 'board' ? PLACES.notice : this.npcById(q.giver)?.pos;
    else if (q.obj === 'kill') { let best = 1e9; for (const s of SPAWNS) if (s.type === q.enemy) { const d = Math.hypot(s.x - P.x, s.z - P.z); if (d < best) { best = d; pos = { x: s.x, z: s.z }; } } }
    else if (q.obj === 'gather') { let best = 1e9; for (const n of this.world.nodes) if (n.type === q.item && n.respawn <= 0 && n.mesh?.visible !== false) { const d = Math.hypot(n.x - P.x, n.z - P.z); if (d < best) { best = d; pos = n; } } if (q.item === 'candle') pos = PLACES.market; }
    else if (q.obj === 'deliver') pos = this.npcById('poor_1').pos; else if (q.obj === 'light_one') pos = this.nearestShrine(); else if (q.obj === 'rescue') pos = this.npcById('luis').pos; else if (q.obj === 'escort') pos = PLACES.town;
    return { name: q.name, obj: `${q.desc} ${q.done ? '— return' : `(${q.prog}/${q.n})`}`, pos };
  }
  nearestShrine() { let b = null, bd = 1e9; for (const it of this.world.interactives) if (it.type === 'shrine') { const d = Math.hypot(it.x - this.player.pos.x, it.z - this.player.pos.z); if (d < bd) { bd = d; b = it; } } return b; }
  // ---------------- world setup ----------------
  setupLighting() {
    const s = this.scene, Q = this.Q;
    const pm = new THREE.PMREMGenerator(this.renderer); this.envMap = pm.fromEquirectangular(this.A.hdr).texture; s.environment = this.envMap; this.A.hdr.dispose(); pm.dispose();
    this.sky = new Sky(); this.sky.scale.setScalar(800); s.add(this.sky); const u = this.sky.material.uniforms; u.turbidity.value = 3.5; u.rayleigh.value = 1.4; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.8;
    this.sky.material.fog = false;
    this.sun = new THREE.DirectionalLight(0xffe4bc, 2.6); this.sun.castShadow = true; const sc = this.sun.shadow.camera; const R = Q.shadowR; sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 1; sc.far = 220; this.sun.shadow.mapSize.set(Q.shadow, Q.shadow); this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.04; s.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xc4d8f4, 0x6a5a3a, 0.35); s.add(this.hemi);
    s.fog = new THREE.Fog(0xbfd0dc, Q.viewDist * 0.45, Q.viewDist * 1.25); // v6: less grey wash in the mid-distance
    this.pls = []; for (let i = 0; i < Q.lights; i++) { const l = new THREE.PointLight(0xffa850, 0, 16, 1.6); s.add(l); this.pls.push(l); }
    this.sunDir = new THREE.Vector3();
  }
  updateSun(dt) {
    if (this.inside) return this.interiorLight();
    const S = this.S || { time: 0.33 }; const phi = (S.time - 0.25) * Math.PI * 2; const e = Math.sin(phi);
    this.sunDir.set(Math.cos(phi) * 0.75, e, 0.45 + Math.cos(phi) * 0.1).normalize();
    const day = sstep(-0.1, 0.18, e), dusk = sstep(0.35, 0.02, Math.abs(e)) * sstep(-0.15, 0.05, e);
    const u = this.sky.material.uniforms; u.sunPosition.value.copy(this.sunDir);
    const night = 1 - day; const P = this.player ? this.player.pos : new THREE.Vector3(-196, 0, 192);
    const ld = e > -0.02 ? this.sunDir : this.sunDir.clone().multiplyScalar(-1).setY(0.6).normalize();
    this.sun.intensity = e > -0.02 ? 2.75 * day : 0.38; this.sun.color.setHSL(0.085 - dusk * 0.04, 0.62 + dusk * 0.3, e > -0.02 ? 0.88 - dusk * 0.18 : 0.75); if (e <= -0.02) this.sun.color.setHex(0x9ab0e0);
    const snap = 0.5; const tx = Math.round(P.x / snap) * snap, tz = Math.round(P.z / snap) * snap;
    this.sun.target.position.set(tx, P.y, tz); this.sun.position.set(tx + ld.x * 90, P.y + ld.y * 90, tz + ld.z * 90);
    this.hemi.intensity = 0.12 + 0.35 * day; this.scene.environmentIntensity = 0.12 + 0.75 * day;
    const fc = new THREE.Color(0x0c121e).lerp(new THREE.Color(0xc2d5e4), day); fc.lerp(new THREE.Color(0xe8c8a0), 0.12 * day); fc.lerp(new THREE.Color(0xd8a87a), dusk * 0.6); this.scene.fog.color.copy(fc);
    if (this.smoke) this.smoke.material.uniforms.uDay.value = day;
    this.renderer.toneMappingExposure = 0.62 + 0.25 * day;
    this.dayAmt = day;
  }
  extraNodes() { // guaranteed early materials near San Roque
    const W = this.world, tpl = {}; for (const n of W.nodes) if (!tpl[n.type] && n.mesh) tpl[n.type] = n.mesh;
    const rng = mulberry(99); const add = (type, cx, cz, cnt, r0, r1) => { if (!tpl[type]) return; for (let i = 0, k = 0; i < cnt * 20 && k < cnt; i++) { const a = rng() * 6.28, d = r0 + rng() * (r1 - r0); const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; if (this.col.pointBlocked(x, heightAt(x, z), z, 1.2) || distToPolyline(x, z, PATH).d < 2.5 || heightAt(x, z) < WATER + 0.3) continue; const m = tpl[type].clone(); m.position.set(x, heightAt(x, z), z); W.group.add(m); W.nodes.push({ type, x, z, mesh: m, respawn: 0 }); k++; } };
    add('wood', -200, 192, 9, 16, 36); add('herb', -200, 192, 6, 18, 40); add('berry', -200, 192, 4, 20, 42); add('wood', 62, -26, 4, 20, 34); add('herb', -60, -110, 6, 10, 40); add('mushroom', -60, -110, 0, 10, 40);
  }
  spawnNPCs() {
    const st = this.world.stalls;
    for (const d0 of [...NPC_DEFS, ...MISSION_NPCS]) { const d = { ...d0 }; if (d.stall) { const s = st[d.stall]; if (!s) continue; d.x = s.npcX; d.z = s.npcZ; d.yaw = s.ry; }
      const n = new NPC(this, d); if (d.scale) n.obj.scale.setScalar(d.scale); this.npcs.push(n);
      this.col.addCircle; }
    const l = this.npcById('luis'); if (!this.S.side.find(s => s.obj === 'rescue' && !s.done)) { l.obj.visible = false; l.hidden = true; }
    if (this.S.side.find(s => s.obj === 'escort' && !s.done)) this.spawnEscort();
    this.missions = new Missions(this);
  }
  /** Santiago plaza: pilgrims arriving, resting on benches, praying at the cruceiro, chatting */
  spawnPlaza() {
    const W = this.world, n = this.Q.plaza, rng = mulberry(77); const cloths = [0x6a5a44, 0x4a5a6a, 0x7a4a3a, 0x5a6a4a, 0x6a4a5a, 0x8a7a5a, 0x3a4a5a, 0x5a4a3a];
    const lines = ['Buen Camino! We made it — eight hundred kilometres!', 'I promised my father I would walk this for him.', 'Have you seen the Botafumeiro inside? Magnificent.', 'My feet are ruined and my heart is full.', 'They stamp the Compostela at the pilgrim office, I think.', 'Ultreia! Onward and upward.', 'Light a candle for us, friend.'];
    const spots = [];
    W.benches.forEach(b => spots.push({ kind: 'sit', x: b.x + Math.sin(b.ry) * 0.12, z: b.z + Math.cos(b.ry) * 0.12, yaw: b.ry }));
    spots.push({ kind: 'pray', x: 222, z: -201.2, yaw: Math.PI }, { kind: 'talk', x: 204.5, z: -199, yaw: -2.3 }, { kind: 'talk', x: 203.4, z: -200.3, yaw: 0.8 }, { kind: 'look', x: 212, z: -212, yaw: Math.PI });
    const loops = [[[196, -192], [204, -192], [206, -200], [196, -202]], [[214, -194], [208, -186], [196, -186], [192, -196], [204, -207]], [[188, -200], [200, -210], [214, -208], [218, -198]]];
    const order = ['walk', 'sit', 'pray', 'walk', 'talk', 'talk', 'sit', 'look', 'walk', 'sit', 'sit', 'sit'];
    let si = 0, wi = 0, used = new Set();
    for (let i = 0; i < n; i++) {
      const kind = order[i % order.length]; const f = rng() < 0.45; const cl = cloths[i % cloths.length];
      const look = { sex: f ? 'f' : 'm', outfit: rng() < 0.6 ? 'Ranger' : 'Peasant', hair: f ? [rng() < 0.5 ? 'Hair_Long' : 'Hair_Buns'] : [rng() < 0.5 ? 'Hair_SimpleParted' : 'Hair_Buzzed', ...(rng() < 0.4 ? ['Hair_Beard'] : [])], tints: { cloth: cl } };
      const d = { id: 'plaza' + i, name: 'Pilgrim', look, talk: () => ({ t: lines[i % lines.length], c: [{ t: 'Buen Camino.' }] }) };
      if (kind === 'walk') { const L = loops[wi++ % loops.length]; const off = i % L.length; d.route = L.slice(off).concat(L.slice(0, off)); d.x = d.route[0][0]; d.z = d.route[0][1]; d.speed = 1.05 + rng() * 0.3; d.wait = 1.5 + rng() * 3; }
      else { const cand = spots.filter((p, k) => p.kind === kind && !used.has(k)); const p = cand[0] || spots.find((q, k) => q.kind === 'sit' && !used.has(k)); if (!p) continue; used.add(spots.indexOf(p)); d.x = p.x; d.z = p.z; d.yaw = p.yaw; d.idle = p.kind === 'sit' ? 'sit' : p.kind === 'pray' ? 'prayidle' : p.kind === 'talk' ? 'talk' : 'idle'; d.still = p.kind !== 'look'; if (p.kind === 'sit') d.yOff = 0.0; }
      const npc = new NPC(this, d); const b = npc.obj.userData.bones; npc.obj.traverse(m => { if (m.isMesh && /Hood/.test(m.name)) m.visible = false; });
      if (rng() < 0.6 && b.Head) { const h = makeHat(rng() < 0.7 ? 'pilgrim_hat' : 'cloth_hat'); h.position.set(0, 0.2, 0.01); h.rotation.x = -0.12; b.Head.add(h); }
      if ((kind === 'walk' || kind === 'look' || rng() < 0.3) && b.hand_r) attachWeapon(b.hand_r, makeWeapon(rng() < 0.5 ? 'wood_staff' : 'oak_staff'));
      this.npcs.push(npc);
    }
    // grazing cows in Paco's pen
    this.critters = [new Critter(this, -246, 140, 7), new Critter(this, -250, 136, 7), new Critter(this, -242, 144, 6)];
  }
  get wpos() { return this.inside ? this.inside.door : this.player.pos; }
  groundAt(x, z) { return groundY(this, x, z); }
  /** swap lighting/visibility for interior or exterior */
  setInterior(on, R) {
    const s = this.scene; this.world.group.visible = !on; this.sky.visible = !on; this.smoke.visible = !on; this.birds.mesh.visible = !on;
    if (on) { s.background = new THREE.Color(0x0a0806); s.fog.color.setHex(R.fog[0]); s.fog.near = R.fog[1]; s.fog.far = R.fog[2]; this.cam.dist = Math.min(5.8, Math.max(3.9, (R.W || 8) * 0.42)); this.cam.curD = null; }
    else { s.background = null; s.fog.near = this.Q.viewDist * 0.45; s.fog.far = this.Q.viewDist * 1.25; this.cam.dist = 4.2; this.cam.curD = null; this.world.refreshVeg(); this.world.update(0, this.time || 0, this.player.pos.x, this.player.pos.z); }
    for (const l of this.pls) l.intensity = 0; this.updateSun(0);
  }
  interiorLight() {
    const R = this.inside, S = this.S; const phi = (S.time - 0.25) * Math.PI * 2; const e = Math.sin(phi); const day = sstep(-0.1, 0.18, e); this.dayAmt = day;
    this.sun.intensity = 0.25 + 0.35 * day; this.sun.color.setHex(0xffd8a8); const P = this.player.pos; this.sun.target.position.set(P.x, 0, P.z); this.sun.position.set(P.x + 50, 70, P.z + 20);
    this.hemi.color.setHex(0xffe2bc); this.hemi.groundColor.setHex(0x3a2a1c); this.hemi.intensity = 0.32 + 0.4 * day; this.scene.environmentIntensity = 0.16 + 0.22 * day;
    this.renderer.toneMappingExposure = R.exposure || 1.0;
    for (const m of R.glass || []) m.color.setScalar(m.userData.day * (0.12 + 0.88 * day)).multiply(m.userData.plain ? new THREE.Color(1, 1, 1).lerp(new THREE.Color(0.35, 0.45, 0.8), 1 - day) : new THREE.Color(1, 1, 1));
    for (const m of R.shafts || []) m.opacity = m.userData.op * day;
    this.hemi.color.setHex(0xffe2bc);
  }
  innRest(cost) {
    const S = this.S; if (S.coin < cost) { this.ui.toast(`You need ${cost} coin`); return; } S.coin -= cost; S.hp = this.maxHp(); S.stamina = this.maxSt(); S.faith = this.maxFaith();
    if (S.time > 0.27) S.day++; S.time = 0.27; this.save(); this.ui.toast('You sleep soundly. Morning comes.', 'good'); this.audio.coin();
  }
  pray(it) {
    const S = this.S, P = this.player; if (it.face != null) P.yaw = it.face; if (!P.doAnim('kneel', 2.4)) return; this.audio.choir(); this.fx.ring(P.pos, 0xffe7a0, 2.5);
    S.faith = this.maxFaith(); S.hp = Math.min(this.maxHp(), S.hp + this.maxHp() * 0.3);
    this.event('kneel', { room: it.key });
    if (it.key === 'cathedral') { this.audio.bell(5); if (this.mq()?.obj === 'pray_cathedral') { this.event('pray_cathedral'); return; } this.ui.toast('You kneel before the altar of the Apostle. Faith restored.', 'good'); }
    else if (it.key === 'mary') this.ui.toast('You kneel before Our Lady. Faith restored.', 'good'); else this.ui.toast('You kneel at the altar rail. Faith restored.', 'good');
    setTimeout(() => { if (!this.ui.dialogOpen()) this.prayerBook(it.key === 'mary' ? 'mary' : it.key === 'cathedral' ? 'pilgrim' : 'church'); }, 450);
  }
  /** choose a prayer; the full, exact text is shown in the dialog box */
  prayerBook(kind = 'church') {
    const show = k => () => ({ t: PRAYERS[k].name + '\n\n' + PRAYERS[k].text, c: [{ t: 'Amen.' }] });
    const mys = MYSTERY_DAY[(this.S.day || 0) % 7]; const rosary = () => ({ t: `The ${mys} Mysteries\n` + MYSTERIES[mys].map((m, i) => `${i + 1}. ${m}`).join('\n') + '\n\n' + PRAYERS.rosary.text, c: [{ t: 'Pray the Our Father', f: show('our_father') }, { t: 'Pray the Hail Mary', f: show('hail_mary') }, { t: 'Pray the Glory Be', f: show('glory_be') }, { t: 'Amen.' }] });
    const c = kind === 'mary' ? [{ t: 'Hail Mary', f: show('hail_mary') }, { t: 'A decade of the Rosary', f: rosary }, { t: 'The Angelus', f: show('angelus') }]
      : kind === 'pilgrim' ? [{ t: "The Pilgrim's Prayer", f: show('pilgrim') }, { t: 'Our Father', f: show('our_father') }, { t: 'Glory Be', f: show('glory_be') }]
        : [{ t: 'Our Father', f: show('our_father') }, { t: 'Hail Mary', f: show('hail_mary') }, { t: 'Glory Be', f: show('glory_be') }, { t: 'A decade of the Rosary', f: rosary }];
    c.push({ t: 'Pray in silence' }); this.ui.dialog('Prayer', PRAYERS.sign.text, c);
  }
  // ---------------- spawning ----------------
  spawner(dt) {
    const P = this.player.pos;
    SPAWNS.forEach((s, i) => {
      const st = this.spawnState[i]; st.alive = st.alive.filter(e => !e.gone);
      const d = Math.hypot(P.x - s.x, P.z - s.z);
      const allowed = !s.night || this.isNight;
      if (d > 140 || (!allowed && s.type === 'demon')) { for (const e of st.alive) if (!e.aggro || !allowed) { e.dispose(); e.gone = true; this.enemies.splice(this.enemies.indexOf(e), 1); } st.alive = st.alive.filter(e => !e.gone); return; }
      if (!allowed) return;
      st.timer -= dt; const living = st.alive.filter(e => e.alive).length;
      if (living < s.n && st.timer <= 0 && d > 26) { // never pop in on top of the player
        for (let k = 0; k < 8; k++) { const a = Math.random() * 6.28, r = Math.random() * s.r; const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r; if (this.col.pointBlocked(x, heightAt(x, z), z, 0.8) || heightAt(x, z) < WATER) continue;
          const lvl = Math.max(1, Math.round(s.lvl + this.S.lvl * 0.35 - 0.35 + (Math.random() - 0.5))); const e = new Enemy(this, s.type, x, z, lvl, { x: s.x, z: s.z, r: s.r }); e.spawn = i; this.enemies.push(e); st.alive.push(e); break; }
        st.timer = st.alive.length < s.n ? 0.4 : (s.respawn || 50);
      }
      if (living < s.n && d <= 26 && st.timer <= 0) st.timer = 2;
    });
    // activation: nearest 8 run AI
    const P2 = this.player.pos; const list = this.enemies.filter(e => e.alive).map(e => [e, e.pos.distanceTo(P2)]).sort((a, b) => a[1] - b[1]);
    list.forEach(([e, d], i) => { e.active = i < 8 && d < 70; e.obj.visible = d < this.Q.viewDist * 0.8; });
  }
  requestToken(e) { if (this.tokens.size < 2) { this.tokens.add(e); return true; } return false; }
  hasToken(e) { return this.tokens.has(e); }
  releaseToken(e) { this.tokens.delete(e); }
  alertPack(e) { for (const o of this.enemies) if (o !== e && o.alive && !o.aggro && o.pos.distanceTo(e.pos) < 16 && (o.type === e.type || (o.def.human && e.def.human && o.type !== 'demon'))) o.aggro = true; }
  nearestEnemy(pos, range, yaw, arc) { let b = null, bd = range; for (const e of this.enemies) { if (!e.alive || !e.active) continue; const d = e.pos.distanceTo(pos); if (d > bd) continue; if (arc != null && Math.abs(angDiff(yaw, Math.atan2(e.pos.x - pos.x, e.pos.z - pos.z))) > arc) continue; bd = d; b = e; } return b; }
  // ---------------- combat ----------------
  playerStrike(a) {
    const P = this.player; let hitAny = false;
    for (const e of this.enemies) { if (!e.alive || !e.active) continue; const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz); if (d > a.range + e.r) continue; if (Math.abs(angDiff(P.yaw, Math.atan2(dx, dz))) > a.arc && d > 1.0) continue;
      let dmg = this.atk() * a.mult * (0.9 + Math.random() * 0.2); const crit = Math.random() < 0.1; if (crit) dmg *= 1.6;
      if (e.def.holyOnly) { const db = (ITEMS[this.S.equip.weapon]?.demonBonus || 0) + this.eqSum('demonBonus') * 0; if (!db) { dmg = 0; if (!this._holyHint || performance.now() - this._holyHint > 8000) { this._holyHint = performance.now(); this.ui.toast('Steel passes through it — pray (✝) or use holy water'); } } else dmg *= db / 30; }
      const dir = { x: dx / (d || 1), z: dz / (d || 1) }; if (dmg > 0) e.hurt(dmg, dir, !!a.heavyHit); hitAny = true;
      this.ui.dmg(new THREE.Vector3(e.pos.x, e.pos.y + 1.6, e.pos.z), dmg, crit ? 'crit' : ''); this.fx.spark(e.pos.x - dir.x * 0.3, e.pos.y + 1.0, e.pos.z - dir.z * 0.3, dmg ? 0xffd2a0 : 0x9a7aff, crit ? 14 : 8);
    }
    if (hitAny) { this.audio.hit(a.heavyHit); this.cam.shake(a.heavyHit ? 0.22 : 0.08); this.hitstop = a.heavyHit ? 0.08 : 0.04; }
  }
  prayBurst() {
    const P = this.player.pos, S = this.S; const heal = 6 + this.skill('healing_prayer') * 8; S.hp = Math.min(this.maxHp(), S.hp + heal);
    this.fx.ring(P, 0xffe7a0, 6);
    if (this.enemies.some(e => e.alive && e.def.holyOnly && e.pos.distanceTo(P) < 12) && (!this._mikeT || performance.now() - this._mikeT > 9000)) { this._mikeT = performance.now(); this.ui.toast('"Saint Michael the Archangel, defend us in battle…"', 'gold'); }
    for (const e of this.enemies) { if (!e.alive || !e.active) continue; const d = e.pos.distanceTo(P); if (d > 6.5) continue; const dir = { x: (e.pos.x - P.x) / (d || 1), z: (e.pos.z - P.z) / (d || 1) };
      const dmg = e.def.holyOnly ? (42 + S.lvl * 3 + this.skill('exorcist') * 10) * (1 + this.skill('st_michael') * 0.08) : 8 + this.skill('exorcist') * 2; e.hurt(dmg, dir, e.def.holyOnly); this.ui.dmg(new THREE.Vector3(e.pos.x, e.pos.y + 1.6, e.pos.z), dmg, e.def.holyOnly ? 'crit' : ''); }
  }
  holyBurst() { const P = this.player.pos; this.fx.ring(P, 0x9fd8ff, 5); this.audio.choir(); this.ui.toast('You sprinkle holy water and make the Sign of the Cross.', 'good'); for (const e of this.enemies) { if (!e.alive) continue; const d = e.pos.distanceTo(P); if (d > 5.5) continue; const dmg = e.def.holyOnly ? 75 + this.skill('exorcist') * 12 : 14; e.hurt(dmg, { x: (e.pos.x - P.x) / (d || 1), z: (e.pos.z - P.z) / (d || 1) }, true); this.ui.dmg(new THREE.Vector3(e.pos.x, e.pos.y + 1.6, e.pos.z), dmg, 'crit'); } }
  enemyHits(e, heavy) {
    const dmg = e.atk * (0.85 + Math.random() * 0.3); const r = this.player.hurt(dmg, e.pos, heavy);
    if (r === 'parry') { e.stun = 1.3; e.state = 'recover'; e.t = -0.8; this.ui.toast('Perfect block'); e.kb.set(e.pos.x - this.player.pos.x, 0, e.pos.z - this.player.pos.z).setLength(4); }
    else if (r === 'hit' || r === 'dead') { this.ui.dmg(new THREE.Vector3(this.player.pos.x, this.player.pos.y + 1.8, this.player.pos.z), dmg, 'me'); this.combatT = 6; }
  }
  onEnemyKilled(e) {
    const S = this.S; this.addXp(e.def.xp * (1 + 0.15 * (e.lvl - 1))); if (e.type === 'demon') S.faith = Math.min(this.maxFaith(), S.faith + 10);
    if (this.player.lock === e) this.player.lock = null;
    const items = {}; for (const [id, p] of Object.entries(e.def.drop || {})) if (Math.random() < p) items[id] = 1;
    if (e.type === 'bandit_chief' && !this.has('chalice') && !(S.mq > 7)) items.chalice = 1; else if (e.type === 'bandit_chief' && S.mq > 7) delete items.chalice;
    if (Math.random() < (e.def.human ? 0.12 : 0.05) + (e.def.boss ? 0.5 : 0)) { const it = this.randomGear(e.lvl); if (it) items[it] = 1; }
    const coin = Math.round(e.def.coin * (0.6 + Math.random() * 0.8) * (1 + this.skill('scallop_luck') * 0.08) * (1 + 0.1 * e.lvl));
    this.dropLoot(e.pos.x, e.pos.z, items, coin); this.event('kill', { enemy: e.type, e });
  }
  randomGear(lvl) { const roll = Math.random() * (1 + lvl * 0.25); const r = roll > 2.4 ? 'epic' : roll > 1.5 ? 'rare' : roll > 0.8 ? 'uncommon' : 'common'; const pool = Object.values(ITEMS).filter(i => i.slot && i.r === r); return pool.length ? pool[Math.floor(Math.random() * pool.length)].id : null; }
  dropLoot(x, z, items, coin) {
    if (!Object.keys(items).length && !coin) return; let best = 0; for (const id of Object.keys(items)) best = Math.max(best, RW.indexOf(ITEMS[id].r));
    const y = groundY(this, x, z); const g = new THREE.Group(); g.position.set(x, y, z);
    const sack = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshStandardMaterial({ color: 0x8a6a40, roughness: 1 })); sack.scale.set(1, 0.8, 1); sack.position.y = 0.15; sack.castShadow = true; g.add(sack);
    const col = RCOL[RW[best]]; const ring = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 24), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring);
    if (best >= 2) { const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.18, 3, 8, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); beam.position.y = 1.5; g.add(beam); }
    this.scene.add(g); this.loot.push({ x, z, items, coin, g, ring, t: 0, rarity: RW[best] });
  }
  pickLoot(l) { for (const [id, n] of Object.entries(l.items)) { this.give(id, n); this.event('gain', { item: id, n }); } if (l.coin) { this.S.coin += l.coin; this.ui.toast(`+${l.coin} coin`); this.audio.coin(); } this.scene.remove(l.g); this.loot.splice(this.loot.indexOf(l), 1); }
  // ---------------- interaction ----------------
  nearInteractive(type, r) { const P = this.player.pos; for (const it of this.world.interactives) if (it.type === type && Math.hypot(it.x - P.x, it.z - P.z) < r) return it; return null; }
  stationsNear() { const s = ['hand']; const P = this.player.pos; for (const it of this.world.interactives) { if (Math.hypot(it.x - P.x, it.z - P.z) > 5) continue; if (it.type === 'bench') s.push('bench'); if (it.type === 'campfire') s.push('campfire'); if (it.type === 'forge') s.push('forge'); if (it.type === 'church' || it.type === 'cathedral') s.push('church'); } return [...new Set(s)]; }
  findInteract() {
    const P = this.player.pos; let best = null, bd = 1e9;
    const consider = (o, d, label, fn, short = 'Use', kind = 'use') => { if (d < bd) { bd = d; best = { o, label, fn, short, kind }; } };
    for (const l of this.loot) { const d = Math.hypot(l.x - P.x, l.z - P.z); if (d < 1.8) consider(l, d - 1, 'Pick up', () => this.pickLoot(l), 'Pick up', 'pick'); }
    for (const n of this.npcs) { if (!n.obj.visible) continue; const d = n.pos.distanceTo(P); if (d < 2.6) consider(n, d - 0.5, `Talk to ${n.name}`, () => this.talk(n), 'Talk', 'talk'); }
    for (const it of this.world.interactives) { const d = Math.hypot(it.x - P.x, it.z - P.z); if (d < it.r) consider(it, d, it.label, () => this.useInteractive(it), it.short || ({ shrine: 'Rest', notice: 'Read', shop: 'Shop', chest: 'Open', sign: 'Read', bench: 'Craft', campfire: 'Cook', forge: 'Smelt', church: 'Bless' })[it.type] || 'Use', /door/.test(it.type) ? 'door' : /kneel|shrine|confess|votive|church/.test(it.type) ? 'pray' : 'use'); }
    for (const n of this.world.nodes) { if (n.respawn > 0 || !n.mesh || n.mesh.visible === false) continue; const d = Math.hypot(n.x - P.x, n.z - P.z); if (d < 2.1) consider(n, d, n.type === 'chapel_key' ? 'Pick up the key' : `Gather ${ITEMS[n.type]?.name || n.type}`, () => this.gather(n), 'Gather', 'pick'); }
    return best;
  }
  interact() { if (this.uiOpen() || this.player.busy) return; const b = this.curInteract; if (b) { this.audio.init(); b.fn(); } }
  uiOpen() { return this.ui.panelOpen() || this.ui.dialogOpen(); }
  onPanelClosed() { }
  talk(n) { const node = this.missions.decorate(n, n.def.talk(this)); this.event('talk', { npc: n.id }); n.talking = true; this.ui.dialog(n.name, node.t, node.c, n); }
  gather(n) {
    const t = n.type; if (t === 'fish' && !this.has('fishing_rod')) { this.ui.toast('You need a fishing rod (workbench)'); return; } if (t === 'iron_ore' && !this.has('pickaxe')) { this.ui.toast('You need a pickaxe (workbench or smith)'); return; }
    const anim = t === 'wood' || t === 'oak_wood' ? 'chop' : t === 'fish' ? 'cast' : 'gather';
    this.player.yaw = Math.atan2(n.x - this.player.pos.x, n.z - this.player.pos.z);
    this.player.start(anim, { dur: 1.1, done: () => {
      if (t === 'chapel_key') { this.give('chapel_key', 1); n.mesh.visible = false; n.respawn = 1e9; return; }
      const tool = Object.keys(this.S.inv).some(k => ITEMS[k].gather === t) ? 1 : 0; let k = 1 + tool + (Math.random() < this.skill('forager') * 0.1 ? 1 : 0); if (t === 'wood' && Math.random() < 0.5) k++;
      this.give(t, k); this.event('gain', { item: t, n: k }); if (n.mesh) n.mesh.visible = false; n.respawn = 120 + Math.random() * 60; } });
    this.audio.step('grass', 1);
  }
  lightShrine(sh) { if (!this.has('candle')) return; this.take('candle', 1); sh.flame.visible = true; sh.lit = true; this.S.flags['lit_' + sh.key] = 1; this.S.faith = this.maxFaith(); this.ui.toast('Candle lit. Faith restored.', 'gold'); this.event('light'); }
  useInteractive(it) {
    const S = this.S;
    if (it.type === 'shrine') {
      const rest = () => { const m = (1 + this.skill('shrine_keeper') * 0.2) * (S.flags.oil ? 2 : 1); S.flags.oil = 0; S.hp = this.maxHp(); S.stamina = this.maxSt(); S.faith = Math.min(this.maxFaith(), S.faith + this.maxFaith() * 0.5 * m); S.respawn = it.key; S.flags.martyrUsed = false; this.player.doAnim('kneel', 1.6); this.fx.ring(this.player.pos, 0xffe7a0, 3); this.event('visit_shrine', { key: it.key }); this.save(); this.ui.toast('Rested · progress saved', 'good'); };
      const c = [{ t: 'Rest and save', f: rest }];
      if (this.has('candle') && !it.lit) c.push({ t: 'Light a candle', f: () => this.lightShrine(it) });
      c.push({ t: this.isNight ? 'Rest until dawn' : 'Rest until dusk', f: () => { rest(); if (this.isNight) { S.time = 0.27; S.day++; } else S.time = 0.8; this.ui.toast(this.isNight ? 'Night falls' : 'Dawn breaks'); } });
      c.push({ t: 'Leave' }); c.splice(c.length - 1, 0, { t: 'Pray before Our Lady', f: () => { this.player.doAnim('kneel', 2.0); S.faith = Math.min(this.maxFaith(), S.faith + 10); return { t: PRAYERS.hail_mary.name + '\n\n' + PRAYERS.hail_mary.text, c: [{ t: 'Amen.' }] }; } });
      this.ui.dialog(PLACES[it.key]?.label || 'Wayside shrine', 'A granite wayside shrine of Our Lady, with candles and a kneeler. You may pray and rest here; it becomes the place you wake if you fall.', c);
    } else if (it.type === 'notice') this.openBoard();
    else if (it.type === 'bench') this.ui.openCraft('bench'); else if (it.type === 'campfire') this.ui.openCraft('campfire'); else if (it.type === 'forge') this.ui.openCraft('forge'); else if (it.type === 'church') this.ui.openCraft('church');
    else if (it.type === 'font') { this.player.doAnim('pick', 0.8); S.faith = Math.min(this.maxFaith(), S.faith + 5); this.ui.toast('You dip your fingers in the holy water and make the Sign of the Cross. +5 faith', 'good'); }
    else if (it.type === 'baptism') { this.player.doAnim('kneel', 2.0); this.ui.dialog('Baptismal font', PRAYERS.baptism.text, [{ t: 'Amen.', f: () => { S.faith = this.maxFaith(); this.ui.toast('You renew the promises of your Baptism. Faith restored.', 'good'); } }]); }
    else if (it.type === 'shop') this.ui.openShop(it.shop);
    else if (it.type === 'cathedral') { this.player.doAnim('kneel', 2.0); this.audio.choir(); this.audio.bell(5); S.faith = this.maxFaith(); if (this.mq()?.obj === 'pray_cathedral') this.event('pray_cathedral'); else this.ui.toast('You pray before the apostle. Faith restored.', 'good'); }
    else if (it.type === 'chest') {
      if (S.opened[it.key]) { this.ui.toast('Empty'); return; } if (it.needsKey && !this.has(it.needsKey)) { this.ui.toast('Locked. It needs a key.'); return; }
      if (it.needsKey) this.take(it.needsKey, 1); S.opened[it.key] = 1; this.player.doAnim('chest', 1.2);
      setTimeout(() => { for (const id of it.loot) { if (id === 'coin') { const c = 40 + Math.round(Math.random() * 30); S.coin += c; this.ui.toast(`+${c} coin`); } else this.give(id, 1); } this.event('open', { key: it.key }); this.save(); }, 700);
    } else if (it.type === 'sign') this.ui.toast(it.text);
    else if (it.type === 'mission') this.missions.pickup(it);
    else if (it.type === 'door') this.interiors.enter(it.id);
    else if (it.type === 'door_out') this.interiors.exit();
    else if (it.type === 'kneel') this.pray(it);
    else if (it.type === 'votive') { if (S.coin < 1) { this.ui.toast('You have no coin to offer'); return; } const f = it.flames.find(i => this.interiors.flames.pos[i * 4 + 1] > 500); if (f == null) { this.ui.toast('Every candle is already burning'); return; } S.coin -= 1; this.interiors.flames.hide(f, false); S.faith = Math.min(this.maxFaith(), S.faith + 15); this.player.doAnim('pick', 0.8); this.ui.toast('You light a candle and offer a prayer. +15 faith', 'good'); this.event('votive', { room: this.inside?.id }); }
    else if (it.type === 'confess') {
      if (S.flags.confessDay === S.day) { this.ui.toast('You have been to confession today. Go in peace.'); return; }
      const absolve = () => { S.flags.confessDay = S.day; S.faith = this.maxFaith(); S.hp = this.maxHp(); this.audio.choir(); this.fx.ring(this.player.pos, 0xfff0c0, 2); this.ui.toast('Absolved: faith and health restored', 'gold');
        return { t: 'God, the Father of mercies, through the death and resurrection of his Son has reconciled the world to himself and sent the Holy Spirit among us for the forgiveness of sins; through the ministry of the Church may God give you pardon and peace, and I absolve you from your sins in the name of the Father, and of the Son, + and of the Holy Spirit.', c: [{ t: 'Amen.', f: () => ({ t: 'Give thanks to the Lord, for he is good.', c: [{ t: 'His mercy endures for ever.', f: () => ({ t: 'The Lord has freed you from your sins. Go in peace.', c: [{ t: 'Thanks be to God.' }] }) }] }) }] }; };
      this.ui.dialog('Priest (behind the grille)', PRAYERS.sign.text + '\nMay God, who has enlightened every heart, help you to know your sins and trust in his mercy.', [
        { t: 'Bless me, Father, for I have sinned…', f: () => ({ t: '(You confess your sins with a contrite heart.)\n\nFor your penance, pray one Our Father and three Hail Marys. Now make your Act of Contrition.', c: [{ t: 'Pray the Act of Contrition', f: () => ({ t: PRAYERS.contrition.text, c: [{ t: 'Amen.', f: absolve }] }) }] }) },
        { t: 'Not today, Father.' }]);
    }
  }
  // ---------------- input ----------------
  bindInput() {
    const P = () => this.player; const zone = document.getElementById('joyZone'), base = document.getElementById('joyBase'), knob = document.getElementById('joyKnob');
    const home = () => { base.style.left = ''; base.style.top = ''; base.style.bottom = ''; knob.style.transform = ''; base.classList.remove('sprint'); };
    let joyId = null, ox = 0, oy = 0;
    zone.addEventListener('pointerdown', e => { e.preventDefault(); this.audio.init(); joyId = e.pointerId; try { zone.setPointerCapture(e.pointerId); } catch (_) { } ox = e.clientX; oy = e.clientY; base.style.left = (ox - 58) + 'px'; base.style.top = (oy - 58) + 'px'; base.style.bottom = 'auto'; });
    zone.addEventListener('pointermove', e => { if (e.pointerId !== joyId) return; let dx = e.clientX - ox, dy = e.clientY - oy; const d = Math.hypot(dx, dy), R = 50; const k = d > R ? R / d : 1; knob.style.transform = `translate(${dx * k}px,${dy * k}px)`; const m = Math.min(1, d / R); this.joy = { x: d ? dx / d * m : 0, y: d ? -dy / d * m : 0 }; });
    const jend = e => { if (e.pointerId !== joyId) return; joyId = null; this.joy = null; home(); };
    zone.addEventListener('pointerup', jend); zone.addEventListener('pointercancel', jend);
    // camera drag on canvas (touch: anywhere not on UI; mouse: drag or pointer lock)
    const cv = this.renderer.domElement; const drags = new Map();
    cv.addEventListener('pointerdown', e => { this.audio.init(); if (e.pointerType === 'mouse') { if (this.state === 'play' && !document.pointerLockElement && !this.uiOpen()) cv.requestPointerLock?.(); if (document.pointerLockElement) { if (e.button === 0) P().light(); if (e.button === 2) this.mouseBlock = true; return; } } drags.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { cv.setPointerCapture(e.pointerId); } catch (_) { } });
    cv.addEventListener('pointermove', e => { if (document.pointerLockElement === cv) { this.look(e.movementX, e.movementY, 0.0028); return; } const d = drags.get(e.pointerId); if (!d) return; this.look(e.clientX - d.x, e.clientY - d.y, 0.0062); d.x = e.clientX; d.y = e.clientY; });
    const dend = e => { drags.delete(e.pointerId); if (e.button === 2) this.mouseBlock = false; }; cv.addEventListener('pointerup', dend); cv.addEventListener('pointercancel', dend);
    addEventListener('mouseup', e => { if (e.button === 2) this.mouseBlock = false; });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('wheel', e => { this.cam.dist = clamp(this.cam.dist + e.deltaY * 0.004, 2.4, 7); }, { passive: true });
    // buttons
    const btn = (id, down, up) => { const b = document.getElementById(id); b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); this.audio.init(); b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (_) { } down(); }); const u = e => { b.classList.remove('on'); up && up(); }; b.addEventListener('pointerup', u); b.addEventListener('pointercancel', u); };
    btn('aAtk', () => P().light());
    btn('aHeavy', () => P().heavy()); btn('aRoll', () => P().roll(P().intent?.dx || 0, P().intent?.dz || 0)); btn('aBlock', () => this.btnBlock = true, () => this.btnBlock = false);
    btn('aPray', () => P().pray()); btn('aLock', () => this.toggleLock()); btn('aUse', () => this.interact());
    const wB = document.getElementById('bWalk'), sB = document.getElementById('bSprint');
    this.setWalk = v => { this.walkMode = v; wB.setAttribute('aria-pressed', v); if (v) this.setSprint(false); };
    this.setSprint = v => { this.sprintLatch = v; this._sprMoved = false; this._idleT = 0; sB.setAttribute('aria-pressed', v); if (v && this.walkMode) this.setWalk(false); };
    for (const [b, f] of [[wB, () => { this.setWalk(!this.walkMode); this.ui.toast(this.walkMode ? 'Walking' : 'Jogging', '', 900); }], [sB, () => { if (!this.sprintLatch && this.S.stamina < 8) { this.ui.toast('Too tired to sprint', '', 1100); return; } this.setSprint(!this.sprintLatch); this.ui.toast(this.sprintLatch ? 'Sprinting' : 'Jogging', '', 900); }]]) {
      // pointerdown fires the toggle once; touchstart/click are swallowed so a tap can never double-toggle or reach the joystick/camera underneath
      let lastT = 0; const fire = e => { e.preventDefault(); e.stopPropagation(); const now = performance.now(); if (now - lastT < 250) return; lastT = now; this.audio.init(); f(); };
      b.addEventListener('pointerdown', fire); b.addEventListener('touchstart', e => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); if (!window.PointerEvent) fire(e); }, { passive: false });
      b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); }); for (const ev of ['pointerup', 'pointermove', 'touchend', 'touchmove']) b.addEventListener(ev, e => e.stopPropagation()); }
    addEventListener('keydown', e => { if (e.repeat) return; this.keys[e.code] = true; this.audio.init(); if (this.state !== 'play') return;
      if (this.ui.dialogOpen()) { const n = +e.key; if (n >= 1 && n <= 9) document.querySelectorAll('#dChoices button')[n - 1]?.click(); if (e.code === 'Escape') this.ui.closeDialog(); return; }
      if (e.code === 'Tab' || e.code === 'KeyI') { e.preventDefault(); this.ui.panelOpen() ? this.ui.closePanel() : this.ui.openPanel('inv'); return; }
      if (e.code === 'Escape' && this.ui.panelOpen()) { this.ui.closePanel(); return; } if (this.ui.panelOpen()) return;
      if (e.code === 'KeyE') this.interact(); if (e.code === 'Space') { e.preventDefault(); P().roll(P().intent?.dx || 0, P().intent?.dz || 0); } if (e.code === 'KeyF') P().heavy(); if (e.code === 'KeyR') P().pray(); if (e.code === 'KeyT' || e.code === 'KeyQ') this.toggleLock(); if (e.code === 'KeyZ' || e.code === 'CapsLock') { this.setWalk(!this.walkMode); this.ui.toast(this.walkMode ? 'Walking' : 'Jogging'); }
      if (e.code === 'Digit1') this.useQuick(0); if (e.code === 'Digit2') this.useQuick(1); if (e.code === 'KeyM') this.ui.openPanel('map'); if (e.code === 'KeyJ') this.ui.openPanel('quests'); if (e.code === 'KeyK') this.ui.openPanel('skills'); if (e.code === 'KeyC') this.ui.openPanel('craft'); });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; this.joy = null; this.btnBlock = false; this.mouseBlock = false; });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'play') this.save(); });
  }
  look(dx, dy, k) { if (this.state !== 'play' || this.uiOpen()) return; this.cam.yaw -= dx * k * this.sens; this.cam.pitch = clamp(this.cam.pitch + dy * k * 0.8 * this.sens * (this.invY ? -1 : 1), -0.35, 1.1); this.cam.lastInput = this.time; }
  toggleLock() { const P = this.player; if (P.lock) { P.lock = null; return; } const e = this.nearestEnemy(P.pos, 20, this.cam.yaw + Math.PI, 1.2) || this.nearestEnemy(P.pos, 14); if (e) { P.lock = e; } else this.ui.toast('No enemy nearby'); }
  readInput() {
    const k = this.keys, inp = this.inp; let mx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0), my = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    if (mx || my) { const l = Math.hypot(mx, my); mx /= l; my /= l; inp.sprint = !!(k.ShiftLeft || k.ShiftRight); } else inp.sprint = false;
    if (this.joy) { mx = this.joy.x; my = this.joy.y; inp.sprint = false; }
    if (this.sprintLatch) { if (Math.hypot(mx, my) > 0.2) { inp.sprint = true; this._idleT = 0; this._sprMoved = true; } else if (this._sprMoved && (this._idleT = (this._idleT || 0) + this._dt) > 0.8) { this.setSprint(false); this.ui.toast('Jogging', '', 900); } if (this.S.stamina <= 1) { this.setSprint(false); } }
    inp.walk = !!this.walkMode && !inp.sprint;
    if (this.debugJoy) { mx = this.debugJoy.x; my = this.debugJoy.y; inp.sprint = !!this.debugJoy.sprint; if (this.debugJoy.walk != null) inp.walk = this.debugJoy.walk; }
    if (this.uiOpen()) { mx = my = 0; }
    inp.mx = mx; inp.my = my; inp.block = !!(this.btnBlock || this.mouseBlock || k.KeyB);
  }
  // ---------------- camera ----------------
  updateCamera(dt) {
    const c = this.cam, P = this.player, cam = this.camera;
    if (P.lock && P.lock.alive && P.lock.pos.distanceTo(P.pos) < 26) { const want = Math.atan2(P.pos.x - P.lock.pos.x, P.pos.z - P.lock.pos.z); c.yaw += angDiff(c.yaw, want) * Math.min(1, dt * 5); c.pitch += (0.3 - c.pitch) * Math.min(1, dt * 2); } else if (P.lock) P.lock = null;
    const ins = !!this.inside; const rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw); const sh = ins ? 0.22 : 0.42;
    const tgt = new THREE.Vector3(P.pos.x + rx * sh, P.pos.y + (ins ? 1.7 : 1.55), P.pos.z + rz * sh);
    if (!this.camTgt) this.camTgt = tgt.clone(); this.camTgt.lerp(tgt, Math.min(1, dt * 14));
    // indoors: sit a little higher and further back, and tilt down more when a wall is behind us, so the room and the player stay in view
    let pitch = c.pitch; if (ins) pitch = Math.min(1.05, Math.max(pitch, this.inside.W > 12 ? 0.3 : 0.38) + (c.blockK || 0) * 0.4);
    const cp = Math.cos(pitch), sp = Math.sin(pitch); const dir = new THREE.Vector3(Math.sin(c.yaw) * cp, sp, Math.cos(c.yaw) * cp);
    let d = c.dist; // collision march
    for (let s = 0.4; s <= c.dist; s += 0.2) { const x = this.camTgt.x + dir.x * s, y = this.camTgt.y + dir.y * s, z = this.camTgt.z + dir.z * s; if (this.col.pointBlocked(x, y, z, ins ? 0.38 : 0.25) || y < this.groundAt(x, z) + 0.25 || (ins && y > this.inside.H - 0.5)) { d = Math.max(0.6, s - (ins ? 0.35 : 0.25)); break; } }
    if (ins) { c.blockK = (c.blockK || 0) + ((d < c.dist * 0.75 ? 1 - d / c.dist : 0) - (c.blockK || 0)) * Math.min(1, dt * 2.5); c.curD = c.curD == null ? d : c.curD + (d - c.curD) * Math.min(1, dt * (d < c.curD ? 14 : 2.5)); }
    else { c.blockK = 0; c.curD = c.curD == null ? d : (d < c.curD ? d : c.curD + (d - c.curD) * Math.min(1, dt * 3)); }
    cam.position.copy(this.camTgt).addScaledVector(dir, c.curD); const gy = this.groundAt(cam.position.x, cam.position.z) + 0.3; if (cam.position.y < gy) cam.position.y = gy; if (this.inside && cam.position.y > this.inside.H - 0.3) cam.position.y = this.inside.H - 0.3;
    if (c.shakeT > 0) { c.shakeT = Math.max(0, c.shakeT - dt); const a = c.shakeT * 0.25; cam.position.x += (Math.random() - 0.5) * a; cam.position.y += (Math.random() - 0.5) * a; }
    // pace feedback: sprint widens the FOV a little and adds a subtle stride bob
    const spr = P.sprinting && P.speed > 4.5 ? 1 : 0; this._sprK = (this._sprK || 0) + (spr - (this._sprK || 0)) * Math.min(1, dt * (spr ? 3 : 4));
    const fk = this._sprK * 7 + (ins ? 6 : 0); if (Math.abs(fk - (this._fovK || 0)) > 0.02) { this._fovK = fk; cam.fov = this.baseFov + fk; cam.updateProjectionMatrix(); }
    this._bobPh = (this._bobPh || 0) + dt * P.speed * 1.55; const bob = this._sprK * 0.055; const by = Math.abs(Math.sin(this._bobPh)) * bob, bx = Math.sin(this._bobPh) * bob * 0.5;
    cam.position.y += by; cam.position.x += rx * bx; cam.position.z += rz * bx;
    cam.lookAt(this.camTgt.x, this.camTgt.y + 0.05 + by * 0.6, this.camTgt.z);
  }
  // ---------------- main loop ----------------
  frame() {
    let dt = Math.min(0.05, this.clock.getDelta());
    this.fpsAcc[0] += dt; this.fpsAcc[1]++; if (this.fpsAcc[0] > 1) { this.fps = this.fpsAcc[1] / this.fpsAcc[0]; this.fpsAcc = [0, 0]; if (this.showFps) document.getElementById('fps').textContent = this.fps.toFixed(0) + ' fps'; }
    if (this.state === 'title') { this.time = (this.time || 0) + dt; const t = this.time * 0.05; const c = this.camera; c.position.set(-196 + Math.sin(t) * 9, heightAt(-196, 190) + 3.2, 190 + Math.cos(t) * 9); c.lookAt(-196, heightAt(-196, 190) + 1.4, 190); this.player.anim.update(dt); for (const n of this.npcs) n.update(dt, n.pos.distanceTo(this.player.pos) < 40); this.world.update(dt, this.time, -196, 190); this.updateSun(dt); tickFx(this.time); this.render(); return; }
    if (this.state !== 'play') return;
    if (!this.paused) this.update(dt);
    this.render();
  }
  /** test hook: advance the simulation without rendering */
  step(sec, dt = 1 / 30) { for (let t = 0; t < sec; t += dt) this.update(dt); this.render(); }
  render() { if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera); }
  update(dt) {
    this.time = (this.time || 0) + dt;
    if (this.hitstop > 0) { this.hitstop -= dt; dt *= 0.15; }
    const S = this.S, P = this.player;
    this._dt = dt; this.readInput(); P.update(dt, this.inp);
    S.time = (S.time + dt / 720) % 1; if (S.time < dt / 720) S.day++;
    // regen
    this.combatT = Math.max(0, (this.combatT || 0) - dt); this.sprintT = Math.max(0, (this.sprintT || 0) - dt);
    if (!P.act && !P.blocking && this.sprintT <= 0) S.stamina = Math.min(this.maxSt(), S.stamina + 46 * dt); // faster regen (v4) if (P.blocking) S.stamina = Math.min(this.maxSt(), S.stamina + 6 * dt);
    if (this.combatT <= 0 && !P.dead) S.hp = Math.min(this.maxHp(), S.hp + 0.8 * dt);
    if (this.owner) ownerTick(this);
    S.faith = Math.min(this.maxFaith(), S.faith + (0.12 + (P.speed > 1 ? this.skill('pilgrim_song') * 0.15 : 0)) * dt);
    // enemies
    this.spawner(dt); this.inCombat = false;
    for (const e of this.enemies) { if (e.active || !e.alive) e.update(dt); if (e.alive && e.aggro && e.active) { this.inCombat = true; this.combatT = Math.max(this.combatT, 3); } }
    for (const n of this.npcs) { const d = n.pos.distanceTo(P.pos); if (n.hidden) continue; n.obj.visible = d < (this.Q.level === 2 ? 80 : 55); if (n.hideAfter && !n.follow) { n.follow = true; } if (d < 90) n.update(dt, d < 50); }
    if (this.escortee && this.S.side.find(s => s.obj === 'escort' && !s.done) && Math.hypot(this.escortee.pos.x - PLACES.town.x, this.escortee.pos.z - PLACES.town.z) < 40) { this.event('escort'); this.escortee.follow = false; const e = this.escortee; setTimeout(() => { this.scene.remove(e.obj); this.npcs.splice(this.npcs.indexOf(e), 1); }, 6000); this.escortee = null; }
    // luis follows home when rescued; disappears near Villafranca
    const lu = this.npcById('luis'); if (lu && lu.follow && Math.hypot(lu.pos.x - PLACES.hamlet.x, lu.pos.z - PLACES.hamlet.z) < 30) { lu.follow = false; lu.hidden = true; lu.obj.visible = false; this.ui.toast('Luis limps home to Ana'); }
    // loot
    for (const l of [...this.loot]) { l.t += dt; l.ring.rotation.z += dt; const d = Math.hypot(l.x - P.pos.x, l.z - P.pos.z); if (d < 1.2 && !P.dead) this.pickLoot(l); else if (l.t > 240) { this.scene.remove(l.g); this.loot.splice(this.loot.indexOf(l), 1); } }
    // nodes respawn
    for (const n of this.world.nodes) if (n.respawn > 0 && n.respawn < 1e8) { n.respawn -= dt; if (n.respawn <= 0 && n.mesh) n.mesh.visible = true; }
    // interact prompt
    this.iT = (this.iT || 0) - dt; if (this.iT <= 0) { this.iT = 0.12; this.curInteract = P.dead || this.uiOpen() ? null : this.findInteract(); }
    this.ui.prompt(this.curInteract ? this.curInteract.label : null);
    this.contextButtons();
    // bells
    const bellT = [0.27, 0.5, 0.75]; for (const bt of bellT) { if (this.lastTime != null && this.lastTime < bt && S.time >= bt) { this.ringT = 3; let bd = 1e9; for (const b of this.world.bells) if (b) bd = Math.min(bd, Math.hypot(b.position.x - P.pos.x, b.position.z - P.pos.z)); if (bd < 260) { this.audio.bell(bd); setTimeout(() => this.audio.bell(bd), 1400); setTimeout(() => this.audio.bell(bd), 2800); } } } this.lastTime = S.time;
    if (this.ringT > 0) { this.ringT -= dt; for (const b of this.world.bells) if (b) b.rotation.z = Math.sin(this.time * 5) * 0.4 * Math.min(1, this.ringT); }
    // lamps (night)
    this.updateLamps(); this.updateSun(dt); this.updateCamera(dt);
    if (!this.inside) this.world.update(dt, this.time, P.pos.x, P.pos.z); else this.interiors.update(dt, this.time); this.fx.update(dt); tickFx(this.time);
    this.missions.update(dt, this.time);
    this.birds.update(dt, P.pos, !this.inside && (this.dayAmt ?? 1) > 0.5); for (const c of this.critters) c.update(dt, !this.inside && Math.hypot(c.pos.x - P.pos.x, c.pos.z - P.pos.z) < 60);
    const rd = distToPolyline(P.pos.x, P.pos.z, RIVER).d; this.audio.update(dt, { day: this.dayAmt, riverD: this.inside ? 999 : rd, wind: this.inside ? 0.05 : 0.4 + 0.3 * Math.sin(this.time * 0.05), inTown: !this.inside && Math.hypot(P.pos.x - 196, P.pos.z + 184) < 60 });
    { const stF = S.stamina / this.maxSt(); this._effort = (this._effort || 0) + (((P.sprinting ? 0.55 : 0) + (stF < 0.3 ? (0.3 - stF) * 2.2 : 0)) - (this._effort || 0)) * Math.min(1, dt * 1.5); this.audio.breathe(dt, P.dead ? 0 : Math.min(1, this._effort)); }
    this.uiT = (this.uiT || 0) - dt; if (this.uiT <= 0) { this.uiT = 0.1; this.ui.hud(); } this.mmT = (this.mmT || 0) - dt; if (this.mmT <= 0) { this.mmT = 0.2; this.ui.minimap(); }
    this.ui.overlays(dt);
    this.saveT = (this.saveT || 60) - dt; if (this.saveT <= 0) { this.saveT = 60; this.save(); }
  }
  contextButtons() {
    const P = this.player, A = document.getElementById('actions'); const near = this.inCombat || this.enemies.some(e => e.alive && e.active && e.obj.visible && e.pos.distanceTo(P.pos) < 16);
    if (near !== this._near) { this._near = near; A.classList.toggle('combat', near); if (near && !this.S.flags.tutCombat) this.combatTutorial(); }
    const ci = this.curInteract, u = document.getElementById('aUse');
    if (ci) { if (this._useL !== ci.short) { this._useL = ci.short; document.getElementById('aUseL').textContent = ci.short; } if (this._useK !== ci.kind) { this._useK = ci.kind; document.getElementById('aUseI').innerHTML = USE_ICONS[ci.kind] || USE_ICONS.use; } u.classList.remove('hidden'); }
    else u.classList.add('hidden');
  }
  combatTutorial() {
    this.S.flags.tutCombat = 1; const T = isTouch;
    const steps = [['aAtk', T ? 'Danger! Tap Attack for quick strikes — tap again to combo' : 'Danger! Left-click to attack — click again to combo'], ['aBlock', T ? 'Hold Block to guard · tap it just as they strike to parry' : 'Hold right-click to block · time it to parry'], ['aRoll', T ? 'Dodge rolls through attacks' : 'Space to dodge-roll through attacks'], ['aHeavy', T ? 'Heavy hits hard but costs stamina' : 'F for a heavy blow (costs stamina)'], ['aLock', T ? 'Lock keeps the camera on one foe' : 'T locks on to one foe']];
    steps.forEach(([id, msg], i) => setTimeout(() => { const b = document.getElementById(id); document.querySelectorAll('.ab.tut').forEach(x => x.classList.remove('tut')); b.classList.add('tut'); this.ui.toast(msg, 'gold', 3000); setTimeout(() => b.classList.remove('tut'), 3000); }, 400 + i * 3200));
  }
  updateLamps() {
    const night = 1 - (this.dayAmt ?? 1), P = this.player.pos; const L = this.world.lamps; this.lT = (this.lT || 0) - 1; if (this.lT > 0) { } 
    const sorted = L.filter(l => (l.always || l.flame?.visible) && !!l.inner === !!this.inside).map(l => [l, (l.x - P.x) ** 2 + (l.z - P.z) ** 2]).sort((a, b) => a[1] - b[1]);
    this.pls.forEach((pl, i) => { const s = sorted[i]; if (!s || s[1] > 60 * 60) { pl.intensity = 0; return; } const l = s[0]; pl.position.set(l.x, l.y + 0.2, l.z); const fl = 0.9 + Math.sin(this.time * 17 + i) * 0.05 + Math.sin(this.time * 7.3 + i * 2) * 0.05; if (l.inner) { pl.color.copy(l.color); pl.intensity = l.power * fl; pl.distance = 14; } else { pl.color.setHex(0xffa850); pl.distance = 16; pl.intensity = (l.strong ? 14 : 8) * Math.max(night, l.strong ? 0.25 : 0) * fl; } });
    for (const l of L) if (l.mesh) l.mesh.material.emissiveIntensity = 0.2 + night * 2.5;
  }
  nearRiver(x, z) { const c = this._nrC; if (c && Math.abs(c.x - x) < 0.5 && Math.abs(c.z - z) < 0.5) return c.v; const v = distToPolyline(x, z, RIVER).d < 15; this._nrC = { x, z, v }; return v; }
  surfaceType(x, z) { if (this.inside) { const k = this.inside.door?.kind; return k === 'church' || k === 'cathedral' ? 'stone' : 'wood'; } if (this.col.surfaceAt(x, z) > -100) return 'stone'; const h = heightAt(x, z); if (h < WATER - 0.1 && this.nearRiver(x, z)) return 'water'; const s = splatAt(x, z, h, 0); if (s[2] > 0.5) return 'stone'; if (s[0] > 0.5) return 'path'; return 'grass'; }
  respawn() {
    if (this.inside) { this.inside.group.visible = false; this.inside = null; this.interiors.inside = null; this.setInterior(false); }
    const S = this.S, P = this.player; const sh = this.world.interactives.find(i => i.type === 'shrine' && i.key === S.respawn) || this.world.interactives.find(i => i.type === 'shrine');
    const lost = Math.floor(S.coin * 0.1); S.coin -= lost; S.hp = this.maxHp(); S.stamina = this.maxSt(); P.dead = false; P.act = null; P.stun = 0; P.lock = null; P.pos.set(sh.x, groundY(this, sh.x, sh.z + 1), sh.z + 1); P.vel.set(0, 0, 0); P.anim.play('idle', { force: true });
    for (const e of this.enemies) { e.aggro = false; e.state = 'return'; } this.tokens.clear(); this.ui.toast(`You wake at the shrine${lost ? ` (lost ${lost} coin)` : ''}`);
  }
}

// ---------------- simple particle FX ----------------
class FX {
  constructor(scene) {
    this.scene = scene; const N = 240; this.N = N; this.p = []; const g = new THREE.BufferGeometry(); this.pos = new Float32Array(N * 3); this.col = new Float32Array(N * 3); g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); this.pts.frustumCulled = false; scene.add(this.pts);
    for (let i = 0; i < N; i++) this.p.push({ l: 0, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, c: new THREE.Color() }); this.i = 0; this.rings = [];
  }
  spark(x, y, z, color, n = 8) { const c = new THREE.Color(color); for (let k = 0; k < n; k++) { const p = this.p[this.i = (this.i + 1) % this.N]; p.l = 0.35 + Math.random() * 0.3; p.x = x; p.y = y; p.z = z; p.vx = (Math.random() - 0.5) * 5; p.vy = Math.random() * 4; p.vz = (Math.random() - 0.5) * 5; p.c.copy(c); } }
  ring(pos, color, r = 4) { const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.set(pos.x, pos.y + 0.1, pos.z); this.scene.add(m); this.rings.push({ m, t: 0, r }); for (let k = 0; k < 24; k++) { const a = k / 24 * 6.28; this.spark(pos.x + Math.cos(a) * 0.5, pos.y + 0.5, pos.z + Math.sin(a) * 0.5, color, 1); } }
  update(dt) {
    for (let i = 0; i < this.N; i++) { const p = this.p[i]; if (p.l > 0) { p.l -= dt; p.vy -= 9 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; } const k = Math.max(0, p.l) * 2.5; this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.l > 0 ? p.y : -999; this.pos[i * 3 + 2] = p.z; this.col[i * 3] = p.c.r * k; this.col[i * 3 + 1] = p.c.g * k; this.col[i * 3 + 2] = p.c.b * k; }
    this.pts.geometry.attributes.position.needsUpdate = true; this.pts.geometry.attributes.color.needsUpdate = true;
    for (const r of [...this.rings]) { r.t += dt; const s = 0.5 + r.t / 0.6 * r.r; r.m.scale.set(s, s, s); r.m.material.opacity = 0.8 * (1 - r.t / 0.6); if (r.t > 0.6) { this.scene.remove(r.m); r.m.geometry.dispose(); this.rings.splice(this.rings.indexOf(r), 1); } }
  }
}

const game = new Game(); game.boot().catch(e => { console.error(e); document.getElementById('lnote').textContent = 'Could not load: ' + e.message; });
