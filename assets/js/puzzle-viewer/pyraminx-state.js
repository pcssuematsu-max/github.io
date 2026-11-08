// The geometry and move axes share one tetrahedral definition. Keeping this
// module free of Three.js lets lessons and tests inspect the logical state.
const ORDER = ["U", "L", "R", "B"];
const FACE_VERTICES = {
  U: ["L", "B", "R"],
  L: ["U", "R", "B"],
  R: ["U", "B", "L"],
  B: ["U", "L", "R"],
};
const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const SIDE = 3.4;
const HEIGHT = SIDE * Math.sqrt(2 / 3);
const BASE_RADIUS = SIDE / Math.sqrt(3);
const VERTICES = {
  U: [0, HEIGHT * 3 / 4, 0],
  L: [-SIDE / 2, -HEIGHT / 4, BASE_RADIUS / 2],
  R: [SIDE / 2, -HEIGHT / 4, BASE_RADIUS / 2],
  B: [0, -HEIGHT / 4, -BASE_RADIUS],
};

const add = (a, b) => a.map((value, index) => value + b[index]);
const scale = (a, factor) => a.map((value) => value * factor);
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const length = (a) => Math.hypot(...a);
const normalize = (a) => scale(a, 1 / length(a));
const centroid = (points) => scale(points.reduce(add, [0, 0, 0]), 1 / points.length);

function facePoint(a, b, c, i, j) {
  return add(add(scale(a, 1 - (i + j) / 3), scale(b, i / 3)), scale(c, j / 3));
}

function barycentric(point) {
  const squaredRadius = dot(VERTICES.U, VERTICES.U);
  return Object.fromEntries(ORDER.map((vertex) => [
    vertex, (1 + 3 * dot(point, VERTICES[vertex]) / squaredRadius) / 4,
  ]));
}

function trianglePieceId(triangle) {
  const weights = Object.entries(barycentric(triangle.center))
    .sort((left, right) => right[1] - left[1]);
  if (triangle.orientation === "down") return `center-${weights[0][0]}`;
  if (weights[0][1] > 2 / 3) return `tip-${weights[0][0]}`;
  const vertices = weights.slice(0, 2).map(([vertex]) => vertex)
    .sort((left, right) => ORDER.indexOf(left) - ORDER.indexOf(right));
  return `edge-${vertices.join("")}`;
}

export function createPyraminxDefinition() {
  const triangles = [];
  for (const face of ORDER) {
    const [a, b, c] = FACE_VERTICES[face].map((vertex) => VERTICES[vertex]);
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3 - i; j += 1) {
        const up = [facePoint(a, b, c, i, j), facePoint(a, b, c, i + 1, j), facePoint(a, b, c, i, j + 1)];
        triangles.push({ id: `${face}-up-${i}-${j}`, face, orientation: "up", corners: up, center: centroid(up) });
        if (i + j < 2) {
          const down = [facePoint(a, b, c, i + 1, j), facePoint(a, b, c, i + 1, j + 1), facePoint(a, b, c, i, j + 1)];
          triangles.push({ id: `${face}-down-${i}-${j}`, face, orientation: "down", corners: down, center: centroid(down) });
        }
      }
    }
  }
  const piecesById = new Map();
  for (const triangle of triangles) {
    triangle.pieceId = trianglePieceId(triangle);
    const piece = piecesById.get(triangle.pieceId) || {
      id: triangle.pieceId,
      type: triangle.pieceId.split("-")[0],
      triangles: [],
    };
    piece.triangles.push(triangle);
    piecesById.set(piece.id, piece);
  }
  const pieces = [...piecesById.values()].map((piece) => ({
    ...piece,
    center: centroid(piece.triangles.map((triangle) => triangle.center)),
  }));
  const definition = {
    id: "pyraminx",
    vertices: VERTICES,
    faceVertices: FACE_VERTICES,
    faces: ORDER,
    faceNormals: Object.fromEntries(ORDER.map((face) => [face, normalize(scale(VERTICES[face], -1))])),
    triangles,
    pieces,
    piecesById: new Map(pieces.map((piece) => [piece.id, piece])),
  };
  validatePyraminxDefinition(definition);
  return definition;
}

