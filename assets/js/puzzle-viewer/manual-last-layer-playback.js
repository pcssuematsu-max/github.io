import { DEFAULT_THEME, createPuzzleViewer } from "./cube3-viewer.js?v=20260925-1";
import { inverseOllSetup, ollStickerOverrides, parseOllAlgorithm } from "./oll-algorithm.js";
import { inversePllSetup, parsePllAlgorithm } from "./pll-algorithm.js";

const isOll = document.body.classList.contains("manual-oll");
const headingSelector = isOll ? "h3.subsection[id]" : "h2.section-title[id]";
const faceColors = {
  U: "#f5c400",
  D: "#f5f5f5",
  F: "#d92d2d",
  B: "#f57c00",
  R: "#3d9a4a",
  L: "#1976d2",
};
const theme = {
  ...DEFAULT_THEME,
  stickerColors: faceColors,
  stickerOverrides: isOll ? ollStickerOverrides() : {},
  // Explicit OLL overrides must not dim every other sticker. Keep all six
  // home colors active, then replace only the twelve upper-side stickers.
  emphasis: { ...DEFAULT_THEME.emphasis, stickerFaces: ["U", "D", "F", "B", "R", "L"] },
  canvasBackground: "#f6fafc",
};
const note = isOll
  ? "上面＝黄色、手前＝赤。下二段は通常色、上段は黄色ステッカー以外をグレーで表示します。完成状態から逆手順で開始します。"
  : "上面＝黄色、手前＝赤。完成状態から逆手順で開始します。";

function headingFor(details) {
  let sibling = details.previousElementSibling;
  while (sibling && !sibling.matches(headingSelector)) sibling = sibling.previousElementSibling;
  return sibling;
}

const cases = [...document.querySelectorAll(".manual-oll .details, .manual-pll .details")].flatMap((details) => {
  const heading = headingFor(details);
  const content = details.querySelector(".content");
  if (!heading || !content) return [];
  const formulas = isOll ? [...content.querySelectorAll("p.move-symbol")] : [content.querySelector("p")];
  return formulas.flatMap((formula, index) => {
    const source = formula?.textContent?.trim();
    if (!source) return [];
    const label = `${heading.textContent}${formulas.length > 1 ? `・手順${index + 1}` : ""}`;
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "manual-playback-trigger";
    trigger.textContent = "3Dで動きを見る";
    trigger.setAttribute("aria-label", `${label}を3Dで動かす`);
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", `last-layer-player-${heading.id}-${index + 1}`);
    if (isOll) formula.insertAdjacentElement("afterend", trigger);
    else content.appendChild(trigger);
    return [{ source, label, trigger }];
  });
});

let active = null;

function closeActive() {
  if (!active) return;
  active.viewer?.pause();
  active.viewer?.destroy();
  active.panel.remove();
  active.trigger.textContent = "3Dで動きを見る";
  active.trigger.setAttribute("aria-expanded", "false");
  active = null;
}

