// v4 asset builds: boar (Quaternius pig re-coloured as a wild boar), props (Fantasy Props MegaKit, lazy interiors), village kit + doors.
import {NodeIO, Document} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {simplify, weld, mergeDocuments, prune, dedup, textureCompress, meshopt, resample} from '@gltf-transform/functions';
import {MeshoptEncoder, MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';
await MeshoptSimplifier.ready; await MeshoptEncoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder});
const OUT='/workspace/pilgrim-rpg/assets';
const V='/tmp/assets/x/village/Medieval Village MegaKit[Standard]/glTF';
const P='/tmp/assets/x/props/Exports/glTF';
async function combine(list){
  const doc=new Document(); doc.createBuffer(); const scene=doc.createScene('Scene');
  for(const [path,tag] of list){ const src=await io.read(path); const before=new Set(doc.getRoot().listScenes()); mergeDocuments(doc,src);
    for(const s of doc.getRoot().listScenes()){ if(s===scene||before.has(s)) continue; const w=doc.createNode(tag); for(const c of s.listChildren()){ s.removeChild(c); w.addChild(c);} scene.addChild(w); s.dispose(); } }
  const bufs=doc.getRoot().listBuffers(); for(const b of bufs.slice(1)) { for(const a of doc.getRoot().listAccessors()) if(a.getBuffer()===b) a.setBuffer(bufs[0]); b.dispose(); }
  return doc;
}
async function finish(doc,file,{tex=1024,norm=512,anim=false,orm=true}={}){
  if(!orm) for(const m of doc.getRoot().listMaterials()){ m.setMetallicRoughnessTexture(null); m.setOcclusionTexture(null); }
  await doc.transform(dedup(), prune({keepLeaves:true}), ...(anim?[resample({tolerance:1e-3}),prune()]:[]),
    textureCompress({encoder:sharp,targetFormat:'webp',resize:[tex,tex],slots:/^(?!normal).*$/,quality:80}),
    textureCompress({encoder:sharp,targetFormat:'webp',resize:[norm,norm],slots:/normal/,quality:85}),
    meshopt({encoder:MeshoptEncoder,level:'medium'}));
  await io.write(`${OUT}/${file}`,doc); console.log('wrote',file);
}
const which=process.argv[2]||'all';
if(which==='all'||which==='boar'){
  const d=await io.read('/tmp/pp_u35l6uP5vj.glb');
  for(const a of d.getRoot().listAnimations()){ const n=a.getName().split('|').pop(); if(/Jump/.test(n)) a.dispose(); else a.setName(n); }
  for(const t of d.getRoot().listTextures()){ // pink pig -> bristly dark-brown boar
    const img=sharp(Buffer.from(t.getImage())); const {data,info}=await img.raw().ensureAlpha().toBuffer({resolveWithObject:true});
    for(let i=0;i<data.length;i+=4){ const r=data[i],g=data[i+1],b=data[i+2]; if(r>150&&r-g>50&&r-b>50){ data[i]=86; data[i+1]=66; data[i+2]=50; } }
    t.setImage(await sharp(data,{raw:info}).png().toBuffer()); t.setMimeType('image/png'); }
  for(const m of d.getRoot().listMaterials()){ m.setMetallicFactor(0); m.setRoughnessFactor(0.92); }
  await finish(d,'boar.glb',{tex:128,norm:128,anim:true});
}
if(which==='all'||which==='props'){
  const props=['Bed_Twin1','Bed_Twin2','Bench','Table_Large','Chair_1','Stool','Bookcase_2','BookGroup_Medium_1','Book_Stack_1','Cabinet','CandleStick','CandleStick_Stand','CandleStick_Triple','Candle_1','Candle_2','Chandelier','Chest_Wood','Barrel','Barrel_Apples','Lantern_Wall','Shelf_Simple','Shelf_Small_Bottles','Banner_1','Chalice','Cauldron','Crate_Wooden','FarmCrate_Apple','Nightstand_Shelf','Mug','Bottle_1','Pot_1','Vase_2','Bag','Pouch_Large','Peg_Rack','Workbench','Table_Plate','Scroll_1','Coin_Pile','Potion_1','Rope_1'];
  const kit=['Floor_WoodDark','Window_Wide_Round1','Stair_Interior_Simple','Corner_Interior_Big'];
  const doc=await combine([...props.map(p=>[`${P}/${p}.gltf`,p]),...kit.map(p=>[`${V}/${p}.gltf`,p])]);
  await doc.transform(weld(), simplify({simplifier:MeshoptSimplifier, ratio:0.45, error:0.003}));
  await finish(doc,'props.glb',{tex:512,norm:256,orm:false});
}
if(which==='all'||which==='village'){
  const pieces=['Wall_Plaster_Straight','Wall_Plaster_Window_Wide_Round','Wall_Plaster_Door_Round','Wall_Plaster_WoodGrid','Wall_UnevenBrick_Straight','Wall_UnevenBrick_Window_Thin_Round','Wall_UnevenBrick_Door_Round','Wall_UnevenBrick_Window_Wide_Round','Corner_Exterior_Brick','Corner_Exterior_Wood','Floor_Brick','Floor_UnevenBrick','Roof_RoundTiles_4x4','Roof_RoundTiles_6x6','Roof_RoundTiles_6x8','Roof_RoundTiles_8x8','Roof_RoundTiles_8x12','Roof_Tower_RoundTiles','Prop_Wagon','Prop_Crate','Prop_WoodenFence_Single','Prop_Chimney','Wall_Arch','Prop_ExteriorBorder_Straight1','Prop_Vine2','Prop_MetalFence_Ornament','Prop_Support','WindowShutters_Wide_Round_Open','Stairs_Exterior_Straight','Prop_Brick1','Door_1_Round','Door_4_Round','DoorFrame_Round_Brick','DoorFrame_Round_WoodDark','Window_Wide_Round1','Window_Thin_Round1'];
  const doc=await combine(pieces.map(p=>[`${V}/${p}.gltf`,p]));
  await doc.transform(weld(), simplify({simplifier:MeshoptSimplifier, ratio:0.35, error:0.004}));
  await finish(doc,'village.glb',{tex:1024,norm:512});
}
