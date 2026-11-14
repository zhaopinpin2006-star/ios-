import * as THREE from 'three';

export function createBurst(poster, targetRatio, base) {
  const count = 300;
  const start = new Float32Array(count * 3);
  const position = new Float32Array(count * 3);
  const velocity = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();
  const palette = [0xff543e, 0xffb84f, 0xffdc78, 0xfff0cf];
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
    const angle = Math.random() * Math.PI * 2;
    const distance = .12 + Math.random() * .49;
    velocity.set([Math.cos(angle) * distance, Math.sin(angle) * distance, .06 + Math.random() * .47], offset);
    color.setHex(palette[i % palette.length]).toArray(colors, offset);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const map = new THREE.CanvasTexture(textureCanvas);
  const material = new THREE.PointsMaterial({
    map, size: .025, transparent: true, vertexColors: true, blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'PosterBurst';
  points.frustumCulled = false;
  points.visible = false;

  const motes = Array.from({ length: 22 }, () => ({
    angle: Math.random() * Math.PI * 2,
    radius: .15 + Math.random() * .27,
    height: .055 + Math.random() * .18,
  }));
  const ambientPosition = new Float32Array(motes.length * 3);
  const ambientGeometry = new THREE.BufferGeometry();
  ambientGeometry.setAttribute('position', new THREE.BufferAttribute(ambientPosition, 3).setUsage(THREE.DynamicDrawUsage));
  const ambientMaterial = new THREE.PointsMaterial({
    map, color: 0xffd580, size: .016, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const ambient = new THREE.Points(ambientGeometry, ambientMaterial);
  ambient.name = 'Embers';
  ambient.frustumCulled = false;
  ambient.visible = false;

  function animate(elapsed, time) {
    ambient.visible = time > .85;
    if (ambient.visible) {
      ambientMaterial.opacity = Math.min(1, time - .85) * (.48 + .14 * Math.sin(time * 1.7));
      for (let i = 0; i < motes.length; i++) {
        const { angle, radius, height } = motes[i];
        const orbit = angle + time * .25;
        const offset = i * 3;
        ambientPosition[offset] = base.x + Math.cos(orbit) * radius;
        ambientPosition[offset + 1] = base.y + Math.sin(orbit) * radius * .76;
        ambientPosition[offset + 2] = height + .034 * Math.sin(time * 1.6 + angle);
      }
      ambientGeometry.attributes.position.needsUpdate = true;
    }

    const gatherDuration = .26;
    const duration = 1.42;
    points.visible = elapsed >= 0 && elapsed < duration;
    if (!points.visible) return;
    const gather = Math.min(1, elapsed / gatherDuration) ** 1.7;
    const progress = Math.max(0, (elapsed - gatherDuration) / (duration - gatherDuration));
    const spread = 1 - (1 - progress) ** 3;
    material.opacity = Math.min(1, elapsed * 21) * (1 - progress) ** 1.2;
    for (let i = 0; i < position.length; i += 3) {
      position[i] = start[i] + (base.x - start[i]) * gather * .9 + velocity[i] * spread;
      position[i + 1] = start[i + 1] + (base.y - start[i + 1]) * gather * .9 + velocity[i + 1] * spread;
      position[i + 2] = start[i + 2] + .045 * gather + velocity[i + 2] * spread - .09 * progress ** 2;
    }
    geometry.attributes.position.needsUpdate = true;
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
    ambientGeometry.dispose();
    ambientMaterial.dispose();
    map.dispose();
  }
  return { points, ambient, animate, dispose };
}
