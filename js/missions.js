// v5 structured missions: giver -> objective steps (each with a place on the map) -> reward.
// Every step resolves to a world position, so the tracker line, the 3D beacon, the edge arrow and the minimap pin always know where to point.
import * as THREE from 'three';
import { Enemy, NPC } from './actors.js?v=5';
import { heightAt } from './world.js?v=5';
import { ITEMS } from './data.js?v=5';

const P = (x, z) => [x, z];
// k: goto | talk | fetch | kill | pickup | escort | votive | kneel | shrine | return
export const MISSIONS = [
  // ---------------- San Roque ----------------
  { id: 'm_bucket', name: 'The Lost Bucket', giver: 'marta', area: 'San Roque', minLvl: 1,
    intro: 'The well rope snapped and the bucket washed down the stream. It will be caught on the stones by the River Shrine, east along the road.',
    steps: [{ k: 'pickup', at: P(-121, 114), label: 'Marta\'s bucket', d: 'Find Marta\'s bucket by the River Shrine', place: 'River Shrine' }, { k: 'return', d: 'Bring the bucket back to Marta' }],
    reward: { xp: 35, coin: 15, items: { bread: 2 } }, outro: 'My bucket! Now I can water the hens before Vespers. Take some bread for the road.' },
  { id: 'm_turnips', name: 'Turnip Thieves', giver: 'paco', area: 'San Roque farm', minLvl: 1,
    intro: 'Two boars are rooting through my turnips right now, in the field west of the barn. Chase them off before they eat the lot.',
    steps: [{ k: 'kill', enemy: 'boar', n: 2, at: P(-255, 128), d: 'Drive off 2 boars in Paco\'s turnip field', place: 'Turnip field' }, { k: 'return', d: 'Tell Paco his field is safe' }],
    reward: { xp: 55, coin: 25, items: { cooked_meat: 2 } }, outro: 'Ha! They will think twice. Here — my wife roasted this last night.' },
  { id: 'm_firewood', name: 'Wood for the Fire', giver: 'marta', area: 'San Roque', minLvl: 1, after: 'm_bucket',
    intro: 'The nights are cold and Old Tomás sleeps outside. Bring me 4 pieces of wood from the fallen logs around the village and I will keep a fire for him.',
    steps: [{ k: 'fetch', item: 'wood', n: 4, d: 'Collect 4 wood from fallen logs', place: 'Village edges' }, { k: 'return', d: 'Bring the wood to Marta' }],
    reward: { xp: 40, coin: 18, items: { bandage: 2 } }, outro: 'That will keep him warm a week. God reward you.' },
  { id: 'm_letter', name: 'A Letter for the Sister', giver: 'poor_1', area: 'San Roque → Villafranca', minLvl: 1,
    intro: 'I cannot walk the road any more. Would you carry this letter to Sister Inés at the Villafranca church? She nursed me once, years ago.',
    steps: [{ k: 'talk', npc: 'sister', d: 'Give Tomás\'s letter to Sister Inés in Villafranca', place: 'Villafranca Church', line: 'From Tomás? He is alive! Thank God. Tell him I pray for him every evening. Here — take this for your trouble.' }],
    reward: { xp: 60, coin: 20, items: { wooden_rosary: 1 } } },
  { id: 'm_vigil', name: 'Prayer at the River', giver: 'poor_1', area: 'River Shrine', minLvl: 1, after: 'm_letter',
    intro: 'My wife is buried near the River Shrine. Would you say a prayer there for her soul? It would mean the world to an old man.',
    steps: [{ k: 'shrine', key: 'shrine_river', d: 'Rest and pray at the River Shrine', place: 'River Shrine' }, { k: 'return', d: 'Tell Tomás you prayed for her' }],
    reward: { xp: 45, coin: 10, items: { candle: 2 } }, outro: 'Eternal rest grant unto her, O Lord. Thank you, child. Take these candles — light one for yourself.' },
  // ---------------- Old Bridge (miller) ----------------
  { id: 'm_flour', name: 'Flour for San Roque', giver: 'martin', area: 'Old Bridge → San Roque', minLvl: 1,
    intro: 'Marta in San Roque ordered a sack of flour and my cart has a broken wheel. Tell her it will come Thursday — and bring back what she owes.',
    steps: [{ k: 'talk', npc: 'marta', d: 'Give Martín\'s message to Marta in San Roque', place: 'San Roque', line: 'Thursday? Typical Martín. Here are his coins, and tell him the last sack had weevils.' }, { k: 'return', d: 'Bring Marta\'s coins back to Martín the miller' }],
    reward: { xp: 45, coin: 22, items: { bread: 3 } }, outro: 'Weevils! Never. Well — keep the loaves, pilgrim.' },
  { id: 'm_bridge', name: 'Wolves at the Bridge', giver: 'martin', area: 'Old Bridge', minLvl: 2, after: 'm_flour',
    intro: 'Two wolves have started waiting under the far end of the bridge for my mules. Drive them off and I will pay you well.',
    steps: [{ k: 'kill', enemy: 'wolf', n: 2, at: P(-72, 61), d: 'Drive off 2 wolves at the east end of the Old Bridge', place: 'Old Bridge' }, { k: 'return', d: 'Tell Martín the bridge is safe' }],
    reward: { xp: 80, coin: 35, items: { leather_boots: 1 } }, outro: 'My mules thank you. These boots were my son\'s — they will serve you better.' },
  // ---------------- Villafranca ----------------
  { id: 'm_candles', name: 'Light the Candles', giver: 'sister', area: 'Villafranca Church', minLvl: 1,
    intro: 'The votive candles in our church have all burned down, and the village grieves its dead. Take these three coins — light three candles at the stand, then kneel and pray at the altar for them.',
    onAccept: G => { G.S.coin += 3; G.ui.toast('+3 coin for the candles'); },
    steps: [{ k: 'votive', room: 'church_vf', n: 3, d: 'Light 3 votive candles in Villafranca church', place: 'Villafranca Church' }, { k: 'kneel', room: 'church_vf', d: 'Kneel and pray at the altar', place: 'Villafranca Church' }, { k: 'return', d: 'Tell Sister Inés the candles are lit' }],
    reward: { xp: 60, coin: 15, items: { holy_water: 1 } }, outro: 'I saw them from the door — like little stars. May perpetual light shine upon them.' },
  { id: 'm_herbs', name: 'Herbs for the Sick', giver: 'ana', area: 'Villafranca', minLvl: 1,
    intro: 'Half the village has a fever. Lucía the apothecary says boiled herbs help. Could you gather 4 herbs? They grow along the river and the forest edge.',
    steps: [{ k: 'fetch', item: 'herb', n: 4, d: 'Gather 4 herbs', place: 'Riverbanks and forest edge' }, { k: 'return', d: 'Bring the herbs to Ana' }],
    reward: { xp: 50, coin: 20, items: { herb_poultice: 1 } }, outro: 'They smell like summer. Thank you — keep this poultice, you look like you need it.' },
  { id: 'm_monk', name: 'The Blind Monk', giver: 'sister', area: 'Villafranca → Forest Shrine', minLvl: 2, after: 'm_candles',
    intro: 'Brother Bento wants to pray at the Forest Shrine, but he cannot see the path and the woods are not safe. Walk with him and keep him close.',
    steps: [{ k: 'escort', who: { name: 'Brother Bento', look: { sex: 'm', outfit: 'Ranger', hair: ['Hair_Buzzed', 'Hair_Beard'], tints: { cloth: 0x4a3a2a } } }, to: P(18, -50), r: 7, d: 'Lead Brother Bento to the Forest Shrine', place: 'Forest Shrine' }],
    reward: { xp: 90, coin: 30, items: { olive_rosary: 1 } }, outro: 'I can hear the leaves here. Thank you, my son. Take my rosary — I know every bead by touch, I will not need it.' },
  // ---------------- Forest Shrine (hermit) ----------------
  { id: 'm_hermit', name: 'The Hermit\'s Peace', giver: 'tome', area: 'Wolf Woods', minLvl: 2,
    intro: 'Three wolves have made their den in the woods south of my shrine. I pray for them — but I would rather they hunted elsewhere. Drive them off.',
    steps: [{ k: 'kill', enemy: 'wolf', n: 3, at: P(-46, -98), d: 'Drive off 3 wolves in the Wolf Woods', place: 'Wolf Woods' }, { k: 'return', d: 'Return to Brother Tomé at the Forest Shrine' }],
    reward: { xp: 100, coin: 35, items: { st_christopher: 1 } }, outro: 'Silence again. Saint Christopher kept me safe on the road — let him keep you.' },
  { id: 'm_medal', name: 'The Chapel Medal', giver: 'tome', area: 'Ruined Chapel', minLvl: 2, after: 'm_hermit',
    intro: 'Before the chapel fell, the priest buried a medal of Our Lady by its door so the bandits would not take it. Find it and bring it to the cathedral in Santiago, to Father Anselm.',
    steps: [{ k: 'pickup', at: P(-46, -165), label: 'Medal of Our Lady', d: 'Find the medal by the Ruined Chapel door', place: 'Ruined Chapel' }, { k: 'talk', npc: 'priest', d: 'Give the medal to Father Anselm in Santiago', place: 'Santiago', line: 'Our Lady of the chapel! We thought it lost for good. It will hang by the altar tonight. Keep this one — it was blessed with it.' }],
    reward: { xp: 120, coin: 45, items: { miraculous_medal: 1 } } },
  // ---------------- Western Hills (shepherd) ----------------
  { id: 'm_crook', name: 'The Shepherd\'s Crook', giver: 'elena', area: 'Western Hills', minLvl: 1,
    intro: 'I dropped my crook running from the bandits up the hill, by the big rocks to the west. Without it the sheep will not listen to me.',
    steps: [{ k: 'pickup', at: P(-232, -18), label: 'Elena\'s crook', d: 'Find Elena\'s crook on the hillside', place: 'Western Hills' }, { k: 'return', d: 'Bring the crook back to Elena' }],
    reward: { xp: 45, coin: 20, items: { dried_rations: 2 } }, outro: 'There it is! The sheep will be so relieved. Well, I will be.' },
  { id: 'm_scouts', name: 'Bandit Scouts', giver: 'elena', area: 'Western Hills', minLvl: 3, after: 'm_crook',
    intro: 'Two bandit scouts watch the hill path from the ridge above the camp. While they are there no shepherd will go up. Bandits hit hard — be ready.',
    steps: [{ k: 'kill', enemy: 'bandit', n: 2, at: P(-196, -58), d: 'Defeat 2 bandit scouts on the ridge', place: 'Ridge above the camp' }, { k: 'return', d: 'Tell Elena the ridge is clear' }],
    reward: { xp: 140, coin: 55, items: { wool_cloak: 1 } }, outro: 'You are braver than you look. Take this cloak — I wove it myself, it keeps the rain off.' },
  // ---------------- Santiago ----------------
  { id: 'm_apostle', name: 'Before the Apostle', giver: 'pedro', area: 'Cathedral of Santiago', minLvl: 1,
    intro: 'Every pilgrim should light a candle in the cathedral and kneel before the Apostle. Here are two coins for the candles — go, it is just across the plaza.',
    onAccept: G => { G.S.coin += 2; G.ui.toast('+2 coin for the candles'); },
    steps: [{ k: 'votive', room: 'cathedral', n: 2, d: 'Light 2 votive candles in the cathedral', place: 'Cathedral of Santiago' }, { k: 'kneel', room: 'cathedral', d: 'Kneel before the high altar', place: 'Cathedral of Santiago' }, { k: 'return', d: 'Return to Brother Pedro at the market' }],
    reward: { xp: 80, coin: 20, items: { blessing_scroll: 1 } }, outro: 'You have the look of someone who has been heard. Take this blessing for the road.' },
  { id: 'm_sword', name: 'The Wooden Sword', giver: 'kid', area: 'Santiago', minLvl: 1,
    intro: 'I lost my wooden sword! I was fighting a dragon by the Town Shrine. It was probably a goat. Please find it!',
    steps: [{ k: 'pickup', at: P(176, -150), label: 'wooden sword', d: 'Find the boy\'s wooden sword near the Town Shrine', place: 'Town Shrine' }, { k: 'return', d: 'Bring the sword back to the village boy' }],
    reward: { xp: 30, coin: 8, items: { berry_pie: 1 } }, outro: 'My sword! Mother made a pie, you can have my piece. Half. All of it. Thank you, Sir Pilgrim!' },
  { id: 'm_patrol', name: 'Evening Patrol', giver: 'guard', area: 'Santiago road', minLvl: 2,
    intro: 'Walk the road out to the west waystone and look for trouble, then come back by the Town Shrine. My knees are not what they were.',
    steps: [{ k: 'goto', at: P(124, -98), r: 7, d: 'Walk the road to the west waystone', place: 'West waystone' }, { k: 'shrine', key: 'shrine_town', d: 'Rest at the Town Shrine on the way back', place: 'Town Shrine' }, { k: 'return', d: 'Report to the town guard' }],
    reward: { xp: 60, coin: 30, items: { stew: 1 } }, outro: 'All quiet? Good. Here — the barracks cook made too much.' },
  { id: 'm_wine', name: 'Wine for the Mass', giver: 'priest', area: 'Santiago → Villafranca', minLvl: 2,
    intro: 'Sister Inés in Villafranca keeps our altar wine. Ask her for a flask for Sunday Mass and bring it here.',
    steps: [{ k: 'talk', npc: 'sister', d: 'Ask Sister Inés for altar wine', place: 'Villafranca Church', line: 'For Father Anselm? Of course. Carry it carefully — and do not drink it!' }, { k: 'return', d: 'Bring the altar wine to Father Anselm' }],
    reward: { xp: 90, coin: 40, items: { wine: 1 } }, outro: 'Thank you. Keep this flask for yourself — not the altar one, mind.' },
];
// three new givers (the rest are existing villagers)
export const MISSION_NPCS = [
  { id: 'martin', name: 'Martín the miller', x: -100, z: 90, yaw: 2.4, idle: 'fold', look: { sex: 'm', outfit: 'Peasant', hair: ['Hair_Buzzed', 'Hair_Beard'], tints: { cloth: 0x8a7a5a } }, talk: () => ({ t: 'The river turns my wheel and my mules carry the flour. When the wolves let them.', c: [{ t: 'Goodbye' }] }) },
  { id: 'tome', name: 'Brother Tomé', x: 21, z: -48, yaw: -2.6, idle: 'idle', look: { sex: 'm', outfit: 'Ranger', hair: ['Hair_Long', 'Hair_Beard'], tints: { cloth: 0x3a3028 } }, extra: o => o.traverse(m => { if (m.isMesh && /Hood/.test(m.name)) m.visible = false; }), talk: () => ({ t: 'Peace be with you. I keep this shrine and pray for those on the road.', c: [{ t: 'And with your spirit.' }] }) },
  { id: 'elena', name: 'Elena the shepherd', x: -165, z: -25, yaw: 0.8, idle: 'idle', look: { sex: 'f', outfit: 'Peasant', hair: ['Hair_Long'], tints: { cloth: 0x6a5a3a } }, talk: () => ({ t: 'Mind the sheep. And the bandits, further up.', c: [{ t: 'Goodbye' }] }) },
];

