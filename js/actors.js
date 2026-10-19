import * as THREE from 'three';
import { clone as skClone } from '../vendor/addons/utils/SkeletonUtils.js?v=3';
import { makeHuman, Animator } from './human.js?v=3';
import { dressPilgrim, makeWeapon, attachWeapon } from './gear.js?v=3';
import { heightAt, WATER } from './world.js?v=3';
import { ENEMY_TYPES, ITEMS } from './data.js?v=3';
import { angDiff, clamp, lerp } from './util.js?v=3';

const HUMAN_MAP = { idle: 'Idle_Loop', walk: 'Walk_Loop', jog: 'Jog_Fwd_Loop', sprint: 'Sprint_Loop', a1: 'Sword_Regular_A', a2: 'Sword_Regular_B', a3: 'Sword_Regular_C', heavy: 'Sword_Attack', block: 'Sword_Block', roll: 'Roll', hit: 'Hit_Chest', kb: 'Hit_Knockback', death: 'Death01', pray: 'Spell_Simple_Shoot', gather: 'Farm_Harvest', pick: 'PickUp_Table', chest: 'Chest_Open', eat: 'Consume', talk: 'Idle_Talking_Loop', ready: 'Sword_Idle', sit: 'Sitting_Idle_Loop', fold: 'Idle_FoldArms_Loop', zwalk: 'Zombie_Walk_Fwd_Loop', zidle: 'Zombie_Idle_Loop', zatk: 'Zombie_Scratch', punch: 'Punch_Jab', chop: 'TreeChopping_Loop', yes: 'Yes', lantern: 'Idle_Lantern_Loop', formal: 'Walk_Formal_Loop' };
export function groundY(G, x, z) { return Math.max(heightAt(x, z), G.col.surfaceAt(x, z), WATER - 0.75); }

