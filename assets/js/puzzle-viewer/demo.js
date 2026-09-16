import { DEFAULT_THEME, createPuzzleViewer } from "./cube3-viewer.js?v=20260916-9";

const SUPPORTED_PUZZLE_IDS = new Set([2, 3, 4, 5, 6, 7].flatMap((size) => [
  `cube-${size}x${size}`, `${size}x${size}`, `${size}x${size}x${size}`,
]));
const stage = document.querySelector("#cube3-stage");
const status = document.querySelector("#cube3-status");
const tokensHost = document.querySelector("#cube3-tokens");
const input = document.querySelector("#cube3-algorithm");
const form = document.querySelector("#cube3-form");
const error = document.querySelector("#cube3-error");
const setupNote = document.querySelector("#cube3-setup-note");
const playButton = document.querySelector("#cube3-play");
const startButton = document.querySelector("#cube3-start");
const previousButton = document.querySelector("#cube3-previous");
const nextButton = document.querySelector("#cube3-next");
const resetViewButton = document.querySelector("#cube3-reset-view");
const copyLinkButton = document.querySelector("#cube3-copy-link");
const shareStatus = document.querySelector("#cube3-share-status");
const speedSelect = document.querySelector("#cube3-speed");
const displaySelect = document.querySelector("#cube3-display");
const themeSelect = document.querySelector("#cube3-theme");
const quickMoves = document.querySelector("#cube3-quick-moves");
const fallback = document.querySelector("#cube3-fallback");
const fallbackMessage = fallback.textContent;

const query = new URLSearchParams(window.location.search);
const requestedPuzzle = query.get("puzzle");
const selectedPuzzle = normalizePuzzleId(requestedPuzzle);
const requestedSetup = query.get("setup") || "";
const requestedAlgorithm = query.get("moves");
const requestedPosition = query.get("position");
const themeFromUrl = query.get("theme");
const requestedTheme = ["focus-front", "f2l-right"].includes(themeFromUrl)
  && (themeFromUrl !== "f2l-right" || selectedPuzzle === "cube-3x3") ? themeFromUrl : "standard";
const requestedCameraState = parseCameraState(query.get("view"));
const initialWarnings = [];
if (requestedPuzzle && !SUPPORTED_PUZZLE_IDS.has(requestedPuzzle)) {
  initialWarnings.push(`「${requestedPuzzle}」はまだ対応していません。3×3を表示しています。`);
}
if (themeFromUrl === "f2l-right" && selectedPuzzle !== "cube-3x3") {
  initialWarnings.push("F2L右スロットの配色例は3×3専用のため、標準の配色を表示しています。");
}
if (query.get("view") && !requestedCameraState) {
  initialWarnings.push("共有された視点を読み取れなかったため、標準の視点を表示しています。");
}
const initialError = initialWarnings.join(" ");

if (requestedAlgorithm !== null) input.value = requestedAlgorithm;
themeSelect.value = requestedTheme;
displaySelect.value = selectedPuzzle;

let viewer;
let lastSnapshot = {
  position: 0, totalMoves: 0, currentMove: null, algorithm: "", setup: "",
  themeId: "standard", cameraState: null, isBusy: false, isPlaying: false, available: false,
};

function setError(message = "") {
  error.textContent = message;
}

function showFallback(message = "") {
  // Renderer setup can fail after it has replaced the fallback node with a
  // canvas. Put the original explanation back so a blank stage is never the
  // only outcome.
  stage.replaceChildren(fallback);
  fallback.hidden = false;
  fallback.textContent = message || fallbackMessage;
  if (message) setError(message);
  quickMoves.querySelectorAll("button").forEach((button) => { button.disabled = true; });
}

function parseCameraState(value) {
  if (!value) return null;
  const values = value.split(",").map(Number);
  if (values.length !== 6 || !values.every(Number.isFinite)) return null;
  const [x, y, z, targetX, targetY, targetZ] = values;
  const distance = Math.hypot(x - targetX, y - targetY, z - targetZ);
  if (distance < 5.4 || distance > 12) return null;
  return { position: [x, y, z], target: [targetX, targetY, targetZ] };
}

function normalizePuzzleId(value) {
  const source = String(value || "cube-3x3").toLowerCase();
  const match = /^(?:cube-)?([2-7])x\1(?:x\1)?$/.exec(source);
  return match ? `cube-${match[1]}x${match[1]}` : "cube-3x3";
}

function serializeCameraState(cameraState) {
  if (!cameraState) return "";
  return [...cameraState.position, ...cameraState.target]
    .map((value) => String(Number(Number(value).toFixed(3))))
    .join(",");
}

function themeFor(themeId) {
  const focusFront = themeId === "focus-front";
  const f2lRightColors = {
    "corner-DFR:D": "#007fff",
    "corner-DFR:F": "#ff00ff",
    "corner-DFR:R": "#7fff00",
    "edge-FR:F": "#ff00ff",
    "edge-FR:R": "#7fff00",
  };
  const f2lRight = themeId === "f2l-right";
  return {
    ...DEFAULT_THEME,
    emphasis: f2lRight ? {
      stickerIds: Object.keys(f2lRightColors),
      colors: f2lRightColors,
      inactiveColor: "#bfbfbf",
      dimOthers: true,
    } : {
      stickerFaces: focusFront ? ["F"] : [],
      dimOthers: focusFront,
    },
  };
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const temporary = document.createElement("textarea");
  temporary.value = value;
  temporary.setAttribute("readonly", "");
  temporary.style.position = "fixed";
  temporary.style.opacity = "0";
  document.body.append(temporary);
  temporary.select();
  const copied = document.execCommand("copy");
  temporary.remove();
  if (!copied) throw new Error("Clipboard unavailable");
}