const ROOM_NAME = { church_vf: 'Villafranca church', cathedral: 'the cathedral' };
function glyphTex(ch, col) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = 'rgba(20,14,8,.75)'; g.beginPath(); g.arc(32, 32, 26, 0, 7); g.fill(); g.lineWidth = 4; g.strokeStyle = col; g.stroke(); g.fillStyle = col; g.font = 'bold 38px Georgia,serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 32, 34); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

export class Missions {
  constructor(G) {
    this.G = G; this.byId = Object.fromEntries(MISSIONS.map(m => [m.id, m])); this.spawned = {}; this.pickups = {}; this.followers = {};
    // world beacon: a soft golden light pillar + a pulsing ground ring at the tracked objective (always on top of fog, visible across the valley)
    const pm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, uniforms: { t: { value: 0 }, a: { value: 1 } },
      vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: 'uniform float t; uniform float a; varying vec2 vU; void main(){ float e = 1. - abs(vU.x * 2. - 1.); e = pow(1. - abs(fract(vU.x * 2.) * 2. - 1.), 1.5); float h = pow(1. - vU.y, 1.6); float p = 0.75 + 0.25 * sin(t * 3. - vU.y * 9.); gl_FragColor = vec4(mix(vec3(1., .66, .16), vec3(1., .93, .62), e), clamp(e * h * p * a * .8, 0., .8)); }' });
    this.pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1, 16, 1, true).translate(0, 0.5, 0), pm); this.pillar.renderOrder = 5; this.pillar.frustumCulled = false;
    const rm = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 40).rotateX(-Math.PI / 2), rm); this.ring.renderOrder = 5;
    this.beacon = new THREE.Group(); this.beacon.add(this.pillar, this.ring); this.beacon.visible = false; G.scene.add(this.beacon);
    this.texBang = glyphTex('!', '#f3c95a'); this.texAsk = glyphTex('?', '#8fe08a'); this.marks = new Map();
    this.pickMat = new THREE.MeshStandardMaterial({ color: 0x8a5a30, roughness: 0.7, emissive: 0x6a4010, emissiveIntensity: 0.6 });
  }
  get st() { const S = this.G.S; if (!S.ms) S.ms = { act: {}, done: {}, order: [] }; if (!S.ms.order) S.ms.order = Object.keys(S.ms.act); return S.ms; }
  isActive(id) { return !!this.st.act[id]; } isDone(id) { return !!this.st.done[id]; }
  activeIds() { return this.st.order.filter(id => this.st.act[id]); }
  available() { const S = this.G.S; return MISSIONS.filter(m => !this.isActive(m.id) && !this.isDone(m.id) && (!m.after || this.isDone(m.after)) && S.lvl >= m.minLvl - 1 && this.G.npcById(m.giver)); }
  giverPos(m) { return this.G.npcById(m.giver)?.pos || null; }
  step(id) { const a = this.st.act[id]; const m = this.byId[id]; return a && m ? m.steps[a.s] : null; }
  place(m) { return m.area; }
  // ---------------------------------------------------------------- accept / advance / complete
  accept(id) {
    const G = this.G, m = this.byId[id]; if (!m || this.isActive(id) || this.isDone(id)) return; const st = this.st; st.act[id] = { s: 0, p: 0 }; st.order = st.order.filter(x => x !== id); st.order.push(id);
    G.S.track = 'm:' + id; m.onAccept?.(G); G.ui.toast(`Mission: ${m.name}`, 'good'); setTimeout(() => G.ui.toast(`→ ${m.steps[0].d}`, '', 3200), 900); this.enterStep(id); this.check(id); G.save();
  }
  abandon(id) { const st = this.st; delete st.act[id]; st.order = st.order.filter(x => x !== id); this.cleanup(id); if (this.G.S.track === 'm:' + id) this.G.S.track = 'main'; }
  enterStep(id) { const s = this.step(id); if (!s) return; if (s.k === 'pickup') this.makePickup(id, s); if (s.k === 'escort') this.makeFollower(id, s); }
  advance(id, quiet) {
    const G = this.G, m = this.byId[id], a = this.st.act[id]; if (!a) return; const done = m.steps[a.s]; this.cleanupStep(id, done); a.s++; a.p = 0;
    if (a.s >= m.steps.length) { this.complete(id); return; }
    const nx = m.steps[a.s]; if (!quiet) { G.ui.toast(`✓ ${done.d}`, 'good', 2000); setTimeout(() => G.ui.toast(`→ ${nx.d}`, '', 3200), 1100); } G.audio.pickup(); this.enterStep(id); G.save();
  }
  complete(id) {
    const G = this.G, m = this.byId[id], S = G.S, st = this.st; delete st.act[id]; st.order = st.order.filter(x => x !== id); st.done[id] = 1; this.cleanup(id);
    const r = m.reward || {}; if (r.xp) G.addXp(r.xp); if (r.coin) S.coin += r.coin; const got = []; for (const [it, n] of Object.entries(r.items || {})) { if (ITEMS[it]) { G.give(it, n, true); got.push(`${ITEMS[it].name}${n > 1 ? ' ×' + n : ''}`); } }
    G.ui.toast(`✓ ${m.name}  +${r.xp || 0} XP · ${r.coin || 0} coin${got.length ? ' · ' + got.join(', ') : ''}`, 'gold', 3600); G.audio.coin(); G.audio.level?.();
    // never a dead end: track the next active mission, else the main road, else the nearest available mission
    const nextA = this.activeIds()[0]; S.track = nextA ? 'm:' + nextA : 'main';
    const sg = this.suggest(); if (sg && !nextA) setTimeout(() => G.ui.toast(`Next: ${sg.m.name} — ${G.npcById(sg.m.giver)?.name}, ${sg.m.area} (${Math.round(sg.d)} m)`, '', 4200), 2400);
    G.save();
  }
  cleanupStep(id, s) { if (!s) return; if (s.k === 'pickup') this.removePickup(id); if (s.k === 'kill') this.despawn(id); if (s.k === 'escort') this.releaseFollower(id); }
  cleanup(id) { this.removePickup(id); this.despawn(id); this.releaseFollower(id); }
  // ---------------------------------------------------------------- step mechanics
  makePickup(id, s) {
    if (this.pickups[id]) return; const G = this.G, [x, z] = s.at, y = heightAt(x, z);
    const grp = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.3), this.pickMat); b.position.y = 0.13; b.castShadow = true; grp.add(b);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.ui.glowTex || (G.ui.glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,225,140,1)'); r.addColorStop(1, 'rgba(255,200,90,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })()), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.scale.setScalar(1.6); glow.position.y = 0.35; grp.add(glow); grp.position.set(x, y, z); G.world.group.add(grp);
    const it = { type: 'mission', mid: id, x, z, r: 1.8, label: `Pick up ${s.label}`, short: 'Take', kind: 'use' }; G.world.interactives.push(it); this.pickups[id] = { grp, it, glow };
  }
  removePickup(id) { const p = this.pickups[id]; if (!p) return; p.grp.parent?.remove(p.grp); const L = this.G.world.interactives; const i = L.indexOf(p.it); if (i >= 0) L.splice(i, 1); delete this.pickups[id]; }
  pickup(it) { const s = this.step(it.mid); if (!s || s.k !== 'pickup') return; this.G.player.doAnim?.('pick', 0.8); this.G.ui.toast(`You found ${s.label}`, 'good'); this.advance(it.mid, false); }
  makeFollower(id, s) {
    if (this.followers[id]) return; const G = this.G, gp = this.giverPos(this.byId[id]) || G.player.pos; const P0 = G.player.pos;
    const d = { id: 'f_' + id, name: s.who.name, x: (gp.x + P0.x) / 2 + 1, z: (gp.z + P0.z) / 2 + 1, look: s.who.look, talk: () => ({ t: 'Lead on, I will follow your footsteps.', c: [{ t: 'Stay close.' }] }) };
    const n = new NPC(G, d); n.follow = true; n.obj.traverse(m => { if (m.isMesh && /Hood/.test(m.name)) m.visible = false; }); G.npcs.push(n); this.followers[id] = n;
  }
  releaseFollower(id) { const n = this.followers[id]; if (!n) return; n.follow = false; delete this.followers[id]; setTimeout(() => { n.obj.visible = false; n.hidden = true; this.G.scene.remove(n.obj); const L = this.G.npcs; const i = L.indexOf(n); if (i >= 0) L.splice(i, 1); }, 6000); }
  despawn(id) { const L = this.spawned[id]; if (!L) return; const G = this.G; for (const e of L) { if (e.alive) { e.dispose(); e.gone = true; const i = G.enemies.indexOf(e); if (i >= 0) G.enemies.splice(i, 1); } } delete this.spawned[id]; }
  // ---------------------------------------------------------------- events from the game
  onEvent(type, d = {}) {
    for (const id of this.activeIds()) { const s = this.step(id), a = this.st.act[id]; if (!s) continue;
      if (type === 'kill' && s.k === 'kill' && d.enemy === s.enemy && (d.e?.mission === id || Math.hypot(d.e?.pos.x - s.at[0], d.e?.pos.z - s.at[1]) < 45)) { a.p++; if (a.p >= s.n) this.advance(id); else this.G.ui.toast(`${this.byId[id].name}: ${a.p}/${s.n}`); }
      else if (type === 'votive' && s.k === 'votive' && d.room === s.room) { a.p++; if (a.p >= s.n) this.advance(id); else this.G.ui.toast(`Candles lit: ${a.p}/${s.n}`); }
      else if (type === 'kneel' && s.k === 'kneel' && d.room === s.room) this.advance(id);
      else if (type === 'visit_shrine' && s.k === 'shrine' && d.key === s.key) this.advance(id);
    }
  }
  check(id) { const s = this.step(id); if (s?.k === 'fetch' && this.G.has(s.item, s.n)) this.advance(id); }
  /** inject mission choices into an NPC conversation */
  decorate(npc, node) {
    const G = this.G; const c = []; let t = node.t;
    for (const id of this.activeIds()) { const m = this.byId[id], s = this.step(id);
      if (s.k === 'talk' && s.npc === npc.id) { t = s.line; this.advance(id); }
      else if (s.k === 'return' && m.giver === npc.id) { const fi = m.steps.findIndex(x => x.k === 'fetch'); const f = m.steps[fi];
        if (f && !G.has(f.item, f.n)) { t = `I still need ${f.n} ${ITEMS[f.item]?.name.toLowerCase() || f.item}. You have ${G.S.inv[f.item] || 0}.`; this.st.act[id].s = fi; G.ui.toast(`→ ${f.d}`); }
        else { if (f) G.take(f.item, f.n); t = m.outro || 'Thank you, pilgrim.'; this.advance(id, true); } }
      else if (m.giver === npc.id) c.push({ t: `★ ${m.name}: ${s.d}`, f: () => ({ t: 'How goes it? ' + this.where(id), c: [{ t: 'I am on my way.' }, { t: 'Abandon this mission', f: () => { this.abandon(id); G.ui.toast(`Abandoned: ${m.name}`); } }] }) }); }
    for (const m of this.available()) if (m.giver === npc.id) {
      const r = m.reward || {}; const items = Object.entries(r.items || {}).map(([k, n]) => `${ITEMS[k]?.name}${n > 1 ? ' ×' + n : ''}`).join(', ');
      c.push({ t: `★ New mission: ${m.name}`, f: () => ({ t: `${m.intro}\n\n${m.steps.map((s, i) => `${i + 1}. ${s.d}`).join('\n')}\nReward: ${r.xp} XP · ${r.coin} coin${items ? ' · ' + items : ''}${G.S.lvl < m.minLvl ? `\n(Level ${m.minLvl} advised)` : ''}`, c: [{ t: 'I will do it.', f: () => { this.accept(m.id); } }, { t: 'Not now.' }] }) });
    }
    return { t, c: [...c, ...(node.c || [])] };
  }
  where(id) { const tg = this.target(id); if (!tg || !tg.pos) return ''; const d = Math.round(Math.hypot(tg.pos.x - this.G.wpos.x, tg.pos.z - this.G.wpos.z)); return `${tg.obj} — ${tg.place || ''}${d > 4 ? `, ${d} m away` : ', right here'}.`; }
  /** objective position for the tracker / beacon / minimap */
  target(id) {
    const G = this.G, m = this.byId[id], s = this.step(id), a = this.st.act[id]; if (!s) return null; let pos = null, obj = s.d, inner = false;
    if (s.k === 'goto' || s.k === 'kill' || s.k === 'pickup') pos = { x: s.at[0], z: s.at[1] };
    else if (s.k === 'talk') pos = G.npcById(s.npc)?.pos; else if (s.k === 'return') pos = this.giverPos(m);
    else if (s.k === 'shrine') pos = G.world.interactives.find(i => i.type === 'shrine' && i.key === s.key) || null;
    else if (s.k === 'fetch') { let best = 1e9; const W = G.wpos; for (const n of G.world.nodes) if (n.type === s.item && n.respawn <= 0 && n.mesh?.visible !== false) { const d = Math.hypot(n.x - W.x, n.z - W.z); if (d < best) { best = d; pos = n; } } }
    else if (s.k === 'escort') { const f = this.followers[id]; pos = { x: s.to[0], z: s.to[1] }; if (f && f.pos.distanceTo(G.player.pos) > 22) { pos = f.pos; obj = `${s.who.name} fell behind — go back for them`; } }
    else if (s.k === 'votive' || s.k === 'kneel') { if (G.inside?.id === s.room) { const it = G.inside.interactives.find(i => i.type === s.k); if (it) { pos = { x: it.x, z: it.z, y: 0 }; inner = true; } } else { const dr = G.world.doors.find(d => d.id === s.room); if (dr) { pos = { x: dr.x, z: dr.z }; obj = `${s.d} — go inside ${ROOM_NAME[s.room] || ''}`; } } }
    if (s.k === 'kill' || s.k === 'votive' || (s.k === 'fetch' && s.n > 1)) obj += ` (${s.k === 'fetch' ? Math.min(G.S.inv[s.item] || 0, s.n) : a.p}/${s.n})`;
    return { name: m.name, obj, pos, place: s.place || m.area, inner, mission: id };
  }
  suggest() { const W = this.G.wpos; let best = null; for (const m of this.available()) { const p = this.giverPos(m); if (!p) continue; const lv = this.G.S.lvl >= m.minLvl ? 0 : 400; const d = Math.hypot(p.x - W.x, p.z - W.z); if (!best || d + lv < best.k) best = { m, d, k: d + lv }; } return best; }
  suggestTarget() { const sg = this.suggest(); if (!sg) return null; const n = this.G.npcById(sg.m.giver); return { name: `Suggested: ${sg.m.name}`, obj: `Talk to ${n.name} (${sg.m.area})`, pos: n.pos, place: sg.m.area, suggestion: sg.m.id }; }
  mapMarks() { const out = []; for (const m of this.available()) { const p = this.giverPos(m); if (p) out.push({ x: p.x, z: p.z, k: '!' }); } for (const id of this.activeIds()) { const m = this.byId[id], s = this.step(id); if (s?.k === 'return') { const p = this.giverPos(m); if (p) out.push({ x: p.x, z: p.z, k: '?' }); } } return out; }
  // ---------------------------------------------------------------- per frame
  update(dt, t) {
    const G = this.G, Pp = G.player.pos;
    for (const id of this.activeIds()) { const s = this.step(id); if (!s) continue;
      if (s.k === 'goto' && !G.inside && Math.hypot(Pp.x - s.at[0], Pp.z - s.at[1]) < (s.r || 6)) this.advance(id);
      else if (s.k === 'fetch') { this._fc = (this._fc || 0) - dt; if (this._fc <= 0) { this._fc = 0.5; this.check(id); } }
      else if (s.k === 'pickup' && !this.pickups[id]) this.makePickup(id, s);
      else if (s.k === 'escort') { let f = this.followers[id]; if (!f) { this.makeFollower(id, s); f = this.followers[id]; } if (!G.inside && f.pos.distanceTo(Pp) > 70) { f.pos.set(Pp.x + 1.5, Pp.y, Pp.z + 1.5); } f.obj.visible = !G.inside; if (Math.hypot(f.pos.x - s.to[0], f.pos.z - s.to[1]) < (s.r || 7) && Math.hypot(Pp.x - s.to[0], Pp.z - s.to[1]) < (s.r || 7) + 4) this.advance(id); }
      else if (s.k === 'kill') { // spawn the step's foes when the player approaches, top up if they wandered off, drop them if the player leaves
        const d = Math.hypot(Pp.x - s.at[0], Pp.z - s.at[1]); let L = this.spawned[id] = (this.spawned[id] || []).filter(e => !e.gone); const a = this.st.act[id];
        if (d < 75 && !G.inside) { const need = s.n - a.p - L.filter(e => e.alive).length; for (let i = 0; i < need; i++) { const ang = i / Math.max(1, need) * 6.283 + Math.random(), x = s.at[0] + Math.cos(ang) * 4, z = s.at[1] + Math.sin(ang) * 4; const e = new Enemy(G, s.enemy, x, z, Math.max(1, Math.min(G.S.lvl, this.byId[id].minLvl + 2)), { x: s.at[0], z: s.at[1], r: 14 }); e.mission = id; G.enemies.push(e); L.push(e); } }
        else if (d > 160) this.despawn(id);
      }
    }
    // pickups bob + glow
    for (const k in this.pickups) { const p = this.pickups[k]; p.glow.material.opacity = 0.55 + 0.35 * Math.sin(t * 3); p.grp.rotation.y = t * 0.8; }
    // giver markers: gold "!" = new mission, green "?" = ready to report
    const want = new Map(); for (const m of this.available()) want.set(m.giver, want.get(m.giver) === '?' ? '?' : '!'); for (const id of this.activeIds()) { const s = this.step(id); if (s.k === 'return') want.set(this.byId[id].giver, '?'); if (s.k === 'talk') want.set(s.npc, '?'); }
    for (const [gid, sp] of this.marks) if (!want.has(gid)) { G.scene.remove(sp); this.marks.delete(gid); }
    for (const [gid, k] of want) { const n = G.npcById(gid); if (!n) continue; let sp = this.marks.get(gid); if (!sp) { sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texBang, depthWrite: false, fog: false })); sp.renderOrder = 6; G.scene.add(sp); this.marks.set(gid, sp); }
      sp.material.map = k === '?' ? this.texAsk : this.texBang; const d = n.pos.distanceTo(Pp); sp.visible = n.obj.visible && !G.inside && d < 90 && d > 1.5; const s = 0.55 + Math.min(1.6, d * 0.025); sp.scale.setScalar(s); sp.position.set(n.pos.x, n.pos.y + 2.25 + s * 0.4 + Math.sin(t * 2.5) * 0.06, n.pos.z); }
    // beacon at the tracked objective
    const tr = G.trackTarget(); const b = this.beacon; b.visible = false;
    if (tr && tr.pos && !G.uiOpen()) { const inside = !!G.inside; if ((inside && tr.inner) || (!inside && tr.pos.x < 900)) {
      const y = tr.pos.y ?? (inside ? 0 : heightAt(tr.pos.x, tr.pos.z)); const d = Math.hypot(tr.pos.x - Pp.x, tr.pos.z - Pp.z);
      if (d > 2.5) { b.visible = true; b.position.set(tr.pos.x, Math.max(y, inside ? 0 : y) , tr.pos.z); const w = inside ? 0.6 : 0.8 + Math.min(4, d * 0.018), h = inside ? 3 : 18 + Math.min(40, d * 0.25); this.pillar.scale.set(w, h, w); this.pillar.material.uniforms.t.value = t; this.pillar.material.uniforms.a.value = Math.min(1, (d - 2.5) / 6) * (inside ? 0.6 : 1); const rs = 1 + 0.25 * Math.sin(t * 3); this.ring.scale.setScalar(rs * (inside ? 0.8 : 1.3)); this.ring.position.y = 0.06; this.ring.material.opacity = 0.35 + 0.25 * Math.sin(t * 3); } } }
  }
  /** rebuild runtime objects after a load */
  restore() { for (const id of this.activeIds()) { if (!this.byId[id]) { delete this.st.act[id]; continue; } this.enterStep(id); } this.st.order = this.st.order.filter(id => this.st.act[id]); }
}
