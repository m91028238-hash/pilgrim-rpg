import * as THREE from 'three';
import { ITEMS, SKILLS, RECIPES, SHOPS, MAIN_QUEST } from './data.js?v=7';
import { PLACES, heightAt, splatAt, PATH, RIVER } from './world.js?v=7';
import { travelPlaces, fastTravel } from './owner.js?v=7';
const $ = id => document.getElementById(id);
const SLOTS = ['weapon', 'hat', 'cloak', 'body', 'boots', 'trinket'];
const SLOTN = { weapon: 'Staff / weapon', hat: 'Hat', cloak: 'Cloak', body: 'Body', boots: 'Boots', trinket: 'Trinket' };
const v3 = new THREE.Vector3();

export class UI {
  constructor(G) {
    this.G = G; this.t = 0; this.plates = new Map(); this.dmgs = [];
    $('menuBtn').onclick = () => this.openPanel('inv');
    $('pClose').onclick = () => this.closePanel();
    $('tracker').onclick = () => this.openPanel('quests');
    $('prompt').addEventListener('pointerdown', e => { e.stopPropagation(); G.interact(); });
    document.querySelectorAll('.qs').forEach(b => b.addEventListener('pointerdown', e => { e.stopPropagation(); G.useQuick(+b.dataset.i); }));
  }
  loading(p) { $('lfill').style.width = (p * 100).toFixed(0) + '%'; $('lpct').textContent = (p * 100).toFixed(0) + '%'; }
  toast(msg, kind = '', dur = 2300) {
    const box = $('toasts'); while (box.children.length >= 3) box.firstChild.remove();
    const d = document.createElement('div'); d.className = 'toast ' + kind; d.textContent = msg; box.appendChild(d);
    setTimeout(() => d.classList.add('out'), dur); setTimeout(() => d.remove(), dur + 450);
  }
  flash() { const f = $('flash'); f.style.transition = 'none'; f.style.opacity = 0.9; requestAnimationFrame(() => { f.style.transition = 'opacity .45s'; f.style.opacity = 0; }); }
  prompt(text, key = 'E') { const p = $('prompt'); if (!text) { if (!p.classList.contains('hidden')) p.classList.add('hidden'); this._pt = null; return; } if (this._pt !== text) { this._pt = text; p.innerHTML = (this.G.isTouch ? '' : `<kbd>${key}</kbd>`) + text; } p.classList.remove('hidden'); }
  hud() {
    const G = this.G, S = G.S;
    $('hpF').style.width = (100 * Math.max(0, S.hp) / G.maxHp()) + '%'; $('hpT').textContent = Math.ceil(Math.max(0, S.hp)) + '/' + G.maxHp();
    $('stF').style.width = (100 * Math.max(0, S.stamina) / G.maxSt()) + '%'; { const sb = $('stF').parentNode; sb.classList.toggle('drain', !!G.player.sprinting); sb.classList.toggle('low', S.stamina < G.maxSt() * 0.2); } $('faF').style.width = (100 * S.faith / G.maxFaith()) + '%';
    $('xpF').style.width = (100 * S.xp / G.xpNeed()) + '%'; $('lvl').textContent = S.lvl;
    const h = (S.time * 24 + 24) % 24; $('clock').textContent = `Day ${S.day} · ${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;
    // tracker
    const tr = G.trackTarget(); $('trName').textContent = tr ? tr.name : ''; $('trObj').textContent = tr ? tr.obj : ''; $('trDist').textContent = tr && tr.pos ? `${Math.round(Math.hypot(tr.pos.x - G.wpos.x, tr.pos.z - G.wpos.z))} m` : '';
    { const M = G.missions; let nx = ''; if (M && !M.activeIds().length && !tr?.suggestion) { const sg = M.suggest(); if (sg) nx = `Next mission: ${sg.m.name} — ${G.npcById(sg.m.giver)?.name} · ${Math.round(sg.d)} m`; } if (this._nx !== nx) { this._nx = nx; $('trNext').textContent = nx; } }
    const q = $('quick').children; for (let i = 0; i < 2; i++) { const id = S.quick[i]; const n = id ? (S.inv[id] || 0) : 0; q[i].innerHTML = id && n ? `${ITEMS[id].ico}<small>${n}</small>` : '<span style="opacity:.3">+</span>'; }
    const lk = G.player.lock; if (lk && lk.alive) { $('lockFrame').classList.remove('hidden'); $('lfName').textContent = `${lk.def.name} · Lv ${lk.lvl}`; $('lfHp').style.width = (100 * lk.hp / lk.maxHp) + '%'; } else $('lockFrame').classList.add('hidden');
  }
  // per-frame overlays: beacon, nameplates, damage numbers
  overlays(dt) {
    const G = this.G, cam = G.camera, W = innerWidth, H = innerHeight;
    // objective: diamond + distance when on screen, an edge arrow pointing at it when it is off screen or behind the camera
    const tr = G.trackTarget(); const b = $('beacon'), ea = $('edgeArrow'); let showB = false, showA = false;
    if (tr && tr.pos && !G.uiOpen() && (!G.inside || tr.inner)) {
      const d = Math.hypot(tr.pos.x - G.player.pos.x, tr.pos.z - G.player.pos.z);
      v3.set(tr.pos.x, (tr.pos.y ?? (G.inside ? 0 : heightAt(tr.pos.x, tr.pos.z))) + (G.inside ? 1.6 : 2.2), tr.pos.z).project(cam);
      const front = v3.z < 1; let x = (v3.x * 0.5 + 0.5) * W, y = (-v3.y * 0.5 + 0.5) * H; const top = 118, mg = 30;
      if (d > 3.5) {
        if (front && x > mg && x < W - mg && y > top && y < H - mg) { showB = true; b.style.left = x + 'px'; b.style.top = y + 'px'; b.lastChild.textContent = Math.round(d) + 'm'; }
        else { let dx = x - W / 2, dy = y - H / 2; if (!front) { dx = -dx; dy = -dy; if (Math.abs(dy) < 1 && Math.abs(dx) < 1) dy = 1; } const a = Math.atan2(dy, dx), c = Math.cos(a), s = Math.sin(a);
          const hw = W / 2 - 34, hhT = H / 2 - top + 6, hhB = H / 2 - 92; const k = Math.min(hw / Math.max(1e-3, Math.abs(c)), (s < 0 ? hhT : hhB) / Math.max(1e-3, Math.abs(s)));
          showA = true; ea.style.left = (W / 2 + c * k) + 'px'; ea.style.top = (H / 2 + s * k) + 'px'; ea.firstChild.style.transform = `rotate(${a}rad)`; ea.lastChild.textContent = Math.round(d) + ' m'; }
      }
    }
    b.classList.toggle('hidden', !showB); ea.classList.toggle('hidden', !showA);
    // plates
    const used = new Set(); const box = $('plates');
    const want = [];
    for (const e of G.enemies) if (e.alive && e.obj.visible) { const d = e.pos.distanceTo(G.player.pos); if (d < 22) want.push([e, d, 'e']); }
    for (const n of G.npcs) if (n.obj.visible) { const d = n.pos.distanceTo(G.player.pos); if (d < 9) want.push([n, d, 'n']); }
    for (const [o, d, k] of want) {
      v3.set(o.pos.x, o.pos.y + (o.type === 'wolf' || o.type === 'boar' ? 1.3 : 2.05) * (o.obj.scale.y > 0.9 ? o.obj.scale.y : 1), o.pos.z).project(cam); if (v3.z > 1) continue;
      let el = this.plates.get(o); if (!el) { el = document.createElement('div'); el.className = 'plate' + (k === 'n' ? ' npc' : ''); el.innerHTML = k === 'n' ? o.name : `<span></span><div class="bar"><i></i></div>`; box.appendChild(el); this.plates.set(o, el); }
      used.add(o); el.style.left = ((v3.x * 0.5 + 0.5) * W) + 'px'; el.style.top = ((-v3.y * 0.5 + 0.5) * H) + 'px'; el.style.opacity = Math.min(1, (k === 'n' ? 9 : 22) - d);
      if (k === 'e') { const c = o.lvl > G.S.lvl + 2 ? '#ff8a7a' : o.lvl < G.S.lvl - 2 ? '#aaa' : '#fff'; el.firstChild.textContent = `${o.def.name} ${o.lvl}`; el.firstChild.style.color = c; el.lastChild.firstChild.style.width = (100 * o.hp / o.maxHp) + '%'; }
    }
    for (const [o, el] of this.plates) if (!used.has(o)) { el.remove(); this.plates.delete(o); }
    for (let i = this.dmgs.length - 1; i >= 0; i--) { const d = this.dmgs[i]; d.t += dt; v3.copy(d.p).project(cam); d.el.style.left = ((v3.x * 0.5 + 0.5) * W) + 'px'; d.el.style.top = ((-v3.y * 0.5 + 0.5) * H - d.t * 50) + 'px'; d.el.style.opacity = 1 - d.t / 0.9; if (d.t > 0.9 || v3.z > 1) { d.el.remove(); this.dmgs.splice(i, 1); } }
  }
  dmg(p, n, cls = '') { const el = document.createElement('div'); el.className = 'dmg ' + cls; el.textContent = Math.round(n); $('plates').appendChild(el); this.dmgs.push({ el, p: p.clone(), t: 0 }); }
  // ---- minimap ----
  buildMapTex() {
    const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'); const img = g.createImageData(N, N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = (i / N - 0.5) * 600, z = (j / N - 0.5) * 600; const h = heightAt(x, z); const s = splatAt(x, z, h, 0); let r = 74, gg = 96, b = 52;
      if (h < -0.9) { r = 52; gg = 92; b = 120; } else { r = r * (1 - s[0] - s[2]) + 176 * s[0] + 150 * s[2]; gg = gg * (1 - s[0] - s[2]) + 150 * s[0] + 140 * s[2]; b = b * (1 - s[0] - s[2]) + 100 * s[0] + 128 * s[2]; const f = s[3]; r = r * (1 - f) + 46 * f; gg = gg * (1 - f) + 70 * f; b = b * (1 - f) + 38 * f; const sh = 0.85 + h * 0.012; r *= sh; gg *= sh; b *= sh; }
      const k = (j * N + i) * 4; img.data[k] = r; img.data[k + 1] = gg; img.data[k + 2] = b; img.data[k + 3] = 255; }
    g.putImageData(img, 0, 0); this.mapTex = c;
  }
  minimap() {
    const G = this.G, c = $('minimap'), g = c.getContext('2d'), S = c.width, P = G.wpos; const R = 70 + G.skill('cartographer') * 15; // metres radius
    const sc = S / (2 * R); g.save(); g.clearRect(0, 0, S, S); g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, 7); g.clip();
    g.translate(S / 2, S / 2); g.rotate(G.cam.yaw); // north-up rotated so camera forward is up
    const k = 256 / 600; g.imageSmoothingEnabled = true;
    g.drawImage(this.mapTex, (P.x + 300) * k - R * k, (P.z + 300) * k - R * k, 2 * R * k, 2 * R * k, -S / 2, -S / 2, S, S);
    const dot = (x, z, col, r = 4) => { const dx = (x - P.x) * sc, dz = (z - P.z) * sc; if (Math.hypot(dx, dz) > S / 2 - 4) return; g.fillStyle = col; g.beginPath(); g.arc(dx, dz, r, 0, 7); g.fill(); };
    for (const e of G.enemies) if (e.alive) dot(e.pos.x, e.pos.z, e.aggro ? '#ff5a4a' : '#c0504a', 3.5);
    for (const n of G.npcs) if (n.obj.visible) dot(n.pos.x, n.pos.z, '#f2e2b0', 3);
    for (const it of G.world.interactives) if (it.type === 'shrine') dot(it.x, it.z, '#ffd76a', 4.5);
    // mission givers: gold ! (new) and green ? (ready to report), drawn upright
    for (const mk of G.missions?.mapMarks() || []) { const dx = (mk.x - P.x) * sc, dz = (mk.z - P.z) * sc; if (Math.hypot(dx, dz) > S / 2 - 7) continue; g.save(); g.translate(dx, dz); g.rotate(-G.cam.yaw); g.fillStyle = 'rgba(20,14,8,.85)'; g.beginPath(); g.arc(0, 0, 6.5, 0, 7); g.fill(); g.strokeStyle = g.fillStyle = mk.k === '?' ? '#8fe08a' : '#f3c95a'; g.lineWidth = 1.5; g.stroke(); g.font = 'bold 10px Georgia,serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(mk.k, 0, 0.5); g.restore(); }
    const tr = G.trackTarget(); if (tr && tr.pos && !tr.inner) { const dx = (tr.pos.x - P.x) * sc, dz = (tr.pos.z - P.z) * sc, d = Math.hypot(dx, dz), m = Math.min(1, (S / 2 - 9) / Math.max(d, 1e-3)); const pu = 1 + 0.18 * Math.sin(performance.now() / 180); g.save(); g.translate(dx * m, dz * m); g.rotate(Math.PI / 4); g.fillStyle = '#ffe08a'; g.strokeStyle = '#3a2a10'; g.lineWidth = 2; g.fillRect(-6 * pu, -6 * pu, 12 * pu, 12 * pu); g.strokeRect(-6 * pu, -6 * pu, 12 * pu, 12 * pu); g.restore(); }
    g.restore();
    // player arrow (always up = facing relative to camera)
    g.save(); g.translate(S / 2, S / 2); g.rotate(-(G.player.yaw - G.cam.yaw) + Math.PI); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(0, 3); g.lineTo(-6, 7); g.closePath(); g.fill(); g.restore();
    // N marker
    const na = G.cam.yaw; g.fillStyle = '#e8c46a'; g.font = 'bold 18px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; const nx = S / 2 + Math.sin(-na + Math.PI) * (S / 2 - 12), ny = S / 2 + Math.cos(-na + Math.PI) * (S / 2 - 12); g.fillText('N', nx, ny);
  }
  // ---- title ----
  showTitle(hasSave, q, cb) {
    $('loading').classList.add('hidden'); $('title').classList.remove('hidden'); $('bContinue').classList.toggle('hidden', !hasSave);
    const seg = $('qsel'); const mark = v => [...seg.children].forEach(b => b.classList.toggle('on', +b.dataset.q === v)); mark(q);
    seg.onclick = e => { const v = e.target.dataset.q; if (v == null) return; mark(+v); cb.quality(+v); };
    $('bContinue').onclick = () => cb.start(false); $('bNew').onclick = () => cb.start(true); $('bCredits').onclick = () => this.credits();
  }
  hideTitle() { $('title').classList.add('hidden'); $('hud').classList.remove('hidden'); }
  credits() {
    this.dialog('Credits', 'Characters, animations, Medieval Village MegaKit (incl. doors and windows), Fantasy Props MegaKit furniture and nature kit by Quaternius (CC0). Wolf, cow and the animated pig used as our wild boar by Quaternius (CC0, via poly.pizza). Foliage cards baked from Poly Haven plant scans (CC0: grass_medium_02, dandelion_01, celandine_01, periwinkle_plant, fern_02, nettle_plant, weed_plant_02, shrub_02/03/04). Terrain, sandstone, monastery floor, old wood floor and dry-stone wall textures and sky HDRI from Poly Haven (CC0). All sound — ambience, footsteps, breathing, combat — is synthesised live in the browser (no audio files). Church furnishings, statues, wayside cruceiros and Stations of the Cross are modelled in code for this game. Prayers are the traditional Catholic texts; the confession and blessing formulas follow the Roman Ritual (English translation). Built with three.js (MIT). Full list in ASSETS.md.', [{ t: 'Close' }]);
  }
  // ---- dialogue ----
  dialog(name, text, choices, npc) {
    const G = this.G; if ($('dialog').classList.contains('hidden')) this.dlgT = performance.now(); $('dialog').classList.remove('hidden'); $('dName').textContent = name; $('dText').textContent = text; const box = $('dChoices'); box.innerHTML = '';
    if (npc) npc.talking = true; this.dlgNpc = npc;
    const gen = this.dlgGen = (this.dlgGen || 0) + 1;
    for (const c of choices) { const b = document.createElement('button'); b.textContent = c.t; b.onclick = () => { if (performance.now() - this.dlgT < 350) return; /* swallow the ghost click from the tap that opened the dialog */ G.audio.click(); const next = c.f && c.f(); if (next && next.t) this.dialog(name, next.t, next.c, npc); else if (this.dlgGen === gen) this.closeDialog(); }; box.appendChild(b); }
  }
  closeDialog() { $('dialog').classList.add('hidden'); if (this.dlgNpc) this.dlgNpc.talking = false; this.dlgNpc = null; }
  dialogOpen() { return !$('dialog').classList.contains('hidden'); }
  // ---- panels ----
  panelOpen() { return !$('panel').classList.contains('hidden'); }
  closePanel() { $('panel').classList.add('hidden'); this.G.audio.click(); this.G.onPanelClosed(); }
  openPanel(tab, extra) {
    this.G.audio.click(); this.tab = tab; this.extra = extra; this.sel = null; $('panel').classList.remove('hidden'); this.renderPanel();
  }
  openShop(k) { this.closeDialog(); this.openPanel('shop', k); }
  openCraft(st) { this.closeDialog(); this.openPanel('craft', st); }
  renderPanel() {
    const G = this.G, S = G.S, tab = this.tab;
    const tabs = [['inv', 'Pack'], ['craft', 'Craft'], ['skills', 'Skills'], ['quests', 'Quests'], ['map', 'Map'], ['settings', 'Settings']]; if (tab === 'shop') tabs.unshift(['shop', SHOPS[this.extra].name]);
    $('ptabs').innerHTML = tabs.map(([k, n]) => `<b data-k="${k}" class="${k === tab ? 'on' : ''}">${n}</b>`).join('');
    $('ptabs').onclick = e => { const k = e.target.dataset.k; if (!k) return; this.tab = k; if (k !== 'shop' && k !== 'craft') this.extra = this.extra; this.sel = null; this.renderPanel(); };
    const B = $('pBody'); const h = [];
    if (tab === 'inv') {
      h.push(`<div class="stats"><div>Attack <b>${G.atk().toFixed(0)}</b></div><div>Defence <b>${G.def().toFixed(0)}</b></div><div>Coin <b>${G.coinStr()}</b></div><div>Pack <b>${G.slotsUsed()}/${G.slotsMax()}</b></div></div><div class="eq">`);
      for (const s of SLOTS) { const it = ITEMS[S.equip[s]]; h.push(`<div class="eqs" data-eq="${s}"><span class="ic">${it ? it.ico : '·'}</span><div><div class="sl">${SLOTN[s]}</div><div class="nm ${it ? 't-' + it.r : ''}">${it ? it.name : 'Empty'}</div></div></div>`); }
      h.push('</div><div class="grid">'); for (const [id, n] of Object.entries(S.inv)) { if (!n) continue; const it = ITEMS[id]; h.push(`<div class="slot r-${it.r} ${this.sel === id ? 'sel' : ''}" data-id="${id}">${it.ico}<small>${n > 1 ? n : ''}</small></div>`); } h.push('</div>');
      const it = ITEMS[this.sel]; h.push('<div class="info">'); if (it) { h.push(`<b class="t-${it.r}">${it.name}</b> <span class="muted">${it.r}</span><div>${it.desc}</div><div class="muted">${statLine(it)}</div>`);
        if (it.slot) h.push(`<button class="btn" data-act="equip">Equip</button>`); if (it.use) h.push(`<button class="btn" data-act="use">Use</button><button class="btn" data-act="q0">Quick 1</button><button class="btn" data-act="q1">Quick 2</button>`); if (it.cat !== 'quest') h.push(`<button class="btn" data-act="drop">Drop one</button>`); }
      else h.push('<span class="muted">Tap an item. Tap an equipped slot to remove it.</span>'); h.push('</div>');
    } else if (tab === 'craft') {
      const st = G.stationsNear(); if (this.extra && !st.includes(this.extra)) st.push(this.extra);
      h.push(`<h3>Crafting</h3><div class="muted" style="margin-bottom:6px">Available here: ${st.map(s => ({ hand: 'by hand', bench: 'workbench', campfire: 'campfire', forge: 'forge', church: 'church' })[s]).join(', ')}</div>`);
      const list = RECIPES.slice().sort((a, b) => (b.at.some(s => st.includes(s)) - a.at.some(s => st.includes(s))));
      for (const r of list) { const it = ITEMS[r.out]; const here = r.at.some(s => st.includes(s)); const can = here && Object.entries(r.need).every(([k, n]) => G.craftCount(k) >= n);
        h.push(`<div class="row"><span class="ic">${it.ico}</span><div class="grow"><div class="t-${it.r}">${it.name}${r.n > 1 ? ' ×' + r.n : ''}</div><div class="muted">${Object.entries(r.need).map(([k, n]) => `<span style="color:${G.craftCount(k) >= n ? '#cfe8b0' : '#e8a090'}">${ITEMS[k].name} ${G.craftCount(k)}/${n}</span>`).join(' · ')}${here ? '' : ' · at ' + r.at.join('/')}</div></div><button class="btn" data-craft="${r.id}" ${can ? '' : 'disabled'}>Make</button></div>`); }
    } else if (tab === 'skills') {
      h.push(`<h3>Skills</h3><div class="muted">Skill points: <b>${S.sp}</b> — one per level.</div>`);
      for (const s of SKILLS) { const rk = S.skills[s.id] || 0; h.push(`<div class="row"><div class="grow"><div>${s.name} <span class="muted">${rk}/${s.max}</span></div><div class="muted">${s.desc}</div></div><button class="btn" data-skill="${s.id}" ${rk < s.max && S.sp >= s.cost ? '' : 'disabled'}>+${s.cost}</button></div>`); }
    } else if (tab === 'quests') {
      const M = G.missions, W = G.wpos, tr = G.trackTarget(); const dist = p => p && p.x < 900 ? Math.round(Math.hypot(p.x - W.x, p.z - W.z)) + ' m' : (p ? 'here' : '');
      const tb = (k, on) => `<button class="btn" data-track="${k}">${on ? '◆ Tracked' : 'Track'}</button>`;
      h.push('<h3>Now</h3>'); if (tr) h.push(`<div class="row"><div class="grow"><div class="t-blessed">${tr.name}</div><div>${tr.obj}</div><div class="muted">${tr.place ? tr.place + ' · ' : ''}${dist(tr.pos)}</div></div></div>`);
      const mq = G.mq(); h.push('<h3>The Way (main road)</h3>'); if (mq) h.push(`<div class="row"><div class="grow"><div class="t-blessed">${mq.name}</div><div>${mq.desc}</div>${mq.why ? `<div class="muted">${mq.why}</div>` : ''}<div class="muted">${G.mqProgText()}</div></div>${tb('main', S.track === 'main')}</div>`); else h.push('<div class="muted">Pilgrimage complete. Missions and bounties always need a willing pair of hands.</div>');
      const act = M.activeIds(); h.push(`<h3>Missions in progress (${act.length})</h3>`); if (!act.length) h.push('<div class="muted">None — pick one below. Look for <b style="color:#f3c95a">!</b> over villagers.</div>');
      for (const id of act) { const m = M.byId[id], a = M.st.act[id], tg = M.target(id);
        const steps = m.steps.map((s, i) => `<div class="${i < a.s ? 'muted' : ''}">${i < a.s ? '✓' : i === a.s ? '▶' : '○'} ${s.d}${i === a.s && s.place ? ` <span class="muted">— ${s.place}</span>` : ''}</div>`).join('');
        h.push(`<div class="row"><div class="grow"><div>${m.name} <span class="muted">· ${G.npcById(m.giver)?.name || ''}</span></div>${steps}<div class="muted">${tg?.pos ? dist(tg.pos) : ''}</div></div>${tb('m:' + id, S.track === 'm:' + id)}<button class="btn" data-mabandon="${id}">✕</button></div>`); }
      const av = M.available().map(m => ({ m, p: M.giverPos(m) })).sort((a, b) => Math.hypot(a.p.x - W.x, a.p.z - W.z) - Math.hypot(b.p.x - W.x, b.p.z - W.z));
      h.push(`<h3>Available missions (${av.length})</h3>`); if (!av.length) h.push('<div class="muted">No new missions right now — follow the main road; more open up as you go.</div>');
      for (const { m, p } of av.slice(0, 8)) { const r = m.reward || {}; h.push(`<div class="row"><div class="grow"><div><b style="color:#f3c95a">!</b> ${m.name} ${S.lvl < m.minLvl ? `<span class="muted">(Lv ${m.minLvl})</span>` : ''}</div><div class="muted">Talk to ${G.npcById(m.giver)?.name} · ${m.area} · ${dist(p)} · +${r.xp} XP, ${r.coin}c</div></div>${tb('g:' + m.id, S.track === 'g:' + m.id)}</div>`); }
      h.push(`<div class="muted" style="margin-top:4px">Missions completed: ${Object.keys(M.st.done).length} / ${M.byId ? Object.keys(M.byId).length : 0}</div>`);
      h.push('<h3>Bounties</h3>'); if (!S.side.length) h.push('<div class="muted">No bounties. Check a notice board or ask townsfolk.</div>');
      for (const q of S.side) h.push(`<div class="row"><div class="grow"><div>${q.name} ${q.done ? '<span class="t-uncommon">✓ ready</span>' : ''}</div><div class="muted">${q.desc} — ${q.prog}/${q.n}${q.giver ? ' · return to ' + G.giverName(q.giver) : ''}</div></div>${tb(q.uid, S.track === q.uid)}<button class="btn" data-abandon="${q.uid}">✕</button></div>`);
    } else if (tab === 'map') {
      h.push('<canvas id="mapC" width="512" height="512"></canvas><div class="muted" style="text-align:center;margin-top:6px">Gold dots: shrines · ◆ objective · <b style=\"color:#f3c95a\">!</b> new mission · <b style=\"color:#8fe08a\">?</b> report back · Yellow line: the Camino</div>');
      if (G.owner) { this._ft = travelPlaces(G); h.push(`<h3 style="margin-top:8px">Fast travel <span class="muted" style="font-size:11px">· tap the map or a place</span></h3><div class="ftList">${this._ft.map((p, i) => `<b data-ft="${i}"><i>${p.kind}</i>${p.label}</b>`).join('')}</div>`); }
    } else if (tab === 'settings') {
      h.push(`<h3>Settings</h3><div class="row"><div class="grow">Graphics quality</div><div class="seg" id="sq">${['Low', 'Medium', 'High'].map((n, i) => `<b data-q="${i}" class="${G.qLevel === i ? 'on' : ''}">${n}</b>`).join('')}</div></div>
      <div class="row"><div class="grow">Camera sensitivity</div><input type="range" id="sens" min="0.4" max="2" step="0.1" value="${G.sens}"></div>
      <div class="row"><div class="grow">Invert camera vertical</div><button class="btn" id="invY">${G.invY ? 'On' : 'Off'}</button></div>
      <div class="row"><div class="grow">Sound</div><button class="btn" id="mute">${G.audio.muted ? 'Off' : 'On'}</button></div>
      <div class="row"><div class="grow">Show FPS</div><button class="btn" id="fpsB">${G.showFps ? 'On' : 'Off'}</button></div>
      <div class="row"><div class="grow">Save &amp; return to title</div><button class="btn" id="quit">Save</button></div>
      <div class="row"><div class="grow">Credits</div><button class="btn" id="cred">View</button></div>`);
    } else if (tab === 'shop') {
      const sh = SHOPS[this.extra]; h.push(`<h3>${sh.name}</h3><div class="muted">Coin: <b>${G.coinStr()}</b></div>`);
      for (const s of sh.stock) { const it = ITEMS[s.id]; const p = G.price(s.price); h.push(`<div class="row"><span class="ic">${it.ico}</span><div class="grow"><div class="t-${it.r}">${it.name}</div><div class="muted">${it.desc} ${statLine(it)}</div></div><button class="btn" data-buy="${s.id}" data-p="${p}" ${S.coin >= p ? '' : 'disabled'}>${p}c</button></div>`); }
      h.push('<h3>Sell</h3>'); for (const [id, n] of Object.entries(S.inv)) { if (!n) continue; const it = ITEMS[id]; if (it.cat === 'quest') continue; const p = G.sellPrice(id); h.push(`<div class="row"><span class="ic">${it.ico}</span><div class="grow">${it.name} ×${n}</div><button class="btn" data-sell="${id}">${p}c</button></div>`); }
    }
    B.innerHTML = h.join('');
    if (tab === 'map') { const c = $('mapC'); this.drawBigMap(c);
      if (G.owner) { c.classList.add('ft'); c.onclick = e => { const r = c.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * 600 - 300, z = (e.clientY - r.top) / r.height * 600 - 300; e.stopPropagation(); fastTravel(G, x, z); };
        B.querySelector('.ftList').onclick = e => { const b = e.target.closest('[data-ft]'); if (!b) return; e.stopPropagation(); const p = this._ft[+b.dataset.ft]; fastTravel(G, p.x, p.z, p.label); }; } }
    B.onclick = e => this.panelClick(e);
    const sq = $('sq'); if (sq) sq.onclick = e => { const v = e.target.dataset.q; if (v != null) { G.setQuality(+v); this.renderPanel(); } };
    const sens = $('sens'); if (sens) sens.oninput = () => { G.sens = +sens.value; localStorage.setItem('pr_sens', G.sens); };
  }
  panelClick(e) {
    const G = this.G, S = G.S, t = e.target.closest('[data-id],[data-eq],[data-act],[data-craft],[data-skill],[data-buy],[data-sell],[data-track],[data-abandon],[data-mabandon],button'); if (!t) return; const d = t.dataset;
    if (d.id) { this.sel = d.id; }
    else if (d.eq) { if (S.equip[d.eq] && d.eq !== 'weapon') G.unequip(d.eq); }
    else if (d.act === 'equip') G.equip(this.sel); else if (d.act === 'use') { G.useItem(this.sel); if (!S.inv[this.sel]) this.sel = null; }
    else if (d.act === 'q0' || d.act === 'q1') { S.quick[+d.act[1]] = this.sel; this.toast('Set to quick slot'); }
    else if (d.act === 'drop') { G.take(this.sel, 1); if (!S.inv[this.sel]) this.sel = null; }
    else if (d.craft) G.craft(d.craft); else if (d.skill) G.learn(d.skill);
    else if (d.buy) G.buy(d.buy, +d.p); else if (d.sell) G.sell(d.sell);
    else if (d.track) { S.track = d.track; } else if (d.mabandon) { G.missions.abandon(d.mabandon); G.ui.toast('Mission abandoned'); } else if (d.abandon) { S.side = S.side.filter(q => q.uid !== d.abandon); if (S.track === d.abandon) S.track = 'main'; }
    else if (t.id === 'invY') { G.invY = !G.invY; localStorage.setItem('pr_invy', G.invY ? '1' : '0'); }
    else if (t.id === 'mute') G.audio.setMuted(!G.audio.muted); else if (t.id === 'fpsB') { G.showFps = !G.showFps; $('fps').classList.toggle('hidden', !G.showFps); }
    else if (t.id === 'quit') { G.save(); location.reload(); return; } else if (t.id === 'cred') { this.closePanel(); this.credits(); return; }
    else return;
    G.audio.click(); this.renderPanel();
  }
  drawBigMap(c) {
    const G = this.G, g = c.getContext('2d'), N = c.width, k = N / 600; g.drawImage(this.mapTex, 0, 0, N, N);
    const P = (x, z) => [(x + 300) * k, (z + 300) * k];
    g.strokeStyle = '#f2c20f'; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); PATH.forEach(([x, z], i) => { const [a, b] = P(x, z); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.stroke(); g.setLineDash([]);
    g.font = '12px Georgia'; g.textAlign = 'center';
    for (const [key, p] of Object.entries(PLACES)) { if (/^(notice|bench|campfire|chapel_chest|market|priest|bridge|poor_1)$/.test(key)) continue; const [a, b] = P(p.x, p.z); const sh = /shrine/.test(key); g.fillStyle = sh ? '#ffd76a' : '#fff'; g.beginPath(); g.arc(a, b, sh ? 4 : 3, 0, 7); g.fill(); if (!sh) { g.fillStyle = '#000a'; g.fillText(p.label, a + 1, b - 7); g.fillStyle = '#fff'; g.fillText(p.label, a, b - 8); } }
    const [px, pz] = P(G.wpos.x, G.wpos.z); g.save(); g.translate(px, pz); g.rotate(-G.player.yaw + Math.PI); g.fillStyle = '#ff6a4a'; g.beginPath(); g.moveTo(0, -8); g.lineTo(6, 6); g.lineTo(-6, 6); g.fill(); g.restore();
    for (const mk of G.missions?.mapMarks() || []) { const [a, b] = P(mk.x, mk.z); g.fillStyle = 'rgba(20,14,8,.85)'; g.beginPath(); g.arc(a, b, 7, 0, 7); g.fill(); g.fillStyle = g.strokeStyle = mk.k === '?' ? '#8fe08a' : '#f3c95a'; g.lineWidth = 1.5; g.stroke(); g.font = 'bold 11px Georgia'; g.textBaseline = 'middle'; g.fillText(mk.k, a, b + 0.5); g.textBaseline = 'alphabetic'; }
    const tr = G.trackTarget(); if (tr && tr.pos && !tr.inner) { const [a, b] = P(tr.pos.x, tr.pos.z); g.save(); g.translate(a, b); g.rotate(Math.PI / 4); g.fillStyle = '#ffe08a'; g.strokeStyle = '#3a2a10'; g.lineWidth = 2; g.fillRect(-6, -6, 12, 12); g.strokeRect(-6, -6, 12, 12); g.restore(); }
  }
}
function statLine(it) { const s = []; if (it.atk) s.push(`ATK ${it.atk}`); if (it.def) s.push(`DEF ${it.def}`); if (it.faithBonus) s.push(`Faith +${it.faithBonus}`); if (it.hpBonus) s.push(`HP +${it.hpBonus}`); if (it.speed) s.push(`Speed +${Math.round(it.speed * 100)}%`); if (it.demonBonus) s.push(`vs shadows +${it.demonBonus}%`); if (it.slots) s.push(`+${it.slots} slots`); if (it.hp) s.push(`+${it.hp} HP`); if (it.hunger) s.push(`+${it.hunger} food`); if (it.faith) s.push(`+${it.faith} faith`); return s.join(' · '); }
