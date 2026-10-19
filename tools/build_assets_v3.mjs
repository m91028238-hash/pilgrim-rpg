import {NodeIO, Document} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {simplify, weld, mergeDocuments, prune, dedup, textureCompress, meshopt, resample, unpartition, flatten} from '@gltf-transform/functions';
import {MeshoptEncoder, MeshoptSimplifier} from 'meshoptimizer';
await MeshoptSimplifier.ready;
import sharp from 'sharp';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder});
await MeshoptEncoder.ready;
const OUT='/workspace/pilgrim-rpg/assets';
const UBC='/tmp/assets/x/ubc/Universal Base Characters[Standard]';
const BASE=UBC+'/Base Characters/Godot - UE';
const HAIR=UBC+'/Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)';
const MCO='/tmp/assets/x/mco/Modular Character Outfits - Fantasy[Standard]/Exports/glTF (Godot-Unreal)/Outfits';
const V='/tmp/assets/x/village/Medieval Village MegaKit[Standard]/glTF';
const N='/tmp/assets/x/nature/glTF';

// Merge several files into one doc; each file's scene roots wrapped in a node named `tag`
async function combine(list){
  const doc=new Document(); doc.createBuffer(); const scene=doc.createScene('Scene');
  for(const [path,tag] of list){
    const src=await io.read(path);
    const before=new Set(doc.getRoot().listScenes());
    mergeDocuments(doc,src);
    for(const s of doc.getRoot().listScenes()){ if(s===scene||before.has(s)) continue;
      const w=doc.createNode(tag); for(const c of s.listChildren()){ s.removeChild(c); w.addChild(c);} scene.addChild(w); s.dispose(); }
  }
  // single buffer
  const bufs=doc.getRoot().listBuffers(); for(const b of bufs.slice(1)) { for(const a of doc.getRoot().listAccessors()) if(a.getBuffer()===b) a.setBuffer(bufs[0]); b.dispose(); }
  return doc;
}
// rebind every skin to the joints of the first skin (by node name) and drop duplicate armatures
function unifySkeleton(doc){
  const skins=doc.getRoot().listSkins(); const master=skins[0];
  const byName=new Map(master.listJoints().map(j=>[j.getName(),j]));
  for(const s of skins.slice(1)){
    const joints=s.listJoints();
    for(const j of joints){ const m=byName.get(j.getName()); if(!m){console.warn('missing joint',j.getName()); continue;} s.removeJoint(j); }
    for(const j of joints){ const m=byName.get(j.getName()); if(m) s.addJoint(m); }
    s.setSkeleton(master.getSkeleton()||null);
  }
  // detach meshes from dead armatures: move skinned mesh nodes under master root, delete other bone trees
  const masterJoints=new Set(master.listJoints());
  const root=doc.getRoot().listScenes()[0];
  const masterTop=topOf(master.listJoints()[0]);
  for(const n of doc.getRoot().listNodes()){
    if(n.getMesh()&&n.getSkin()&&!isUnder(n,masterTop)){ const p=n.getParentNode(); if(p) p.removeChild(n); masterTop.addChild(n);} }
  for(const n of doc.getRoot().listNodes()){
    if(masterJoints.has(n)||n===masterTop) continue;
    if(!n.getMesh() && !isUnder(n,masterTop) && !hasMeshDesc(n)) n.dispose();
  }
  for(const s of skins.slice(1)) if(s.listJoints().length===0) s.dispose();
}
function topOf(n){ while(n.getParentNode()) n=n.getParentNode(); return n; }
function isUnder(n,top){ while(n){ if(n===top) return true; n=n.getParentNode(); } return false; }
function hasMeshDesc(n){ if(n.getMesh()) return true; return n.listChildren().some(hasMeshDesc); }

