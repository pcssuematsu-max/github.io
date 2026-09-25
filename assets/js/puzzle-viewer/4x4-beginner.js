import { DEFAULT_THEME, createPuzzleViewer } from "./cube3-viewer.js?v=20260925-1";

// This manual uses lower-case r/u for a single inner layer. The shared viewer
// reserves lower-case notation for wide moves, so translate only at this page
// boundary to the viewer's unambiguous `2R` / `2U` form.
const MANUAL_INNER_MOVES = { r: "2R", l: "2L", u: "2U", d: "2D", f: "2F", b: "2B" };
const PINK = "#ef6695";

// `manual-case-diagrams.js` stacks an U-face grid over an F-face grid. Both
// grids number their cells from top-left; 5, 6, 9, 10 are the four centers.
// Keep the coordinate maps next to the lesson data so each flat highlight
// becomes a highlight on the same face and grid cell in the 3D sample.
const UPPER_CENTER_STICKERS = {
  5: "U/2L/2B@U",
  6: "U/2R/2B@U",
  9: "U/2L/2F@U",
  10: "U/2R/2F@U",
};
const FRONT_CENTER_STICKERS = {
  5: "2U/2L/F@F",
  6: "2U/2R/F@F",
  9: "2D/2L/F@F",
  10: "2D/2R/F@F",
};

function highlightedCenterFaces(upperIndices = [], frontIndices = []) {
  return Object.fromEntries([
    ...upperIndices.map((index) => [UPPER_CENTER_STICKERS[index], PINK]),
    ...frontIndices.map((index) => [FRONT_CENTER_STICKERS[index], PINK]),
  ]);
}

const EXAMPLES = {
  notation: {
    algorithm: "R Rw r",
    stickerOverrides: {},
  },
  "center-make-1": {
    algorithm: "Rw U Rw'",
    stickerOverrides: highlightedCenterFaces([9], [10]),
  },
  "center-make-2": {
    algorithm: "Rw U' Rw'",
    stickerOverrides: highlightedCenterFaces([5], [6]),
  },
  "center-insert": {
    algorithm: "Rw U2 Rw'",
    stickerOverrides: highlightedCenterFaces([5, 9], [5, 9]),
  },
  "center-three-same": {
    algorithm: "Rw U' Rw'",
    stickerOverrides: highlightedCenterFaces([9], [5, 9, 10]),
  },
  "center-single": {
    algorithm: "Rw U Rw'",
    stickerOverrides: highlightedCenterFaces([5], [5, 6, 9]),
  },
  "center-opposite": {
    algorithm: "Rw2 U' Rw2",
    stickerOverrides: {
      "U/2L/2B@U": PINK,
      "D/2R/2F@D": PINK,
    },
  },
  "edge-pair-a": {
    algorithm: "u' R U' R' u",
    stickerOverrides: {
      "U/R/2F@U": "#ef6695",
      "U/2R/F@U": "#a6d94b",
    },
  },
};

function toViewerNotation(manualAlgorithm) {
  return String(manualAlgorithm || "").trim().split(/\s+/).filter(Boolean).map((token) => {
    const match = /^([rludfb])((?:2)?'?)$/.exec(token);
    if (!match) return token;
    return `${MANUAL_INNER_MOVES[match[1]]}${match[2]}`;
  }).join(" ");
}

function statusText(snapshot) {
  if (!snapshot.available) return "このブラウザでは3D見本を表示できません。";
  if (snapshot.position === 0) return `開始状態。全${snapshot.totalMoves}手`;
  return `${snapshot.currentMove}まで再生中。${snapshot.position} / ${snapshot.totalMoves}手`;
}

document.querySelectorAll("[data-4x4-viewer]").forEach((root) => {
  const example = EXAMPLES[root.dataset["4x4Viewer"]];
  const stage = root.querySelector("[data-viewer-stage]");
  const status = root.querySelector("[data-viewer-status]");
  const buttons = Object.fromEntries(
    [...root.querySelectorAll("[data-viewer-action]")].map((button) => [button.dataset.viewerAction, button]),
  );
  let viewer;

  function render(snapshot) {
    status.textContent = statusText(snapshot);
    buttons.play.textContent = snapshot.isPlaying ? "停止" : "再生";
    buttons.start.disabled = !snapshot.available || snapshot.isBusy || snapshot.position === 0;
    buttons.previous.disabled = !snapshot.available || snapshot.isBusy || snapshot.position === 0;
    buttons.next.disabled = !snapshot.available || snapshot.isBusy || snapshot.position >= snapshot.totalMoves;
    buttons.play.disabled = !snapshot.available || snapshot.isBusy || snapshot.totalMoves === 0;
    buttons.reset.disabled = !snapshot.available;
  }

  try {
    viewer = createPuzzleViewer(stage, {
      puzzleId: "cube-4x4",
      algorithm: toViewerNotation(example.algorithm),
      speed: 0.9,
      themeId: `4x4-beginner-${root.dataset["4x4Viewer"]}`,
      theme: {
        ...DEFAULT_THEME,
        canvasBackground: "#edf8f5",
        cubieColor: "#77766f",
        stickerOverrides: example.stickerOverrides,
        emphasis: {
          dimOthers: true,
          inactiveColor: "#b4c1c0",
        },
      },
      onChange: render,
    });
    if (!viewer.available) {
      stage.replaceChildren(Object.assign(document.createElement("p"), {
        className: "cube3-fallback",
        textContent: "このブラウザでは3D表示に必要なWebGLを利用できません。",
      }));
      render(viewer.getSnapshot());
    }
  } catch (caught) {
    stage.replaceChildren(Object.assign(document.createElement("p"), {
      className: "cube3-fallback",
      textContent: `3D見本を起動できませんでした: ${caught.message}`,
    }));
    Object.values(buttons).forEach((button) => { button.disabled = true; });
    status.textContent = "3D見本を起動できませんでした。";
    return;
  }

  buttons.start.addEventListener("click", () => viewer.seek(0));
  buttons.previous.addEventListener("click", () => viewer.stepPrevious());
  buttons.play.addEventListener("click", () => viewer.play());
  buttons.next.addEventListener("click", () => viewer.stepNext());
  buttons.reset.addEventListener("click", () => viewer.resetCamera());
});
