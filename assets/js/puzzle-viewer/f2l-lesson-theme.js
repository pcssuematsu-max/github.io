import { DEFAULT_THEME } from "./cube3-viewer.js?v=20260925-1";

export const F2L_PALETTE = Object.freeze({
  cross: "#007fff",
  front: "#ff00ff",
  side: "#7fff00",
  inactive: "#bfbfbf",
});

// These are the physical stickers highlighted by the old right/left-slot
// sprite: the pair, the two adjacent cross edges, and the three centers.
const SLOT_STICKERS = {
  right: {
    D: ["corner-DFR:D", "edge-DF:D", "edge-DR:D", "center-D:D"],
    F: ["corner-DFR:F", "edge-FR:F", "edge-DF:F", "center-F:F"],
    R: ["corner-DFR:R", "edge-FR:R", "edge-DR:R", "center-R:R"],
  },
  left: {
    D: ["corner-DFL:D", "edge-DF:D", "edge-DL:D", "center-D:D"],
    F: ["corner-DFL:F", "edge-FL:F", "edge-DF:F", "center-F:F"],
    L: ["corner-DFL:L", "edge-FL:L", "edge-DL:L", "center-L:L"],
  },
};

export function createF2lSlotTheme(side, { showCenters = true } = {}) {
  const stickers = SLOT_STICKERS[side];
  if (!stickers) throw new Error(`F2Lスロットの向きが不正です: ${side}`);
  const sideFace = side === "right" ? "R" : "L";
  const colors = { D: F2L_PALETTE.cross, F: F2L_PALETTE.front, [sideFace]: F2L_PALETTE.side };
  const isPairOrCross = (id) => id.startsWith("corner-")
    || id.startsWith(`edge-F${sideFace}:`)
    || (id.startsWith("edge-D") && id.endsWith(":D"));
  return {
    ...DEFAULT_THEME,
    stickerColors: { ...DEFAULT_THEME.stickerColors, ...colors },
    stickerOverrides: Object.fromEntries(Object.entries(stickers).flatMap(([face, ids]) => (
      ids.filter((id) => showCenters || isPairOrCross(id)).map((id) => [id, colors[face]])
    ))),
    emphasis: { ...DEFAULT_THEME.emphasis, dimOthers: true, inactiveColor: F2L_PALETTE.inactive },
    canvasBackground: "#f6fafc",
  };
}
