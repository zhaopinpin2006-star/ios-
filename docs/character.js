import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createWings } from './wings.js';

const modelUrl = new URL('./mudgugu.glb?v=3d1', import.meta.url);
let model;

export async function createBird() {
  model ??= new GLTFLoader().loadAsync(modelUrl.href).catch(error => {
    model = undefined;
    throw error;
  });
  const sculpture = (await model).scene.clone();
  const bounds = new THREE.Box3().setFromObject(sculpture);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const wings = createWings();
  const source = new THREE.Group();
  source.position.copy(center).negate();
  source.add(sculpture, wings.group);

  const group = new THREE.Group();
  group.name = 'Mudgugu';
  group.add(source);

  return { group, flap: wings.flap, height: size.y, depth: size.z, dispose: wings.dispose };
}

export function lightBird(scene) {
  scene.add(new THREE.HemisphereLight(0xfff5e5, 0x9699bd, 2));
  const key = new THREE.DirectionalLight(0xffe4c3, 2.1);
  key.position.set(3, 5, 5);
  const rim = new THREE.DirectionalLight(0xb1ccff, 1.5);
  rim.position.set(-4, 2, -4);
  scene.add(key, rim);
}
