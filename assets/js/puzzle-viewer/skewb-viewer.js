import * as THREE from "../../vendor/three/r162/three.module.js";
import { OrbitControls } from "../../vendor/three/r162/addons/controls/OrbitControls.js";
import { SKEWB_FACE_COLORS } from "./skewb-colors.js";
import {
  applySkewbMove,
  createSkewbDefinition,
  createSolvedSkewbState,
  invertSkewbMove,
  parseSkewbAlgorithm,
  skewbNormalize,
  skewbStateAt,
  selectedSkewbPieces,
} from "./skewb-state.js?v=20261109-3";

export const DEFAULT_SKEWB_THEME = {
  faceColors: SKEWB_FACE_COLORS,
  coreColor: "#77766f",
  canvasBackground: "#eef3f5",
};

function roundedPanelGeometry(panel, faceNormal) {
  const corners = panel.corners;
  const center = panel.center;
  const side = Math.min(...corners.map((corner, index) => (
    new THREE.Vector3(...corner).distanceTo(new THREE.Vector3(...corners[(index + 1) % corners.length]))
  )));
  const normal = new THREE.Vector3(...faceNormal);
  const origin = new THREE.Vector3(...corners[0]);
  const xAxis = new THREE.Vector3(...corners[1]).sub(origin).normalize();
  const yAxis = new THREE.Vector3().crossVectors(normal, xAxis).normalize();
  const vertices = corners.map((corner, index) => {
    const shrunk = new THREE.Vector3(...center).lerp(new THREE.Vector3(...corner), 0.991);
    const relative = shrunk.sub(origin);
    return {
      point: new THREE.Vector2(relative.dot(xAxis), relative.dot(yAxis)),
      // The shared inner junctions are softer than the cube's outer corners.
      radius: side * (panel.kind === "center" ? 0.08 : index === 0 ? 0.045 : 0.105),
    };
  });
  if (THREE.ShapeUtils.isClockWise(vertices.map((vertex) => vertex.point))) vertices.reverse();

  const tangent = vertices.map(({ point, radius }, index) => {
    const previous = vertices[(index + vertices.length - 1) % vertices.length].point;
    const next = vertices[(index + 1) % vertices.length].point;
    const toPrevious = previous.clone().sub(point);
    const toNext = next.clone().sub(point);
    const angle = Math.acos(THREE.MathUtils.clamp(toPrevious.clone().normalize().dot(toNext.clone().normalize()), -1, 1));
    const distance = Math.min(radius / Math.tan(angle / 2), 0.34 * Math.min(toPrevious.length(), toNext.length()));
    return {
      before: point.clone().add(toPrevious.normalize().multiplyScalar(distance)),
      after: point.clone().add(toNext.normalize().multiplyScalar(distance)),
    };
  });
  const shape = new THREE.Shape();
  shape.moveTo(tangent[0].after.x, tangent[0].after.y);
  for (let index = 1; index <= vertices.length; index += 1) {
    const current = index % vertices.length;
    shape.lineTo(tangent[current].before.x, tangent[current].before.y);
    shape.quadraticCurveTo(
      vertices[current].point.x, vertices[current].point.y,
      tangent[current].after.x, tangent[current].after.y,
    );
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: side * 0.035,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: side * 0.009,
    bevelSize: side * 0.006,
    bevelSegments: 3,
    curveSegments: 7,
  });
  geometry.computeVertexNormals();
  const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, normal);
  const position = origin.addScaledVector(normal, side * 0.006);
  geometry.applyMatrix4(basis.setPosition(position));
  return geometry;
}

