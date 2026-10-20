// NPC definitions and dialogue. Dialogue nodes: { t:text, c:[{t:label, f:()=>next|undefined}] }
import { ITEMS } from './data.js?v=7';
const M = (cloth, hair = ['Hair_SimpleParted'], outfit = 'Peasant') => ({ sex: 'm', outfit, hair, tints: { cloth } });
const F = (cloth, hair = ['Hair_Buns'], outfit = 'Peasant') => ({ sex: 'f', outfit, hair, tints: { cloth } });
const hoodOff = o => o.traverse(m => { if (m.isMesh && /Hood/.test(m.name)) m.visible = false; });

export const NPC_DEFS = [
  { id: 'poor_1', name: 'Old Tomás', x: -183.5, z: 201, yaw: -2.2, idle: 'sit', look: M(0x6a5a44, ['Hair_Long', 'Hair_Beard']), talk: tomas },
  { id: 'marta', name: 'Marta', x: -201, z: 186.5, yaw: 0.4, idle: 'fold', look: F(0x8a3a2a, ['Hair_Buns']), talk: G => giver(G, 'marta', 'Marta', "The harvest's late and the hens are fussy. If you're staying a while, I could use a hand.", ['gather_herb', 'gather_berry', 'gather_wood', 'wax_candles']) },
  { id: 'paco', name: 'Paco the farmer', x: -238, z: 150, yaw: 1.0, idle: 'idle', look: M(0x4a5a3a, ['Hair_Buzzed', 'Hair_Beard']), route: [[-238, 150], [-250, 146], [-244, 134]], talk: G => giver(G, 'paco', 'Paco', "Boars dig up my turnips every night. Wolves too, now and then.", ['hunt_boar', 'hunt_wolf']) },
  { id: 'sister', name: 'Sister Inés', x: 72.5, z: -36, yaw: 0.6, idle: 'idle', look: F(0x15151a, [], 'Ranger'), habit: 'nun', extra: hoodOff, talk: sister },
  { id: 'ana', name: 'Ana', x: 56, z: -20, yaw: 2.0, idle: 'idle', look: F(0x3a4a6a, ['Hair_Long']), route: [[56, -20], [62, -30], [50, -28]], talk: ana },
  { id: 'luis', name: 'Luis', x: -150, z: -160, yaw: 0.5, idle: 'sit', look: M(0x5a5048, ['Hair_SimpleParted']), talk: luis },
  { id: 'rafael', name: 'Rafael', shop: 'merchant', stall: 'merchant', look: M(0x7a2e24, ['Hair_Buzzed', 'Hair_Beard']), talk: G => shopTalk(G, 'merchant', 'Bread, salt, packs. Fair prices for walkers.') },
  { id: 'lucia', name: 'Lucía', shop: 'apothecary', stall: 'apothecary', look: F(0x2e5a3a, ['Hair_Long']), talk: G => shopTalk(G, 'apothecary', 'Feeling sore? Herbs for the feet, poultices for the rest.') },
  { id: 'carmen', name: 'Carmen', shop: 'tailor', stall: 'tailor', look: F(0x3a3f7a, ['Hair_Buns']), talk: G => shopTalk(G, 'tailor', 'A good cloak keeps the rain and the wolves off.') },
  { id: 'pedro', name: 'Brother Pedro', shop: 'church', stall: 'church', look: M(0x5a4632, ['Hair_Buzzed'], 'Ranger'), habit: 'friar', extra: hoodOff, talk: G => shopTalk(G, 'church', 'Candles, rosaries and medals. Father Anselm blessed the holy water and the medals at morning Mass.') },
  { id: 'iago', name: 'Iago the smith', shop: 'blacksmith', stall: 'blacksmith', look: M(0x3a2a20, ['Hair_Buzzed', 'Hair_Beard']), idle: 'idle', talk: G => giver(G, 'iago', 'Iago', 'Need steel? Or bring me ore and I will pay you for it.', ['ore_run'], 'blacksmith') },
  { id: 'priest', name: 'Father Anselm', x: 206, z: -206.5, yaw: 0, idle: 'idle', look: M(0x15151a, ['Hair_SimpleParted'], 'Ranger'), habit: 'cassock', extra: hoodOff, talk: priest },
  { id: 'guard', name: 'Town guard', x: 160, z: -150, yaw: 2.4, idle: 'fold', look: M(0x5a3a2a, ['Hair_Buzzed'], 'Ranger'), extra: hoodOff, talk: G => ({ t: 'Santiago welcomes walkers. Keep to the road at night — shadows have been seen near the old chapel.', c: [{ t: 'Any bounties?', f: () => { G.openBoard('Town bounties'); } }, { t: 'Thank you.' }] }) },
  { id: 'walker1', name: 'Pilgrim', x: -150, z: 140, look: M(0x6a6050, ['Hair_SimpleParted'], 'Ranger'), extra: hoodOff, speed: 1.25, wait: 6, route: [[-168, 156], [-136, 122], [-104, 92], [-78, 70], [-46, 44], [-10, 22], [-46, 44], [-78, 70], [-104, 92], [-136, 122]], talk: G => ({ t: pick(['Buen Camino! My knees disagree with this hill.', 'They say the cathedral bells can be heard from the last ridge.', 'Watch the woods past Villafranca. Wolves.']), c: [{ t: 'Buen Camino.' }] }) },
  { id: 'walker2', name: 'Pilgrim', x: 100, z: -70, look: F(0x5a6a7a, ['Hair_Long'], 'Ranger'), extra: hoodOff, speed: 1.2, wait: 5, route: [[92, -58], [124, -98], [152, -132], [176, -160], [152, -132], [124, -98]], talk: G => ({ t: pick(['Almost there. I can smell the market.', 'I walked from the coast. Three weeks.', 'Rest at every shrine. Trust me.']), c: [{ t: 'Buen Camino.' }] }) },
  { id: 'kid', name: 'Village boy', x: 186, z: -182, look: M(0x8a6a3a, ['Hair_Buzzed']), scale: 0.82, speed: 2.2, wait: 1, route: [[186, -182], [194, -192], [200, -180], [190, -170]], talk: G => ({ t: "Did you see a wolf? A real one? I'm going to be a knight.", c: [{ t: 'Maybe one day.' }] }) },
];
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

