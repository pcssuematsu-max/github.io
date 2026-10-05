import { invertMove, parseAlgorithm } from "./cube3-viewer.js?v=20260925-1";

// In printed PLL notation, a prime on a half-turn changes no physical state.
// Parentheses separate memory chunks; they are not repeated groups on this page.
export function parsePllAlgorithm(source) {
  const notation = String(source || "")
    .replace(/[()]/g, " ")
    .replace(/2'/g, "2")
    .replace(/\s+/g, " ")
    .trim();
  const moves = parseAlgorithm(notation);
  const xTurns = moves.reduce((turns, move) => {
    if (move.base !== "x") return turns;
    return turns + (move.modifier === "2" ? 2 : move.modifier === "'" ? -1 : 1);
  }, 0);
  const remainder = ((xTurns % 4) + 4) % 4;
  const restore = remainder === 1 ? "x'" : remainder === 2 ? "x2" : remainder === 3 ? "x" : "";
  return restore ? [...moves, ...parseAlgorithm(restore)] : moves;
}

export function inversePllSetup(moves) {
  return moves.slice().reverse().map(invertMove).map((move) => move.token).join(" ");
}
