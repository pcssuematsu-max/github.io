import * as THREE from "../../vendor/three/r180/three.module.js";
import { OrbitControls } from "../../vendor/three/r180/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "../../vendor/three/r180/addons/geometries/RoundedBoxGeometry.js";

const FACE_NORMALS = {
  U: [0, 1, 0], D: [0, -1, 0], R: [1, 0, 0],
  L: [-1, 0, 0], F: [0, 0, 1], B: [0, 0, -1],
};

const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const AXIS_INDEX = { x: 0, y: 1, z: 2 };

export const DEFAULT_THEME = {
  stickerColors: {
    U: "#f7f4ed", D: "#e8ee00", R: "#ee1730",
    L: "#ff7a1a", F: "#00c83c", B: "#1468cf",
  },
  // The only dark material is the neutral inner mechanism seen through gaps.
  cubieColor: "#77766f",
  canvasBackground: "#eef3f5",
  emphasis: { stickerFaces: [], dimOthers: false },
};

function multiplyMatrix(left, right) {
  const output = Array(9).fill(0);
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      output[row * 3 + column] = Math.round(
        left[row * 3] * right[column]
        + left[row * 3 + 1] * right[column + 3]
        + left[row * 3 + 2] * right[column + 6]
      );
    }
  }
  return output;
}

function transformVector(matrix, vector) {
  return [
    Math.round(matrix[0] * vector[0] + matrix[1] * vector[1] + matrix[2] * vector[2]),
    Math.round(matrix[3] * vector[0] + matrix[4] * vector[1] + matrix[5] * vector[2]),
    Math.round(matrix[6] * vector[0] + matrix[7] * vector[1] + matrix[8] * vector[2]),
  ];
}

function rotationMatrix(axis, degrees) {
  const [x, y, z] = axis;
  const radians = degrees * Math.PI / 180;
  const cosine = Math.round(Math.cos(radians));
  const sine = Math.round(Math.sin(radians));
  const remainder = 1 - cosine;
  return [
    cosine + x * x * remainder, x * y * remainder - z * sine, x * z * remainder + y * sine,
    y * x * remainder + z * sine, cosine + y * y * remainder, y * z * remainder - x * sine,
    z * x * remainder - y * sine, z * y * remainder + x * sine, cosine + z * z * remainder,
  ].map(Math.round);
}

function matrixKey(matrix) {
  return matrix.join(",");
}

function makeOrientations() {
  const byId = new Map();
  const queue = [IDENTITY];
  const rotations = [
    rotationMatrix([1, 0, 0], 90),
    rotationMatrix([0, 1, 0], 90),
    rotationMatrix([0, 0, 1], 90),
  ];
  while (queue.length) {
    const orientation = queue.shift();
    const id = matrixKey(orientation);
    if (byId.has(id)) continue;
    byId.set(id, orientation);
    rotations.forEach((rotation) => queue.push(multiplyMatrix(rotation, orientation)));
  }
  if (byId.size !== 24) throw new Error("3×3の向きは24通りでなければなりません。");
  return byId;
}

function slotIdFor(position) {
  const [x, y, z] = position;
  const names = [];
  if (y === 1) names.push("U");
  if (y === -1) names.push("D");
  if (z === 1) names.push("F");
  if (z === -1) names.push("B");
  if (x === 1) names.push("R");
  if (x === -1) names.push("L");
  return `slot-${names.join("")}`;
}

function createSlotsAndPieces() {
  const slots = [];
  const pieces = [];
  [-1, 0, 1].forEach((x) => [-1, 0, 1].forEach((y) => [-1, 0, 1].forEach((z) => {
    if (x === 0 && y === 0 && z === 0) return;
    const position = [x, y, z];
    const id = slotIdFor(position);
    const stickers = {};
    if (y === 1) stickers.U = "U";
    if (y === -1) stickers.D = "D";
    if (z === 1) stickers.F = "F";
    if (z === -1) stickers.B = "B";
    if (x === 1) stickers.R = "R";
    if (x === -1) stickers.L = "L";
    const kind = Object.keys(stickers).length === 3 ? "corner"
      : Object.keys(stickers).length === 2 ? "edge" : "center";
    slots.push({ id, position });
    pieces.push({ id: `${kind}-${id.slice(5)}`, homeSlotId: id, stickers });
  })));
  return { slots, pieces };
}

