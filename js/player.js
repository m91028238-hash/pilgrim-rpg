import * as THREE from '../vendor/three.module.min.js';
import { heightAt } from './world.js';
import { ITEMS } from './data.js';

export function createPilgrim() {
  const root = new THREE.Group();
  const skin = 0xe8c4a0;
  const tunicCol = 0xc8b890;

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 0.85, 4, 8),
    new THREE.MeshLambertMaterial({ color: tunicCol })
  );
  body.position.y = 1.05;
  body.castShadow = true;
  root.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 8, 6),
    new THREE.MeshLambertMaterial({ color: skin })
  );
  head.position.y = 1.85;
  root.add(head);

  // Hat (wide pilgrim)
  const hatBrim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 0.06, 10),
    new THREE.MeshLambertMaterial({ color: 0x5a4030 })
  );
  hatBrim.position.y = 2.05;
  root.add(hatBrim);
  const hatTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.32, 0.35, 8),
    new THREE.MeshLambertMaterial({ color: 0x5a4030 })
  );
  hatTop.position.y = 2.25;
  root.add(hatTop);

  // Scallop shell on hat
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 6, 4, 0, Math.PI),
    new THREE.MeshLambertMaterial({ color: 0xe8dcc0 })
  );
  shell.position.set(0.25, 2.08, 0.35);
  shell.rotation.x = -0.5;
  root.add(shell);

  // Cloak
  const cloak = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 1.2, 6, 1, true),
    new THREE.MeshLambertMaterial({ color: 0x4a5a6a, side: THREE.DoubleSide })
  );
  cloak.position.y = 1.2;
  cloak.rotation.x = Math.PI;
  root.add(cloak);

  // Staff
  const staff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.06, 2.2, 5),
    new THREE.MeshLambertMaterial({ color: 0x6a4a28 })
  );
  staff.position.set(0.45, 1.2, 0);
  root.add(staff);

  // Boots
  const bootL = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.2, 0.35),
    new THREE.MeshLambertMaterial({ color: 0x3a2a1a })
  );
  bootL.position.set(-0.15, 0.12, 0.05);
  root.add(bootL);
  const bootR = bootL.clone();
  bootR.position.x = 0.15;
  root.add(bootR);

  root.userData = { body, head, hatBrim, hatTop, shell, cloak, staff, bootL, bootR, tunicCol };
  return root;
}

export function applyGearVisuals(mesh, equip) {
  const u = mesh.userData;
  const hat = equip.hat ? ITEMS[equip.hat] : null;
  const cloak = equip.cloak ? ITEMS[equip.cloak] : null;
  const weapon = equip.weapon ? ITEMS[equip.weapon] : null;
  const boots = equip.boots ? ITEMS[equip.boots] : null;
  const body = equip.body ? ITEMS[equip.body] : null;

  const hatColors = { common: 0x6a5040, uncommon: 0x5a4030, rare: 0x3a2a1a, blessed: 0xc9a86c, epic: 0x4a3060, legendary: 0xffd98a };
  if (hat) {
    u.hatBrim.visible = true; u.hatTop.visible = true; u.shell.visible = true;
    const c = hatColors[hat.r] || 0x5a4030;
    u.hatBrim.material.color.setHex(c);
    u.hatTop.material.color.setHex(c);
  } else {
    u.hatBrim.visible = false; u.hatTop.visible = false; u.shell.visible = false;
  }

  const cloakColors = { common: 0x6a6a60, uncommon: 0x4a5a6a, rare: 0x3a4a5a, blessed: 0x4a6080, legendary: 0x2a3a6a, epic: 0x5a3a6a };
  if (cloak) {
    u.cloak.visible = true;
    u.cloak.material.color.setHex(cloakColors[cloak.r] || 0x4a5a6a);
  } else {
    u.cloak.visible = false;
  }

  const staffColors = { common: 0x6a4a28, uncommon: 0x5a3a18, rare: 0x4a4a50, blessed: 0xc9a86c, epic: 0x8a70c0, legendary: 0xffe8a0 };
  if (weapon) {
    u.staff.visible = true;
    u.staff.material.color.setHex(staffColors[weapon.r] || 0x6a4a28);
    const isBlade = /sword|blade|knife/.test(weapon.id);
    u.staff.scale.set(isBlade ? 0.7 : 1, isBlade ? 0.85 : 1, isBlade ? 0.7 : 1);
  } else {
    u.staff.visible = true;
    u.staff.material.color.setHex(0x8a7a60);
  }

  if (body) {
    const cols = { common: 0xc8b890, uncommon: 0xb0a078, rare: 0x6a5a48, epic: 0x7a8a9a, blessed: 0xd4c8a0 };
    u.body.material.color.setHex(cols[body.r] || 0xc8b890);
  } else {
    u.body.material.color.setHex(0xc8b890);
  }

  if (boots) {
    const c = boots.r === 'blessed' ? 0x8a7030 : boots.r === 'rare' ? 0x2a1a10 : 0x3a2a1a;
    u.bootL.material.color.setHex(c);
    u.bootR.material.color.setHex(c);
  }
}

export function placeOnTerrain(obj, x, z) {
  const y = heightAt(x, z);
  obj.position.set(x, y, z);
  return y;
}