// ===================== PLAYER =====================
export class Player {
  constructor(G) {
    this.G = G; const A = G.A;
    this.obj = makeHuman(A, { sex: 'm', outfit: 'Peasant', hair: ['Hair_Beard', 'Hair_SimpleParted'], hairTint: 0x3a2a1e });
    G.scene.add(this.obj); this.anim = new Animator(this.obj, A.clips, HUMAN_MAP);
    this.dur = {}; for (const [k, a] of Object.entries(this.anim.actions)) this.dur[k] = a.getClip().duration;
    this.pos = this.obj.position; this.vel = new THREE.Vector3(); this.yaw = 0; this.r = 0.38;
    this.act = null; this.combo = 0; this.comboWindow = 0; this.iframes = 0; this.blocking = false; this.blockT = 0; this.stun = 0; this.dead = false; this.deadT = 0;
    this.stepAcc = 0; this.queued = null; this.lock = null;
    this.anim.play('idle');
  }
  dress(equip) { dressPilgrim(this.obj, equip); }
  get busy() { return !!this.act || this.stun > 0 || this.dead; }
  start(k, o = {}) { const d = (this.dur[k] || 0.8) / (o.speed || 1); this.act = { k, t: 0, dur: o.dur || d, ...o }; this.anim.play(k, { once: true, speed: (o.speed || 1) * (o.dur ? (this.dur[k] / o.dur) : 1), fade: o.fade ?? 0.1, force: true }); }
  light() {
    const S = this.G.S; if (this.dead || this.stun > 0) return;
    if (this.act && /^a\d$/.test(this.act.k)) { if (this.act.t > this.act.dur * 0.45) this.queued = 'light'; return; }
    if (this.act) return; const cost = 9; if (S.stamina < cost) { this.G.ui.toast('Too tired'); return; }
    S.stamina -= cost; const k = 'a' + (1 + (this.comboWindow > 0 ? this.combo % 3 : 0)); this.combo = this.comboWindow > 0 ? this.combo + 1 : 1;
    this.faceTarget(); this.start(k, { speed: 1.35, hitAt: 0.38, mult: [1, 1.1, 1.4][(this.combo - 1) % 3], range: 2.3, arc: 1.3, lunge: 2.2 }); this.G.audio.swing();
  }
  heavy() {
    const S = this.G.S; if (this.busy) return; if (S.stamina < 24) { this.G.ui.toast('Too tired'); return; }
    S.stamina -= 24; this.faceTarget(); this.start('heavy', { speed: 1.05, hitAt: 0.5, mult: 2.3, range: 2.6, arc: 1.6, heavyHit: true, lunge: 3.0 }); this.G.audio.swing(0.6);
  }
  roll(dirX, dirZ) {
    const S = this.G.S; if (this.dead || this.stun > 0 || (this.act && this.act.k === 'roll')) return; if (this.act && this.act.t < this.act.dur * 0.5 && this.act.k !== 'block') return;
    if (S.stamina < 20) { this.G.ui.toast('Too tired'); return; } S.stamina -= 20;
    let dx = dirX, dz = dirZ; if (Math.hypot(dx, dz) < 0.2) { dx = Math.sin(this.yaw); dz = Math.cos(this.yaw); } const l = Math.hypot(dx, dz); dx /= l; dz /= l;
    this.yaw = Math.atan2(dx, dz); this.start('roll', { dur: 0.62, rdx: dx, rdz: dz }); this.iframes = 0.42; this.G.audio.whoosh();
  }
  pray() {
    const G = this.G, S = G.S; if (this.busy) return; if (S.faith < 18) { G.ui.toast('Not enough faith — rest at a shrine'); return; }
    S.faith -= 18; this.start('pray', { speed: 1.2, prayAt: 0.45 }); G.audio.choir();
  }
  faceTarget() { const e = this.lock && this.lock.alive ? this.lock : this.G.nearestEnemy(this.pos, 4, this.yaw, 1.8); if (e) this.yaw = Math.atan2(e.pos.x - this.pos.x, e.pos.z - this.pos.z); }
  doAnim(k, d = 0.9) { if (this.busy) return false; this.start(k, { dur: d }); return true; }
  hurt(dmg, from, heavy) {
    if (this.dead || this.iframes > 0) return 'dodged';
    const G = this.G, S = G.S; const ang = Math.atan2(from.x - this.pos.x, from.z - this.pos.z); const front = Math.abs(angDiff(this.yaw, ang)) < 1.15;
    if (this.blocking && front) {
      if (this.blockT < 0.2) { G.audio.parry(); G.fx.spark(this.pos.x + Math.sin(this.yaw) * 0.6, this.pos.y + 1.2, this.pos.z + Math.cos(this.yaw) * 0.6, 0xfff0c0, 10); return 'parry'; }
      const red = 0.72 + G.skill('swordless') * 0.05; const cost = dmg * 0.7; S.stamina -= cost;
      if (S.stamina > 0) { G.audio.block(); dmg *= 1 - red; G.fx.spark(this.pos.x + Math.sin(this.yaw) * 0.6, this.pos.y + 1.2, this.pos.z + Math.cos(this.yaw) * 0.6, 0xffd080, 6); }
      else { S.stamina = 0; this.blocking = false; heavy = true; G.ui.toast('Guard broken'); }
    }
    dmg = Math.max(1, dmg - G.def() * 0.35); S.hp -= dmg; G.ui.flash(); G.audio.hurt();
    const kb = heavy ? 6 : 2.5; this.vel.x = -Math.sin(ang) * kb; this.vel.z = -Math.cos(ang) * kb;
    if (S.hp <= 0) { if (G.skill('martyr') && !G.S.flags.martyrUsed) { S.hp = 1; G.S.flags.martyrUsed = true; G.ui.toast("Martyr's Resolve holds you up"); } else { this.die(); return 'dead'; } }
    if (!this.blocking || heavy) { this.act = null; this.stun = heavy ? 0.7 : 0.32; this.anim.play(heavy ? 'kb' : 'hit', { once: true, force: true, speed: heavy ? 1.3 : 1.6 }); }
    G.cam.shake(heavy ? 0.35 : 0.15); return 'hit';
  }
  die() { this.dead = true; this.deadT = 0; this.act = null; this.anim.play('death', { once: true, force: true }); this.G.audio.hurt(); }
  update(dt, inp) {
    const G = this.G, S = G.S;
    if (this.dead) { this.deadT += dt; this.anim.update(dt); if (this.deadT > 3.2) G.respawn(); return; }
    this.iframes = Math.max(0, this.iframes - dt); this.comboWindow = Math.max(0, this.comboWindow - dt); if (this.stun > 0) this.stun -= dt;
    // camera-relative intent
    const cy = G.cam.yaw; const fx = -Math.sin(cy), fz = -Math.cos(cy), rx = Math.cos(cy), rz = -Math.sin(cy);
    let mx = inp.mx, my = inp.my; const mag = Math.min(1, Math.hypot(mx, my));
    let dx = fx * my + rx * mx, dz = fz * my + rz * mx; const dl = Math.hypot(dx, dz); if (dl > 1e-3) { dx /= dl; dz /= dl; }
    this.intent = { dx, dz, mag };
    // block
    const wantBlock = inp.block && !this.dead && this.stun <= 0 && (!this.act || this.act.k === 'block');
    if (wantBlock && !this.blocking) { this.blocking = true; this.blockT = 0; this.anim.play('block', { once: true, fade: 0.08, force: true }); }
    if (!wantBlock && this.blocking) this.blocking = false;
    if (this.blocking) this.blockT += dt;
    // action progression
    let speedCap = 0; let moveX = 0, moveZ = 0;
    const walkMax = 2.0 * G.speedMul(), jogMax = 4.1 * G.speedMul(), sprintMax = 5.9 * G.speedMul();
    const wading = heightAt(this.pos.x, this.pos.z) < WATER - 0.3 && G.col.surfaceAt(this.pos.x, this.pos.z) < -100;
    if (this.act) {
      const a = this.act; a.t += dt; const p = a.t / a.dur;
      if (a.lunge && p < 0.4) { moveX = Math.sin(this.yaw) * a.lunge; moveZ = Math.cos(this.yaw) * a.lunge; speedCap = -1; }
      if (a.k === 'roll') { const sp = 6.2 * (1 - p * 0.6); moveX = a.rdx * sp; moveZ = a.rdz * sp; speedCap = -1; }
      if (a.hitAt != null && !a.hitDone && p >= a.hitAt) { a.hitDone = true; G.playerStrike(a); }
      if (a.prayAt != null && !a.prayDone && p >= a.prayAt) { a.prayDone = true; G.prayBurst(); }
      if (/^a\d$/.test(a.k) && this.queued === 'light' && p > 0.62) { this.queued = null; this.act = null; this.comboWindow = 0.6; this.light(); }
      else if (p >= 1) { if (/^a\d$/.test(a.k)) this.comboWindow = 0.55; if (a.done) a.done(); this.act = null; this.queued = null; }
    }
    if (!this.act && this.stun <= 0) {
      let target = mag < 0.08 ? 0 : (mag < 0.6 ? walkMax * (0.45 + mag) : jogMax);
      if (this.blocking) target = Math.min(target, 1.2);
      if (inp.sprint && mag > 0.3 && !this.blocking && S.stamina > 1) { target = sprintMax; S.stamina -= 16 * dt; G.sprintT = 0.25; }
      if (wading) target *= 0.55;
      moveX = dx * target; moveZ = dz * target; speedCap = target;
      if (mag > 0.08) { const want = Math.atan2(dx, dz); this.yaw += angDiff(this.yaw, want) * Math.min(1, dt * 11); }
      if (this.lock && this.lock.alive && this.blocking) this.yaw = Math.atan2(this.lock.pos.x - this.pos.x, this.lock.pos.z - this.pos.z);
    }
    // smooth acceleration
    const acc = speedCap < 0 ? 30 : (Math.hypot(moveX, moveZ) > Math.hypot(this.vel.x, this.vel.z) ? 9 : 12);
    this.vel.x += (moveX - this.vel.x) * Math.min(1, acc * dt); this.vel.z += (moveZ - this.vel.z) * Math.min(1, acc * dt);
    let nx = this.pos.x + this.vel.x * dt, nz = this.pos.z + this.vel.z * dt;
    const res = G.col.resolve(nx, nz, this.r, this.pos.y + 0.3); nx = res.x; nz = res.z;
    for (const n of G.npcs) { const ddx = nx - n.pos.x, ddz = nz - n.pos.z, d = Math.hypot(ddx, ddz); if (d < 0.75 && d > 1e-4) { nx = n.pos.x + ddx / d * 0.75; nz = n.pos.z + ddz / d * 0.75; } }
    for (const e of G.enemies) if (e.alive && e.active) { const ddx = nx - e.pos.x, ddz = nz - e.pos.z, d = Math.hypot(ddx, ddz), m = e.r + this.r; if (d < m && d > 1e-4) { nx = e.pos.x + ddx / d * m; nz = e.pos.z + ddz / d * m; } }
    nx = clamp(nx, -292, 292); nz = clamp(nz, -292, 292);
    const sp = Math.hypot(nx - this.pos.x, nz - this.pos.z) / Math.max(dt, 1e-4);
    this.pos.x = nx; this.pos.z = nz; const gy = groundY(G, nx, nz); this.pos.y += (gy - this.pos.y) * Math.min(1, dt * 18);
    this.obj.rotation.y = this.yaw;
    // locomotion anim
    if (!this.act && this.stun <= 0 && !this.blocking) {
      if (sp < 0.25) this.anim.play(G.inCombat ? 'ready' : 'idle', { fade: 0.25 });
      else if (sp < 2.6) this.anim.play('walk', { speed: clamp(sp / 1.9, 0.6, 1.5), fade: 0.2 });
      else if (sp < 5.0) this.anim.play('jog', { speed: clamp(sp / 4.0, 0.75, 1.3), fade: 0.2 });
      else this.anim.play('sprint', { speed: clamp(sp / 5.8, 0.8, 1.2), fade: 0.2 });
    }
    // footsteps
    if (sp > 0.6 && !this.act) { this.stepAcc += sp * dt; const stride = sp > 5 ? 1.5 : sp > 2.6 ? 1.25 : 0.72; if (this.stepAcc > stride) { this.stepAcc = 0; G.audio.step(G.surfaceType(nx, nz), sp > 5 ? 1 : 0.6); } }
    this.speed = sp; this.anim.update(dt);
  }
}

