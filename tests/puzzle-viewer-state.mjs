import {
  applyMove,
  createCube3Definition,
  createCubeNDefinition,
  createSolvedState,
  invertMove,
  parseAlgorithm,
  stickerIdFor,
  stateAt,
  validateCube3Definition,
  validateCubeNDefinition,
} from "../assets/js/puzzle-viewer/cube3-viewer.js";

const definition = createCube3Definition();
validateCube3Definition(definition);
const solved = createSolvedState(definition);

if (stickerIdFor("corner-DFR", "F") !== "corner-DFR:F") {
  throw new Error("注目ステッカー用の安定IDを生成できません。");
}
if (new Set(definition.pieces.flatMap((piece) => Object.keys(piece.stickers)
  .map((face) => stickerIdFor(piece.id, face)))).size !== 54) {
  throw new Error("3×3の注目ステッカーIDは54個すべて一意である必要があります。");
}

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

const canonical = parseAlgorithm("r u' f2 2Rw Lw Uw Dw Fw Bw M E S x y z");
const tokens = canonical.map((move) => move.token).join(" ");
if (tokens !== "Rw Uw' Fw2 Rw Lw Uw Dw Fw Bw M E S x y z") {
  throw new Error(`wide notation normalization failed: ${tokens}`);
}

const aiLabWideTokens = parseAlgorithm("2U 3F' 3R2").map((move) => move.token).join(" ");
if (aiLabWideTokens !== "2U 3F' 3R2") {
  throw new Error(`AI Lab slice notation normalization failed: ${aiLabWideTokens}`);
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

[
  [2, 8, 50, 50, "R U Rw x"],
  [3, 26, 36, 36, "R U Rw M x"],
  [4, 56, 26, 28, "R U Rw 3Rw x"],
  [5, 98, 22, 26, "R U Rw 4Rw M x"],
  [6, 152, 17, 26, "R U 3Rw 5Uw x"],
  [7, 218, 14, 26, "R U 3Rw 6Uw M x"],
].forEach(([size, expectedSurfacePieces, inside, outside, notation]) => {
  const nxn = createCubeNDefinition(size);
  validateCubeNDefinition(nxn);
  if (nxn.pieces.length !== expectedSurfacePieces) {
    throw new Error(`${size}×${size}の表面ピース数が一致しません。`);
  }
  if (nxn.columnSizeReference.inside !== inside || nxn.columnSizeReference.outside !== outside) {
    throw new Error(`${size}×${size}の内外列幅がRubiks_portfolioの定数と一致しません。`);
  }
  if (Math.abs(nxn.columnWidths.reduce((sum, width) => sum + width, 0) - 3) > 1e-9) {
    throw new Error(`${size}×${size}の列幅が表示サイズへ正規化されていません。`);
  }
  if (size >= 4 && nxn.columnWidths[0] <= nxn.columnWidths[1]) {
    throw new Error(`${size}×${size}の外側列は内側列より太くなければなりません。`);
  }
  const nxnSolved = createSolvedState(nxn);
  const moves = parseAlgorithm(notation);
  const rotated = stateAt(nxnSolved, moves, moves.length, nxn);
  const restored = moves.slice().reverse().map(invertMove)
    .reduce((state, move) => applyMove(state, move, nxn), rotated);
  assertSameState(restored, nxnSolved, `${size}×${size} NxN / wide move`);
});

console.log("2×2〜7×7 notation, slice, wide, and rotation tests passed");
