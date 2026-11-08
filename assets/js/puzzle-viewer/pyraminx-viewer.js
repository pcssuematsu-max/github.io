import * as THREE from "../../vendor/three/r162/three.module.js";
import { OrbitControls } from "../../vendor/three/r162/addons/controls/OrbitControls.js";
import { PYRAMINX_FACE_COLORS } from "./pyraminx-colors.js";
import {
  applyPyraminxMove,
  createPyraminxDefinition,
  createSolvedPyraminxState,
  invertPyraminxMove,
  parsePyraminxAlgorithm,
  pyraminxBarycentric,
  pyraminxNormalize,
  pyraminxStateAt,
  selectedPyraminxPieces,
} from "./pyraminx-state.js";

export const DEFAULT_PYRAMINX_THEME = {
  faceColors: PYRAMINX_FACE_COLORS,
  coreColor: "#77766f",
  canvasBackground: "#eef3f5",
};

function roundedTriangleGeometry(triangle, faceNormal) {
  const corners = triangle.corners;
  const center = triangle.center;
  const edgeLength = new THREE.Vector3(...corners[0]).distanceTo(new THREE.Vector3(...corners[1]));
  const normal = new THREE.Vector3(...faceNormal);
  const origin = new THREE.Vector3(...corners[0]);
  const xAxis = new THREE.Vector3(...corners[1]).sub(origin).normalize();
  const yAxis = new THREE.Vector3().crossVectors(normal, xAxis).normalize();
  const points = corners.map((corner) => {
    const shrunk = new THREE.Vector3(...center).lerp(new THREE.Vector3(...corner), 0.967);
    const relative = shrunk.sub(origin);
    return new THREE.Vector2(relative.dot(xAxis), relative.dot(yAxis));
  });
  if (THREE.ShapeUtils.isClockWise(points)) points.reverse();

  const radii = corners.map((corner) => {
    const weights = Object.values(pyraminxBarycentric(corner));
    if (Math.max(...weights) > 0.999) return edgeLength * 0.045;
    if (weights.filter((weight) => Math.abs(weight) < 1e-5).length >= 2) return edgeLength * 0.075;
    return edgeLength * 0.135;
  });
  if (THREE.ShapeUtils.isClockWise(corners.map((corner) => {
    const relative = new THREE.Vector3(...corner).sub(origin);
    return new THREE.Vector2(relative.dot(xAxis), relative.dot(yAxis));
  }))) radii.reverse();

  const tangent = points.map((point, index) => {
    const previous = points[(index + 2) % 3];
    const next = points[(index + 1) % 3];
    const distance = Math.min(radii[index] * Math.sqrt(3), edgeLength * 0.3);
    return {
      before: point.clone().add(previous.clone().sub(point).normalize().multiplyScalar(distance)),
      after: point.clone().add(next.clone().sub(point).normalize().multiplyScalar(distance)),
    };
  });
  const shape = new THREE.Shape();
  shape.moveTo(tangent[0].after.x, tangent[0].after.y);
  for (let index = 1; index <= 3; index += 1) {
    const current = index % 3;
    shape.lineTo(tangent[current].before.x, tangent[current].before.y);
    shape.quadraticCurveTo(
      points[current].x, points[current].y,
      tangent[current].after.x, tangent[current].after.y,
    );
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: edgeLength * 0.045,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: edgeLength * 0.012,
    bevelSize: edgeLength * 0.008,
    bevelSegments: 3,
    curveSegments: 6,
  });
  geometry.computeVertexNormals();
  const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, normal);
  const position = origin.addScaledVector(normal, edgeLength * 0.012);
  geometry.applyMatrix4(basis.setPosition(position));
  return geometry;
}

