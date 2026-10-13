import { createPuzzleViewer, invertMove, parseAlgorithm } from "./cube3-viewer.js?v=20260925-1";
import { createF2lSlotTheme } from "./f2l-lesson-theme.js";

const cases = [...document.querySelectorAll('.manual-f2l .manual-playback-trigger[data-viewer="custom"]')];
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

function openCase(trigger) {
  const label = trigger.dataset.label || "F2L";
  const sideName = trigger.dataset.slot === "left" ? "左" : "右";
  const showCenters = trigger.dataset.centerless !== "true";
  const panel = document.createElement("section");
  panel.id = trigger.getAttribute("aria-controls");
  panel.className = "manual-playback-panel f2l-playback-panel";
  panel.setAttribute("aria-label", `${label}の3D再生`);
  panel.innerHTML = `
    <p class="manual-player-heading" data-f2l-heading></p>
    <p class="manual-player-note" data-f2l-note></p>
    <div class="manual-player-stage f2l-playback-stage" data-f2l-stage></div>
    <div class="manual-player-controls" aria-label="再生操作">
      <button type="button" class="manual-player-button" data-f2l-action="start">最初へ</button>
      <button type="button" class="manual-player-button" data-f2l-action="previous">戻る</button>
      <button type="button" class="manual-player-button is-play" data-f2l-action="play">再生</button>
      <button type="button" class="manual-player-button" data-f2l-action="next">進む</button>
    </div>
    <div class="f2l-playback-tools">
      <button type="button" class="manual-player-button" data-f2l-action="reset">視点を戻す</button>
      <label class="f2l-playback-speed">再生速度
        <select data-f2l-speed>
          <option value="0.75">ゆっくり</option>
          <option value="1" selected>標準</option>
          <option value="1.5">速め</option>
          <option value="2">2倍</option>
        </select>
      </label>
    </div>
    <div class="manual-player-progress">
      <span class="manual-player-status" data-f2l-status aria-live="polite"></span>
      <div class="manual-player-moves" data-f2l-moves></div>
    </div>`;
  panel.querySelector("[data-f2l-heading]").textContent = `3Dで手順を見る：${label}`;
  panel.querySelector("[data-f2l-note]").textContent = showCenters
    ? `水色＝クロス、ピンク＝手前、黄緑＝${sideName}。グレーは今回追わないステッカーです。色は同じ物理ステッカーを追いかけます。`
    : `水色＝クロス、ピンク＝手前、黄緑＝${sideName}。このケースではセンター色を確定せず、センターと下段エッジの側面はグレーにしています。色は同じ物理ステッカーを追いかけます。`;
  const stage = panel.querySelector("[data-f2l-stage]");
  stage.setAttribute("aria-label", `${label}の3Dモデル`);
  trigger.insertAdjacentElement("afterend", panel);
  trigger.textContent = "3D再生を閉じる";
  trigger.setAttribute("aria-expanded", "true");

  const status = panel.querySelector("[data-f2l-status]");
  const moveList = panel.querySelector("[data-f2l-moves]");
  const buttons = Object.fromEntries([...panel.querySelectorAll("[data-f2l-action]")]
    .map((button) => [button.dataset.f2lAction, button]));
  const speed = panel.querySelector("[data-f2l-speed]");
  const leftCamera = trigger.dataset.slot === "left"
    ? { position: [-5.6, 5.2, 7.4], target: [0, 0, 0] }
    : null;
  let viewer = null;
  active = { trigger, panel, viewer };

  try {
    const moves = parseAlgorithm(trigger.dataset.alg || "");
    if (!moves.length) throw new Error("再生する手順がありません。");
    const setupAlgorithm = trigger.dataset.setup || moves.slice().reverse()
      .map((move) => invertMove(move).token).join(" ");
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
      buttons.play.disabled = !snapshot.available || (snapshot.isBusy && !snapshot.isPlaying);
      buttons.play.textContent = snapshot.isPlaying ? "停止" : "再生";
      buttons.reset.disabled = !snapshot.available;
      speed.disabled = !snapshot.available;
      cases.forEach((item) => { item.disabled = snapshot.isBusy; });
    }

    buttons.start.addEventListener("click", () => viewer?.seek(0));
    buttons.previous.addEventListener("click", () => viewer?.stepPrevious());
    buttons.play.addEventListener("click", () => {
      if (viewer?.getSnapshot().isPlaying) viewer.pause();
      else viewer?.play();
    });
    buttons.next.addEventListener("click", () => viewer?.stepNext());
    buttons.reset.addEventListener("click", () => {
      if (leftCamera) viewer?.setCameraState(leftCamera);
      else viewer?.resetCamera();
    });
    speed.addEventListener("change", () => viewer?.setSpeed(Number(speed.value)));

    viewer = createPuzzleViewer(stage, {
      puzzleId: "cube-3x3",
      algorithm: moves.map((move) => move.token).join(" "),
      setupAlgorithm,
      themeId: `f2l-${trigger.dataset.slot}-slot`,
      theme: createF2lSlotTheme(trigger.dataset.slot, { showCenters }),
      onChange: render,
    });
    active.viewer = viewer;
    if (leftCamera) viewer.setCameraState(leftCamera);
    if (!viewer.available) {
      stage.replaceChildren(Object.assign(document.createElement("p"), {
        className: "f2l-playback-fallback",
        textContent: "このブラウザでは3D表示を利用できません。",
      }));
    }
  } catch (error) {
    stage.replaceChildren(Object.assign(document.createElement("p"), {
      className: "f2l-playback-fallback",
      textContent: `3Dビューアを起動できませんでした: ${error.message}`,
    }));
    status.textContent = "この手順の3D再生は現在利用できません。";
    Object.values(buttons).forEach((button) => { button.disabled = true; });
    speed.disabled = true;
  }
}

cases.forEach((trigger) => {
  trigger.addEventListener("click", () => {
    const sameCase = active?.trigger === trigger;
    closeActive();
    if (!sameCase) openCase(trigger);
  });
});