function shopTalk(G, shop, line) { return { t: line, c: [{ t: 'Show me your wares', f: () => { G.ui.openShop(shop); } }, { t: 'Goodbye' }] }; }
function giver(G, id, name, line, pool, shop) {
  const c = []; const act = G.S.side.find(q => q.giver === id);
  if (act) { if (act.done) c.push({ t: `Hand in: ${act.name}`, f: () => { G.turnIn(act); return { t: 'Bless you. That makes my week easier.', c: [{ t: 'Glad to help.' }] }; } }); else line = `How is it going? (${act.name}: ${act.prog}/${act.n})`; }
  else { const off = G.offerFor(id, pool); if (off) c.push({ t: `Offer help: ${off.name} — ${off.desc} (+${off.xp} XP, ${off.coin} coin)`, f: () => { G.acceptSide(off, id); return { t: 'Thank you. Come back when it is done.', c: [{ t: 'I will.' }] }; } }); }
  if (shop) c.push({ t: 'Let me see your stock', f: () => { G.ui.openShop(shop); } });
  c.push({ t: 'Goodbye' }); return { t: line, c };
}
function tomas(G) {
  const mq = G.mq(); const c = [];
  const side = G.S.side.find(q => q.obj === 'deliver' && !q.done);
  if ((mq && mq.id === 'mq3') || side) {
    if (G.has('bread')) c.push({ t: 'Give him a loaf of bread', f: () => { G.take('bread', 1); G.event('deliver', { npc: 'poor_1', item: 'bread' }); return { t: 'God bless you, child. My stomach thanks you, and so do I. Take this shell — it walked with me on my own Camino. Wear it, and people will know you for a pilgrim.', c: [{ t: 'Rest well, Tomás.', f: () => { if (!G.S.flags.tomasGift) { G.S.flags.tomasGift = 1; G.give('scallop_shell', 1); } } }] }; } });
    else c.push({ t: "I don't have bread yet", f: () => ({ t: 'The campfire by the workbench — wheat and a little fire make bread. Or the merchant in Santiago sells it.', c: [{ t: 'I will be back.' }] }) });
  }
  c.push({ t: 'Ask about the Camino', f: () => ({ t: 'Follow the yellow shells east. Past the river shrine, past Villafranca, through the woods. Santiago is at the end. It is not the end of the walk, mind — only the road.', c: [{ t: 'Thank you.' }] }) });
  c.push({ t: 'Goodbye' });
  return { t: G.S.flags.tomasGift ? 'Ah, my friend the pilgrim. Buen Camino.' : 'A pilgrim! It has been a cold week. A little bread would warm an old man.', c };
}
function sister(G) {
  const mq = G.mq(); const c = []; let t = 'Peace be with you, pilgrim. Father Rodrigo blesses water after the morning Mass — leave salt with me and I will bring you a blessed flask.';
  if (mq?.id === 'mq5') { t = 'A pilgrim from San Roque? Thank God. Someone has stolen our chalice — bandits from the western hills. And wolves have grown bold on the forest road.'; c.push({ t: 'I will help.', f: () => { G.event('talk', { npc: 'sister' }); return { t: 'Clear the wolves from the woods first, or you will not reach the hills alive. Then find the camp. Be careful.', c: [{ t: 'I will.' }] }; } }); c.push({ t: 'Why would bandits want a chalice?', f: () => ({ t: 'Silver is silver to a hungry man. Still — it belongs to God and to this village.', c: [{ t: 'I will bring it back.', f: () => { G.event('talk', { npc: 'sister' }); } }] }) }); }
  else if (mq?.id === 'mq8' && G.has('chalice')) { t = 'Is that… you found it!'; c.push({ t: 'Return the chalice', f: () => { G.take('chalice', 1); G.event('deliver', { npc: 'sister', item: 'chalice' }); return { t: 'We will say Mass with it on Sunday, and pray for you. There is a ruined chapel in the woods — its old chest was sealed when the monks left. The key was lost nearby. You should see it before Santiago.', c: [{ t: 'I will look for it.' }] }; } }); }
  else if (mq && ['mq6', 'mq7'].includes(mq.id)) t = mq.id === 'mq6' ? 'The wolves are in the woods south of here. Block when they crouch — they lunge.' : 'The bandit camp is west, in the hills past the shrine. Their chief will have the chalice.';
  c.push({ t: 'Ask for holy water (Father Rodrigo blesses it)', f: () => { G.ui.openCraft('church'); } });
  c.push({ t: 'Goodbye' }); return { t, c };
}
function ana(G) {
  const q = G.S.side.find(s => s.obj === 'rescue');
  if (q) return { t: q.done ? 'Luis is home! Thank you, thank you.' : 'Please — Luis went toward the western woods for firewood and never came back.', c: [{ t: q.done ? 'Thanks be to God.' : 'I will find him.' }] };
  if (G.S.flags.luisSaved) return { t: 'Luis is mending fences now. He owes you one.', c: [{ t: 'Good.' }] };
  return { t: "My brother Luis went to cut wood in the south-west woods two days ago. He hasn't come back. Please, if you're heading that way…", c: [{ t: 'I will look for him.', f: () => { G.acceptSide(G.makeSide('find_pilgrim'), 'ana'); } }, { t: 'Not now' }] };
}
function luis(G) {
  const q = G.S.side.find(s => s.obj === 'rescue' && !s.done);
  if (q) return { t: 'You came for me? I twisted my ankle running from wolves. Ana sent you? God bless her.', c: [{ t: 'Lean on me — let us get you home.', f: () => { G.event('rescue'); G.S.flags.luisSaved = 1; G.npcById('luis').hideAfter = 2; } }] };
  return { t: 'Just resting my ankle.', c: [{ t: 'Take care.' }] };
}
function priest(G) {
  const mq = G.mq(); const c = []; let t = 'Welcome, pilgrim. The cathedral is open day and night.';
  if (mq?.id === 'mq11') { t = 'You have walked far. I can see it in your boots. Go in, pray at the tomb of the Apostle, and make your confession if you can — then come back and I will take you to the Pilgrim\'s Office for your Compostela.'; c.push({ t: 'I will.', f: () => { G.event('talk', { npc: 'priest' }); } }); }
  else if (G.S.flags.finished) { t = 'You have your Compostela. The road east is closed for now — the passes are snowed in. Until then there is work here: the notice boards always need a willing pair of hands.'; }
  else if (mq) t = 'Your road is not finished yet. ' + (mq.desc || '');
  c.push({ t: 'Ask for a blessing', f: () => { G.S.faith = G.maxFaith(); G.ui.toast('Faith restored'); G.audio.choir(); return { t: 'The Lord be with you.', c: [{ t: 'And with your spirit.', f: () => ({ t: 'May almighty God bless you, the Father, and the Son, + and the Holy Spirit.', c: [{ t: 'Amen.' }] }) }] }; } });
  c.push({ t: 'Please bless water and salt for me', f: () => { G.ui.openCraft('church'); } });
  c.push({ t: 'Ask about the cathedral', f: () => ({ t: 'The Apostle St James rests in the crypt beneath the high altar. The Pilgrims\' Mass is at noon, and on great feasts the Botafumeiro swings across the transept. In a Holy Year — when the feast of St James, the 25th of July, falls on a Sunday — the Holy Door is opened, and pilgrims who enter by it, go to confession and receive Holy Communion may gain the plenary indulgence.', c: [{ t: 'Thank you, Father.' }] }) });
  c.push({ t: 'Goodbye' }); return { t, c };
}
export { ITEMS };
