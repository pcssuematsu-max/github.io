import { readFileSync } from "node:fs";
import {
  applyMove,
  createCube3Definition,
  createCubeNDefinition,
  createSolvedState,
  invertMove,
  parseAlgorithm,
  parseStickerCoordinate,
  resolveStickerCoordinate,
  resolveStickerOverrides,
  stickerIdFor,
  stickerPoseFor,
  stateAt,
  validateCube3Definition,
  validateCubeNDefinition,
} from "../assets/js/puzzle-viewer/cube3-viewer.js";
import { EDGE_WINGS, centerStickerIds, edgeOverridesFromDiagram } from "../assets/js/puzzle-viewer/4x4-edge-stickers.js";
import { inversePllSetup, parsePllAlgorithm } from "../assets/js/puzzle-viewer/pll-algorithm.js";
import { inverseOllSetup, ollStickerOverrides, parseOllAlgorithm } from "../assets/js/puzzle-viewer/oll-algorithm.js";

const definition = createCube3Definition();
validateCube3Definition(definition);
const solved = createSolvedState(definition);

const pllPage = readFileSync(new URL("../PLL.html", import.meta.url), "utf8");
if (pllPage.includes("assets/js/last-layer-playback.js") || pllPage.includes("assets/vendor/cubing/twisty.js")) {
  throw new Error("PLLページに旧ビューアの読み込みが残っています。");
}
if (!pllPage.includes("puzzle-viewer/manual-last-layer-playback.js")) {
  throw new Error("PLLページに共通の新ビューアが読み込まれていません。");
}
const pllCases = [...pllPage.matchAll(/<h2 class\s*=\s*"section-title" id\s*=\s*"([^"]+)">[^<]+<\/h2>[\s\S]*?<div class\s*=\s*"content">\s*<p>([^<]+)<\/p>/g)];
if (pllCases.length !== 21 || new Set(pllCases.map((match) => match[1])).size !== 21) {
  throw new Error(`PLLの21手順を読み取れません: ${pllCases.length}件`);
}
for (const [, id, source] of pllCases) {
  const moves = parsePllAlgorithm(source);
  if (!moves.length) throw new Error(`${id}: 手順が空です。`);
  const inverse = parseAlgorithm(inversePllSetup(moves));
  const setup = stateAt(solved, inverse, inverse.length, definition);
  const finished = stateAt(setup, moves, moves.length, definition);
  if (JSON.stringify(setup) === JSON.stringify(solved)) {
    throw new Error(`${id}: 逆セットアップが完成状態のままです。`);
  }
  if (JSON.stringify(finished) !== JSON.stringify(solved)) {
    throw new Error(`${id}: 再生しても完成状態に戻りません。`);
  }
  for (const piece of definition.pieces.filter((candidate) => candidate.id.startsWith("center-"))) {
    const face = Object.keys(piece.stickers)[0];
    if (stickerPoseFor(setup, definition, stickerIdFor(piece.id, face)).face !== face) {
      throw new Error(`${id}: 初期状態の${face}面センター色が変わっています。`);
    }
  }
}
if (parsePllAlgorithm(pllCases[0][2]).length !== 14) {
  throw new Error("Tパームの手数が変わりました。");
}
const jPermA = parsePllAlgorithm(pllCases.find((match) => match[1] === "J-Perm-a")[2]);
if (jPermA[1].token !== "R2" || jPermA.at(-1).token !== "x'") {
  throw new Error("Jパームaの180度回転と向き戻しを解釈できません。");
}

const ollPage = readFileSync(new URL("../OLL.html", import.meta.url), "utf8");
if (ollPage.includes("assets/js/last-layer-playback.js") || ollPage.includes("assets/vendor/cubing/twisty.js")) {
  throw new Error("OLLページに旧ビューアの読み込みが残っています。");
}
if (!ollPage.includes("puzzle-viewer/manual-last-layer-playback.js")) {
  throw new Error("OLLページに共通の新ビューアが読み込まれていません。");
}
const ollCases = [...ollPage.matchAll(/<h3 class="subsection" id\s*=\s*"([^"]+)">[^<]+<\/h3>[\s\S]*?<details class\s*=\s*"details">[\s\S]*?<div class\s*=\s*"content">([\s\S]*?)<\/div>/g)];
const ollFormulas = ollCases.flatMap(([, id, content]) => [...content.matchAll(/<p class\s*=\s*"move-symbol">([^<]+)<\/p>/g)]
  .map((match) => ({ id, source: match[1] })));
