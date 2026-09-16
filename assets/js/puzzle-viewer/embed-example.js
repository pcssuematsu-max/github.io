import { DEFAULT_THEME, createPuzzleViewer } from "./cube3-viewer.js?v=20260916-11";

const stage = document.querySelector("#embed-cube-stage");
const fallback = document.querySelector("#embed-fallback");
const fallbackMessage = fallback.textContent;
const note = document.querySelector("#embed-note");
const status = document.querySelector("#embed-status");
const controls = {
  start: document.querySelector("#embed-start"),
  previous: document.querySelector("#embed-previous"),
  play: document.querySelector("#embed-play"),
  next: document.querySelector("#embed-next"),
  resetView: document.querySelector("#embed-reset-view"),
};

const focusedCorner = {
  stickerIds: ["corner-UFR:U", "corner-UFR:F", "corner-UFR:R"],
  colors: {
    "corner-UFR:U": "#ff4fa4",
    "corner-UFR:F": "#ff4fa4",
    "corner-UFR:R": "#ff4fa4",
  },
  inactiveColor: "#aab4ba",
  dimOthers: true,
};

const teachingSteps = [
  {
    position: 0,
    text: "ピンクのコーナーを追いながら、右面を回す準備をします。",
    emphasis: focusedCorner,
  },
  {
    position: 1,
    text: "Rで注目コーナーが右層と一緒に移動します。色はページ側のテーマで決めています。",
    emphasis: focusedCorner,
  },
  { position: 2, text: "Uで上層を合わせます。注目ステッカーは物理パーツに追従します。", emphasis: focusedCorner },
  { position: 3, text: "R'で右層を戻し、最初に注目したコーナーの変化を確認します。", emphasis: focusedCorner },
  { position: 4, text: "U'で完了です。教材データは手順の位置ごとに差し替えられます。", emphasis: focusedCorner },
];

let viewer;
try {
  viewer = createPuzzleViewer(stage, {
    puzzleId: "cube-3x3",
    setupAlgorithm: "F R U",
    algorithm: "R U R' U'",
    theme: {
      ...DEFAULT_THEME,
      canvasBackground: "#fff6fb",
      cubieColor: "#79726f",
    },
    themeId: "embed-example",
    teachingSteps,
    onChange: render,
  });
} catch (caught) {
  stage.replaceChildren(fallback);
  fallback.hidden = false;
  fallback.textContent = `3Dビューアを起動できませんでした: ${caught.message}`;
  note.textContent = fallbackMessage;
  Object.values(controls).forEach((control) => { control.disabled = true; });
}

function render(snapshot) {
  const current = snapshot.position === 0 ? "開始状態" : `現在の手: ${snapshot.currentMove}`;
  note.textContent = snapshot.teaching?.text || "この位置には教材メモを設定していません。";
  status.textContent = `${current}。${snapshot.position}手目 / ${snapshot.totalMoves}手中。`;
  controls.play.textContent = snapshot.isPlaying ? "停止" : "再生";
  controls.start.disabled = !snapshot.available || snapshot.isBusy || snapshot.position === 0;
  controls.previous.disabled = !snapshot.available || snapshot.isBusy || snapshot.position === 0;
  controls.next.disabled = !snapshot.available || snapshot.isBusy || snapshot.position >= snapshot.totalMoves;
  controls.play.disabled = !snapshot.available || snapshot.isBusy || snapshot.totalMoves === 0;
}

if (!viewer?.available) {
  stage.replaceChildren(fallback);
  fallback.hidden = false;
}
controls.start.addEventListener("click", () => viewer.seek(0));
controls.previous.addEventListener("click", () => viewer.stepPrevious());
controls.play.addEventListener("click", () => viewer.play());
controls.next.addEventListener("click", () => viewer.stepNext());
controls.resetView.addEventListener("click", () => viewer.resetCamera());
