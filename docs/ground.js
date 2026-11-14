import {
  CanvasTexture, Group, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace,
} from 'three';

function radialTexture(stops) {
  const canvas = document.createElement('canvas');
  const radius = 64;
  canvas.width = canvas.height = radius * 2;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(radius, radius, 0, radius, radius, radius);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function createGround() {
  const group = new Group();
  const geometry = new PlaneGeometry(1, 1);
  const shadowMap = radialTexture([
    [0, '#211426c9'],
    [.24, '#211426aa'],
    [.54, '#21142658'],
    [.78, '#21142616'],
    [1, '#21142600'],
  ]);
  const rippleMap = radialTexture([
    [0, '#ef4e3100'],
    [.64, '#ef4e3100'],
    [.76, '#ff7b2548'],
    [.81, '#ffb53bae'],
    [.85, '#ffe6a0ff'],
    [.878, '#ffc454e0'],
    [.905, '#f25030aa'],
    [.96, '#e32c2300'],
    [1, '#e32c2300'],
  ]);
  const shadowMaterial = new MeshBasicMaterial({
    map: shadowMap, transparent: true, depthWrite: false, toneMapped: false,
  });
  const rippleMaterial = new MeshBasicMaterial({
    map: rippleMap, transparent: true, depthWrite: false, toneMapped: false,
  });
  const shadow = new Mesh(geometry, shadowMaterial);
  const ripple = new Mesh(geometry, rippleMaterial);
  ripple.position.z = .002;
  group.add(shadow, ripple);

  function animate(elapsed) {
    group.visible = elapsed >= 0;
    if (!group.visible) return;

    const lift = 1 - (1 - Math.min(1, elapsed / 1.65)) ** 3;
    shadow.scale.set(.45 + .10 * lift, .29 + .11 * lift, 1);
    shadowMaterial.opacity = (.55 - .34 * lift) * Math.min(1, elapsed * 12);

    const progress = elapsed / 1.25;
    ripple.visible = progress < 1;
    if (!ripple.visible) return;

    const spread = 1 - (1 - progress) ** 2;
    const diameter = .19 + .73 * spread;
    ripple.scale.set(diameter, diameter * .87, 1);
    rippleMaterial.opacity = (1 - progress) ** 1.6;
  }

  animate(-1);
  return {
    group,
    animate,
    dispose() {
      geometry.dispose();
      shadowMaterial.dispose();
      rippleMaterial.dispose();
      shadowMap.dispose();
      rippleMap.dispose();
    },
  };
}
