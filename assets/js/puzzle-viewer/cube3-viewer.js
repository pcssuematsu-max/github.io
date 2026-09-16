import * as THREE from "../../vendor/three/r162/three.module.js";
import { OrbitControls } from "../../vendor/three/r162/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "../../vendor/three/r162/addons/geometries/RoundedBoxGeometry.js";

const FACE_NORMALS = {
  U: [0, 1, 0], D: [0, -1, 0], R: [1, 0, 0],
  L: [-1, 0, 0], F: [0, 0, 1], B: [0, 0, -1],
};
// RoundedBoxGeometry inherits BoxGeometry's material-group order.
const BOX_GROUP_FACES = ["R", "L", "U", "D", "F", "B"];
// Sticker swiping is deliberately paused until its direction can choose the
// neighbouring layer users expect (for example F-panel upward → R turn).
// OrbitControls remains available for looking around the whole cube.
const STICKER_SWIPE_ENABLED = false;

// A modern stickerless cube needs three different treatments. The long panel
// edges are nearly square (A), grid-intersection corners open up broadly (B),
// and the outer silhouette corners stay restrained (C). A single rounded-box
// radius cannot express that distinction, so the neutral core and coloured
// face shells are built separately below.
const CUBIE_CORE_EDGE_RADIUS_RATIO = 0.055;
const CUBIE_GAP_RATIO = 0.002;
const THREE_BY_THREE_SLOT_SPACING = 1.002;
const PANEL_EDGE_BEVEL_RATIO = 0.01;
const PANEL_INNER_CORNER_RADIUS_RATIO = 0.16;
const PANEL_OUTER_CORNER_RADIUS_RATIO = 0.065;
const PANEL_INSET_RATIO = 0.002;

const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const AXIS_INDEX = { x: 0, y: 1, z: 2 };

// Keep the visual proportions aligned with Rubiks_portfolio/core/cube_constants.py.
// The Python values are pixel-oriented; here only their relative size matters.
const CUBE_COLUMN_SIZE_REFERENCE = {
  2: { inside: 50, outside: 50 },
  3: { inside: 36, outside: 36 },
  4: { inside: 26, outside: 28 },
  5: { inside: 22, outside: 26 },
  6: { inside: 17, outside: 26 },
  7: { inside: 14, outside: 26 },
};