function openCase({ source, label, trigger }) {
  const panel = document.createElement("section");
  panel.id = trigger.getAttribute("aria-controls");
  panel.className = "manual-playback-panel last-layer-playback-panel";
  panel.setAttribute("aria-label", `${label}の3D再生`);
  panel.innerHTML = `
    <p class="manual-player-heading" data-last-layer-heading></p>
    <p class="manual-player-note" data-last-layer-note></p>
    <div class="manual-player-stage last-layer-playback-stage" data-last-layer-stage></div>
    <div class="manual-player-controls" aria-label="再生操作">
      <button type="button" class="manual-player-button" data-last-layer-action="start">最初へ</button>
      <button type="button" class="manual-player-button" data-last-layer-action="previous">戻る</button>
      <button type="button" class="manual-player-button is-play" data-last-layer-action="play">再生</button>
      <button type="button" class="manual-player-button" data-last-layer-action="next">進む</button>
    </div>
    <div class="last-layer-playback-tools">
      <button type="button" class="manual-player-button" data-last-layer-action="reset">視点を戻す</button>
      <label class="last-layer-playback-speed">再生速度
        <select data-last-layer-speed>
          <option value="0.75">ゆっくり</option>
          <option value="1" selected>標準</option>
          <option value="1.5">速め</option>
          <option value="2">2倍</option>
        </select>
      </label>
    </div>
    <div class="manual-player-progress">
      <span class="manual-player-status" data-last-layer-status aria-live="polite"></span>
      <div class="manual-player-moves" data-last-layer-moves></div>
    </div>`;
  panel.querySelector("[data-last-layer-heading]").textContent = `3Dで手順を見る：${label}`;
  panel.querySelector("[data-last-layer-note]").textContent = note;
  const stage = panel.querySelector("[data-last-layer-stage]");
  stage.setAttribute("aria-label", `${label}の3Dモデル`);
  trigger.insertAdjacentElement("afterend", panel);
  trigger.textContent = "3D再生を閉じる";
  trigger.setAttribute("aria-expanded", "true");

  const status = panel.querySelector("[data-last-layer-status]");
  const moveList = panel.querySelector("[data-last-layer-moves]");
  const buttons = Object.fromEntries([...panel.querySelectorAll("[data-last-layer-action]")]
    .map((button) => [button.dataset.lastLayerAction, button]));
  const speed = panel.querySelector("[data-last-layer-speed]");
  let viewer = null;
  active = { trigger, panel, viewer };

  try {
    const moves = isOll ? parseOllAlgorithm(source) : parsePllAlgorithm(source);
    const algorithm = moves.map((move) => move.token).join(" ");
    const moveNodes = moves.map((move) => {
      const node = document.createElement("span");
      node.className = "manual-player-move";
      node.textContent = move.token;
      moveList.appendChild(node);
      return node;
    });

    function render(snapshot) {
      status.textContent = !snapshot.available
        ? "このブラウザでは3D表示を利用できません。"
        : snapshot.position === snapshot.totalMoves
          ? `再生完了 / ${snapshot.totalMoves}手`
          : `${snapshot.position} / ${snapshot.totalMoves}手`;
      moveNodes.forEach((node, index) => {
        node.classList.toggle("is-complete", index < snapshot.position);
        node.classList.toggle("is-active", index === snapshot.position);
      });
      buttons.start.disabled = !snapshot.available || snapshot.isBusy || snapshot.position === 0;
      buttons.previous.disabled = !snapshot.available || snapshot.isBusy || snapshot.position === 0;
      buttons.next.disabled = !snapshot.available || snapshot.isBusy || snapshot.position >= snapshot.totalMoves;
      buttons.play.disabled = !snapshot.available || (snapshot.isBusy && !snapshot.isPlaying) || !snapshot.totalMoves;
      buttons.play.textContent = snapshot.isPlaying ? "停止" : "再生";
      buttons.reset.disabled = !snapshot.available;
      speed.disabled = !snapshot.available;
      cases.forEach(({ trigger: other }) => { other.disabled = snapshot.isBusy; });
    }

    buttons.start.addEventListener("click", () => viewer?.seek(0));
    buttons.previous.addEventListener("click", () => viewer?.stepPrevious());
    buttons.play.addEventListener("click", () => {
      if (viewer?.getSnapshot().isPlaying) viewer.pause();
      else viewer?.play();
    });
    buttons.next.addEventListener("click", () => viewer?.stepNext());
    buttons.reset.addEventListener("click", () => viewer?.resetCamera());
    speed.addEventListener("change", () => viewer?.setSpeed(Number(speed.value)));

    viewer = createPuzzleViewer(stage, {
      puzzleId: "cube-3x3",
      algorithm,
      setupAlgorithm: isOll ? inverseOllSetup(moves) : inversePllSetup(moves),
      speed: 1,
      themeId: isOll ? "oll-manual" : "pll-manual",
      theme,
      onChange: render,
    });
    active.viewer = viewer;
  } catch (error) {
    stage.replaceChildren(Object.assign(document.createElement("p"), {
      className: "last-layer-playback-fallback",
      textContent: `3Dビューアを起動できませんでした: ${error.message}`,
    }));
    status.textContent = "この手順の3D再生は現在利用できません。";
    Object.values(buttons).forEach((button) => { button.disabled = true; });
    speed.disabled = true;
  }
}

cases.forEach((item) => {
  item.trigger.addEventListener("click", () => {
    const sameCase = active?.trigger === item.trigger;
    closeActive();
    if (!sameCase) openCase(item);
  });
});
