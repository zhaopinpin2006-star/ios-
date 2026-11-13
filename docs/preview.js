import * as THREE from 'three';
import { lightBird } from './character.js';

export function openPreview(stage, bird) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  stage.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(33, 1, .1, 30);
  lightBird(scene);
  scene.add(bird.group);
  const bounds = new THREE.Box3().setFromObject(bird.group);
  const radius = bounds.getBoundingSphere(new THREE.Sphere()).radius;
  let yaw = -.62;
  let pitch = .02;
  let pointer;

  function resize() {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.z = radius / (tangent * Math.min(1, camera.aspect)) * 1.09;
    camera.updateProjectionMatrix();
  }
  function begin(event) {
    if (pointer) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    stage.setPointerCapture(event.pointerId);
  }
  function drag(event) {
    if (pointer?.id !== event.pointerId) return;
    yaw += (event.clientX - pointer.x) * .011;
    pitch = THREE.MathUtils.clamp(pitch + (event.clientY - pointer.y) * .01, -1.05, 1.05);
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  }
  function end(event) {
    if (pointer?.id === event.pointerId) pointer = undefined;
  }
  stage.addEventListener('pointerdown', begin);
  stage.addEventListener('pointermove', drag);
  stage.addEventListener('lostpointercapture', end);
  window.addEventListener('resize', resize);
  resize();
  const began = performance.now();
  renderer.setAnimationLoop(now => {
    const time = (now - began) / 1000;
    bird.group.position.y = .035 * Math.sin(time * 2.8);
    bird.group.rotation.set(pitch, yaw, 0);
    bird.flap(time, .4);
    renderer.render(scene, camera);
  });
  return () => {
    renderer.setAnimationLoop(null);
    renderer.dispose();
    renderer.domElement.remove();
    bird.dispose();
    stage.removeEventListener('pointerdown', begin);
    stage.removeEventListener('pointermove', drag);
    stage.removeEventListener('lostpointercapture', end);
    window.removeEventListener('resize', resize);
  };
}
