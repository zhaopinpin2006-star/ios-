import {
  BufferGeometry, CanvasTexture, Float32BufferAttribute, Group, Mesh,
  MeshStandardMaterial, Shape, ShapeUtils, SRGBColorSpace,
} from 'three';

const wingBounds = { left: -0.73, right: 0.09, bottom: -0.24, top: 0.27 };

function makeWingGeometry() {
  const outline = new Shape();
  outline.moveTo(0.047, -0.064);
  outline.bezierCurveTo(0.085, 0.020, 0.012, 0.121, -0.139, 0.182);
  outline.bezierCurveTo(-0.337, 0.267, -0.601, 0.210, -0.701, 0.080);
  outline.bezierCurveTo(-0.770, -0.015, -0.664, -0.081, -0.530, -0.070);
  outline.bezierCurveTo(-0.533, -0.142, -0.443, -0.162, -0.353, -0.132);
  outline.bezierCurveTo(-0.326, -0.199, -0.251, -0.212, -0.185, -0.161);
  outline.bezierCurveTo(-0.102, -0.147, 0.015, -0.126, 0.047, -0.064);

  const outlineSamples = outline.getSpacedPoints(60).slice(0, -1);
  if (ShapeUtils.isClockWise(outlineSamples)) outlineSamples.reverse();
  const center = { x: -0.323, y: 0.031 };
  const positions = [];
  const uvs = [];
  const indices = [];
  const sampleCount = outlineSamples.length;
  const radii = [0.25, 0.49, 0.70, 0.86, 0.96];

  function vertex(x, y, thickness) {
    const index = positions.length / 3;
    const bend = -0.23 * x + 0.048 * Math.sin(Math.PI * -x / 0.73) + 0.10 * y;
    positions.push(x, y, bend + thickness);
    uvs.push(
      (x - wingBounds.left) / (wingBounds.right - wingBounds.left),
      (y - wingBounds.bottom) / (wingBounds.top - wingBounds.bottom),
    );
    return index;
  }

  const rim = outlineSamples.map(({ x, y }) => vertex(x, y, 0));
  for (const side of [1, -1]) {
    const tip = vertex(center.x, center.y, side * 0.054);
    const rings = radii.map((radius) => outlineSamples.map(({ x, y }) => vertex(
      center.x + (x - center.x) * radius,
      center.y + (y - center.y) * radius,
      side * 0.054 * Math.sqrt(1 - radius * radius),
    )));
    rings.push(rim);

    function triangle(a, b, c) {
      if (side === 1) indices.push(a, b, c);
      else indices.push(c, b, a);
    }

    for (let i = 0; i < sampleCount; i++) {
      const next = (i + 1) % sampleCount;
      triangle(tip, rings[0][i], rings[0][next]);
      for (let ring = 1; ring < rings.length; ring++) {
        const inner = rings[ring - 1];
        const outer = rings[ring];
        triangle(inner[i], outer[i], outer[next]);
        triangle(inner[i], outer[next], inner[next]);
      }
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeWingTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const base = ctx.createLinearGradient(0, 12, 90, 247);
  base.addColorStop(0, '#f05c40');
  base.addColorStop(0.52, '#c53124');
  base.addColorStop(1, '#96241d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  function paintedDash(x, y, length, width, angle, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-length * 0.62, 0);
    ctx.bezierCurveTo(-length * 0.35, -width, length * 0.54, -width * 0.71, length * 0.56, 0);
    ctx.bezierCurveTo(length * 0.58, width * 0.77, -length * 0.21, width * 0.70, -length * 0.62, 0);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  paintedDash(86, 77, 38, 10, -0.46, '#ffeac4');
  paintedDash(151, 59, 39, 9, -0.19, '#fff2d5');
  paintedDash(212, 68, 33, 7, 0.15, '#ffe9bb');
  paintedDash(87, 118, 53, 12, -0.35, '#efad3c');
  paintedDash(151, 113, 66, 13, -0.54, '#ffc854');
  paintedDash(200, 131, 57, 11, -0.62, '#f8b741');
  paintedDash(225, 154, 47, 10, -0.61, '#ffcf65');

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function createWings() {
  const group = new Group();
  const geometry = makeWingGeometry();
  const texture = makeWingTexture();
  const material = new MeshStandardMaterial({ map: texture, roughness: 0.83 });
  const wings = [1, -1].map((side) => {
    const pivot = new Group();
    pivot.position.set(0.053, 0.035, side * 0.285);
    const mesh = new Mesh(geometry, material);
    mesh.scale.z = side;
    pivot.add(mesh);
    group.add(pivot);
    return { side, pivot };
  });

  function flap(elapsed, intensity) {
    const beat = elapsed * 17;
    for (const { side, pivot } of wings) {
      pivot.rotation.set(
        side * (0.12 + Math.sin(beat) * 0.92 * intensity),
        side * (0.42 + Math.cos(beat) * 0.15 * intensity),
        -0.22 + Math.sin(beat + 0.45) * 0.25 * intensity,
        'YXZ',
      );
    }
  }

  flap(0, 0);
  return {
    group,
    flap,
    dispose() {
      texture.dispose();
      material.dispose();
      geometry.dispose();
    },
  };
}
