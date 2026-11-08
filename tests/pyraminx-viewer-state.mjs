import assert from "node:assert/strict";
import { PYRAMINX_FACE_COLORS } from "../assets/js/puzzle-viewer/pyraminx-colors.js";
import {
  applyPyraminxMove,
  createPyraminxDefinition,
  createSolvedPyraminxState,
  invertPyraminxMove,
  parsePyraminxAlgorithm,
  pyraminxStateAt,
  pyraminxStatesEqual,
  selectedPyraminxPieces,
} from "../assets/js/puzzle-viewer/pyraminx-state.js";

const definition = createPyraminxDefinition();
const solved = createSolvedPyraminxState(definition);
assert.deepEqual(PYRAMINX_FACE_COLORS, {
  U: "#f0df24", L: "#1468cf", R: "#ee1730", B: "#00c83c",
});
assert.ok(definition.faceNormals.U[1] < 0, "yellow is the horizontal bottom face");
assert.ok(definition.faceNormals.B[2] > 0, "green faces the viewer");
assert.ok(definition.faceNormals.R[0] < 0, "red is left of green");
assert.ok(definition.faceNormals.L[0] > 0, "blue is right of green");
assert.equal(definition.triangles.length, 36);
assert.equal(definition.pieces.length, 14);

for (const token of ["U", "L", "R", "B", "u", "l", "r", "b"]) {
  const move = parsePyraminxAlgorithm(token)[0];
  const selected = selectedPyraminxPieces(solved, move, definition);
  assert.equal(selected.length, token === token.toLowerCase() ? 1 : 5, token);
  if (token === token.toLowerCase()) assert.deepEqual(selected, [`tip-${token.toUpperCase()}`]);
  const once = applyPyraminxMove(solved, move, definition);
  const undone = applyPyraminxMove(once, invertPyraminxMove(move), definition);
  assert.ok(pyraminxStatesEqual(undone, solved), `${token} and its inverse`);
  const thrice = applyPyraminxMove(applyPyraminxMove(once, move, definition), move, definition);
  assert.ok(pyraminxStatesEqual(thrice, solved), `${token} repeated three times`);
}

const algorithm = parsePyraminxAlgorithm("R U R' U' L B' u l' r b'");
const scrambled = pyraminxStateAt(solved, algorithm, algorithm.length, definition);
const inverse = algorithm.toReversed().map(invertPyraminxMove);
assert.ok(pyraminxStatesEqual(pyraminxStateAt(scrambled, inverse, inverse.length, definition), solved));
assert.throws(() => parsePyraminxAlgorithm("F"), /ピラミンクスの手/);
assert.throws(() => parsePyraminxAlgorithm("U2"), /ピラミンクスの手/);

console.log("Pyraminx: 36 panels, 14 pieces, turns and inverse sequences verified.");
