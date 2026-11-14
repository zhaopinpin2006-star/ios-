import { Group, Vector3 } from 'three';
import { createBird, lightBird } from './character.js';
import { createBurst } from './burst.js?v=3d2';
import { createGround } from './ground.js?v=3d2';
import { openPreview } from './preview.js';

const intro = document.querySelector('#intro');
const container = document.querySelector('#ar');
const status = document.querySelector('#status');
const startButton = document.querySelector('#start');
const preview = document.querySelector('#preview');
const previewButton = document.querySelector('#preview-button');
const previewStatus = document.querySelector('#preview-status');
const photo = document.querySelector('#photo');
const hud = document.querySelector('#hud');
const hint = document.querySelector('#hint');
const replay = document.querySelector('#replay');
const poster = document.querySelector('.poster img');

let session;
let closePreview;

function setBusy(busy) {
  startButton.disabled = busy;
  previewButton.disabled = busy;
  photo.disabled = busy;
}

async function loadTarget(selectedPhoto) {
  if (!selectedPhoto) {
    const response = await fetch('./targets.mind');
    if (!response.ok) throw new Error('识别数据加载失败（HTTP ' + response.status + '）');
    return { data: await response.arrayBuffer(), ratio: 256 / 260 };
  }

  const { Compiler } = await import('./vendor/mindar-image.prod.js');
  const url = URL.createObjectURL(selectedPhoto);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 700 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    const compiler = new Compiler();
    await compiler.compileImageTargets([canvas], progress => {
      status.textContent = '正在分析识别图片 ' + Math.min(100, Math.round(progress)) + '%';
    });
    return { data: compiler.exportData(), ratio: canvas.height / canvas.width };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function disposeSession(current) {
  if (!current) return;
  current.burst?.dispose();
  current.ground?.dispose();
  current.bird?.dispose();
  current.ar?.dispose();
}

function exitAR() {
  disposeSession(session);
  session = undefined;
  hud.hidden = true;
  intro.hidden = false;
  status.textContent = '';
  setBusy(false);
}

async function startAR() {
  setBusy(true);
  let stage = '检查摄像头';
  const current = { firstSeenAt: null, effectsAt: null };
  try {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('请使用 Safari 或支持摄像头的浏览器打开 HTTPS 链接。');
    }
    stage = '加载识别数据和 3D 模型';
    status.textContent = '正在' + stage + '…';
    const selectedPhoto = photo.files[0];
    const [{ MindARThree }, target] = await Promise.all([
      import('./vendor/mindar-image-three.prod.js'),
      loadTarget(selectedPhoto),
    ]);
    const bird = current.bird = await createBird();
    const ground = current.ground = createGround();
    const base = selectedPhoto
      ? new Vector3(0, 0, .036)
      : new Vector3(.06, -.54, .036);
    const burst = current.burst = createBurst(selectedPhoto ? null : poster, target.ratio, base);
    ground.group.position.set(base.x, base.y, .003);

    const stance = new Group();
    stance.name = 'StandingMudgugu';
    stance.position.copy(base);
    // The flat target lies in XY. Its normal (+Z) is the sculpture's up direction.
    stance.rotation.x = Math.PI / 2;
    const heading = new Group();
    heading.rotation.y = -1.08;
    // Offset the centered sculpture so the stance origin is between its feet.
    bird.group.position.set(-.11, bird.height / 2, -.03);
    heading.add(bird.group);
    stance.add(heading);
    const standingHeight = selectedPhoto ? Math.min(.74, target.ratio * .86) : .74;
    const standingScale = standingHeight / bird.height;
    stance.scale.setScalar(standingScale);

    const ar = current.ar = new MindARThree({
      container, imageTargetData: target.data, maxTrack: 1,
      uiLoading: 'no', uiScanning: 'no', uiError: 'no',
    });
    const { scene, renderer, camera } = ar;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.45));
    lightBird(scene);
    const anchor = ar.addAnchor(0);
    anchor.group.add(stance, ground.group, burst.points, burst.ambient);
    hint.textContent = selectedPhoto ? '请对准选择的识别图片…' : '正在寻找泥咕咕海报…';
    replay.disabled = true;

    anchor.onTargetFound = () => {
      if (current.firstSeenAt === null) {
        current.firstSeenAt = current.effectsAt = performance.now();
      }
      hint.textContent = '已识别 · 移动手机绕看';
      replay.disabled = false;
    };
    anchor.onTargetLost = () => {
      current.effectsAt = null;
      hint.textContent = selectedPhoto ? '请重新对准识别图片' : '请重新对准泥咕咕海报';
      replay.disabled = true;
    };

    stage = '启动摄像头与图像跟踪';
    status.textContent = '正在' + stage + '…';
    await ar.start();
    renderer.setAnimationLoop(now => {
      if (anchor.visible && current.firstSeenAt !== null) {
        const elapsed = Math.max(0, (now - current.firstSeenAt) / 1000);
        const entrance = Math.min(1, Math.max(0, (elapsed - .18) / .65));
        stance.visible = elapsed >= .18;
        stance.scale.setScalar(standingScale * (1 - .28 * (1 - entrance) ** 3));
        const effectsElapsed = current.effectsAt === null ? Infinity : Math.max(0, (now - current.effectsAt) / 1000);
        ground.animate(effectsElapsed);
        burst.animate(effectsElapsed, elapsed);
      }
      renderer.render(scene, camera);
    });

    session = current;
    intro.hidden = true;
    hud.hidden = false;
  } catch (error) {
    disposeSession(current);
    console.error(error);
    status.textContent = stage + '失败：' + (error?.message || String(error));
    setBusy(false);
  }
}

async function showPreview() {
  setBusy(true);
  intro.hidden = true;
  preview.hidden = false;
  previewStatus.textContent = '正在加载 3D 模型…';
  const request = new AbortController();
  closePreview = () => request.abort();
  try {
    const bird = await createBird();
    if (request.signal.aborted) {
      bird.dispose();
      return;
    }
    try {
      closePreview = openPreview(document.querySelector('#model-stage'), bird);
    } catch (error) {
      bird.dispose();
      throw error;
    }
    previewStatus.textContent = '拖动查看模型的各个角度';
  } catch (error) {
    if (!request.signal.aborted) {
      console.error(error);
      previewStatus.textContent = '3D 预览加载失败。返回后可重试。';
    }
  }
}

startButton.addEventListener('click', startAR);
previewButton.addEventListener('click', showPreview);
document.querySelector('#close-preview').addEventListener('click', () => {
  closePreview?.();
  closePreview = undefined;
  preview.hidden = true;
  intro.hidden = false;
  setBusy(false);
  previewButton.focus();
});
document.querySelector('#stop').addEventListener('click', exitAR);
replay.addEventListener('click', () => {
  if (session && !replay.disabled) session.effectsAt = performance.now();
});
window.addEventListener('pagehide', () => {
  if (session) exitAR();
});