// A shallow neutral backing belongs to each moving piece. A fixed tetrahedron
// would remain visible inside the opening while a layer is turning.
function backingGeometry(triangle, faceNormal) {
  const normal = new THREE.Vector3(...faceNormal);
  const center = new THREE.Vector3(...triangle.center);
  const outer = triangle.corners.map((corner) => center.clone().lerp(new THREE.Vector3(...corner), 0.987)
    .addScaledVector(normal, -0.009));
  const inner = outer.map((corner) => corner.clone().addScaledVector(normal, -0.13));
  const positions = [];
  function addFace(a, b, c) { positions.push(...a.toArray(), ...b.toArray(), ...c.toArray()); }
  addFace(outer[0], outer[1], outer[2]);
  addFace(inner[2], inner[1], inner[0]);
  for (let index = 0; index < 3; index += 1) {
    const next = (index + 1) % 3;
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
  webgl.domElement.className = "pyraminx-viewer-canvas";
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

  const coreMaterial = new THREE.MeshStandardMaterial({ color: initialTheme.coreColor || DEFAULT_PYRAMINX_THEME.coreColor, roughness: 0.58, side: THREE.DoubleSide });
  const materials = Object.fromEntries(definition.faces.map((face) => [face, new THREE.MeshPhysicalMaterial({
    color: initialTheme.faceColors?.[face] || DEFAULT_PYRAMINX_THEME.faceColors[face],
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
    piece.triangles.forEach((triangle) => {
      const backing = backingGeometry(triangle, definition.faceNormals[triangle.face]);
      geometries.push(backing);
      node.add(new THREE.Mesh(backing, coreMaterial));
      const geometry = roundedTriangleGeometry(triangle, definition.faceNormals[triangle.face]);
      geometries.push(geometry);
      node.add(new THREE.Mesh(geometry, materials[triangle.face]));
    });
    piecesRoot.add(node);
    nodes.set(piece.id, node);
  }

  const initialCamera = { position: [-6.8, 3.5, 7.2], target: [0, 0.14, 0] };
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
    const selected = selectedPyraminxPieces(fromState, move, definition);
    selected.forEach((id) => turnGroup.add(nodes.get(id)));
    const axis = new THREE.Vector3(...pyraminxNormalize(definition.vertices[move.vertex]));
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
    definition.faces.forEach((face) => materials[face].color.set(theme.faceColors?.[face] || DEFAULT_PYRAMINX_THEME.faceColors[face]));
    coreMaterial.color.set(theme.coreColor || DEFAULT_PYRAMINX_THEME.coreColor);
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

// The public playback surface mirrors createPuzzleViewer while the tetrahedral
// state and renderer remain independent of the NxN implementation.
export function createPyraminxViewer(host, options = {}) {
  if (options.puzzleId && options.puzzleId !== "pyraminx") {
    throw new Error("このビューアはpyraminx専用です。");
  }
  const definition = createPyraminxDefinition();
  const solved = createSolvedPyraminxState(definition);
  let setupMoves = options.initialState ? [] : parsePyraminxAlgorithm(options.setupAlgorithm || "");
  let initialState = options.initialState || pyraminxStateAt(solved, setupMoves, setupMoves.length, definition);
  let moves = parsePyraminxAlgorithm(options.algorithm || "");
  let position = 0;
  let speed = Number(options.speed) > 0 ? Number(options.speed) : 1;
  let busy = false;
  let playing = false;
  let theme = options.theme || DEFAULT_PYRAMINX_THEME;
  const renderer = createRenderer(host, definition, theme);
  const removeCameraListener = renderer?.onCameraChange(() => notify());
  if (options.cameraState) renderer?.setCameraState(options.cameraState);

  function snapshot() {
    return {
      puzzleId: "pyraminx",
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
  function currentState() { return pyraminxStateAt(initialState, moves, position, definition); }
  function update() { renderer?.applyState(currentState()); notify(); }
  function setAlgorithm(value) {
    if (busy) return false;
    moves = parsePyraminxAlgorithm(value);
    position = 0;
    playing = false;
    update();
    return true;
  }
  function setSetupAlgorithm(value) {
    if (busy) return false;
    const parsed = parsePyraminxAlgorithm(value);
    setupMoves = parsed;
    initialState = pyraminxStateAt(solved, parsed, parsed.length, definition);
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
    const to = applyPyraminxMove(from, move, definition);
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
    const move = invertPyraminxMove(moves[position - 1]);
    const to = pyraminxStateAt(initialState, moves, position - 1, definition);
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
    const parsed = typeof input === "string" ? parsePyraminxAlgorithm(input) : [input];
    if (parsed.length !== 1) throw new Error("追加できるのは1手だけです。");
    const move = parsed[0];
    busy = true;
    playing = false;
    notify();
    const from = currentState();
    const to = applyPyraminxMove(from, move, definition);
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
    setTheme(value) { theme = value || DEFAULT_PYRAMINX_THEME; renderer?.applyTheme(theme); notify(); },
    resetCamera() { renderer?.resetCamera(); notify(); },
    setCameraState(value) { const applied = renderer?.setCameraState(value) || false; if (applied) notify(); return applied; },
    destroy() { playing = false; removeCameraListener?.(); renderer?.destroy(); },
  };
}