// ===================== ENEMIES =====================
const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3a2a });
export class Enemy {
  constructor(G, type, x, z, lvl, home) {
    this.G = G; this.type = type; this.def = ENEMY_TYPES[type]; const d = this.def; this.lvl = lvl;
    this.maxHp = Math.round(d.hp * (1 + 0.2 * (lvl - 1))); this.hp = this.maxHp; this.atk = d.atk * (1 + 0.13 * (lvl - 1));
    this.home = home || { x, z, r: 30 }; this.r = type === 'wolf' ? 0.5 : type === 'boar' ? 0.55 : 0.4;
    this.alive = true; this.state = 'idle'; this.t = 0; this.cd = 1 + Math.random(); this.wanderT = 0; this.yaw = Math.random() * 6; this.stun = 0; this.kb = new THREE.Vector3();
    this.slot = Math.random() * Math.PI * 2; this.active = false; this.deadT = 0;
    const A = G.A;
    if (type === 'wolf') { this.obj = skClone(A.wolf.scene); this.obj.scale.setScalar(0.3); this.mixer = new THREE.AnimationMixer(this.obj); this.clips = A.wolf.clipMap; this.mapA = { idle: 'Idle', walk: 'Walk', run: 'Gallop', atk: 'Attack', hit: 'Idle_HitReact_Left', death: 'Death', tele: 'Idle_2_HeadLow', eat: 'Eating' }; }
    else if (type === 'boar') { this.obj = new THREE.Group(); const b = A.boar.scene.clone(true); b.scale.setScalar(0.013); this.body = b; this.obj.add(b); }
    else { // humans
      const opts = type === 'demon' ? { sex: 'm', outfit: 'Ranger', demon: true, hair: [] } : { sex: 'm', outfit: 'Ranger', hair: [Math.random() < 0.5 ? 'Hair_Beard' : 'Hair_Buzzed'], tints: { cloth: type === 'bandit_chief' ? 0x5a1a14 : [0x3a3026, 0x2c2a22, 0x46301e][Math.floor(Math.random() * 3)] } };
      this.obj = makeHuman(A, opts); if (type === 'bandit_chief') this.obj.scale.setScalar(1.08);
      this.anim = new Animator(this.obj, A.clips, HUMAN_MAP);
      if (type !== 'demon') { const w = makeWeapon(type === 'bandit_chief' ? 'iron_sword' : (Math.random() < 0.5 ? 'wood_knife' : 'oak_staff')); if (this.obj.userData.bones.hand_r) attachWeapon(this.obj.userData.bones.hand_r, w); }
      else { const eyes = new THREE.Group(); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), eyeMat); e.position.set(s * 0.035, 0.08, 0.1); eyes.add(e); } this.obj.userData.bones.Head?.add(eyes);
        this.obj.traverse(o => { if (o.isMesh) o.castShadow = false; }); }
    }
    this.obj.traverse(o => { if (o.isMesh) o.castShadow = true; });
    if (type === 'demon') this.obj.traverse(o => { if (o.isMesh) o.castShadow = false; });
    this.pos = this.obj.position; this.pos.set(x, heightAt(x, z), z); G.scene.add(this.obj); this.obj.visible = false;
    // telegraph ring
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 1.0, 28), new THREE.MeshBasicMaterial({ color: 0xff4020, transparent: true, opacity: 0, depthWrite: false })); this.ring.rotation.x = -Math.PI / 2; this.ring.renderOrder = 3; G.scene.add(this.ring);
    this.playA('idle');
  }
  playA(k, o = {}) {
    if (this.anim) { const map = { idle: this.type === 'demon' ? 'zidle' : (this.state === 'chase' || this.state === 'circle' ? 'ready' : 'idle'), walk: this.type === 'demon' ? 'zwalk' : 'walk', run: this.type === 'demon' ? 'zwalk' : 'jog', atk: this.type === 'demon' ? 'zatk' : (this.def.boss ? 'heavy' : 'a1'), tele: 'ready', hit: 'hit', death: 'death', block: 'block' }; return this.anim.play(map[k] || k, o); }
    if (this.mixer) { const name = this.mapA[k] || this.mapA.idle; const c = this.clips[name]; if (!c) return; const a = this.mixer.clipAction(c); if (this.cur === a && !o.force) { a.timeScale = o.speed || 1; return; } a.reset(); a.setLoop(o.once ? THREE.LoopOnce : THREE.LoopRepeat, o.once ? 1 : Infinity); a.clampWhenFinished = !!o.once; a.timeScale = o.speed || 1; if (this.cur) a.crossFadeFrom(this.cur, 0.15, false); a.play(); this.cur = a; }
  }
  hurt(dmg, dir, heavy) {
    if (!this.alive) return; this.hp -= dmg; this.lastHit = 0; this.aggro = true; this.G.alertPack(this);
    this.kb.set(dir.x, 0, dir.z).multiplyScalar(heavy ? 7 : 3.2);
    if (this.state === 'tele' && !heavy && this.type !== 'demon' && !this.def.boss) { } // hyper-armour on boss only
    if (!(this.def.boss && this.state === 'strike')) { this.stun = heavy ? 0.6 : 0.28; if (this.state === 'tele' || this.state === 'strike') this.state = 'recover'; this.t = 0; this.playA('hit', { once: true, force: true, speed: 1.4 }); }
    if (this.hp <= 0) this.die();
  }
  die() {
    this.alive = false; this.state = 'dead'; this.deadT = 0; this.ring.material.opacity = 0; this.G.releaseToken(this);
    if (this.type === 'boar') this.dieRot = 0; else this.playA('death', { once: true, force: true });
    this.G.onEnemyKilled(this);
  }
  update(dt) {
    const G = this.G, P = G.player; this.t += dt;
    if (!this.alive) { this.deadT += dt; if (this.type === 'boar') { this.body.rotation.z = Math.min(Math.PI / 2, this.deadT * 4); } if (this.type === 'demon') this.obj.traverse(o => { if (o.isMesh) { o.material.opacity = Math.max(0, 0.9 - this.deadT); } });
      if (this.deadT > 4) { this.obj.position.y -= dt * 0.5; } if (this.deadT > 6) { this.obj.visible = false; this.gone = true; } this.animUpdate(dt); return; }
    const d = this.def; const dx = P.pos.x - this.pos.x, dz = P.pos.z - this.pos.z, dist = Math.hypot(dx, dz); const toP = Math.atan2(dx, dz);
    let mvx = 0, mvz = 0, faceYaw = null;
    const aggroR = d.aggro * (1 - G.skill('quiet_step') * 0.12) * (G.isNight && this.type === 'wolf' ? 1.3 : 1);
    if (P.dead) { this.aggro = false; if (this.state !== 'idle' && this.state !== 'wander') { this.state = 'wander'; G.releaseToken(this); } }
    else if (!this.aggro && dist < aggroR && this.state !== 'flee') { this.aggro = true; G.alertPack(this); if (this.type === 'wolf') G.audio.growl(); }
    const homeD = Math.hypot(this.pos.x - this.home.x, this.pos.z - this.home.z);
    if (this.aggro && (homeD > this.home.r + 25 || dist > 40)) { this.aggro = false; this.state = 'return'; G.releaseToken(this); }
    if (this.stun > 0) { this.stun -= dt; mvx = this.kb.x; mvz = this.kb.z; this.kb.multiplyScalar(Math.max(0, 1 - dt * 6)); }
    else if (this.hp < this.maxHp * 0.25 && !d.boss && this.type !== 'demon' && this.state !== 'flee' && !this.fled) { this.state = 'flee'; this.fled = true; this.t = 0; G.releaseToken(this); }
    else if (this.state === 'flee') { mvx = -dx / dist * d.speed * 0.9; mvz = -dz / dist * d.speed * 0.9; faceYaw = Math.atan2(mvx, mvz); this.playA('run'); if (this.t > 4) { this.state = 'return'; this.aggro = false; this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.3); } }
    else if (this.state === 'tele') { faceYaw = toP; this.ring.material.opacity = 0.25 + 0.6 * (this.t / d.tele); this.ring.scale.setScalar(0.6 + this.t / d.tele * 0.8);
      if (this.type === 'wolf') this.playA('tele'); else if (this.type === 'boar') { this.body.rotation.x = Math.sin(this.t * 30) * 0.06; }
      if (this.t >= d.tele) { this.state = 'strike'; this.t = 0; this.hitDone = false; this.ring.material.opacity = 0; this.chargeDir = { x: dx / dist, z: dz / dist }; if (this.type !== 'boar') this.playA('atk', { once: true, force: true, speed: this.type === 'wolf' ? 1.2 : 1.1 }); else G.audio.grunt(); } }
    else if (this.state === 'strike') {
      if (d.charge) { mvx = this.chargeDir.x * d.speed * 1.25; mvz = this.chargeDir.z * d.speed * 1.25; faceYaw = Math.atan2(mvx, mvz); if (!this.hitDone && dist < 1.5) { this.hitDone = true; G.enemyHits(this, true); } if (this.t > 1.1 || this.bonked) { this.state = 'recover'; this.t = 0; if (this.bonked) { this.stun = 1.4; G.ui.toast('The boar is stunned!'); } this.bonked = false; } }
      else { faceYaw = toP; const hitT = this.type === 'wolf' ? 0.3 : this.def.boss ? 0.45 : 0.32; if (this.type === 'wolf' && this.t < 0.35) { mvx = Math.sin(this.yaw) * 6; mvz = Math.cos(this.yaw) * 6; }
        if (!this.hitDone && this.t > hitT) { this.hitDone = true; if (dist < d.range + 0.5 && Math.abs(angDiff(this.yaw, toP)) < 1.0) G.enemyHits(this, !!this.def.boss); }
        if (this.t > (this.def.boss ? 1.1 : 0.85)) { this.state = 'recover'; this.t = 0; } } }
    else if (this.state === 'recover') { if (this.t > 0.5) { this.state = 'chase'; G.releaseToken(this); this.cd = 0.8 + Math.random() * 1.2; } }
    else if (this.aggro) {
      this.state = this.state === 'idle' || this.state === 'wander' || this.state === 'return' ? 'chase' : this.state;
      this.cd -= dt; const hasTok = G.hasToken(this);
      let tx, tz, spd = d.speed;
      if (hasTok || this.def.boss || this.type === 'demon') { tx = P.pos.x; tz = P.pos.z; if (dist < d.range + (d.charge ? 5 : 0) && this.cd <= 0) { this.state = 'tele'; this.t = 0; } }
      else { // circle / flank at radius
        this.slot += dt * 0.35 * (this.type === 'wolf' ? 1 : 0.6); const R = this.type === 'wolf' ? 4.2 : 3.6; tx = P.pos.x + Math.sin(this.slot) * R; tz = P.pos.z + Math.cos(this.slot) * R; spd = d.speed * 0.6;
        if (this.cd <= 0 && G.requestToken(this)) { }
      }
      const ex = tx - this.pos.x, ez = tz - this.pos.z, el = Math.hypot(ex, ez);
      if (el > 0.6 && !(hasTok && dist < d.range * 0.85)) { mvx = ex / el * spd; mvz = ez / el * spd; }
      faceYaw = dist < 7 ? toP : Math.atan2(mvx, mvz);
      const ms = Math.hypot(mvx, mvz); if (ms < 0.3) this.playA('idle'); else this.playA(ms > d.speed * 0.7 ? 'run' : 'walk', { speed: this.type === 'wolf' ? clamp(ms / 4.5, 0.6, 1.4) : 1 });
    } else { // idle / wander / return
      if (this.state === 'return' && homeD < 4) this.state = 'idle';
      if (this.state === 'return') { const ex = this.home.x - this.pos.x, ez = this.home.z - this.pos.z, el = Math.hypot(ex, ez); mvx = ex / el * d.walk * 2; mvz = ez / el * d.walk * 2; this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.1 * dt); }
      else { this.wanderT -= dt; if (this.wanderT <= 0) { this.wanderT = 4 + Math.random() * 6; const a = Math.random() * 6.28, r = Math.random() * this.home.r; this.wp = Math.random() < 0.35 ? null : { x: this.home.x + Math.cos(a) * r, z: this.home.z + Math.sin(a) * r }; }
        if (this.wp) { const ex = this.wp.x - this.pos.x, ez = this.wp.z - this.pos.z, el = Math.hypot(ex, ez); if (el < 1) this.wp = null; else { mvx = ex / el * d.walk; mvz = ez / el * d.walk; } } }
      const ms = Math.hypot(mvx, mvz); this.playA(ms < 0.2 ? 'idle' : (this.state === 'return' ? 'run' : 'walk'));
      if (faceYaw == null && ms > 0.2) faceYaw = Math.atan2(mvx, mvz);
    }
    if (faceYaw != null) this.yaw += angDiff(this.yaw, faceYaw) * Math.min(1, dt * (this.state === 'strike' && d.charge ? 2 : 8));
    let nx = this.pos.x + mvx * dt, nz = this.pos.z + mvz * dt; const r = G.col.resolve(nx, nz, this.r, this.pos.y + 0.3);
    if (r.hit && this.state === 'strike' && d.charge) this.bonked = true;
    nx = r.x; nz = r.z;
    for (const o of G.enemies) if (o !== this && o.alive && o.active) { const ddx = nx - o.pos.x, ddz = nz - o.pos.z, dd = Math.hypot(ddx, ddz), m = this.r + o.r; if (dd < m && dd > 1e-4) { nx += ddx / dd * (m - dd) * 0.5; nz += ddz / dd * (m - dd) * 0.5; } }
    this.pos.x = nx; this.pos.z = nz; const gy = groundY(G, nx, nz); this.pos.y += (gy - this.pos.y) * Math.min(1, dt * 15);
    this.obj.rotation.y = this.yaw;
    if (this.type === 'boar' && this.state !== 'tele') { const ms = Math.hypot(mvx, mvz); this.body.position.y = Math.abs(Math.sin(this.t * (6 + ms * 2))) * 0.05 * Math.min(1, ms); this.body.rotation.x = Math.sin(this.t * (6 + ms * 2)) * 0.05 * Math.min(1, ms); }
    if (this.type === 'demon') { const p = 0.5 + Math.sin(this.t * 3) * 0.3; this.obj.traverse(o => { if (o.isMesh && o.material.emissive) o.material.emissiveIntensity = p; }); }
    this.ring.position.set(this.pos.x, this.pos.y + 0.06, this.pos.z);
    this.animUpdate(dt);
  }
  animUpdate(dt) { if (this.anim) this.anim.update(dt); if (this.mixer) this.mixer.update(dt); }
  dispose() { this.G.scene.remove(this.obj); this.G.scene.remove(this.ring); }
}