const BASE_MOVES = {
  U: { selector: { axis: "y", values: [1] }, rotation: { axis: [0, 1, 0], degrees: -90 } },
  D: { selector: { axis: "y", values: [-1] }, rotation: { axis: [0, -1, 0], degrees: -90 } },
  R: { selector: { axis: "x", values: [1] }, rotation: { axis: [1, 0, 0], degrees: -90 } },
  L: { selector: { axis: "x", values: [-1] }, rotation: { axis: [-1, 0, 0], degrees: -90 } },
  F: { selector: { axis: "z", values: [1] }, rotation: { axis: [0, 0, 1], degrees: -90 } },
  B: { selector: { axis: "z", values: [-1] }, rotation: { axis: [0, 0, -1], degrees: -90 } },

  // Slice moves follow standard Singmaster directions: M = L, E = D, S = F.
  M: { selector: { axis: "x", values: [0] }, rotation: { axis: [1, 0, 0], degrees: 90 } },
  E: { selector: { axis: "y", values: [0] }, rotation: { axis: [0, 1, 0], degrees: 90 } },
  S: { selector: { axis: "z", values: [0] }, rotation: { axis: [0, 0, 1], degrees: -90 } },

  // Two-layer wide turns. Lower-case r/u/f… notation is normalized in parseAlgorithm.
  Rw: { selector: { axis: "x", values: [0, 1] }, rotation: { axis: [1, 0, 0], degrees: -90 } },
  Lw: { selector: { axis: "x", values: [-1, 0] }, rotation: { axis: [1, 0, 0], degrees: 90 } },
  Uw: { selector: { axis: "y", values: [0, 1] }, rotation: { axis: [0, 1, 0], degrees: -90 } },
  Dw: { selector: { axis: "y", values: [-1, 0] }, rotation: { axis: [0, 1, 0], degrees: 90 } },
  Fw: { selector: { axis: "z", values: [0, 1] }, rotation: { axis: [0, 0, 1], degrees: -90 } },
  Bw: { selector: { axis: "z", values: [-1, 0] }, rotation: { axis: [0, 0, 1], degrees: 90 } },

  // Whole-cube rotations use the same positive directions as R, U and F.
  x: { selector: { axis: "x", values: [-1, 0, 1] }, rotation: { axis: [1, 0, 0], degrees: -90 } },
  y: { selector: { axis: "y", values: [-1, 0, 1] }, rotation: { axis: [0, 1, 0], degrees: -90 } },
  z: { selector: { axis: "z", values: [-1, 0, 1] }, rotation: { axis: [0, 0, 1], degrees: -90 } },
};

export function createCube3Definition() {
  const { slots, pieces } = createSlotsAndPieces();
  const orientations = makeOrientations();
  const slotsById = Object.fromEntries(slots.map((slot) => [slot.id, slot]));
  const slotByPosition = new Map(slots.map((slot) => [slot.position.join(","), slot.id]));
  return { id: "cube-3x3", slots, slotsById, slotByPosition, pieces, orientations, baseMoves: BASE_MOVES };
}

export function createSolvedState(definition) {
  return {
    definitionId: definition.id,
    pieces: Object.fromEntries(definition.pieces.map((piece) => [piece.id, {
      slotId: piece.homeSlotId,
      orientationId: matrixKey(IDENTITY),
    }])),
  };
}

function cloneState(state) {
  return {
    definitionId: state.definitionId,
    pieces: Object.fromEntries(Object.entries(state.pieces).map(([id, pose]) => [id, { ...pose }])),
  };
}

