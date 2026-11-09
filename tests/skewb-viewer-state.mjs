import assert from "node:assert/strict";
import { SKEWB_FACE_COLORS } from "../assets/js/puzzle-viewer/skewb-colors.js";
import {
  applySkewbMove,
  createSkewbDefinition,
  createSolvedSkewbState,
  invertSkewbMove,
  parseSkewbAlgorithm,
  selectedSkewbPieces,
  skewbStateAt,
  skewbStatesEqual,
  SKEWB_OPPOSITE_CORNERS,
  SKEWB_WCA_CORNERS,
} from "../assets/js/puzzle-viewer/skewb-state.js";

const definition = createSkewbDefinition();
const solved = createSolvedSkewbState(definition);
assert.deepEqual(SKEWB_FACE_COLORS, {
  U: "#f4f2ed", R: "#e65259", F: "#31b96b",
  D: "#eed643", L: "#ff963f", B: "#3d84e8",
});
assert.equal(definition.panels.length, 30);
assert.equal(definition.pieces.length, 14);
assert.deepEqual(SKEWB_WCA_CORNERS, { R: "DRB", U: "ULB", L: "DFL", B: "DBL" });
assert.deepEqual(SKEWB_OPPOSITE_CORNERS, { oR: "UFL", oU: "DFR", oL: "UBR", oB: "URF" });
assert.deepEqual(parseSkewbAlgorithm("DRB ULB' DFL DBL' URF UFL' UBR DFR'").map((move) => move.token),
  ["R", "U'", "L", "B'", "oB", "oR'", "oL", "oU'"]);
assert.notDeepEqual(
  selectedSkewbPieces(solved, parseSkewbAlgorithm("oR")[0], definition),
  selectedSkewbPieces(solved, parseSkewbAlgorithm("R'")[0], definition),
);

for (const token of ["R", "U", "L", "B", "oR", "oU", "oL", "oB"]) {
  const move = parseSkewbAlgorithm(token)[0];
  const selected = selectedSkewbPieces(solved, move, definition);
  assert.equal(selected.filter((id) => id.startsWith("corner-")).length, 4, token);
  assert.equal(selected.filter((id) => id.startsWith("center-")).length, 3, token);
  const once = applySkewbMove(solved, move, definition);
  const undone = applySkewbMove(once, invertSkewbMove(move), definition);
  assert.ok(skewbStatesEqual(undone, solved), `${token} and its inverse`);
  const thrice = applySkewbMove(applySkewbMove(once, move, definition), move, definition);
  assert.ok(skewbStatesEqual(thrice, solved), `${token} repeated three times`);
}

for (const [alias, corner] of Object.entries({ ...SKEWB_WCA_CORNERS, ...SKEWB_OPPOSITE_CORNERS })) {
  assert.ok(skewbStatesEqual(
    applySkewbMove(solved, parseSkewbAlgorithm(alias)[0], definition),
    applySkewbMove(solved, parseSkewbAlgorithm(corner)[0], definition),
  ));
}

const algorithm = parseSkewbAlgorithm("R U R' U' L B' oB oU'");
const scrambled = skewbStateAt(solved, algorithm, algorithm.length, definition);
const inverse = algorithm.toReversed().map(invertSkewbMove);
assert.ok(skewbStatesEqual(skewbStateAt(scrambled, inverse, inverse.length, definition), solved));
assert.throws(() => parseSkewbAlgorithm("F"), /Skewbの手/);
assert.throws(() => parseSkewbAlgorithm("R2"), /Skewbの手/);
assert.throws(() => parseSkewbAlgorithm("DRF"), /Skewbの手/);

console.log("Skewb: 30 panels, 14 pieces, WCA turns and inverse sequences verified.");
