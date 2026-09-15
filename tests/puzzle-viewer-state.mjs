import {
  applyMove,
  createCube3Definition,
  createSolvedState,
  invertMove,
  parseAlgorithm,
  stateAt,
  validateCube3Definition,
} from "../assets/js/puzzle-viewer/cube3-viewer.js";

const definition = createCube3Definition();
validateCube3Definition(definition);
const solved = createSolvedState(definition);

function applyNotation(notation) {
  const moves = parseAlgorithm(notation);
  return stateAt(solved, moves, moves.length, definition);
}

function assertSameState(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: 状態が一致しません。`);
  }
}

function assertMoveOrder(moveNotation) {
  const moves = parseAlgorithm(moveNotation);
  const rotated = stateAt(solved, moves, moves.length, definition);
  const restored = moves.slice().reverse().map(invertMove)
    .reduce((state, move) => applyMove(state, move, definition), rotated);
  assertSameState(restored, solved, `${moveNotation} の逆手`);
}

const canonical = parseAlgorithm("r u' f2 Rw Lw Uw Dw Fw Bw M E S x y z");
const tokens = canonical.map((move) => move.token).join(" ");
if (tokens !== "Rw Uw' Fw2 Rw Lw Uw Dw Fw Bw M E S x y z") {
  throw new Error(`wide notation normalization failed: ${tokens}`);
}

[
  "R L U D F B M E S Rw Lw Uw Dw Fw Bw x y z",
  "R U R' U' F2 M E' S2 Rw U2 r' x y' z2",
].forEach(assertMoveOrder);

[
  ["Rw", "R M'"],
  ["Lw", "L M"],
  ["Uw", "U E'"],
  ["Dw", "D E"],
  ["Fw", "F S"],
  ["Bw", "B S'"],
  ["x", "R L' M'"],
  ["y", "U D' E'"],
  ["z", "F B' S"],
].forEach(([combined, expanded]) => {
  assertSameState(applyNotation(combined), applyNotation(expanded), `${combined} の展開`);
});

Object.keys(definition.baseMoves).forEach((base) => {
  const move = parseAlgorithm(base)[0];
  const afterFourTurns = [0, 1, 2, 3]
    .reduce((state) => applyMove(state, move, definition), solved);
  assertSameState(afterFourTurns, solved, `${base} の4回転`);
});

console.log("3×3 notation, slice, wide, and rotation tests passed");
