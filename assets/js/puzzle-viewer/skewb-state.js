// A Skewb has eight corner shells and six center shells. Its turns move the
// four corners and three centers on one side of a body-diagonal cut.
const HALF = 1.5;
const FACES = ["U", "R", "F", "D", "L", "B"];
const NORMALS = {
  U: [0, 1, 0], R: [1, 0, 0], F: [0, 0, 1],
  D: [0, -1, 0], L: [-1, 0, 0], B: [0, 0, -1],
};
const FACE_CORNERS = {
  U: [[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]],
  R: [[1, 1, 1], [1, 1, -1], [1, -1, -1], [1, -1, 1]],
  F: [[-1, 1, 1], [1, 1, 1], [1, -1, 1], [-1, -1, 1]],
  D: [[-1, -1, 1], [1, -1, 1], [1, -1, -1], [-1, -1, -1]],
  L: [[-1, 1, -1], [-1, 1, 1], [-1, -1, 1], [-1, -1, -1]],
  B: [[1, 1, -1], [-1, 1, -1], [-1, -1, -1], [1, -1, -1]],
};
const CORNERS = {
  URF: [1, 1, 1], ULB: [-1, 1, -1], DFL: [-1, -1, 1], DRB: [1, -1, -1],
  UFL: [-1, 1, 1], UBR: [1, 1, -1], DBL: [-1, -1, -1], DFR: [1, -1, 1],
};
// WCA names identify four vertices; o-prefixed names turn the opposite layer.
export const SKEWB_WCA_CORNERS = Object.freeze({ R: "DRB", U: "ULB", L: "DFL", B: "DBL" });
export const SKEWB_OPPOSITE_CORNERS = Object.freeze({ oR: "UFL", oU: "DFR", oL: "UBR", oB: "URF" });
const MOVE_TO_CORNER = { ...SKEWB_WCA_CORNERS, ...SKEWB_OPPOSITE_CORNERS };
const CORNER_TO_MOVE = Object.fromEntries(Object.entries(MOVE_TO_CORNER).map(([move, corner]) => [corner, move]));
const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const add = (a, b) => a.map((value, index) => value + b[index]);
const scale = (a, factor) => a.map((value) => value * factor);
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const length = (a) => Math.hypot(...a);
const normalize = (a) => scale(a, 1 / length(a));
const centroid = (points) => scale(points.reduce(add, [0, 0, 0]), 1 / points.length);
const transform = (matrix, vector) => [
  dot(matrix.slice(0, 3), vector),
  dot(matrix.slice(3, 6), vector),
  dot(matrix.slice(6, 9), vector),
];

function multiply(left, right) {
  return Array.from({ length: 9 }, (_, index) => {
    const row = Math.floor(index / 3);
    const column = index % 3;
    const value = left[row * 3] * right[column]
      + left[row * 3 + 1] * right[3 + column]
      + left[row * 3 + 2] * right[6 + column];
    return Math.abs(value) < 1e-10 ? 0 : Number(value.toFixed(10));
  });
}

function rotationMatrix(axis, degrees) {
  const [x, y, z] = normalize(axis);
  const angle = degrees * Math.PI / 180;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  return [
    c + x * x * t, x * y * t - z * s, x * z * t + y * s,
    y * x * t + z * s, c + y * y * t, y * z * t - x * s,
    z * x * t - y * s, z * y * t + x * s, c + z * z * t,
  ];
}

function cornerName(point) {
  const signs = point.map((coordinate) => Math.sign(coordinate));
  const name = Object.keys(CORNERS).find((key) => CORNERS[key].every((sign, index) => sign === signs[index]));
  if (!name) throw new Error("Skewbのコーナー位置を解決できません。");
  return name;
}