if (ollCases.length !== 57 || ollFormulas.length !== 67) {
  throw new Error(`OLLの57ケース・67手順を読み取れません: ${ollCases.length}ケース・${ollFormulas.length}手順`);
}
const ollGrayStickers = ollStickerOverrides();
if (Object.keys(ollGrayStickers).length !== 12) {
  throw new Error("OLLの上段側面12枚だけをグレーにできません。");
}
for (const { id, source } of ollFormulas) {
  const moves = parseOllAlgorithm(source);
  const inverse = parseAlgorithm(inverseOllSetup(moves));
  const setup = stateAt(solved, inverse, inverse.length, definition);
  const finished = stateAt(setup, moves, moves.length, definition);
  if (!moves.length || JSON.stringify(finished) !== JSON.stringify(solved)) {
    throw new Error(`${id}: OLLの逆セットアップと再生に失敗しました。`);
  }
  const upperCenter = definition.pieces.find((piece) => piece.id === "center-U");
  if (stickerPoseFor(setup, definition, stickerIdFor(upperCenter.id, "U")).face !== "U") {
    throw new Error(`${id}: 初期状態の上面が黄色ではありません。`);
  }
  for (const piece of definition.pieces.filter((candidate) => definition.slotsById[candidate.homeSlotId].position[1] < 1)) {
    for (const face of Object.keys(piece.stickers)) {
      const pose = stickerPoseFor(setup, definition, stickerIdFor(piece.id, face));
      if (pose.slotId !== piece.homeSlotId || pose.face !== face) {
        throw new Error(`${id}: 下二段の${piece.id}:${face}が揃っていません。`);
      }
    }
  }
}