export function validatePyraminxDefinition(definition) {
  if (definition.triangles.length !== 36 || definition.pieces.length !== 14) {
    throw new Error("ピラミンクスは36面キャップ・14パーツで構成される必要があります。");
  }
  for (const face of ORDER) {
    if (definition.triangles.filter((triangle) => triangle.face === face).length !== 9) {
      throw new Error(`${face}面の三角パネル数が不正です。`);
    }
  }
  for (const type of ["tip", "center", "edge"]) {
    const group = definition.pieces.filter((piece) => piece.type === type);
    const expected = type === "edge" ? 6 : 4;
    const stickers = type === "edge" ? 2 : 3;
    if (group.length !== expected || group.some((piece) => piece.triangles.length !== stickers)) {
      throw new Error(`${type}パーツの数または面キャップ数が不正です。`);
    }
  }
  return true;
}

export function parsePyraminxAlgorithm(value = "") {
  const source = Array.isArray(value) ? value.join(" ") : String(value);
  return source.trim().split(/\s+/).filter(Boolean).map((token) => {
    if (!/^[ULRBulrb]'?$/.test(token)) {
      throw new Error(`「${token}」はピラミンクスの手として読めません。U/L/R/Bと小文字の先端回転を使ってください。`);
    }
    const base = token[0];
    return { token, base, vertex: base.toUpperCase(), tip: base !== base.toUpperCase(), angle: token.endsWith("'") ? 120 : -120 };
  });
}

export function invertPyraminxMove(move) {
  const token = `${move.base}${move.token.endsWith("'") ? "" : "'"}`;
  return parsePyraminxAlgorithm(token)[0];
}

function transform(matrix, vector) {
  return [
    dot(matrix.slice(0, 3), vector),
    dot(matrix.slice(3, 6), vector),
    dot(matrix.slice(6, 9), vector),
  ];
}

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
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const other = 1 - cosine;
  return [
    cosine + x * x * other, x * y * other - z * sine, x * z * other + y * sine,
    y * x * other + z * sine, cosine + y * y * other, y * z * other - x * sine,
    z * x * other - y * sine, z * y * other + x * sine, cosine + z * z * other,
  ];
}

export function createSolvedPyraminxState(definition) {
  return { orientations: Object.fromEntries(definition.pieces.map((piece) => [piece.id, [...IDENTITY]])) };
}

export function selectedPyraminxPieces(state, move, definition) {
  const threshold = move.tip ? 2 / 3 : 1 / 3;
  return definition.pieces.filter((piece) => {
    const center = transform(state.orientations[piece.id], piece.center);
    return barycentric(center)[move.vertex] > threshold + 1e-6;
  }).map((piece) => piece.id);
}

export function applyPyraminxMove(state, move, definition) {
  const selected = selectedPyraminxPieces(state, move, definition);
  if (selected.length !== (move.tip ? 1 : 5)) {
    throw new Error(`${move.token}の回転対象パーツ数が不正です: ${selected.length}`);
  }
  const rotation = rotationMatrix(definition.vertices[move.vertex], move.angle);
  const orientations = { ...state.orientations };
  selected.forEach((pieceId) => {
    orientations[pieceId] = multiply(rotation, state.orientations[pieceId]);
  });
  return { orientations };
}

export function pyraminxStateAt(initialState, moves, position, definition) {
  return moves.slice(0, position).reduce((state, move) => applyPyraminxMove(state, move, definition), initialState);
}

export function pyraminxStatesEqual(left, right, tolerance = 1e-8) {
  return Object.keys(left.orientations).every((id) => left.orientations[id].every((value, index) => (
    Math.abs(value - right.orientations[id][index]) < tolerance
  )));
}

export { barycentric as pyraminxBarycentric, cross as pyraminxCross, normalize as pyraminxNormalize };