export function parseAlgorithm(value) {
  const source = String(value || "").trim();
  if (!source) return [];
  return source.split(/\s+/).map((token) => {
    const match = /^([UDRLFB]w|[UDRLFBMESxyz]|[udrlfb])(2|')?$/.exec(token);
    if (!match) {
      throw new Error(`「${token}」は3×3で扱えない手です。外層、M/E/S、x/y/z、Rw（またはr）と ' / 2 を使ってください。`);
    }
    const lowerWide = { r: "Rw", l: "Lw", u: "Uw", d: "Dw", f: "Fw", b: "Bw" };
    const base = lowerWide[match[1]] || match[1];
    const modifier = match[2] || "";
    return { base, modifier, token: `${base}${modifier}` };
  });
}

export function invertMove(move) {
  const modifier = move.modifier === "'" ? "" : move.modifier === "2" ? "2" : "'";
  return { base: move.base, modifier, token: `${move.base}${modifier}` };
}

function rotationForMove(move, definition) {
  const base = definition.baseMoves[move.base];
  let degrees = base.rotation.degrees;
  if (move.modifier === "'") degrees *= -1;
  if (move.modifier === "2") degrees *= 2;
  return { ...base.rotation, degrees };
}

export function applyMove(state, move, definition) {
  const next = cloneState(state);
  const base = definition.baseMoves[move.base];
  const rotation = rotationForMove(move, definition);
  const matrix = rotationMatrix(rotation.axis, rotation.degrees);
  const axis = AXIS_INDEX[base.selector.axis];

  Object.values(next.pieces).forEach((pose) => {
    const position = definition.slotsById[pose.slotId].position;
    if (!base.selector.values.includes(position[axis])) return;
    const destination = transformVector(matrix, position);
    const slotId = definition.slotByPosition.get(destination.join(","));
    if (!slotId) throw new Error("回転先のslotを特定できませんでした。");
    const orientation = definition.orientations.get(pose.orientationId);
    const nextOrientation = multiplyMatrix(matrix, orientation);
    const orientationId = matrixKey(nextOrientation);
    if (!definition.orientations.has(orientationId)) throw new Error("無効なピースの向きです。");
    pose.slotId = slotId;
    pose.orientationId = orientationId;
  });
  return next;
}

export function stateAt(initialState, moves, position, definition) {
  return moves.slice(0, position).reduce((state, move) => applyMove(state, move, definition), initialState);
}

export function validateCube3Definition(definition) {
  const count = definition.pieces.reduce((result, piece) => {
    const key = piece.id.split("-")[0];
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
  if (count.corner !== 8 || count.edge !== 12 || count.center !== 6 || definition.slots.length !== 26) {
    throw new Error("3×3のピース構成が不正です。");
  }
  const solved = createSolvedState(definition);
  Object.keys(definition.baseMoves).forEach((base) => {
    const move = { base, modifier: "", token: base };
    const back = applyMove(applyMove(solved, move, definition), invertMove(move), definition);
    const cycle = [0, 1, 2, 3].reduce((state) => applyMove(state, move, definition), solved);
    if (JSON.stringify(back) !== JSON.stringify(solved) || JSON.stringify(cycle) !== JSON.stringify(solved)) {
      throw new Error(`${base}の回転定義が閉じていません。`);
    }
  });
}

function vectorToThree(vector) {
  return new THREE.Vector3(vector[0], vector[1], vector[2]);
}

function threeMatrix(matrix) {
  return new THREE.Matrix4().set(
    matrix[0], matrix[1], matrix[2], 0,
    matrix[3], matrix[4], matrix[5], 0,
    matrix[6], matrix[7], matrix[8], 0,
    0, 0, 0, 1
  );
}

export function isWebGL2Available() {
  const canvas = document.createElement("canvas");
  return Boolean(canvas.getContext("webgl2"));
}

export function createCube3Renderer(host, definition, initialTheme = DEFAULT_THEME) {
  if (!isWebGL2Available()) return null;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const root = new THREE.Group();
  const piecesRoot = new THREE.Group();
  const pieceNodes = new Map();
  let currentTheme = initialTheme;

  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = false;
  renderer.domElement.className = "cube3-viewer-canvas";
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.replaceChildren(renderer.domElement);
  scene.add(root);
  root.add(piecesRoot);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6d8290, 2.2));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.7);
  keyLight.position.set(5, 8, 7);
  scene.add(keyLight);

  camera.position.set(5.6, 5.2, 7.4);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.minDistance = 5.4;
  controls.maxDistance = 12;
  controls.target.set(0, 0, 0);
  controls.update();

  // Stickerless speed cubes have coloured plastic caps, not flat stickers with
  // a coloured border. The small neutral gaps are the exposed inner mechanism.
  const cubieGeometry = new RoundedBoxGeometry(0.98, 0.98, 0.98, 4, 0.105);
  const faceCapGeometry = new RoundedBoxGeometry(0.965, 0.965, 0.09, 4, 0.12);
  const cubieMaterial = new THREE.MeshStandardMaterial({ color: currentTheme.cubieColor, roughness: 0.58, metalness: 0 });

  definition.pieces.forEach((piece) => {
    const node = new THREE.Group();
    node.name = piece.id;
    const cubie = new THREE.Mesh(cubieGeometry, cubieMaterial);
    node.add(cubie);
    Object.entries(piece.stickers).forEach(([face, colorKey]) => {
      const normal = vectorToThree(FACE_NORMALS[face]);
      const faceQuaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1), normal
      );
      const capMaterial = new THREE.MeshPhysicalMaterial({
        color: currentTheme.stickerColors[colorKey],
        roughness: 0.26,
        metalness: 0,
        clearcoat: 0.3,
        clearcoatRoughness: 0.18,
      });
      const cap = new THREE.Mesh(faceCapGeometry, capMaterial);
      cap.position.copy(normal.clone().multiplyScalar(0.505));
      cap.quaternion.copy(faceQuaternion);
      cap.userData = { stickerFace: face, colorKey, surface: "cap" };
      node.add(cap);
    });
    piecesRoot.add(node);
    pieceNodes.set(piece.id, node);
  });

  function resize() {
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();

  function applyTheme(theme) {
    currentTheme = { ...DEFAULT_THEME, ...theme, emphasis: { ...DEFAULT_THEME.emphasis, ...(theme.emphasis || {}) } };
    renderer.setClearColor(currentTheme.canvasBackground, 1);
    const emphasized = new Set(currentTheme.emphasis.stickerFaces || []);
    cubieMaterial.color.set(currentTheme.cubieColor);
    pieceNodes.forEach((node) => node.children.forEach((child) => {
      if (!child.userData.colorKey) return;
      const focus = emphasized.size === 0 || emphasized.has(child.userData.stickerFace);
      const color = focus ? currentTheme.stickerColors[child.userData.colorKey] : "#87919a";
      child.material.color.set(color);
      child.material.roughness = currentTheme.emphasis.dimOthers && !focus ? 0.72 : 0.26;
      if ("clearcoat" in child.material) child.material.clearcoat = focus ? 0.3 : 0;
    }));
  }

  function applyState(state) {
    definition.pieces.forEach((piece) => {
      const pose = state.pieces[piece.id];
      const slot = definition.slotsById[pose.slotId];
      const node = pieceNodes.get(piece.id);
      node.position.set(slot.position[0] * 1.018, slot.position[1] * 1.018, slot.position[2] * 1.018);
      node.quaternion.setFromRotationMatrix(threeMatrix(definition.orientations.get(pose.orientationId)));
    });
  }

  function animateMove(fromState, toState, move, duration) {
    const base = definition.baseMoves[move.base];
    const axis = AXIS_INDEX[base.selector.axis];
    const turnGroup = new THREE.Group();
    root.add(turnGroup);
    definition.pieces.forEach((piece) => {
      const pose = fromState.pieces[piece.id];
      const position = definition.slotsById[pose.slotId].position;
      if (base.selector.values.includes(position[axis])) turnGroup.attach(pieceNodes.get(piece.id));
    });
    const rotation = rotationForMove(move, definition);
    const rotationAxis = vectorToThree(rotation.axis).normalize();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const effectiveDuration = reduced ? 1 : duration;

    return new Promise((resolve) => {
      const startedAt = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - startedAt) / effectiveDuration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        turnGroup.quaternion.setFromAxisAngle(rotationAxis, rotation.degrees * eased * Math.PI / 180);
        if (progress < 1) {
          requestAnimationFrame(tick);
          return;
        }
        [...turnGroup.children].forEach((node) => piecesRoot.attach(node));
        root.remove(turnGroup);
        applyState(toState);
        resolve();
      };
      requestAnimationFrame(tick);
    });
  }

  function resetCamera() {
    controls.reset();
    camera.position.set(5.6, 5.2, 7.4);
    controls.target.set(0, 0, 0);
    controls.update();
  }

  function getCameraState() {
    return {
      position: camera.position.toArray(),
      target: controls.target.toArray(),
    };
  }

  function setCameraState(cameraState) {
    const position = cameraState?.position;
    const target = cameraState?.target;
    if (!Array.isArray(position) || !Array.isArray(target) || position.length !== 3 || target.length !== 3) {
      return false;
    }
    const values = [...position, ...target];
    if (!values.every((value) => Number.isFinite(Number(value)))) return false;
    const nextPosition = new THREE.Vector3(...position.map(Number));
    const nextTarget = new THREE.Vector3(...target.map(Number));
    const distance = nextPosition.distanceTo(nextTarget);
    if (distance < controls.minDistance || distance > controls.maxDistance) return false;
    camera.position.copy(nextPosition);
    controls.target.copy(nextTarget);
    controls.update();
    return true;
  }

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
  applyTheme(initialTheme);

  return {
    applyState,
    animateMove,
    applyTheme,
    resetCamera,
    getCameraState,
    setCameraState,
    onCameraChange(callback) {
      controls.addEventListener("end", callback);
      return () => controls.removeEventListener("end", callback);
    },
    destroy() {
      resizeObserver.disconnect();
      controls.dispose();
      renderer.setAnimationLoop(null);
      cubieGeometry.dispose();
      faceCapGeometry.dispose();
      cubieMaterial.dispose();
      pieceNodes.forEach((node) => node.children.forEach((child) => child.material?.dispose?.()));
      renderer.dispose();
      host.replaceChildren();
    },
  };
}

