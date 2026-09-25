import { DEFAULT_THEME, createPuzzleViewer } from "./cube3-viewer.js?v=20260925-1";

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

// 教材ページ側が、公開座標のまま色を渡せる4×4の最小例。
// ビューア内部では各指定を物理ステッカーIDへ解決するため、回転後も色は追従する。
const fourByFourTheme = {
  ...DEFAULT_THEME,
  canvasBackground: "#fff6fb",
  cubieColor: "#79726f",
  stickerOverrides: {
    "2D/R/2B@R": "#ff4fa3",
  },
  emphasis: {
    dimOthers: true,
    inactiveColor: "#aab4ba",
  },
};

const teachingSteps = [
  {
    position: 0,
    text: "ピンクの4×4センターステッカーを追いながら、外層と内層の回転を確認します。",
  },
  {
    position: 1,
    text: "Rで外層と一緒に移動します。色は教材ページ側のテーマで決めています。",
  },
  { position: 2, text: "Rwでは右の2層が回ります。物理ステッカーは同じ色のまま追従します。" },
  { position: 3, text: "2Fは前面から2層目だけを回す指定です。" },
  { position: 4, text: "Dの外層回転を経ても、テーマの色指定は変わりません。" },
  { position: 5, text: "3Fで前面から3層目を回します。URL形式や編集UIなしでも教材データを渡せます。" },
];

let viewer;
try {
  viewer = createPuzzleViewer(stage, {
    puzzleId: "cube-4x4",
    algorithm: "R Rw 2F D 3F",
    theme: fourByFourTheme,
    themeId: "embed-4x4-sticker-overrides",
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
