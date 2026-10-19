import * as THREE from '../vendor/three.module.min.js';
import { LANDMARKS } from './data.js';

export const WORLD_SIZE = 600;
const HALF = WORLD_SIZE / 2;

export function heightAt(x, z) {
  const n = Math.sin(x * 0.02) * Math.cos(z * 0.018) * 4
    + Math.sin(x * 0.05 + z * 0.03) * 2
    + Math.cos(z * 0.04) * 1.5;
  // River dip
  const rd = Math.abs(z - (-0.4 * x + 20));
  const river = rd < 18 ? -2.5 * (1 - rd / 18) : 0;
  // Hills west
  const hill = (x < -80) ? ((-80 - x) / 80) * 8 * Math.max(0, Math.sin((z + 150) * 0.03)) : 0;
  return n + river + hill;
}

export function createWorld(scene) {
  const group = new THREE.Group();
  scene.add(group);

  // Ground
  const groundGeo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 80, 80);
  const pos = groundGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    pos.setZ(i, heightAt(x, y));
  }
  groundGeo.computeVertexNormals();
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x3d5c34 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // River strip
  const riverGeo = new THREE.PlaneGeometry(28, 420, 1, 20);
  const riverMat = new THREE.MeshLambertMaterial({ color: 0x3a6a8a, transparent: true, opacity: 0.85 });
  const river = new THREE.Mesh(riverGeo, riverMat);
  river.rotation.x = -Math.PI / 2;
  river.rotation.z = Math.atan2(1, -0.4) - Math.PI / 2;
  river.position.set(-40, 0.15, 40);
  group.add(river);

  // Instanced trees
  const treeGeo = new THREE.ConeGeometry(1.2, 4, 5);
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 1.5, 5);
  const treeMat = new THREE.MeshLambertMaterial({ color: 0x2d5a28 });
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a3a1a });
  const treeCount = 280;
  const trees = new THREE.InstancedMesh(treeGeo, treeMat, treeCount);
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  trees.castShadow = true;
  const dummy = new THREE.Object3D();
  let ti = 0;
  for (let i = 0; i < treeCount * 3 && ti < treeCount; i++) {
    const x = (Math.random() - 0.5) * WORLD_SIZE * 0.92;
    const z = (Math.random() - 0.5) * WORLD_SIZE * 0.92;
    if (Math.hypot(x - 200, z - 200) < 45) continue; // town clear
    if (Math.hypot(x, z - 40) < 35) continue; // start village
    if (Math.abs(z - (-0.4 * x + 20)) < 22) continue; // river
    const y = heightAt(x, z);
    const s = 0.7 + Math.random() * 0.6;
    dummy.position.set(x, y + 2.5 * s, z);
    dummy.scale.set(s, s, s);
    dummy.rotation.y = Math.random() * 6;
    dummy.updateMatrix();
    trees.setMatrixAt(ti, dummy.matrix);
    dummy.position.set(x, y + 0.75 * s, z);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    trunks.setMatrixAt(ti, dummy.matrix);
    ti++;
  }
  trees.count = ti; trunks.count = ti;
  group.add(trees); group.add(trunks);

  // Instanced rocks
  const rockGeo = new THREE.DodecahedronGeometry(0.7, 0);
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x6a6a62 });
  const rockCount = 120;
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  rocks.castShadow = true;
  let ri = 0;
  for (let i = 0; i < rockCount * 2 && ri < rockCount; i++) {
    const x = (Math.random() - 0.5) * WORLD_SIZE * 0.9;
    const z = (Math.random() - 0.5) * WORLD_SIZE * 0.9;
    if (Math.hypot(x, z - 40) < 30) continue;
    const y = heightAt(x, z);
    const s = 0.5 + Math.random() * 1.2;
    dummy.position.set(x, y + 0.3 * s, z);
    dummy.scale.set(s, s * 0.7, s);
    dummy.rotation.set(Math.random(), Math.random(), Math.random());
    dummy.updateMatrix();
    rocks.setMatrixAt(ri++, dummy.matrix);
  }
  rocks.count = ri;
  group.add(rocks);

  // Gather nodes
  const nodes = [];
  function addNode(type, x, z, color, yOff = 0.4) {
    const geo = type === 'berry' || type === 'herb'
      ? new THREE.SphereGeometry(0.35, 6, 4)
      : type === 'fish' ? new THREE.SphereGeometry(0.25, 5, 4)
      : new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }));
    const y = heightAt(x, z) + yOff;
    mesh.position.set(x, y, z);
    group.add(mesh);
    nodes.push({ type, mesh, x, z, respawn: 0 });
  }
  for (let i = 0; i < 40; i++) {
    const x = (Math.random() - 0.5) * 500, z = (Math.random() - 0.5) * 500;
    addNode('wood', x, z, 0x8a5a2a);
  }
  for (let i = 0; i < 30; i++) {
    const x = (Math.random() - 0.5) * 500, z = (Math.random() - 0.5) * 500;
    addNode('stone', x, z, 0x888880);
  }
  for (let i = 0; i < 35; i++) {
    const x = (Math.random() - 0.5) * 500, z = (Math.random() - 0.5) * 500;
    addNode('herb', x, z, 0x4aaf4a, 0.3);
  }
  for (let i = 0; i < 30; i++) {
    const x = (Math.random() - 0.5) * 500, z = (Math.random() - 0.5) * 500;
    addNode('berry', x, z, 0x6a2a8a, 0.3);
  }
  for (let i = 0; i < 12; i++) {
    const t = (i / 12) * Math.PI * 2;
    const x = -40 + Math.cos(t) * 100;
    const z = 40 + Math.sin(t) * 80;
    addNode('fish', x, z, 0x4a8aba, 0.2);
  }
  for (let i = 0; i < 15; i++) {
    const x = -150 + (Math.random() - 0.5) * 80;
    const z = -140 + (Math.random() - 0.5) * 80;
    addNode('iron_ore', x, z, 0x4a4a5a);
  }
  for (let i = 0; i < 10; i++) {
    const x = (Math.random() - 0.5) * 400, z = (Math.random() - 0.5) * 400;
    addNode('wax', x, z, 0xd4c48a, 0.5);
  }
  for (let i = 0; i < 12; i++) {
    const x = (Math.random() - 0.5) * 400, z = (Math.random() - 0.5) * 400;
    addNode('cloth', x, z, 0xc8c0b0, 0.3);
  }

  const buildings = [];
  const interactives = [];

  function boxBuilding(x, z, w, h, d, color, label) {
    const y = heightAt(x, z);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color })
    );
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    group.add(mesh);
    // roof
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(w, d) * 0.75, h * 0.45, 4),
      new THREE.MeshLambertMaterial({ color: 0x6a3030 })
    );
    roof.position.set(x, y + h + h * 0.2, z);
    roof.rotation.y = Math.PI / 4;
    group.add(roof);
    buildings.push({ mesh, x, z, label });
    return mesh;
  }

  function makeShrine(key, x, z) {
    const y = heightAt(x, z);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.4, 0.4, 8),
      new THREE.MeshLambertMaterial({ color: 0x9a9a90 })
    );
    base.position.set(x, y + 0.2, z);
    group.add(base);
    const crossV = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 2.2, 0.2),
      new THREE.MeshLambertMaterial({ color: 0xc9a86c })
    );
    crossV.position.set(x, y + 1.5, z);
    group.add(crossV);
    const crossH = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.2, 0.2),
      new THREE.MeshLambertMaterial({ color: 0xc9a86c })
    );
    crossH.position.set(x, y + 2.1, z);
    group.add(crossH);
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 6, 4),
      new THREE.MeshBasicMaterial({ color: 0xffaa40 })
    );
    flame.position.set(x + 0.6, y + 0.7, z);
    flame.visible = false;
    group.add(flame);
    interactives.push({ type: 'shrine', key, x, z, mesh: base, flame, lit: false });
  }

  // Start village
  boxBuilding(-12, 45, 6, 4, 5, 0xb8a078, 'cottage');
  boxBuilding(15, 48, 5, 3.5, 5, 0xa89068, 'cottage');
  boxBuilding(-5, 55, 7, 4, 6, 0xc0a880, 'inn');
  makeShrine('shrine_start', 8, 28);
  // Notice board
  {
    const y = heightAt(5, 35);
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(2, 1.5, 0.15),
      new THREE.MeshLambertMaterial({ color: 0x6a4a28 })
    );
    board.position.set(5, y + 1.5, 35);
    group.add(board);
    interactives.push({ type: 'notice', x: 5, z: 35, mesh: board });
  }
  // Crafting bench + campfire near start
  {
    const y = heightAt(-8, 38);
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.8, 1),
      new THREE.MeshLambertMaterial({ color: 0x5a3a1a })
    );
    bench.position.set(-8, y + 0.4, 38);
    group.add(bench);
    interactives.push({ type: 'bench', x: -8, z: 38, mesh: bench });
    const fire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.8, 0.4, 8),
      new THREE.MeshLambertMaterial({ color: 0x333333 })
    );
    fire.position.set(-5, y + 0.2, 36);
    group.add(fire);
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 6, 4),
      new THREE.MeshBasicMaterial({ color: 0xff6620 })
    );
    glow.position.set(-5, y + 0.6, 36);
    group.add(glow);
    interactives.push({ type: 'campfire', x: -5, z: 36, mesh: fire });
  }

  makeShrine('shrine_forest', 140, -120);
  makeShrine('shrine_river', -100, 80);
  makeShrine('shrine_hill', -160, -160);
  makeShrine('shrine_town', 200, 180);

  // Bandit camp
  boxBuilding(-180, 40, 5, 3, 5, 0x4a3020, 'bandit_tent');
  boxBuilding(-172, 48, 4, 2.5, 4, 0x4a3020, 'bandit_tent');
  {
    const y = heightAt(-175, 42);
    const chest = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.7, 0.7),
      new THREE.MeshLambertMaterial({ color: 0x8a6a20 })
    );
    chest.position.set(-175, y + 0.35, 42);
    group.add(chest);
    interactives.push({ type: 'chest', key: 'bandit_chest', x: -175, z: 42, mesh: chest, loot: ['iron_ingot', 'cloth', 'coin'] });
  }

  // Ruined chapel
  {
    const x = 60, z = -200;
    const y = heightAt(x, z);
    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(10, 5, 8),
      new THREE.MeshLambertMaterial({ color: 0x8a8a80, transparent: true, opacity: 0.85 })
    );
    walls.position.set(x, y + 2.5, z);
    group.add(walls);
    interactives.push({ type: 'chapel', x, z, mesh: walls });
    const chest = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.8, 0.8),
      new THREE.MeshLambertMaterial({ color: 0xaa8820 })
    );
    chest.position.set(62, y + 0.4, -198);
    group.add(chest);
    interactives.push({ type: 'chest', key: 'chapel_chest', x: 62, z: -198, mesh: chest, needsKey: 'chapel_key', loot: ['blessed_hat', 'silver_rosary', 'coin'] });
  }

  // Town
  boxBuilding(185, 195, 6, 4, 6, 0xb8a888, 'shop');
  boxBuilding(198, 188, 5, 4, 5, 0xa89878, 'smith');
  boxBuilding(210, 192, 5, 3.5, 5, 0xc0b090, 'tailor');
  boxBuilding(192, 208, 5, 3.5, 5, 0xb0a080, 'apothecary');
  // Cathedral
  {
    const x = 210, z = 210;
    const y = heightAt(x, z);
    const cath = new THREE.Mesh(
      new THREE.BoxGeometry(14, 10, 10),
      new THREE.MeshLambertMaterial({ color: 0xd4c8b0 })
    );
    cath.position.set(x, y + 5, z);
    cath.castShadow = true;
    group.add(cath);
    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(2, 8, 4),
      new THREE.MeshLambertMaterial({ color: 0xc9a86c })
    );
    spire.position.set(x, y + 14, z);
    group.add(spire);
    interactives.push({ type: 'cathedral', key: 'cathedral', x, z, mesh: cath });
    interactives.push({ type: 'church', x: 205, z: 205, mesh: cath });
    // Forge near smith
    interactives.push({ type: 'forge', x: 198, z: 185, mesh: cath });
  }
  // Shops interactives
  interactives.push({ type: 'shop', shop: 'merchant', x: 185, z: 195, label: 'Merchant' });
  interactives.push({ type: 'shop', shop: 'blacksmith', x: 198, z: 188, label: 'Blacksmith' });
  interactives.push({ type: 'shop', shop: 'tailor', x: 210, z: 192, label: 'Tailor' });
  interactives.push({ type: 'shop', shop: 'apothecary', x: 192, z: 208, label: 'Apothecary' });
  interactives.push({ type: 'shop', shop: 'church', x: 208, z: 208, label: 'Church Shop' });
  interactives.push({ type: 'npc', npc: 'priest', x: 212, z: 208, label: 'Priest' });
  interactives.push({ type: 'npc', npc: 'poor_1', x: 12, z: 42, label: 'Beggar' });
  interactives.push({ type: 'npc', npc: 'lost_pilgrim', x: -120, z: -220, label: 'Lost Pilgrim' });

  // NPC meshes (simple)
  function addNpc(x, z, color) {
    const y = heightAt(x, z);
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 0.9, 3, 6),
      new THREE.MeshLambertMaterial({ color })
    );
    body.position.set(x, y + 1.1, z);
    group.add(body);
    return body;
  }
  addNpc(212, 208, 0x2a2a35);
  addNpc(12, 42, 0x6a5a40);
  addNpc(-120, -220, 0x8a7a60);

  // Region 2 sign
  {
    const x = 0, z = -290;
    const y = heightAt(x, z);
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 3, 0.2),
      new THREE.MeshLambertMaterial({ color: 0x5a3a1a })
    );
    post.position.set(x, y + 1.5, z);
    group.add(post);
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(3, 1.2, 0.15),
      new THREE.MeshLambertMaterial({ color: 0x8a6a38 })
    );
    sign.position.set(x, y + 2.5, z);
    group.add(sign);
    interactives.push({ type: 'sign', x, z, mesh: sign, text: 'Region 2: coming soon' });
  }

  // Chests scattered
  const chestSpots = [[80, 80], [-50, -80], [150, 50], [-200, -50], [40, 150]];
  chestSpots.forEach(([x, z], i) => {
    const y = heightAt(x, z);
    const chest = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.6, 0.6),
      new THREE.MeshLambertMaterial({ color: 0x8a7020 })
    );
    chest.position.set(x, y + 0.3, z);
    group.add(chest);
    const loots = [['coin'], ['herb', 'cloth'], ['iron_ore', 'coin'], ['scallop_shell'], ['olive_rosary', 'coin']];
    interactives.push({
      type: 'chest', key: 'chest_' + i, x, z, mesh: chest,
      loot: loots[i] || ['coin']
    });
  });

  // Chapel key near chapel ruins exterior
  {
    const x = 70, z = -190;
    const y = heightAt(x, z);
    const keyMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.15, 0.15),
      new THREE.MeshLambertMaterial({ color: 0xffd98a })
    );
    keyMesh.position.set(x, y + 0.3, z);
    group.add(keyMesh);
    nodes.push({ type: 'chapel_key', mesh: keyMesh, x, z, respawn: -1 });
  }

  return { group, nodes, interactives, buildings, trees, rocks };
}

export function getLandmark(key) {
  return LANDMARKS[key] || null;
}