async function finish(doc,file,{tex=1024,norm=512,anim=false}={}){
  const clean=()=>{const live=new Set(doc.getRoot().listAnimations().flatMap(a=>a.listSamplers()));for(const a of doc.getRoot().listAccessors()) if(a.listParents().every(p=>p.propertyType==='Root'||(p.propertyType==='AnimationSampler'&&!live.has(p)))) a.dispose();};
  await doc.transform(dedup(), prune({keepLeaves:true}), ...(anim?[resample({tolerance:1e-3}),prune()]:[]),
    textureCompress({encoder:sharp,targetFormat:'webp',resize:[tex,tex],slots:/^(?!normal).*$/,quality:80}),
    textureCompress({encoder:sharp,targetFormat:'webp',resize:[norm,norm],slots:/normal/,quality:85}),
    ()=>clean(), meshopt({encoder:MeshoptEncoder,level:'medium'}));
  await io.write(`${OUT}/${file}`,doc); console.log('wrote',file);
}
const which=process.argv[2]||'all';
if(which==='all'||which==='chars'){
  for(const [sex,base,outfits,hairs] of [
    ['m','Superhero_Male_FullBody',['Male_Peasant','Male_Ranger'],['Hair_SimpleParted','Hair_Beard','Hair_Long','Hair_Buzzed','Eyebrows_Regular']],
    ['f','Superhero_Female_FullBody',['Female_Peasant','Female_Ranger'],['Hair_Buns','Hair_Long','Eyebrows_Female']]]){
    const list=[[`${BASE}/${base}.gltf`,'Base'],...outfits.map(o=>[`${MCO}/${o}.gltf`,o]),...hairs.map(h=>[`${HAIR}/${h}.gltf`,h])];
    const doc=await combine(list);
    // tag meshes with their group name for runtime toggling
    for(const w of doc.getRoot().listScenes()[0].listChildren()) tagMeshes(w,w.getName());
    unifySkeleton(doc);
    await finish(doc,`human_${sex}.glb`,{tex:1024,norm:512});
  }
}
function tagMeshes(n,tag){ if(n.getMesh()) n.setExtras({...n.getExtras(),group:tag}); n.listChildren().forEach(c=>tagMeshes(c,tag)); }
if(which==='all'||which==='anims'){
  const keep1=['Idle_Loop','Walk_Loop','Jog_Fwd_Loop','Sprint_Loop','Sword_Attack','Sword_Idle','Roll','Hit_Chest','Hit_Head','Death01','Idle_Talking_Loop','Interact','PickUp_Table','Spell_Simple_Shoot','Spell_Simple_Idle_Loop','Punch_Jab','Walk_Formal_Loop','Sitting_Idle_Loop'];
  const keep2=['Sword_Regular_A','Sword_Regular_B','Sword_Regular_C','Sword_Heavy_Combo','Sword_Block','Idle_Shield_Loop','Hit_Knockback','Consume','Chest_Open','TreeChopping_Loop','Farm_Harvest','Zombie_Walk_Fwd_Loop','Zombie_Scratch','Zombie_Idle_Loop','Idle_FoldArms_Loop','Yes','Idle_Lantern_Loop'];
  const a1=await io.read('/tmp/assets/x/ual1/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb');
  const a2=await io.read('/tmp/assets/x/ual2/Universal Animation Library 2[Standard]/Unreal-Godot/UAL2_Standard.glb');
  for(const a of a1.getRoot().listAnimations()) if(!keep1.includes(a.getName())) a.dispose();
  for(const a of a2.getRoot().listAnimations()) if(!keep2.includes(a.getName())) a.dispose();
  mergeDocuments(a1,a2);
  const s0=a1.getRoot().listSkins()[0]; const byName=new Map(s0.listJoints().map(j=>[j.getName(),j]));
  const rootNames=new Map(a1.getRoot().listNodes().filter(n=>!n.getParentNode()).map(n=>[n.getName(),n]));
  const firstScene=a1.getRoot().listScenes()[0];
  const own=new Set(); (function walk(n){own.add(n);n.listChildren().forEach(walk)}); for(const c of firstScene.listChildren()) (function w(n){own.add(n);n.listChildren().forEach(w)})(c);
  for(const an of a1.getRoot().listAnimations()) for(const ch of an.listChannels()){ const t=ch.getTargetNode(); if(t&&!own.has(t)){ const m=byName.get(t.getName())|| [...own].find(o=>o.getName()===t.getName()); if(m) ch.setTargetNode(m); else ch.dispose(); } }
  for(const s of a1.getRoot().listScenes().slice(1)){ for(const c of s.listChildren()) (function d(n){n.listChildren().forEach(d); n.dispose()})(c); s.dispose(); }
  const bufs=a1.getRoot().listBuffers(); for(const b of bufs.slice(1)){ for(const a of a1.getRoot().listAccessors()) if(a.getBuffer()===b) a.setBuffer(bufs[0]); b.dispose(); }
  for(const an of a1.getRoot().listAnimations()) for(const ch of an.listChannels()){ const path=ch.getTargetPath(); const nm=ch.getTargetNode()?.getName()||''; if(path==='scale'||(path==='translation'&&!/^(pelvis|root)$/i.test(nm))){ const s=ch.getSampler(); ch.dispose(); s.dispose(); } }
  console.log('anims',a1.getRoot().listAnimations().map(a=>a.getName()).join(','));
  await finish(a1,'anims.glb',{tex:512,norm:256,anim:true});
}
if(which==='all'||which==='village'){
  const pieces=['Wall_Plaster_Straight','Wall_Plaster_Window_Wide_Round','Wall_Plaster_Door_Round','Wall_Plaster_WoodGrid','Wall_UnevenBrick_Straight','Wall_UnevenBrick_Window_Thin_Round','Wall_UnevenBrick_Door_Round','Wall_UnevenBrick_Window_Wide_Round','Corner_Exterior_Brick','Corner_Exterior_Wood','Floor_Brick','Floor_UnevenBrick','Roof_RoundTiles_4x4','Roof_RoundTiles_6x6','Roof_RoundTiles_6x8','Roof_RoundTiles_8x8','Roof_RoundTiles_8x12','Roof_Tower_RoundTiles','Prop_Wagon','Prop_Crate','Prop_WoodenFence_Single','Prop_Chimney','Wall_Arch','Prop_ExteriorBorder_Straight1','Prop_Vine2','Prop_MetalFence_Ornament','Prop_Support','WindowShutters_Wide_Round_Open','Stairs_Exterior_Straight','Prop_Brick1'];
  const doc=await combine(pieces.map(p=>[`${V}/${p}.gltf`,p]));
  await doc.transform(weld(), simplify({simplifier:MeshoptSimplifier, ratio:0.35, error:0.004}));
  await finish(doc,'village.glb',{tex:1024,norm:512});
}
if(which==='all'||which==='nature'){
  const pieces=['CommonTree_1','CommonTree_2','CommonTree_3','Pine_1','Pine_2','Pine_3','DeadTree_1','TwistedTree_2','Rock_Medium_1','Rock_Medium_2','Rock_Medium_3','Bush_Common','Bush_Common_Flowers','Grass_Common_Short','Grass_Wispy_Tall','Flower_3_Group','Flower_4_Group','Fern_1','Plant_1','Mushroom_Common','Pebble_Round_1','RockPath_Round_Wide','Clover_1'];
  const lods=['CommonTree_1','CommonTree_2','CommonTree_3','Pine_1','Pine_2','Pine_3','DeadTree_1','Bush_Common','Rock_Medium_1','Rock_Medium_2'];
  const doc=await combine([...pieces.map(p=>[`${N}/${p}.gltf`,p])]);
  await doc.transform(weld(), simplify({simplifier:MeshoptSimplifier, ratio:0.5, error:0.01}));
  await finish(doc,'nature.glb',{tex:512,norm:256});
}
if(which==='all'||which==='animals'){
  for(const [f,o] of [['/tmp/assets/Wolf.glb','wolf.glb'],['/tmp/assets/Boar.glb','boar.glb'],['/tmp/assets/Cow.glb','cow.glb']]){
    const d=await io.read(f);
    // drop duplicate "AnimalArmature|" clips
    for(const a of d.getRoot().listAnimations()) if(a.getName().includes('|')) a.dispose();
    await finish(d,o,{tex:512,norm:256,anim:true});
  }
}