// ===================== NPCs =====================
export class NPC {
  constructor(G, def) {
    this.G = G; this.def = def; this.id = def.id; this.name = def.name;
    this.obj = makeHuman(G.A, def.look); G.scene.add(this.obj);
    if (def.look.extra) def.look.extra(this.obj);
    this.anim = new Animator(this.obj, G.A.clips, HUMAN_MAP); this.pos = this.obj.position; this.pos.set(def.x, heightAt(def.x, def.z), def.z);
    this.yaw = def.yaw || 0; this.baseYaw = this.yaw; this.idleK = def.idle || 'idle'; this.anim.play(this.idleK); this.anim.mixer.setTime(Math.random() * 3);
    this.route = def.route || null; this.ri = 0; this.waitT = Math.random() * 3; this.r = 0.38;
  }
  update(dt, near) {
    const G = this.G, P = G.player; const dx = P.pos.x - this.pos.x, dz = P.pos.z - this.pos.z, dist = Math.hypot(dx, dz);
    let mv = 0;
    if (this.follow && !P.dead) { if (dist > 3) { const sp = dist > 8 ? 4 : 1.8; mv = sp; this.yaw += angDiff(this.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 6); const nx = this.pos.x + dx / dist * sp * dt, nz = this.pos.z + dz / dist * sp * dt; const r = G.col.resolve(nx, nz, this.r, this.pos.y + 0.3); this.pos.x = r.x; this.pos.z = r.z; } }
    else if (this.route && !(this.talking)) {
      if (this.waitT > 0) { this.waitT -= dt; }
      else { const w = this.route[this.ri]; const ex = w[0] - this.pos.x, ez = w[1] - this.pos.z, el = Math.hypot(ex, ez); if (el < 0.8) { this.ri = (this.ri + 1) % this.route.length; this.waitT = this.def.wait ?? (2 + Math.random() * 5); }
        else { const sp = this.def.speed || 1.3; mv = sp; this.yaw += angDiff(this.yaw, Math.atan2(ex, ez)) * Math.min(1, dt * 5); const nx = this.pos.x + ex / el * sp * dt, nz = this.pos.z + ez / el * sp * dt; const r = G.col.resolve(nx, nz, this.r, this.pos.y + 0.3); this.pos.x = r.x; this.pos.z = r.z; if (dist < 1.1) { this.pos.x -= ex / el * sp * dt; this.pos.z -= ez / el * sp * dt; } } }
    }
    if (mv === 0 && dist < 4.5 && this.idleK !== 'sit') this.yaw += angDiff(this.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 3);
    else if (mv === 0 && !this.route && !this.follow) this.yaw += angDiff(this.yaw, this.baseYaw) * Math.min(1, dt * 1.5);
    this.pos.y = groundY(G, this.pos.x, this.pos.z); this.obj.rotation.y = this.yaw;
    this.anim.play(mv > 2.5 ? 'jog' : mv > 0 ? 'walk' : (this.talking ? 'talk' : this.idleK), { speed: mv > 0 ? clamp(mv / 1.5, 0.7, 1.2) : 1 });
    if (near) this.anim.update(dt);
  }
}
