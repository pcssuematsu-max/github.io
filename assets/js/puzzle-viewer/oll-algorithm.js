import {
  applyMove,
  createCube3Definition,
  createSolvedState,
  invertMove,
  parseAlgorithm,
  stateAt,
  stickerIdFor,
  stickerPoseFor,
} from "./cube3-viewer.js?v=20260925-1";

const definition = createCube3Definition();
const solved = createSolvedState(definition);
const centerStickers = definition.pieces
  .filter((piece) => piece.id.startsWith("center-"))
  .map((piece) => stickerIdFor(piece.id, Object.keys(piece.stickers)[0]));
const solvedCenters = centerSignature(solved);
const rotations = parseAlgorithm("x x' x2 y y' y2 z z' z2");

function centerSignature(state) {
  return centerStickers.map((id) => stickerPoseFor(state, definition, id).face).join("");
}

function expandGroups(source) {
  const compact = String(source || "").replace(/2'/g, "2").replace(/\s+/g, "");
  const tokens = compact.match(/\(|\)|[UDRLFBMESxyzudrlfb]w?(?:2|')?|\d+/g) || [];
  if (tokens.join("") !== compact) throw new Error(`手順の記法を読み取れません: ${source}`);
  let index = 0;

  function readGroup(nested) {
    const moves = [];
    while (index < tokens.length) {
      const token = tokens[index++];
      if (token === ")") {
        if (!nested) throw new Error("手順に対応しない閉じ括弧があります。");
        return moves;
      }
      if (token === "(") {
        const group = readGroup(true);
        const repeat = /^\d+$/.test(tokens[index] || "") ? Number(tokens[index++]) : 1;
        if (repeat < 1 || repeat > 20) throw new Error("括弧の繰り返し回数が不正です。");
        for (let count = 0; count < repeat; count += 1) moves.push(...group);
      } else if (/^\d+$/.test(token)) {
        throw new Error("括弧の外に繰り返し回数があります。");
      } else {
        moves.push(token);
      }
    }
    if (nested) throw new Error("手順の括弧が閉じられていません。");
    return moves;
  }

  return readGroup(false);
}

function restoreCenterOrientation(moves) {
  const after = stateAt(solved, moves, moves.length, definition);
  if (centerSignature(after) === solvedCenters) return moves;
  const queue = [{ state: after, correction: [] }];
  const seen = new Set([centerSignature(after)]);

  for (let index = 0; index < queue.length; index += 1) {
    const { state, correction } = queue[index];
    for (const rotation of rotations) {
      const next = applyMove(state, rotation, definition);
      const signature = centerSignature(next);
      if (seen.has(signature)) continue;
      const nextCorrection = [...correction, rotation];
      if (signature === solvedCenters) return [...moves, ...nextCorrection];
      seen.add(signature);
      queue.push({ state: next, correction: nextCorrection });
    }
  }
  throw new Error("手順の後にキューブの向きを元に戻せません。");
}

export function parseOllAlgorithm(source) {
  const moves = parseAlgorithm(expandGroups(source).join(" "));
  return restoreCenterOrientation(moves);
}

export function inverseOllSetup(moves) {
  return moves.slice().reverse().map(invertMove).map((move) => move.token).join(" ");
}

// The old OLL sprite colored solved U stickers and the lower two layers,
// leaving every other sticker of a last-layer piece neutral gray.
export function ollStickerOverrides(gray = "#bfbfbf") {
  return Object.fromEntries(definition.pieces
    .filter((piece) => definition.slotsById[piece.homeSlotId].position[1] === 1)
    .flatMap((piece) => Object.keys(piece.stickers)
      .filter((face) => face !== "U")
      .map((face) => [stickerIdFor(piece.id, face), gray])));
}
