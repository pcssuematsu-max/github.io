import { DEFAULT_THEME, createCubeNDefinition, createPuzzleViewer, invertMove, parseAlgorithm } from "./cube3-viewer.js?v=20260925-1";
import { centerStickerIds, edgeOverridesFromDiagram } from "./4x4-edge-stickers.js?v=20261001-2";

// This manual uses lower-case r/u for a single inner layer. The shared viewer
// reserves lower-case notation for wide moves, so translate only at this page
// boundary to the viewer's unambiguous `2R` / `2U` form.
const MANUAL_INNER_MOVES = { r: "2R", l: "2L", u: "2U", d: "2D", f: "2F", b: "2B" };
const PINK = "#ef6695";
const EDGE_CENTER_STICKERS = centerStickerIds(createCubeNDefinition(4));
const EDGE_ALGORITHMS = {
  "edge-first-ru": "R U' R'",
  "edge-first-fr": "F R' F' R",
  "edge-first-rd": "R' D R",
  "edge-first-fprime": "F' R F R'",
  "edge-first-flip": "R U R' F R' F' R",
  "edge-pair-a": "u' R U' R' u",
  "edge-pair-b": "u' F R' F' R u",
  "edge-pair-c": "u' R U R' F R' F' R u",
  "edge-basic-setup": "u' R U' R' u",
};

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
  ...Object.fromEntries(Object.entries(EDGE_ALGORITHMS).map(([name, algorithm]) => [name, {
    algorithm,
    edgeDiagram: name,
  }])),
  "edge-last-two": {
    algorithm: "Uw' R U R' F R' F' R Uw",
    edgeDiagram: "edge-pair-c",
  },
  "oll-parity": {
    algorithm: "Rw U2 x Rw U2 Rw U2 Rw' U2 Lw U2 Rw' U2 Rw U2 Rw' U2 Rw'",
    inverseSetup: true,
  },
  "pll-parity": {
    algorithm: "r2 U2 r2 Uw2 r2 Uw2 U2",
    inverseSetup: true,
  },
};

// Add a 3D playback directly beneath each F-face diagram. The diagram script
// provides its color data, so its adjacent-face strip and F-face sticker stay
// in sync with the matching 3D wing.
function createViewerCard(caseName) {
  const card = document.createElement("div");
  card.className = "manual-case-3d";
  card.setAttribute("data-4x4-viewer", caseName);
  card.setAttribute("data-lazy-4x4-viewer", "");
  card.innerHTML = `<p class="manual-case-3d-kicker">3Dで動きを確認</p>
    <div class="manual-3d-example-viewer">
      <div class="manual-3d-stage" data-viewer-stage aria-label="4x4手順の3D見本"></div>
      <div class="manual-3d-controls" aria-label="4x4手順の再生操作">
        <p class="manual-3d-status" data-viewer-status aria-live="polite">表示位置に来ると3Dを読み込みます。</p>
        <div><button type="button" data-viewer-action="start" disabled>最初へ</button><button type="button" data-viewer-action="previous" disabled>戻る</button><button type="button" data-viewer-action="play" disabled>再生</button><button type="button" data-viewer-action="next" disabled>進む</button></div>
        <button type="button" class="manual-3d-reset" data-viewer-action="reset" disabled>視点を戻す</button>
      </div>
    </div>`;
  return card;
}

document.querySelectorAll("[data-manual-case^='edge-']").forEach((visual) => {
  const caseName = visual.dataset.manualCase;
  if (!EXAMPLES[caseName]) return;
  const figure = visual.closest("figure");
  if (figure.querySelector(`[data-4x4-viewer='${caseName}']`)) return;
  const card = createViewerCard(caseName);
  figure.insertBefore(card, figure.querySelector("figcaption"));
});

// The last-two-pairs lesson shares C's initial sticker layout, but has its
// own wide-turn algorithm.
document.querySelectorAll("[data-manual-viewer-example]").forEach((mount) => {
  const caseName = mount.dataset.manualViewerExample;
  if (EXAMPLES[caseName]) mount.replaceWith(createViewerCard(caseName));
});