/**
 * Create the portable 3×3 viewer controller used by pages outside this demo.
 * `initialState` is a logical state; callers with notation can use
 * `setSetupAlgorithm` to derive one from the solved state instead.
 */
export function createPuzzleViewer(host, options = {}) {
  const puzzleId = options.puzzleId || "cube-3x3";
  if (puzzleId !== "cube-3x3") {
    throw new Error(`「${puzzleId}」はまだ対応していません。Phase 1ではcube-3x3を指定してください。`);
  }

  const definition = createCube3Definition();
  validateCube3Definition(definition);
  const solvedState = createSolvedState(definition);
  let initialState = options.initialState || solvedState;
  let moves = parseAlgorithm(options.algorithm || "");
  let setupMoves = [];
  let position = 0;
  let speed = Number(options.speed) > 0 ? Number(options.speed) : 1;
  let isBusy = false;
  let isPlaying = false;
  let themeId = options.themeId || "standard";
  const renderer = createCube3Renderer(host, definition, options.theme || DEFAULT_THEME);
  const removeCameraChangeListener = renderer?.onCameraChange(() => notify());

  if (options.cameraState) renderer?.setCameraState(options.cameraState);

  function snapshot() {
    return {
      puzzleId,
      position,
      totalMoves: moves.length,
      currentMove: position ? moves[position - 1].token : null,
      algorithm: moves.map((move) => move.token).join(" "),
      setup: setupMoves.map((move) => move.token).join(" "),
      themeId,
      cameraState: renderer?.getCameraState() || null,
      isBusy,
      isPlaying,
      available: Boolean(renderer),
    };
  }

  function notify() {
    options.onChange?.(snapshot());
  }

  function currentState() {
    return stateAt(initialState, moves, position, definition);
  }

  function applyCurrentState() {
    renderer?.applyState(currentState());
  }

  function setAlgorithm(value) {
    moves = parseAlgorithm(value);
    position = 0;
    isPlaying = false;
    applyCurrentState();
    notify();
  }

  function setInitialState(nextInitialState) {
    initialState = nextInitialState || solvedState;
    setupMoves = [];
    position = 0;
    isPlaying = false;
    applyCurrentState();
    notify();
  }

  function setSetupAlgorithm(value = "") {
    setupMoves = parseAlgorithm(value);
    initialState = stateAt(solvedState, setupMoves, setupMoves.length, definition);
    position = 0;
    isPlaying = false;
    applyCurrentState();
    notify();
  }

  async function stepNext() {
    if (!renderer || isBusy || position >= moves.length) return false;
    isBusy = true;
    notify();
    const fromState = currentState();
    const move = moves[position];
    const toState = applyMove(fromState, move, definition);
    await renderer.animateMove(fromState, toState, move, 440 / speed);
    position += 1;
    isBusy = false;
    notify();
    return true;
  }

  async function stepPrevious() {
    if (!renderer || isBusy || position <= 0) return false;
    isBusy = true;
    notify();
    const fromState = currentState();
    const move = invertMove(moves[position - 1]);
    const toState = stateAt(initialState, moves, position - 1, definition);
    await renderer.animateMove(fromState, toState, move, 440 / speed);
    position -= 1;
    isBusy = false;
    notify();
    return true;
  }

  function seek(nextPosition) {
    if (isBusy) return false;
    position = Math.max(0, Math.min(Number(nextPosition) || 0, moves.length));
    applyCurrentState();
    notify();
    return true;
  }

  async function play() {
    if (!renderer || isBusy) return;
    if (isPlaying) {
      isPlaying = false;
      notify();
      return;
    }
    if (position >= moves.length) seek(0);
    isPlaying = true;
    notify();
    while (isPlaying && position < moves.length) await stepNext();
    isPlaying = false;
    notify();
  }

  function pause() {
    if (!isPlaying) return;
    isPlaying = false;
    notify();
  }

  function setSpeed(nextSpeed) {
    if (Number(nextSpeed) > 0) speed = Number(nextSpeed);
  }

  applyCurrentState();
  notify();

  return {
    definition,
    available: Boolean(renderer),
    getSnapshot: snapshot,
    setAlgorithm,
    setInitialState,
    setSetupAlgorithm,
    stepNext,
    stepPrevious,
    seek,
    play,
    pause,
    setSpeed,
    setTheme(theme, nextThemeId = "standard") {
      themeId = nextThemeId;
      renderer?.applyTheme(theme);
      notify();
    },
    resetCamera() {
      renderer?.resetCamera();
      notify();
    },
    setCameraState(cameraState) {
      const applied = renderer?.setCameraState(cameraState) || false;
      if (applied) notify();
      return applied;
    },
    destroy() {
      removeCameraChangeListener?.();
      renderer?.destroy();
    },
  };
}