export function createSkewbDefinition() {
  const panels = [];
  for (const face of FACES) {
    const corners = FACE_CORNERS[face].map((point) => scale(point, HALF));
    const midpoints = corners.map((corner, index) => scale(add(corner, corners[(index + 1) % 4]), 0.5));
    const center = centroid(corners);
    panels.push({ id: `${face}-center`, face, kind: "center", pieceId: `center-${face}`, corners: midpoints, center });
    for (let index = 0; index < 4; index += 1) {
      const vertex = corners[index];
      panels.push({
        id: `${face}-corner-${index}`,
        face,
        kind: "corner",
        pieceId: `corner-${cornerName(vertex)}`,
        corners: [vertex, midpoints[index], midpoints[(index + 3) % 4]],
        center: centroid([vertex, midpoints[index], midpoints[(index + 3) % 4]]),
      });
    }
  }
  const piecesById = new Map();
  for (const panel of panels) {
    const piece = piecesById.get(panel.pieceId) || {
      id: panel.pieceId, kind: panel.kind, panels: [],
    };
    piece.panels.push(panel);
    piecesById.set(piece.id, piece);
  }
  const pieces = [...piecesById.values()].map((piece) => ({
    ...piece, center: centroid(piece.panels.map((panel) => panel.center)),
  }));
  const definition = {
    id: "skewb", faces: FACES, faceNormals: NORMALS, corners: CORNERS,
    wcaCorners: SKEWB_WCA_CORNERS, oppositeCorners: SKEWB_OPPOSITE_CORNERS, panels, pieces,
    piecesById: new Map(pieces.map((piece) => [piece.id, piece])),
  };
  validateSkewbDefinition(definition);
  return definition;
}

export function validateSkewbDefinition(definition) {
  if (definition.panels.length !== 30 || definition.pieces.length !== 14) {
    throw new Error("Skewbは30パネル・14パーツで構成される必要があります。");
  }
  for (const face of FACES) {
    const panels = definition.panels.filter((panel) => panel.face === face);
    if (panels.length !== 5 || panels.filter((panel) => panel.kind === "center").length !== 1) {
      throw new Error(`${face}面の分割が不正です。`);
    }
  }
  if (definition.pieces.filter((piece) => piece.kind === "corner" && piece.panels.length === 3).length !== 8
    || definition.pieces.filter((piece) => piece.kind === "center" && piece.panels.length === 1).length !== 6) {
    throw new Error("Skewbのコーナーまたはセンターのパネル数が不正です。");
  }
  return true;
}

export function parseSkewbAlgorithm(value = "") {
  const source = Array.isArray(value) ? value.join(" ") : String(value);
  return source.trim().split(/\s+/).filter(Boolean).map((token) => {
    const base = token.replace(/'$/, "");
    const corner = MOVE_TO_CORNER[base] || base;
    if (!/^(?:[RULB]|o[RULB]|[UDFBLR]{3})'?$/.test(token) || !CORNERS[corner]) {
      throw new Error(`「${token}」はSkewbの手として読めません。R/U/L/B、oR/oU/oL/oB、または旧3面表記を使ってください。`);
    }
    const canonicalBase = CORNER_TO_MOVE[corner];
    return { token: canonicalBase + (token.endsWith("'") ? "'" : ""), base: canonicalBase,
      corner, angle: token.endsWith("'") ? 120 : -120 };
  });
}

export function invertSkewbMove(move) {
  return parseSkewbAlgorithm(`${move.base}${move.token.endsWith("'") ? "" : "'"}`)[0];
}

export function createSolvedSkewbState(definition) {
  return { orientations: Object.fromEntries(definition.pieces.map((piece) => [piece.id, [...IDENTITY]])) };
}

export function selectedSkewbPieces(state, move, definition) {
  const axis = normalize(definition.corners[move.corner]);
  return definition.pieces.filter((piece) => (
    dot(axis, transform(state.orientations[piece.id], piece.center)) > 1e-6
  )).map((piece) => piece.id);
}

export function applySkewbMove(state, move, definition) {
  const selected = selectedSkewbPieces(state, move, definition);
  if (selected.length !== 7) throw new Error(`${move.token}の回転対象パーツ数が不正です: ${selected.length}`);
  const rotation = rotationMatrix(definition.corners[move.corner], move.angle);
  const orientations = { ...state.orientations };
  selected.forEach((pieceId) => { orientations[pieceId] = multiply(rotation, state.orientations[pieceId]); });
  return { orientations };
}

export function skewbStateAt(initialState, moves, position, definition) {
  return moves.slice(0, position).reduce((state, move) => applySkewbMove(state, move, definition), initialState);
}

export function skewbStatesEqual(left, right, tolerance = 1e-8) {
  return Object.keys(left.orientations).every((id) => left.orientations[id].every((value, index) => (
    Math.abs(value - right.orientations[id][index]) < tolerance
  )));
}

export { normalize as skewbNormalize };