// Every backing moves with its own piece, leaving no stationary cube in a turn.
function backingGeometry(panel, faceNormal) {
  const normal = new THREE.Vector3(...faceNormal);
  const center = new THREE.Vector3(...panel.center);
  const outer = panel.corners.map((corner) => center.clone().lerp(new THREE.Vector3(...corner), 0.994)
    .addScaledVector(normal, -0.009));
  const inner = outer.map((corner) => corner.clone().addScaledVector(normal, -0.17));
  const positions = [];
  function addFace(a, b, c) { positions.push(...a.toArray(), ...b.toArray(), ...c.toArray()); }
  for (let index = 1; index < outer.length - 1; index += 1) {
    addFace(outer[0], outer[index], outer[index + 1]);
    addFace(inner[0], inner[index + 1], inner[index]);
  }
  for (let index = 0; index < outer.length; index += 1) {
    const next = (index + 1) % outer.length;
    addFace(outer[index], inner[index], outer[next]);
    addFace(outer[next], inner[index], inner[next]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function createRenderer(host, definition, initialTheme) {
  if (typeof document === "undefined") return null;
  const probe = document.createElement("canvas");
  if (!probe.getContext("webgl2") && !probe.getContext("webgl")) return null;
  let webgl;
  try {
    webgl = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return null;
  }
  webgl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  webgl.outputColorSpace = THREE.SRGBColorSpace;
  webgl.domElement.className = "skewb-viewer-canvas";
  webgl.domElement.setAttribute("aria-hidden", "true");
  host.replaceChildren(webgl.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 100);
  const root = new THREE.Group();
  const piecesRoot = new THREE.Group();
  root.add(piecesRoot);
  scene.add(root);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x687c88, 2.0));
  const light = new THREE.DirectionalLight(0xffffff, 2.65);
  light.position.set(4, 8, 7);
  scene.add(light);

  const coreMaterial = new THREE.MeshStandardMaterial({ color: initialTheme.coreColor || DEFAULT_SKEWB_THEME.coreColor, roughness: 0.58, side: THREE.DoubleSide });
  const materials = Object.fromEntries(definition.faces.map((face) => [face, new THREE.MeshPhysicalMaterial({
    color: initialTheme.faceColors?.[face] || DEFAULT_SKEWB_THEME.faceColors[face],
    roughness: 0.27,
    metalness: 0,
    clearcoat: 0.27,
    clearcoatRoughness: 0.28,
    side: THREE.DoubleSide,
  })]));
  const geometries = [];
  const nodes = new Map();
  for (const piece of definition.pieces) {
    const node = new THREE.Group();
    node.name = piece.id;
    node.matrixAutoUpdate = false;
    piece.panels.forEach((panel) => {
      const backing = backingGeometry(panel, definition.faceNormals[panel.face]);
      geometries.push(backing);
      node.add(new THREE.Mesh(backing, coreMaterial));
      const geometry = roundedPanelGeometry(panel, definition.faceNormals[panel.face]);
      geometries.push(geometry);
      node.add(new THREE.Mesh(geometry, materials[panel.face]));
    });
    piecesRoot.add(node);
    nodes.set(piece.id, node);
  }

  const aspectFit = Math.min(1, host.clientWidth / Math.max(host.clientHeight, 1));
  const cameraScale = 1 + (1 - aspectFit) * 1.5;
  const initialCamera = { position: [4.9, 3.8, 6.2].map((value) => value * cameraScale), target: [0, 0, 0] };
  camera.position.set(...initialCamera.position);
  const controls = new OrbitControls(camera, webgl.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.minDistance = 4.5;
  controls.maxDistance = 15;
  controls.target.set(...initialCamera.target);
  controls.update();
  const cameraListeners = new Set();
  controls.addEventListener("change", () => cameraListeners.forEach((listener) => listener()));

  function resize() {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    webgl.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  let frameId = 0;
  let destroyed = false;
  function frame() {
    if (destroyed) return;
    controls.update();
    webgl.render(scene, camera);
    frameId = requestAnimationFrame(frame);
  }
  frame();

  function setNodeMatrix(node, matrix) {
    node.matrix.set(
      matrix[0], matrix[1], matrix[2], 0,
      matrix[3], matrix[4], matrix[5], 0,
      matrix[6], matrix[7], matrix[8], 0,
      0, 0, 0, 1,
    );
    node.matrixWorldNeedsUpdate = true;
  }

  function applyState(state) {
    for (const [id, matrix] of Object.entries(state.orientations)) {
      setNodeMatrix(nodes.get(id), matrix);
    }
  }

  function animateMove(fromState, toState, move, duration) {
    applyState(fromState);
    const turnGroup = new THREE.Group();
    piecesRoot.add(turnGroup);
    const selected = selectedSkewbPieces(fromState, move, definition);
    selected.forEach((id) => turnGroup.add(nodes.get(id)));
    const axis = new THREE.Vector3(...skewbNormalize(definition.corners[move.corner]));
    const radians = move.angle * Math.PI / 180;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const started = performance.now();
    return new Promise((resolve) => {
      function tick(now) {
        const progress = reduced ? 1 : Math.min((now - started) / duration, 1);
        const eased = 1 - (1 - progress) ** 3;
        turnGroup.quaternion.setFromAxisAngle(axis, radians * eased);
        if (progress < 1) {
          requestAnimationFrame(tick);
          return;
        }
        selected.forEach((id) => piecesRoot.add(nodes.get(id)));
        piecesRoot.remove(turnGroup);
        applyState(toState);
        resolve();
      }
      requestAnimationFrame(tick);
    });
  }

  function getCameraState() {
    return { position: camera.position.toArray(), target: controls.target.toArray() };
  }
  function setCameraState(state) {
    const values = [...(state?.position || []), ...(state?.target || [])];
    if (values.length !== 6 || !values.every((value) => Number.isFinite(Number(value)))) return false;
    const position = new THREE.Vector3(...state.position.map(Number));
    const target = new THREE.Vector3(...state.target.map(Number));
    const distance = position.distanceTo(target);
    if (distance < controls.minDistance || distance > controls.maxDistance) return false;
    camera.position.copy(position);
    controls.target.copy(target);
    controls.update();
    return true;
  }
  function resetCamera() { setCameraState(initialCamera); }
  function applyTheme(theme) {
    definition.faces.forEach((face) => materials[face].color.set(theme.faceColors?.[face] || DEFAULT_SKEWB_THEME.faceColors[face]));
    coreMaterial.color.set(theme.coreColor || DEFAULT_SKEWB_THEME.coreColor);
  }

  return {
    applyState,
    animateMove,
    applyTheme,
    getCameraState,
    setCameraState,
    resetCamera,
    onCameraChange(listener) { cameraListeners.add(listener); return () => cameraListeners.delete(listener); },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      controls.dispose();
      geometries.forEach((geometry) => geometry.dispose());
      Object.values(materials).forEach((material) => material.dispose());
      coreMaterial.dispose();
      webgl.dispose();
      host.replaceChildren();
    },
  };
}

// The public playback surface mirrors createPuzzleViewer while the corner-turn
// state and renderer remain independent of the NxN implementation.
export function createSkewbViewer(host, options = {}) {
  if (options.puzzleId && options.puzzleId !== "skewb") {
    throw new Error("このビューアはskewb専用です。");
  }
  const definition = createSkewbDefinition();
  const solved = createSolvedSkewbState(definition);
  let setupMoves = options.initialState ? [] : parseSkewbAlgorithm(options.setupAlgorithm || "");
  let initialState = options.initialState || skewbStateAt(solved, setupMoves, setupMoves.length, definition);
  let moves = parseSkewbAlgorithm(options.algorithm || "");
  let position = 0;
  let speed = Number(options.speed) > 0 ? Number(options.speed) : 1;
  let busy = false;
  let playing = false;
  let theme = options.theme || DEFAULT_SKEWB_THEME;
  const renderer = createRenderer(host, definition, theme);
  const removeCameraListener = renderer?.onCameraChange(() => notify());
  if (options.cameraState) renderer?.setCameraState(options.cameraState);

  function snapshot() {
    return {
      puzzleId: "skewb",
      position,
      totalMoves: moves.length,
      currentMove: position ? moves[position - 1].token : null,
      algorithm: moves.map((move) => move.token).join(" "),
      setup: setupMoves.map((move) => move.token).join(" "),
      cameraState: renderer?.getCameraState() || null,
      isBusy: busy,
      isPlaying: playing,
      available: Boolean(renderer),
    };
  }
  function notify() { options.onChange?.(snapshot()); }
  function currentState() { return skewbStateAt(initialState, moves, position, definition); }
  function update() { renderer?.applyState(currentState()); notify(); }
  function setAlgorithm(value) {
    if (busy) return false;
    moves = parseSkewbAlgorithm(value);
    position = 0;
    playing = false;
    update();
    return true;
  }
  function setSetupAlgorithm(value) {
    if (busy) return false;
    const parsed = parseSkewbAlgorithm(value);
    setupMoves = parsed;
    initialState = skewbStateAt(solved, parsed, parsed.length, definition);
    position = 0;
    playing = false;
    update();
    return true;
  }
  function setInitialState(value) {
    if (busy) return false;
    initialState = value || solved;
    setupMoves = [];
    position = 0;
    playing = false;
    update();
    return true;
  }
  async function stepNext() {
    if (!renderer || busy || position >= moves.length) return false;
    busy = true;
    notify();
    const move = moves[position];
    const from = currentState();
    const to = applySkewbMove(from, move, definition);
    await renderer.animateMove(from, to, move, 480 / speed);
    position += 1;
    busy = false;
    notify();
    return true;
  }
  async function stepPrevious() {
    if (!renderer || busy || position <= 0) return false;
    busy = true;
    notify();
    const from = currentState();
    const move = invertSkewbMove(moves[position - 1]);
    const to = skewbStateAt(initialState, moves, position - 1, definition);
    await renderer.animateMove(from, to, move, 480 / speed);
    position -= 1;
    busy = false;
    notify();
    return true;
  }
  function seek(nextPosition) {
    if (busy) return false;
    playing = false;
    position = Math.max(0, Math.min(Math.trunc(Number(nextPosition) || 0), moves.length));
    update();
    return true;
  }
  async function play() {
    if (playing) { playing = false; notify(); return; }
    if (!renderer || busy) return;
    if (position >= moves.length) seek(0);
    playing = true;
    notify();
    while (playing && position < moves.length) await stepNext();
    playing = false;
    notify();
  }
  function pause() { playing = false; notify(); }
  async function turn(input) {
    if (!renderer || busy) return false;
    const parsed = typeof input === "string" ? parseSkewbAlgorithm(input) : [input];
    if (parsed.length !== 1) throw new Error("追加できるのは1手だけです。");
    const move = parsed[0];
    busy = true;
    playing = false;
    notify();
    const from = currentState();
    const to = applySkewbMove(from, move, definition);
    await renderer.animateMove(from, to, move, 480 / speed);
    moves.splice(position, 0, move);
    position += 1;
    busy = false;
    notify();
    return true;
  }

  update();
  return {
    definition,
    available: Boolean(renderer),
    getSnapshot: snapshot,
    getState: currentState,
    setAlgorithm,
    setSetupAlgorithm,
    setInitialState,
    stepNext,
    stepPrevious,
    seek,
    play,
    pause,
    turn,
    setSpeed(value) { if (Number(value) > 0) speed = Number(value); },
    setTheme(value) { theme = value || DEFAULT_SKEWB_THEME; renderer?.applyTheme(theme); notify(); },
    resetCamera() { renderer?.resetCamera(); notify(); },
    setCameraState(value) { const applied = renderer?.setCameraState(value) || false; if (applied) notify(); return applied; },
    destroy() { playing = false; removeCameraListener?.(); renderer?.destroy(); },
  };
}