if (stickerIdFor("corner-DFR", "F") !== "corner-DFR:F") {
  throw new Error("注目ステッカー用の安定IDを生成できません。");
}
if (new Set(definition.pieces.flatMap((piece) => Object.keys(piece.stickers)
  .map((face) => stickerIdFor(piece.id, face)))).size !== 54) {
  throw new Error("3×3の注目ステッカーIDは54個すべて一意である必要があります。");
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`);
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

const portfolioSetup = "U' L' 3F2 2F2 R2 U2 3F2 2F2 U2 R2 3F2 2F2 U2 F U2 F' U2 D2 R F R' D2 L B' L B L' U 2U F 3D' F' 2U' F 3D F'";
const portfolioDefinition = createCubeNDefinition(7);
const portfolioSolved = createSolvedState(portfolioDefinition);
const portfolioScrambled = stateAt(
  portfolioSolved,
  parseAlgorithm(portfolioSetup),
  parseAlgorithm(portfolioSetup).length,
  portfolioDefinition,
);
if (JSON.stringify(portfolioScrambled) === JSON.stringify(portfolioSolved)) {
  throw new Error("Portfolio の開始スクランブルが7×7の状態へ反映されません。");
}

const coordinateCube4 = createCubeNDefinition(4);
const coordinateCube7 = createCubeNDefinition(7);
const edgeCenterIds = centerStickerIds(coordinateCube4);
assertEqual(edgeCenterIds.length, 24, "4×4の標準色センターステッカー数");
assertEqual(new Set(edgeCenterIds).size, 24, "4×4のセンターステッカーIDの一意性");
for (const face of "UDRLFB") {
  assertEqual(edgeCenterIds.filter((id) => id.endsWith(`:${face}`)).length, 4, `${face}面のセンター4枚`);
}
for (const [position, [outer, front]] of Object.entries(EDGE_WINGS)) {
  const outerSticker = resolveStickerCoordinate(coordinateCube4, outer);
  const frontSticker = resolveStickerCoordinate(coordinateCube4, front);
  assertEqual(outerSticker.pieceId, frontSticker.pieceId, `${position} は同じウイングの2色`);
  assertEqual(frontSticker.stickerFace, "F", `${position} のF面ステッカー`);
  if (outerSticker.stickerId === frontSticker.stickerId) {
    throw new Error(`${position} の2色が同じステッカーを指しています。`);
  }
}
const edgeDiagramOverrides = edgeOverridesFromDiagram({
  "left:1": ["magenta", "lime"],
  "top:2": ["blue", "amber"],
});
assertEqual(edgeDiagramOverrides["2U/L/F@L"], "#ed00ef", "F面左帯の着色");
assertEqual(edgeDiagramOverrides["2U/L/F@F"], "#76f400", "F面左ウイングの着色");
assertEqual(edgeDiagramOverrides["U/2R/F@U"], "#1487ed", "F面上帯の着色");
assertEqual(edgeDiagramOverrides["U/2R/F@F"], "#ffbd10", "F面上ウイングの着色");
const basicEdgeOverrides = edgeOverridesFromDiagram({
  "top:1": ["lime", "lime"],
  "top:2": ["cyan", "cyan"],
});
assertEqual(basicEdgeOverrides["U/2L/F@F"], "#76f400", "未完成UF左ウイング");
assertEqual(basicEdgeOverrides["U/2R/F@F"], "#007fff", "未完成UF右ウイング");
assertEqual(basicEdgeOverrides["U/2R/F@U"], "#007fff", "未完成UF右ウイングのU面");
const lastTwoMoves = parseAlgorithm("Uw' R U R' F R' F' R Uw");
assertEqual(lastTwoMoves.length, 9, "最後の2ペアのUw手順の手数");
assertEqual(lastTwoMoves[0].token, "Uw'", "最後の2ペアの開始ワイドターン");
assertEqual(lastTwoMoves.at(-1).token, "Uw", "最後の2ペアの終了ワイドターン");
stateAt(createSolvedState(coordinateCube4), lastTwoMoves, lastTwoMoves.length, coordinateCube4);
const parityAlgorithms = {
  OLL: "Rw U2 x Rw U2 Rw U2 Rw' U2 Lw U2 Rw' U2 Rw U2 Rw' U2 Rw'",
  PLL: "2R2 U2 2R2 Uw2 2R2 Uw2 U2",
};
for (const [name, algorithm] of Object.entries(parityAlgorithms)) {
  const moves = parseAlgorithm(algorithm);
  const inverse = moves.slice().reverse().map(invertMove);
  const solved4 = createSolvedState(coordinateCube4);
  const setup = stateAt(solved4, inverse, inverse.length, coordinateCube4);
  const result = stateAt(setup, moves, moves.length, coordinateCube4);
  assertSameState(result, solved4, `${name}パリティの逆手順セットアップと再生`);
  if (JSON.stringify(setup) === JSON.stringify(solved4)) {
    throw new Error(`${name}パリティの開始状態が完成状態のままです。`);
  }
}
assertEqual(
  resolveStickerCoordinate(coordinateCube4, "U/2R/2F@U").stickerId,
  "center-1,3,1:U",
  "4×4 center coordinate",
);
assertEqual(
  resolveStickerCoordinate(coordinateCube7, "U/2R/3F@U").stickerId,
  "center-4,6,2:U",
  "7×7 center coordinate",
);
assertEqual(
  resolveStickerCoordinate(coordinateCube7, "U/R/2B@U").stickerId,
  "edge-6,6,-4:U",
  "7×7 wing U sticker",
);
assertEqual(
  resolveStickerCoordinate(coordinateCube7, "U/R/2B@R").stickerId,
  "edge-6,6,-4:R",
  "7×7 wing R sticker",
);
assertEqual(
  resolveStickerCoordinate(coordinateCube7, { solvedAt: ["U", "L", "F"], stickerFace: "U" }).stickerId,
  "corner--6,6,6:U",
  "7×7 corner coordinate",
);
assertEqual(
  parseStickerCoordinate("U/2R/3F@U", 7).layers.join("/"),
  "U/2R/3F",
  "public coordinate parser",
);
const coordinateOverrides = resolveStickerOverrides(coordinateCube4, {
  "U/2R/2F@U": "#ff4fa3",
  "center-1,3,1:U": "#00d98b",
});
assertEqual(
  coordinateOverrides["center-1,3,1:U"],
  "#00d98b",
  "physical override takes the last explicit color",
);
assertEqual(
  resolveStickerOverrides(coordinateCube7, [{ at: "U/R/2B@U", color: "#76c7ff" }])["edge-6,6,-4:U"],
  "#76c7ff",
  "array-form coordinate override",
);

// 4×4教材用の任意着色は、座標ではなく物理ステッカーIDに解決して保持する。
// 外層・wide・内層スライスをまたいでも、同じパーツの同じ面を追い続けられることを確認する。
const trackedStickerId = resolveStickerCoordinate(coordinateCube4, "2D/R/2B@R").stickerId;
const trackingOverrides = resolveStickerOverrides(coordinateCube4, {
  "2D/R/2B@R": "#ff4fa3",
});
assertEqual(trackingOverrides[trackedStickerId], "#ff4fa3", "4×4 tracking override");
[
  "2D/R/2B@R",
  "U/2R/2F@U",
  "U/2L/2F@U",
  "U/R/2F@U",
  "U/2R/F@U",
].forEach((coordinate) => {
  const resolved = resolveStickerCoordinate(coordinateCube4, coordinate);
  assertEqual(
    resolveStickerOverrides(coordinateCube4, { [coordinate]: "#ef6695" })[resolved.stickerId],
    "#ef6695",
    `4×4 manual coordinate ${coordinate}`,
  );
});
const trackingMoves = parseAlgorithm("R Rw 2F D 3F");
let trackingState = createSolvedState(coordinateCube4);
const trackingPoses = [stickerPoseFor(trackingState, coordinateCube4, trackedStickerId)];
for (const move of trackingMoves) {
  trackingState = applyMove(trackingState, move, coordinateCube4);
  trackingPoses.push(stickerPoseFor(trackingState, coordinateCube4, trackedStickerId));
}
trackingPoses.forEach((pose, index) => {
  assertEqual(pose.stickerId, trackedStickerId, `4×4 tracking sticker identity at ${index}`);
  assertEqual(trackingOverrides[pose.stickerId], "#ff4fa3", `4×4 tracking color at ${index}`);
});
for (let index = 1; index < trackingPoses.length; index += 1) {
  if (trackingPoses[index - 1].slotId === trackingPoses[index].slotId) {
    throw new Error(`4×4 tracking move ${trackingMoves[index - 1].token} did not move the selected sticker.`);
  }
}

const centerBarMoves = parseAlgorithm("Rw U Rw'");
const centerBarInitial = createSolvedState(coordinateCube4);
const centerBarFinal = stateAt(centerBarInitial, centerBarMoves, centerBarMoves.length, coordinateCube4);
const centerBarOverrides = resolveStickerOverrides(coordinateCube4, {
  "U/2L/2F@U": "#ef6695",
  "2D/2R/F@F": "#ef6695",
});
const centerBarFirstId = resolveStickerCoordinate(coordinateCube4, "U/2L/2F@U").stickerId;
const centerBarSecondId = resolveStickerCoordinate(coordinateCube4, "2D/2R/F@F").stickerId;
assertEqual(centerBarOverrides[centerBarFirstId], "#ef6695", "center-bar first pink sticker");
assertEqual(centerBarOverrides[centerBarSecondId], "#ef6695", "center-bar second pink sticker");
const centerBarFirstFinal = stickerPoseFor(centerBarFinal, coordinateCube4, centerBarFirstId);
const centerBarSecondFinal = stickerPoseFor(centerBarFinal, coordinateCube4, centerBarSecondId);
assertEqual(centerBarFirstFinal.slotId, "slot--1,3,-1", "center-bar first final slot");
assertEqual(centerBarFirstFinal.face, "U", "center-bar first final face");
assertEqual(centerBarSecondFinal.slotId, "slot--1,3,1", "center-bar second final slot");
assertEqual(centerBarSecondFinal.face, "U", "center-bar second final face");

const centerBarReverseMoves = parseAlgorithm("Rw U' Rw'");
const centerBarReverseFinal = stateAt(
  centerBarInitial,
  centerBarReverseMoves,
  centerBarReverseMoves.length,
  coordinateCube4,
);
const centerBarReverseOverrides = resolveStickerOverrides(coordinateCube4, {
  "U/2L/2B@U": "#ef6695",
  "2U/2R/F@F": "#ef6695",
});
const centerBarReverseFirstId = resolveStickerCoordinate(coordinateCube4, "U/2L/2B@U").stickerId;
const centerBarReverseSecondId = resolveStickerCoordinate(coordinateCube4, "2U/2R/F@F").stickerId;
assertEqual(centerBarReverseOverrides[centerBarReverseFirstId], "#ef6695", "reverse center-bar first pink sticker");
assertEqual(centerBarReverseOverrides[centerBarReverseSecondId], "#ef6695", "reverse center-bar second pink sticker");
const centerBarReverseFirstFinal = stickerPoseFor(centerBarReverseFinal, coordinateCube4, centerBarReverseFirstId);
const centerBarReverseSecondFinal = stickerPoseFor(centerBarReverseFinal, coordinateCube4, centerBarReverseSecondId);
assertEqual(centerBarReverseFirstFinal.slotId, "slot--1,3,1", "reverse center-bar first final slot");
assertEqual(centerBarReverseFirstFinal.face, "U", "reverse center-bar first final face");
assertEqual(centerBarReverseSecondFinal.slotId, "slot--1,3,-1", "reverse center-bar second final slot");
assertEqual(centerBarReverseSecondFinal.face, "U", "reverse center-bar second final face");

[
  ["Rw U2 Rw'", ["U/2L/2B@U", "U/2L/2F@U", "2U/2L/F@F", "2D/2L/F@F"]],
  ["Rw U' Rw'", ["U/2L/2F@U", "2U/2L/F@F", "2D/2L/F@F", "2D/2R/F@F"]],
  ["Rw U Rw'", ["U/2L/2B@U", "2U/2L/F@F", "2U/2R/F@F", "2D/2L/F@F"]],
  ["Rw2 U' Rw2", ["U/2L/2B@U", "D/2R/2F@D"]],
].forEach(([algorithm, coordinates]) => {
  const moves = parseAlgorithm(algorithm);
  const finalState = stateAt(centerBarInitial, moves, moves.length, coordinateCube4);
  const overrides = resolveStickerOverrides(coordinateCube4, Object.fromEntries(
    coordinates.map((coordinate) => [coordinate, "#ef6695"]),
  ));
  coordinates.forEach((coordinate) => {
    const stickerId = resolveStickerCoordinate(coordinateCube4, coordinate).stickerId;
    assertEqual(overrides[stickerId], "#ef6695", `${algorithm} manual center color`);
    if (!stickerPoseFor(finalState, coordinateCube4, stickerId).face) {
      throw new Error(`${algorithm} manual center sticker could not be tracked.`);
    }
  });
});
for (const invalidCoordinate of ["2R/U/3F@U", "U/2R/3F@F", "U/4L/3F@U"]) {
  try {
    resolveStickerCoordinate(coordinateCube7, invalidCoordinate);
    throw new Error(`${invalidCoordinate} should be rejected`);
  } catch (caught) {
    if (String(caught.message).includes("should be rejected")) throw caught;
  }
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

console.log("2×2〜7×7 notation, slice, wide, rotation, and 4×4 sticker tracking tests passed");