function toViewerNotation(manualAlgorithm) {
  return String(manualAlgorithm || "").trim().split(/\s+/).filter(Boolean).map((token) => {
    const match = /^([rludfb])((?:2)?'?)$/.exec(token);
    if (!match) return token;
    return `${MANUAL_INNER_MOVES[match[1]]}${match[2]}`;
  }).join(" ");
}

function statusText(snapshot, example) {
  if (!snapshot.available) return "このブラウザでは3D見本を表示できません。";
  if (snapshot.position === 0) return `開始状態。全${snapshot.totalMoves}手`;
  const manualMove = example.algorithm.split(/\s+/)[snapshot.position - 1];
  return `${manualMove}まで再生中。${snapshot.position} / ${snapshot.totalMoves}手`;
}

document.querySelectorAll("[data-4x4-viewer]").forEach((root) => {
  const example = EXAMPLES[root.dataset["4x4Viewer"]];
  const stage = root.querySelector("[data-viewer-stage]");
  const status = root.querySelector("[data-viewer-status]");
  const buttons = Object.fromEntries(
    [...root.querySelectorAll("[data-viewer-action]")].map((button) => [button.dataset.viewerAction, button]),
  );
  let viewer;
  let inRange = !root.hasAttribute("data-lazy-4x4-viewer");
  let savedPosition = 0;
  let savedCamera = null;

  function releaseOffscreenViewer() {
    if (inRange || !viewer) return;
    const snapshot = viewer.getSnapshot();
    if (snapshot.isBusy) return;
    savedPosition = snapshot.position;
    savedCamera = snapshot.cameraState;
    viewer.destroy();
    viewer = null;
    status.textContent = "表示位置に来ると3Dを読み込みます。";
    Object.values(buttons).forEach((button) => { button.disabled = true; });
  }

  function render(snapshot) {
    status.textContent = statusText(snapshot, example);
    buttons.play.textContent = snapshot.isPlaying ? "停止" : "再生";
    buttons.start.disabled = !snapshot.available || snapshot.isBusy || snapshot.position === 0;
    buttons.previous.disabled = !snapshot.available || snapshot.isBusy || snapshot.position === 0;
    buttons.next.disabled = !snapshot.available || snapshot.isBusy || snapshot.position >= snapshot.totalMoves;
    buttons.play.disabled = !snapshot.available || snapshot.isBusy || snapshot.totalMoves === 0;
    buttons.reset.disabled = !snapshot.available;
    if (!inRange && !snapshot.isBusy) setTimeout(releaseOffscreenViewer, 0);
  }

  function initializeViewer() {
    if (viewer) return;
    try {
      const edgeDiagram = example.edgeDiagram
        ? document.querySelector(`[data-manual-case="${example.edgeDiagram}"]`)
        : null;
      const overrides = example.edgeDiagram
        ? edgeOverridesFromDiagram(JSON.parse(edgeDiagram?.dataset.edgeColors || "null"))
        : example.stickerOverrides;
      const algorithm = toViewerNotation(example.algorithm);
      const setupAlgorithm = example.inverseSetup
        ? parseAlgorithm(algorithm).reverse().map(invertMove).map((move) => move.token).join(" ")
        : "";
      viewer = createPuzzleViewer(stage, {
        puzzleId: "cube-4x4",
        algorithm,
        setupAlgorithm,
        speed: 0.9,
        themeId: `4x4-beginner-${root.dataset["4x4Viewer"]}`,
        theme: {
          ...DEFAULT_THEME,
          canvasBackground: "#edf8f5",
          cubieColor: "#77766f",
          stickerOverrides: overrides,
          emphasis: {
            dimOthers: true,
            inactiveColor: example.edgeDiagram ? "#9c9c9c" : "#b4c1c0",
            stickerIds: example.edgeDiagram ? EDGE_CENTER_STICKERS : [],
          },
        },
        onChange: render,
      });
      if (savedPosition) viewer.seek(savedPosition);
      if (savedCamera) viewer.setCameraState(savedCamera);
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
    }
  }

  buttons.start.addEventListener("click", () => viewer?.seek(0));
  buttons.previous.addEventListener("click", () => viewer?.stepPrevious());
  buttons.play.addEventListener("click", () => viewer?.play());
  buttons.next.addEventListener("click", () => viewer?.stepNext());
  buttons.reset.addEventListener("click", () => viewer?.resetCamera());
  if (inRange || !window.IntersectionObserver) {
    inRange = true;
    initializeViewer();
  } else {
    const observer = new IntersectionObserver(([entry]) => {
      inRange = entry.isIntersecting;
      if (inRange) initializeViewer();
      else if (viewer) {
        viewer.pause();
        releaseOffscreenViewer();
      }
    }, { rootMargin: "320px 0px" });
    observer.observe(root);
  }
});
