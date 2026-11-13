import * as THREE from 'three';

export function createBurst(poster, targetRatio) {
  const count = 360;
  const start = new Float32Array(count * 3);
  const position = new Float32Array(count * 3);
  const velocity = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();
  const palette = [0xff543e, 0xffc85f, 0xfff0cf, 0xa8d65f];
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = textureCanvas.height = 32;
  const context = textureCanvas.getContext('2d');
  const glow = context.createRadialGradient(16, 16, 0, 16, 16, 16);
  glow.addColorStop(0, '#ffffff');
  glow.addColorStop(.22, '#ffffffeb');
  glow.addColorStop(.55, '#ffffff58');
  glow.addColorStop(1, '#ffffff00');
  context.fillStyle = glow;
  context.fillRect(0, 0, 32, 32);

  // Sample the lower part of the target where the bird is drawn.
  const sample = document.createElement('canvas');
  sample.width = sample.height = 80;
  const sampleContext = sample.getContext('2d', { willReadFrequently: true });
  if (poster?.naturalWidth) sampleContext.drawImage(poster, 0, 0, 80, 80);
  const pixels = sampleContext.getImageData(0, 0, 80, 80).data;
  const silhouette = [];
  for (let y = 38; y < 80; y++) {
    for (let x = 2; x < 71; x++) {
      const offset = (y * 80 + x) * 4;
      const [r, g, b, a] = pixels.subarray(offset, offset + 4);
      if (a && (Math.max(r, g, b) < 104 || (r > g * 1.3 && r > b * 1.3))) {
        silhouette.push([x / 80 - .5, .5 - y / 80]);
      }
    }
  }

  for (let i = 0; i < count; i++) {
    const offset = i * 3;
    const point = silhouette[Math.floor(Math.random() * silhouette.length)];
    const x = point?.[0] ?? (Math.random() - .5) * .65;
    const y = point?.[1] ?? (Math.random() - .5) * .55;
    start.set([x, y * targetRatio, .015], offset);
    velocity.set([x * .9 + (Math.random() - .5) * .36, y * .55 + Math.random() * .5, .2 + Math.random() * .55], offset);
    color.setHex(palette[i % palette.length]).toArray(colors, offset);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const map = new THREE.CanvasTexture(textureCanvas);
  const material = new THREE.PointsMaterial({
    map, size: .023, transparent: true, vertexColors: true, blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.visible = false;

  function animate(elapsed) {
    points.visible = elapsed >= 0 && elapsed < 1.65;
    if (!points.visible) return;
    const progress = Math.min(1, elapsed / 1.65);
    const spread = 1 - (1 - progress) ** 3;
    material.opacity = Math.min(1, elapsed * 17) * (1 - progress ** 2);
    for (let i = 0; i < position.length; i++) {
      position[i] = start[i] + velocity[i] * spread;
    }
    geometry.attributes.position.needsUpdate = true;
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
    map.dispose();
  }
  return { points, animate, dispose };
}