export const DEFAULT_THEME = {
  stickerColors: {
    U: "#f7f4ed", D: "#e8ee00", R: "#ee1730",
    L: "#ff7a1a", F: "#00c83c", B: "#1468cf",
  },
  // The only dark material is the neutral inner mechanism seen through gaps.
  cubieColor: "#77766f",
  canvasBackground: "#eef3f5",
  emphasis: {
    // `pieceId:face` keeps a highlight attached to the physical sticker while it moves.
    stickerIds: [],
    stickerFaces: [],
    colors: {},
    dimOthers: false,
    inactiveColor: "#87919a",
  },
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

/**
 * A stable identifier for one physical sticker. `face` is its home-face/color
 * key, so the identifier continues to refer to the same sticker after turns.
 */
export function stickerIdFor(pieceId, face) {
  if (!pieceId || !FACE_NORMALS[face]) {
    throw new Error("ステッカーIDには有効なpieceIdと面名（U/D/R/L/F/B）が必要です。");
  }
  return `${pieceId}:${face}`;
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
  return {
    id: "cube-3x3", dimension: 3, cubieSize: 1, renderScale: THREE_BY_THREE_SLOT_SPACING,
    columnWidths: columnWidthsFor(3), columnSizeReference: CUBE_COLUMN_SIZE_REFERENCE[3],
    slots, slotsById, slotByPosition, pieces, orientations, baseMoves: BASE_MOVES,
  };
}

function coordinateValuesFor(size) {
  return Array.from({ length: size }, (_value, index) => 2 * index - (size - 1));
}

function columnWidthsFor(size) {
  const reference = CUBE_COLUMN_SIZE_REFERENCE[size];
  if (!reference) throw new Error(`${size}×${size}の列幅定義がありません。`);
  const rawWidths = Array.from({ length: size }, (_value, index) => (
    index === 0 || index === size - 1 ? reference.outside : reference.inside
  ));
  const total = rawWidths.reduce((sum, width) => sum + width, 0);
  return rawWidths.map((width) => 3 * width / total);
}

function createAxisLayout(size) {
  const columnWidths = columnWidthsFor(size);
  let cursor = -1.5;
  const centers = columnWidths.map((width) => {
    const center = cursor + width / 2;
    cursor += width;
    return center;
  });
  const gap = Math.min(...columnWidths) * CUBIE_GAP_RATIO;
  return {
    columnWidths,
    centers,
    cubieWidths: columnWidths.map((width) => Math.max(width - gap, 0.01)),
  };
}

function genericSlotId(position) {
  return `slot-${position.join(",")}`;
}

const FACE_MOVE_METADATA = {
  U: { axis: "y", direction: 1, rotationAxis: [0, 1, 0], degrees: -90 },
  D: { axis: "y", direction: -1, rotationAxis: [0, -1, 0], degrees: -90 },
  R: { axis: "x", direction: 1, rotationAxis: [1, 0, 0], degrees: -90 },
  L: { axis: "x", direction: -1, rotationAxis: [-1, 0, 0], degrees: -90 },
  F: { axis: "z", direction: 1, rotationAxis: [0, 0, 1], degrees: -90 },
  B: { axis: "z", direction: -1, rotationAxis: [0, 0, -1], degrees: -90 },
};

function genericMoveDefinition(metadata, values) {
  return {
    selector: { axis: metadata.axis, values },
    rotation: { axis: metadata.rotationAxis, degrees: metadata.degrees },
  };
}

function createCubeNBaseMoves(size, values) {
  const baseMoves = {};
  Object.entries(FACE_MOVE_METADATA).forEach(([face, metadata]) => {
    const layerValues = metadata.direction > 0 ? [...values].reverse() : [...values];
    baseMoves[face] = genericMoveDefinition(metadata, [layerValues[0]]);

    // Standard wide notation starts at two layers (Rw). Keep every partial
    // width available so the same definition can express 3Rw, 4Rw, … when a
    // page needs a deeper block turn.
    // On 2×2, Rw is equivalent to a whole-cube rotation but accepting it
    // keeps notation portable when a lesson changes order.
    for (let width = 2; width <= Math.max(2, size - 1); width += 1) {
      const key = width === 2 ? `${face}w` : `${width}${face}w`;
      baseMoves[key] = genericMoveDefinition(metadata, layerValues.slice(0, width));
    }
  });

  // M/E/S exist only where a physical centre slice exists.
  if (size % 2 === 1) {
    baseMoves.M = { selector: { axis: "x", values: [0] }, rotation: { axis: [1, 0, 0], degrees: 90 } };
    baseMoves.E = { selector: { axis: "y", values: [0] }, rotation: { axis: [0, 1, 0], degrees: 90 } };
    baseMoves.S = { selector: { axis: "z", values: [0] }, rotation: { axis: [0, 0, 1], degrees: -90 } };
  }
  baseMoves.x = { selector: { axis: "x", values: [...values] }, rotation: { axis: [1, 0, 0], degrees: -90 } };
  baseMoves.y = { selector: { axis: "y", values: [...values] }, rotation: { axis: [0, 1, 0], degrees: -90 } };
  baseMoves.z = { selector: { axis: "z", values: [...values] }, rotation: { axis: [0, 0, 1], degrees: -90 } };
  return baseMoves;
}

/**
 * Surface-only NxN cube definition for 2×2 through 7×7. Coordinates are
 * integer-spaced so the same exact rotation/state machinery works for odd and
 * even orders. Invisible internal mechanism pieces are deliberately omitted.
 */
export function createCubeNDefinition(size) {
  const dimension = Number(size);
  if (!Number.isInteger(dimension) || dimension < 2 || dimension > 7) {
    throw new Error("NxNキューブは2×2から7×7まで指定できます。");
  }
  if (dimension === 3) return createCube3Definition();

  const values = coordinateValuesFor(dimension);
  const outer = values.at(-1);
  const axisLayout = createAxisLayout(dimension);
  const slots = [];
  const pieces = [];
  values.forEach((x) => values.forEach((y) => values.forEach((z) => {
    if (Math.abs(x) !== outer && Math.abs(y) !== outer && Math.abs(z) !== outer) return;
    const position = [x, y, z];
    const id = genericSlotId(position);
    const indexes = position.map((coordinate) => values.indexOf(coordinate));
    const renderPosition = indexes.map((index) => axisLayout.centers[index]);
    const dimensions = indexes.map((index) => axisLayout.cubieWidths[index]);
    const stickers = {};
    if (y === outer) stickers.U = "U";
    if (y === -outer) stickers.D = "D";
    if (z === outer) stickers.F = "F";
    if (z === -outer) stickers.B = "B";
    if (x === outer) stickers.R = "R";
    if (x === -outer) stickers.L = "L";
    const stickerCount = Object.keys(stickers).length;
    const kind = stickerCount === 3 ? "corner" : stickerCount === 2 ? "edge" : "center";
    slots.push({ id, position, renderPosition });
    pieces.push({ id: `${kind}-${x},${y},${z}`, homeSlotId: id, stickers, dimensions });
  })));
  const slotsById = Object.fromEntries(slots.map((slot) => [slot.id, slot]));
  const slotByPosition = new Map(slots.map((slot) => [slot.position.join(","), slot.id]));
  return {
    id: `cube-${dimension}x${dimension}`,
    dimension,
    coordinateValues: values,
    columnWidths: axisLayout.columnWidths,
    columnSizeReference: CUBE_COLUMN_SIZE_REFERENCE[dimension],
    slots,
    slotsById,
    slotByPosition,
    pieces,
    orientations: makeOrientations(),
    baseMoves: createCubeNBaseMoves(dimension, values),
  };
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
    const match = /^((?:[2-6])?[UDRLFB]w|[UDRLFBMESxyz]|[udrlfb])(2|')?$/.exec(token);
    if (!match) {
      throw new Error(`「${token}」は扱えない手です。外層、M/E/S、x/y/z、Rw（またはr）、3Rwなどのwide moveと ' / 2 を使ってください。`);
    }
    const lowerWide = { r: "Rw", l: "Lw", u: "Uw", d: "Dw", f: "Fw", b: "Bw" };
    let base = lowerWide[match[1]] || match[1];
    // 2Rw is a verbose spelling of Rw; keep one canonical move key.
    if (/^2[UDRLFB]w$/.test(base)) base = base.slice(1);
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
  if (!base) throw new Error(`「${move.base}」は${definition.dimension || 3}×${definition.dimension || 3}では使えません。`);
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

export function validateCubeNDefinition(definition) {
  const dimension = definition.dimension;
  if (!Number.isInteger(dimension) || dimension < 2 || dimension > 7) {
    throw new Error("NxNキューブのサイズが不正です。");
  }
  const expectedSurfacePieces = dimension ** 3 - Math.max(dimension - 2, 0) ** 3;
  if (definition.slots.length !== expectedSurfacePieces || definition.pieces.length !== expectedSurfacePieces) {
    throw new Error(`${dimension}×${dimension}の表面ピース構成が不正です。`);
  }
  const solved = createSolvedState(definition);
  Object.keys(definition.baseMoves).forEach((base) => {
    const move = { base, modifier: "", token: base };
    const back = applyMove(applyMove(solved, move, definition), invertMove(move), definition);
    const cycle = [0, 1, 2, 3].reduce((state) => applyMove(state, move, definition), solved);
    if (JSON.stringify(back) !== JSON.stringify(solved) || JSON.stringify(cycle) !== JSON.stringify(solved)) {
      throw new Error(`${dimension}×${dimension}の${base}回転定義が閉じていません。`);
    }
  });
}

function assertMovesSupported(moves, definition) {
  moves.forEach((move) => {
    if (!definition.baseMoves[move.base]) {
      throw new Error(`「${move.token}」は${definition.dimension || 3}×${definition.dimension || 3}では使えません。`);
    }
  });
  return moves;
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

export function isWebGLAvailable() {
  const canvas = document.createElement("canvas");
  return Boolean(
    canvas.getContext("webgl2")
    || canvas.getContext("webgl")
    || canvas.getContext("experimental-webgl")
  );
}

function panelShape(width, height, radii) {
  const left = -width / 2;
  const right = width / 2;
  const bottom = -height / 2;
  const top = height / 2;
  const { bottomLeft, bottomRight, topRight, topLeft } = radii;
  const shape = new THREE.Shape();
  shape.moveTo(left + bottomLeft, bottom);
  shape.lineTo(right - bottomRight, bottom);
  shape.quadraticCurveTo(right, bottom, right, bottom + bottomRight);
  shape.lineTo(right, top - topRight);
  shape.quadraticCurveTo(right, top, right - topRight, top);
  shape.lineTo(left + topLeft, top);
  shape.quadraticCurveTo(left, top, left, top - topLeft);
  shape.lineTo(left, bottom + bottomLeft);
  shape.quadraticCurveTo(left, bottom, left + bottomLeft, bottom);
  return shape;
}

export function createCube3Renderer(host, definition, initialTheme = DEFAULT_THEME) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const root = new THREE.Group();
  const piecesRoot = new THREE.Group();
  const pieceNodes = new Map();
  const stickerSurfaces = [];
  const innerMaterials = [];
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let onStickerSwipe = null;
  let swipeGesture = null;
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
  controls.enabled = true;

  // A neutral core lies immediately behind thin coloured shells. This lets the
  // straight seam stay almost closed while the deliberately wider inner panel
  // corners make the small star-shaped grid openings visible.
  const cornerSegments = (definition.dimension || 3) > 5 ? 4 : 8;
  const cubieGeometries = new Map();
  const panelGeometries = new Map();
  const coordinateExtents = [0, 1, 2].map((axis) => Math.max(
    ...definition.slots.map((slot) => Math.abs(slot.position[axis]))
  ));
  const facePanelAxes = {
    F: { uAxis: 0, vAxis: 1, uDirection: 1, vDirection: 1, rotation: [0, 0, 0], positionAxis: 2, positionDirection: 1 },
    B: { uAxis: 0, vAxis: 1, uDirection: -1, vDirection: 1, rotation: [0, Math.PI, 0], positionAxis: 2, positionDirection: -1 },
    U: { uAxis: 0, vAxis: 2, uDirection: 1, vDirection: -1, rotation: [-Math.PI / 2, 0, 0], positionAxis: 1, positionDirection: 1 },
    D: { uAxis: 0, vAxis: 2, uDirection: 1, vDirection: 1, rotation: [Math.PI / 2, 0, 0], positionAxis: 1, positionDirection: -1 },
    R: { uAxis: 2, vAxis: 1, uDirection: -1, vDirection: 1, rotation: [0, Math.PI / 2, 0], positionAxis: 0, positionDirection: 1 },
    L: { uAxis: 2, vAxis: 1, uDirection: 1, vDirection: 1, rotation: [0, -Math.PI / 2, 0], positionAxis: 0, positionDirection: -1 },
  };

  function geometryFor(piece) {
    const dimensions = piece.dimensions || [definition.cubieSize || 1, definition.cubieSize || 1, definition.cubieSize || 1];
    const key = dimensions.map((value) => value.toFixed(6)).join(",");
    if (!cubieGeometries.has(key)) {
      cubieGeometries.set(key, new RoundedBoxGeometry(
        dimensions[0], dimensions[1], dimensions[2], cornerSegments,
        Math.min(...dimensions) * CUBIE_CORE_EDGE_RADIUS_RATIO,
      ));
    }
    return cubieGeometries.get(key);
  }

  function panelDimensions(dimensions, face) {
    if (face === "F" || face === "B") return [dimensions[0], dimensions[1]];
    if (face === "U" || face === "D") return [dimensions[0], dimensions[2]];
    return [dimensions[2], dimensions[1]];
  }

  function panelCornerRadius(piece, face, uSign, vSign, smallestPanelSide) {
    const slot = definition.slotsById[piece.homeSlotId];
    const axes = facePanelAxes[face];
    const isOnBoundary = (axis, direction) => (
      slot.position[axis] * direction === coordinateExtents[axis]
    );
    const outerU = isOnBoundary(axes.uAxis, axes.uDirection * uSign);
    const outerV = isOnBoundary(axes.vAxis, axes.vDirection * vSign);
    if (outerU && outerV) return smallestPanelSide * PANEL_OUTER_CORNER_RADIUS_RATIO;
    if (outerU || outerV) return smallestPanelSide * PANEL_OUTER_CORNER_RADIUS_RATIO;
    return smallestPanelSide * PANEL_INNER_CORNER_RADIUS_RATIO;
  }

  function panelGeometryFor(piece, face) {
    const dimensions = piece.dimensions || [definition.cubieSize || 1, definition.cubieSize || 1, definition.cubieSize || 1];
    const [sourceWidth, sourceHeight] = panelDimensions(dimensions, face);
    const inset = Math.min(sourceWidth, sourceHeight) * PANEL_INSET_RATIO;
    const width = sourceWidth - inset * 2;
    const height = sourceHeight - inset * 2;
    const smallestPanelSide = Math.min(width, height);
    const depth = smallestPanelSide * PANEL_EDGE_BEVEL_RATIO;
    const radii = {
      bottomLeft: panelCornerRadius(piece, face, -1, -1, smallestPanelSide),
      bottomRight: panelCornerRadius(piece, face, 1, -1, smallestPanelSide),
      topRight: panelCornerRadius(piece, face, 1, 1, smallestPanelSide),
      topLeft: panelCornerRadius(piece, face, -1, 1, smallestPanelSide),
    };
    const key = [width, height, ...Object.values(radii)].map((value) => value.toFixed(6)).join(",");
    if (!panelGeometries.has(key)) {
      panelGeometries.set(key, new THREE.ExtrudeGeometry(panelShape(width, height, radii), {
        depth,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: depth * 0.7,
        bevelThickness: depth * 0.7,
        curveSegments: cornerSegments,
      }));
    }
    return { geometry: panelGeometries.get(key), depth };
  }

  definition.pieces.forEach((piece) => {
    const node = new THREE.Group();
    node.name = piece.id;
    const coreMaterial = new THREE.MeshPhysicalMaterial({
        color: currentTheme.cubieColor,
        roughness: 0.62,
        metalness: 0,
        clearcoat: 0,
        clearcoatRoughness: 0.18,
      });
    innerMaterials.push(coreMaterial);
    const cubie = new THREE.Mesh(geometryFor(piece), coreMaterial);
    cubie.userData.pieceId = piece.id;
    node.add(cubie);

    Object.entries(piece.stickers).forEach(([face, colorKey]) => {
      const material = new THREE.MeshPhysicalMaterial({
        color: currentTheme.stickerColors[colorKey],
        roughness: 0.24,
        metalness: 0,
        clearcoat: 0.3,
        clearcoatRoughness: 0.18,
      });
      const { geometry } = panelGeometryFor(piece, face);
      const panel = new THREE.Mesh(geometry, material);
      const axes = facePanelAxes[face];
      const dimensions = piece.dimensions || [definition.cubieSize || 1, definition.cubieSize || 1, definition.cubieSize || 1];
      panel.rotation.set(...axes.rotation);
      panel.position.setComponent(
        axes.positionAxis,
        axes.positionDirection * (dimensions[axes.positionAxis] / 2 - Math.min(...dimensions) * PANEL_INSET_RATIO)
      );
      panel.userData.pieceId = piece.id;
      panel.userData.homeFace = face;
      node.add(panel);
        stickerSurfaces.push({
          material,
          stickerId: stickerIdFor(piece.id, face),
          stickerFace: face,
          colorKey,
        });
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
    currentTheme = {
      ...DEFAULT_THEME,
      ...theme,
      stickerColors: { ...DEFAULT_THEME.stickerColors, ...(theme.stickerColors || {}) },
      emphasis: {
        ...DEFAULT_THEME.emphasis,
        ...(theme.emphasis || {}),
        colors: { ...DEFAULT_THEME.emphasis.colors, ...(theme.emphasis?.colors || {}) },
      },
    };
    renderer.setClearColor(currentTheme.canvasBackground, 1);
    const emphasisColors = currentTheme.emphasis.colors || {};
    const emphasizedStickerIds = new Set([
      ...(currentTheme.emphasis.stickerIds || []),
      ...Object.keys(emphasisColors),
    ]);
    const emphasizedFaces = new Set(currentTheme.emphasis.stickerFaces || []);
    const hasEmphasis = emphasizedStickerIds.size > 0 || emphasizedFaces.size > 0;
    innerMaterials.forEach((material) => {
      material.color.set(currentTheme.cubieColor);
      material.roughness = 0.62;
      material.clearcoat = 0;
    });
    stickerSurfaces.forEach((surface) => {
      const focus = !hasEmphasis
        || emphasizedStickerIds.has(surface.stickerId)
        || emphasizedFaces.has(surface.stickerFace);
      const color = focus
        ? emphasisColors[surface.stickerId] || currentTheme.stickerColors[surface.colorKey]
        : currentTheme.emphasis.inactiveColor;
      surface.material.color.set(color);
      surface.material.roughness = currentTheme.emphasis.dimOthers && !focus ? 0.72 : 0.24;
      surface.material.clearcoat = focus ? 0.3 : 0;
    });
  }

  function applyState(state) {
    definition.pieces.forEach((piece) => {
      const pose = state.pieces[piece.id];
      const slot = definition.slotsById[pose.slotId];
      const node = pieceNodes.get(piece.id);
      const displayPosition = slot.renderPosition || slot.position.map((coordinate) => coordinate * (definition.renderScale || 1.01));
      node.position.set(...displayPosition);
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

  function faceForWorldNormal(normal) {
    if (Math.abs(normal.x) > 0.5) return normal.x > 0 ? "R" : "L";
    if (Math.abs(normal.y) > 0.5) return normal.y > 0 ? "U" : "D";
    return normal.z > 0 ? "F" : "B";
  }

  function materialIndexForHit(hit) {
    const triangleStart = (hit.faceIndex || 0) * 3;
    const group = hit.object.geometry.groups.find((candidate) => (
      triangleStart >= candidate.start && triangleStart < candidate.start + candidate.count
    ));
    return group?.materialIndex;
  }

  function pickSticker(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects([...pieceNodes.values()], true);
    for (const hit of hits) {
      const materialIndex = materialIndexForHit(hit);
      const homeFace = hit.object.userData.homeFace || BOX_GROUP_FACES[materialIndex];
      const pieceId = hit.object.userData.pieceId;
      if (!pieceId || !homeFace) continue;
      const node = pieceNodes.get(pieceId);
      const worldNormal = vectorToThree(FACE_NORMALS[homeFace])
        .applyQuaternion(node.getWorldQuaternion(new THREE.Quaternion()))
        .normalize();
      return { face: faceForWorldNormal(worldNormal), worldNormal };
    }
    return null;
  }

  function projectToScreen(worldPoint) {
    const point = worldPoint.clone().project(camera);
    const rect = renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(
      rect.left + (point.x + 1) * rect.width / 2,
      rect.top + (1 - point.y) * rect.height / 2,
    );
  }

  function clockwiseForSwipe(gesture, event) {
    const drag = new THREE.Vector2(event.clientX - gesture.x, event.clientY - gesture.y);
    const faceCenter = gesture.worldNormal.clone().multiplyScalar(1.51);
    const centerScreen = projectToScreen(faceCenter);
    const radial = new THREE.Vector2(gesture.x, gesture.y).sub(centerScreen);
    if (radial.length() > 18) {
      // Browser screen coordinates grow downward, so this sign is clockwise.
      return radial.x * drag.y - radial.y * drag.x > 0;
    }

    // On a centre sticker the radial direction is ambiguous. Use the screen
    // direction of the face's local right axis as a stable fallback.
    const referenceUp = Math.abs(gesture.worldNormal.y) > 0.9
      ? new THREE.Vector3(0, 0, 1)
      : new THREE.Vector3(0, 1, 0);
    const faceRight = new THREE.Vector3().crossVectors(referenceUp, gesture.worldNormal).normalize();
    const rightScreen = projectToScreen(faceCenter.clone().add(faceRight)).sub(centerScreen).normalize();
    return drag.dot(rightScreen) > 0;
  }

  function finishSwipe(event) {
    if (!swipeGesture || event.pointerId !== swipeGesture.pointerId) return;
    const gesture = swipeGesture;
    swipeGesture = null;
    controls.enabled = true;
    if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
    const distance = Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y);
    if (distance < 28 || !onStickerSwipe) return;
    onStickerSwipe({ face: gesture.face, clockwise: clockwiseForSwipe(gesture, event) });
  }

  function handlePointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const sticker = pickSticker(event);
    if (!sticker) return;
    swipeGesture = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, ...sticker };
    controls.enabled = false;
    renderer.domElement.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function handlePointerMove(event) {
    if (!swipeGesture || event.pointerId !== swipeGesture.pointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function handlePointerUp(event) {
    if (!swipeGesture || event.pointerId !== swipeGesture.pointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    finishSwipe(event);
  }

  function handlePointerCancel(event) {
    if (!swipeGesture || event.pointerId !== swipeGesture.pointerId) return;
    swipeGesture = null;
    controls.enabled = true;
  }

  if (STICKER_SWIPE_ENABLED) {
    renderer.domElement.addEventListener("pointerdown", handlePointerDown, { capture: true });
    renderer.domElement.addEventListener("pointermove", handlePointerMove, { capture: true });
    renderer.domElement.addEventListener("pointerup", handlePointerUp, { capture: true });
    renderer.domElement.addEventListener("pointercancel", handlePointerCancel, { capture: true });
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
    onStickerSwipe(callback) {
      onStickerSwipe = callback;
      return () => { onStickerSwipe = null; };
    },
    onCameraChange(callback) {
      controls.addEventListener("end", callback);
      return () => controls.removeEventListener("end", callback);
    },
    destroy() {
      resizeObserver.disconnect();
      if (STICKER_SWIPE_ENABLED) {
        renderer.domElement.removeEventListener("pointerdown", handlePointerDown, { capture: true });
        renderer.domElement.removeEventListener("pointermove", handlePointerMove, { capture: true });
        renderer.domElement.removeEventListener("pointerup", handlePointerUp, { capture: true });
        renderer.domElement.removeEventListener("pointercancel", handlePointerCancel, { capture: true });
      }
      controls.dispose();
      renderer.setAnimationLoop(null);
      cubieGeometries.forEach((geometry) => geometry.dispose());
      panelGeometries.forEach((geometry) => geometry.dispose());
      [...innerMaterials, ...stickerSurfaces.map((surface) => surface.material)].forEach((material) => material.dispose());
      renderer.dispose();
      host.replaceChildren();
    },
  };
}

function normalizePuzzleId(value) {
  const source = String(value || "cube-3x3").toLowerCase();
  const match = /^(?:cube-)?([2-7])x\1(?:x\1)?$/.exec(source);
  if (!match) throw new Error(`「${value}」は未対応です。cube-2x2からcube-7x7を指定してください。`);
  return `cube-${match[1]}x${match[1]}`;
}

/**
 * Create the portable NxN viewer controller used by pages outside this demo.
 * `initialState` is a logical state; callers with notation can use
 * `setupAlgorithm` (or `setSetupAlgorithm`) to derive one from solved state.
 * `teachingSteps` adds page-owned notes and sticker emphasis at each position.
 */
export function createPuzzleViewer(host, options = {}) {
  const puzzleId = normalizePuzzleId(options.puzzleId || "cube-3x3");
  const dimension = Number(puzzleId.slice(5, 6));
  const definition = dimension === 3 ? createCube3Definition() : createCubeNDefinition(dimension);
  if (dimension === 3) validateCube3Definition(definition);
  else validateCubeNDefinition(definition);
  const solvedState = createSolvedState(definition);
  let setupMoves = options.initialState ? [] : assertMovesSupported(parseAlgorithm(options.setupAlgorithm || ""), definition);
  let initialState = options.initialState || stateAt(solvedState, setupMoves, setupMoves.length, definition);
  let moves = assertMovesSupported(parseAlgorithm(options.algorithm || ""), definition);
  let teachingSteps = Array.isArray(options.teachingSteps) ? options.teachingSteps : [];
  let position = 0;
  let speed = Number(options.speed) > 0 ? Number(options.speed) : 1;
  let isBusy = false;
  let isPlaying = false;
  let themeId = options.themeId || "standard";
  let theme = options.theme || DEFAULT_THEME;
  const renderer = createCube3Renderer(host, definition, theme);
  const removeCameraChangeListener = renderer?.onCameraChange(() => notify());

  if (options.cameraState) renderer?.setCameraState(options.cameraState);

  function snapshot() {
    const teaching = teachingSteps.find((step) => Number(step.position) === position) || null;
    return {
      puzzleId,
      position,
      totalMoves: moves.length,
      currentMove: position ? moves[position - 1].token : null,
      algorithm: moves.map((move) => move.token).join(" "),
      setup: setupMoves.map((move) => move.token).join(" "),
      themeId,
      teaching,
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

  function currentTeachingTheme() {
    const teaching = teachingSteps.find((step) => Number(step.position) === position);
    if (!teaching?.emphasis) return theme;
    return {
      ...theme,
      emphasis: {
        ...(theme.emphasis || {}),
        ...teaching.emphasis,
        colors: { ...(theme.emphasis?.colors || {}), ...(teaching.emphasis.colors || {}) },
      },
    };
  }

  function applyCurrentState() {
    renderer?.applyState(currentState());
    renderer?.applyTheme(currentTeachingTheme());
  }

  function applyCurrentTheme() {
    renderer?.applyTheme(currentTeachingTheme());
  }

  function setAlgorithm(value) {
    moves = assertMovesSupported(parseAlgorithm(value), definition);
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
    setupMoves = assertMovesSupported(parseAlgorithm(value), definition);
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
    applyCurrentTheme();
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
    applyCurrentTheme();
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

  async function turn(moveInput) {
    if (!renderer || isBusy) return false;
    const parsed = typeof moveInput === "string" ? parseAlgorithm(moveInput) : [moveInput];
    if (parsed.length !== 1 || !parsed[0]?.base) {
      throw new Error("直接操作では1手だけを実行できます。");
    }
    const move = assertMovesSupported(parsed, definition)[0];
    isPlaying = false;
    isBusy = true;
    notify();
    const fromState = currentState();
    const toState = applyMove(fromState, move, definition);
    await renderer.animateMove(fromState, toState, move, 440 / speed);
    // Keep the logical history intact: a manual turn becomes one new move at
    // the current playback point, instead of discarding the loaded procedure.
    moves.splice(position, 0, move);
    position += 1;
    applyCurrentTheme();
    isBusy = false;
    notify();
    return true;
  }

  const removeStickerSwipeListener = renderer?.onStickerSwipe(({ face, clockwise }) => {
    if (isBusy) return;
    turn(`${face}${clockwise ? "" : "'"}`);
  });

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
    turn,
    setTheme(nextTheme, nextThemeId = "standard") {
      theme = nextTheme || DEFAULT_THEME;
      themeId = nextThemeId;
      renderer?.applyTheme(currentTeachingTheme());
      notify();
    },
    setEmphasis(emphasis = {}) {
      theme = {
        ...theme,
        emphasis: {
          ...(theme.emphasis || {}),
          ...emphasis,
          colors: { ...(theme.emphasis?.colors || {}), ...(emphasis.colors || {}) },
        },
      };
      renderer?.applyTheme(currentTeachingTheme());
      notify();
    },
    setTeachingSteps(nextTeachingSteps = []) {
      teachingSteps = Array.isArray(nextTeachingSteps) ? nextTeachingSteps : [];
      applyCurrentState();
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
      removeStickerSwipeListener?.();
      renderer?.destroy();
    },
  };
}
