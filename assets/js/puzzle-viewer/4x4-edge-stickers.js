// The flat diagram looks straight at F. Its outer strips are the adjacent
// U/R/D/L stickers of the same wing whose other sticker appears on F.
export const EDGE_WINGS = {
  "top:1": ["U/2L/F@U", "U/2L/F@F"],
  "top:2": ["U/2R/F@U", "U/2R/F@F"],
  "right:1": ["2U/R/F@R", "2U/R/F@F"],
  "right:2": ["2D/R/F@R", "2D/R/F@F"],
  "bottom:1": ["D/2L/F@D", "D/2L/F@F"],
  "bottom:2": ["D/2R/F@D", "D/2R/F@F"],
  "left:1": ["2U/L/F@L", "2U/L/F@F"],
  "left:2": ["2D/L/F@L", "2D/L/F@F"],
};

const EDGE_COLORS = {
  magenta: "#ed00ef",
  lime: "#76f400",
  cyan: "#007fff",
  blue: "#1487ed",
  amber: "#ffbd10",
};

export function edgeOverridesFromDiagram(caseData) {
  if (!caseData || typeof caseData !== "object" || Array.isArray(caseData)) {
    throw new Error("エッジ図の配色を読み取れません。");
  }
  return Object.fromEntries(Object.entries(caseData).flatMap(([position, colors]) => {
    const stickers = EDGE_WINGS[position];
    if (!stickers || !Array.isArray(colors) || colors.length !== 2
      || colors.some((color) => !EDGE_COLORS[color])) {
      throw new Error(`エッジ図の${position}の配色を読み取れません。`);
    }
    return stickers.map((sticker, index) => [sticker, EDGE_COLORS[colors[index]]]);
  }));
}

// Keep centers in their normal face colors even when non-target wings are
// dimmed. These IDs belong to physical center stickers and follow each turn.
export function centerStickerIds(definition) {
  return definition.pieces.filter((piece) => piece.id.startsWith("center-"))
    .flatMap((piece) => Object.keys(piece.stickers).map((face) => `${piece.id}:${face}`));
}
