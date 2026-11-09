import { createSkewbViewer, DEFAULT_SKEWB_THEME } from "./skewb-viewer.js?v=20261109-3";
import { parseSkewbAlgorithm } from "./skewb-state.js?v=20261109-3";

const byId = (id) => document.getElementById(`skewb-${id}`);
const stage = byId("stage");
const input = byId("algorithm");
const error = byId("error");
const status = byId("status");
const remaining = byId("remaining");
const tokens = byId("tokens");
const playButton = byId("play");
const params = new URLSearchParams(location.search);
const algorithm = params.get("moves") ?? input.value;
const setup = params.get("setup") ?? "";
let validAlgorithm = algorithm;
let validSetup = setup;

function showError(message) { error.textContent = message; }

try {
  parseSkewbAlgorithm(algorithm);
  parseSkewbAlgorithm(setup);
  input.value = algorithm;
} catch (cause) {
  showError(cause.message);
  validAlgorithm = input.value;
  validSetup = "";
}

let viewer;
try {
  viewer = createSkewbViewer(stage, {
    puzzleId: "skewb",
    algorithm: validAlgorithm,
    setupAlgorithm: validSetup,
    theme: DEFAULT_SKEWB_THEME,
    onChange: render,
  });
} catch (cause) {
  showError(`3Dビューアを起動できませんでした: ${cause.message}`);
}

if (!viewer?.available) {
  byId("fallback").hidden = false;
  stage.append(byId("fallback"));
}
if (viewer) input.value = viewer.getSnapshot().algorithm;

function render(snapshot) {
  const moves = snapshot.algorithm ? snapshot.algorithm.split(" ") : [];
  status.textContent = snapshot.isPlaying ? "再生中" : `現在 ${snapshot.position} / ${snapshot.totalMoves} 手`;
  remaining.textContent = `残り ${snapshot.totalMoves - snapshot.position} 手`;
  playButton.textContent = snapshot.isPlaying ? "停止" : "再生";
  byId("start").disabled = snapshot.isBusy || snapshot.position === 0;
  byId("previous").disabled = snapshot.isBusy || snapshot.position === 0;
  byId("next").disabled = snapshot.isBusy || snapshot.position === snapshot.totalMoves;
  byId("form").querySelector("button").disabled = snapshot.isBusy;
  playButton.disabled = !snapshot.available || (snapshot.isBusy && !snapshot.isPlaying) || (!snapshot.totalMoves && !snapshot.isPlaying);
  byId("quick-moves").querySelectorAll("button").forEach((button) => { button.disabled = snapshot.isBusy; });
  tokens.replaceChildren(...moves.map((move, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `cube3-token${index < snapshot.position ? " is-complete" : ""}${index === snapshot.position - 1 ? " is-current" : ""}`;
    button.textContent = move;
    button.title = `${index + 1}手目まで移動`;
    button.disabled = snapshot.isBusy;
    button.addEventListener("click", () => viewer.seek(index + 1));
    return button;
  }));
}

byId("form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!viewer) return;
  try {
    viewer.pause();
    if (viewer.setAlgorithm(input.value)) showError("");
  } catch (cause) {
    showError(cause.message);
  }
});
byId("start").addEventListener("click", () => viewer?.seek(0));
byId("previous").addEventListener("click", () => viewer?.stepPrevious());
byId("next").addEventListener("click", () => viewer?.stepNext());
playButton.addEventListener("click", () => viewer?.getSnapshot().isPlaying ? viewer.pause() : viewer.play());
byId("speed").addEventListener("change", (event) => viewer?.setSpeed(event.target.value));
byId("reset-view").addEventListener("click", () => viewer?.resetCamera());
byId("quick-moves").addEventListener("click", (event) => {
  const move = event.target.closest("[data-move]")?.dataset.move;
  if (move) viewer?.turn(move);
});
byId("copy-link").addEventListener("click", async () => {
  if (!viewer) return;
  const snapshot = viewer.getSnapshot();
  const url = new URL(location.href);
  url.search = "";
  if (snapshot.algorithm) url.searchParams.set("moves", snapshot.algorithm);
  if (snapshot.setup) url.searchParams.set("setup", snapshot.setup);
  if (snapshot.position) url.searchParams.set("position", snapshot.position);
  try {
    await navigator.clipboard.writeText(url.href);
    byId("share-status").textContent = "現在の手順と位置のリンクをコピーしました。";
  } catch {
    byId("share-status").textContent = "コピーできませんでした。ブラウザの共有機能をお使いください。";
  }
});
if (viewer && params.has("position")) viewer.seek(params.get("position"));