function updateAddress(snapshot) {
  const next = new URL(window.location.href);
  next.search = "";
  next.searchParams.set("puzzle", snapshot.puzzleId);
  if (snapshot.setup) next.searchParams.set("setup", snapshot.setup);
  if (snapshot.algorithm) next.searchParams.set("moves", snapshot.algorithm);
  if (snapshot.position) next.searchParams.set("position", String(snapshot.position));
  if (snapshot.themeId !== "standard") next.searchParams.set("theme", snapshot.themeId);
  const view = serializeCameraState(snapshot.cameraState);
  if (view) next.searchParams.set("view", view);
  window.history.replaceState(null, "", next);
}

function renderTokens(snapshot) {
  const moves = snapshot.algorithm ? snapshot.algorithm.split(" ") : [];
  tokensHost.replaceChildren(...moves.map((token, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cube3-token";
    if (index < snapshot.position) button.classList.add("is-complete");
    if (index === snapshot.position - 1) button.classList.add("is-current");
    button.textContent = token;
    button.disabled = snapshot.isBusy;
    button.addEventListener("click", () => viewer.seek(index + 1));
    return button;
  }));
}

function render(snapshot) {
  lastSnapshot = snapshot;
  if (document.activeElement !== input) input.value = snapshot.algorithm;
  const current = snapshot.position === 0 ? "開始状態" : `現在の手: ${snapshot.currentMove}`;
  status.textContent = `${current}。${snapshot.position}手目 / ${snapshot.totalMoves}手中。`;
  setupNote.hidden = !snapshot.setup;
  setupNote.textContent = snapshot.setup ? `開始状態に適用済み: ${snapshot.setup}` : "";
  playButton.textContent = snapshot.isPlaying ? "停止" : "再生";
  playButton.disabled = !snapshot.available || snapshot.isBusy || snapshot.totalMoves === 0;
  previousButton.disabled = !snapshot.available || snapshot.isBusy || snapshot.position === 0;
  nextButton.disabled = !snapshot.available || snapshot.isBusy || snapshot.position >= snapshot.totalMoves;
  startButton.disabled = !snapshot.available || snapshot.isBusy || snapshot.position === 0;
  renderTokens(snapshot);
  updateAddress(snapshot);
}

try {
  viewer = createPuzzleViewer(stage, {
    puzzleId: selectedPuzzle,
    algorithm: input.value,
    speed: Number(speedSelect.value),
    theme: themeFor(requestedTheme),
    themeId: requestedTheme,
    cameraState: requestedCameraState,
    onChange: render,
  });
  if (requestedSetup) viewer.setSetupAlgorithm(requestedSetup);
  if (requestedPosition !== null) viewer.seek(Number(requestedPosition));
  if (!viewer.available) {
    showFallback();
  }
  render(viewer.getSnapshot());
  setError(initialError);
} catch (caught) {
  showFallback(`3Dビューアを起動できませんでした: ${caught.message}`);
  playButton.disabled = true;
  previousButton.disabled = true;
  nextButton.disabled = true;
  startButton.disabled = true;
}

function loadAlgorithm(value) {
  try {
    viewer.setAlgorithm(value);
    setError(initialError);
  } catch (caught) {
    setError(caught.message);
  }
}

async function appendMove(token) {
  if (!viewer || lastSnapshot.isBusy) return;
  const before = lastSnapshot.algorithm ? lastSnapshot.algorithm.split(" ") : [];
  const next = [...before.slice(0, lastSnapshot.position), token].join(" ");
  input.value = next;
  loadAlgorithm(next);
  await viewer.stepNext();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  loadAlgorithm(input.value);
});
playButton.addEventListener("click", () => viewer?.play());
previousButton.addEventListener("click", () => viewer?.stepPrevious());
nextButton.addEventListener("click", () => viewer?.stepNext());
startButton.addEventListener("click", () => viewer?.seek(0));
resetViewButton.addEventListener("click", () => viewer?.resetCamera());
copyLinkButton.addEventListener("click", async () => {
  if (viewer) updateAddress(viewer.getSnapshot());
  const link = window.location.href;
  try {
    await copyText(link);
    shareStatus.textContent = "現在の表示へのリンクをコピーしました。";
  } catch (_error) {
    shareStatus.textContent = "コピーできませんでした。アドレスバーからリンクをコピーしてください。";
  }
});
speedSelect.addEventListener("change", () => viewer?.setSpeed(Number(speedSelect.value)));
displaySelect.addEventListener("change", () => {
  const next = new URL(window.location.href);
  next.searchParams.set("puzzle", displaySelect.value);
  next.searchParams.delete("position");
  window.location.assign(next);
});
themeSelect.addEventListener("change", () => {
  viewer?.setTheme(themeFor(themeSelect.value), themeSelect.value);
});
quickMoves.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-move]");
  if (button) appendMove(button.dataset.move);
});
document.addEventListener("keydown", (event) => {
  if (event.target.closest("input, textarea, select, button")) return;
  if (event.code === "Space") { event.preventDefault(); viewer?.play(); }
  if (event.key === "ArrowLeft") { event.preventDefault(); viewer?.stepPrevious(); }
  if (event.key === "ArrowRight") { event.preventDefault(); viewer?.stepNext(); }
});
