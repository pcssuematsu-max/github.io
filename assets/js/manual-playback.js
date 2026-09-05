const playbackInterval = 760;
// file:// で開いたときも追加のファイル読み込みをせず、同じ配色を使えるようにする。
const embeddedSprites = {
    f2lRightSlot: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAwIiBoZWlnaHQ9IjkwMCIgdmlld0JveD0iMCAwIDEyMDAgOTAwIj4KICA8IS0tIGN1YmluZy5qcyDjga4gMTLDlzkg44K544OX44Op44Kk44OI44CC54Gw6Imy5Lul5aSW44GuNuODnuOCueOBoOOBkeOBjOWPs+aJi0YyTOOBruWvvuixoeOAgiAtLT4KICA8cmVjdCB3aWR0aD0iMTIwMCIgaGVpZ2h0PSI5MDAiIGZpbGw9IiNiZmJmYmYiLz4KICA8IS0tIOOCqOODg+OCuCBGUjog5omL5YmN77yd44OU44Oz44Kv44CB5Y+z77yd6buE57eRIC0tPgogIDxyZWN0IHg9IjUwMCIgeT0iNDAwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2ZmMDBmZiIvPgogIDxyZWN0IHg9IjYwMCIgeT0iNDAwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzdmZmYwMCIvPgogIDwhLS0g44Kz44O844OK44O8IERSRjog44Kv44Ot44K56Imy77yd5rC06Imy44CB5Y+z77yd6buE57eR44CB5omL5YmN77yd44OU44Oz44KvIC0tPgogIDxyZWN0IHg9IjUwMCIgeT0iMjAwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwN2ZmZiIvPgogIDxyZWN0IHg9IjYwMCIgeT0iMzAwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzdmZmYwMCIvPgogIDxyZWN0IHg9IjUwMCIgeT0iMzAwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2ZmMDBmZiIvPgogIDwhLS0g5L2N572u56K66KqN55So44Gu44K744Oz44K/44O8OiBE77yd5rC06Imy44CBRu+8neODlOODs+OCr+OAgVLvvJ3pu4Tnt5EgLS0+CiAgPHJlY3QgeD0iNDAwIiB5PSIxMDAiIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjMDA3ZmZmIi8+CiAgPHJlY3QgeD0iNDAwIiB5PSI0MDAiIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZmYwMGZmIi8+CiAgPHJlY3QgeD0iNzAwIiB5PSI0MDAiIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjN2ZmZjAwIi8+Cjwvc3ZnPgo=",
};

// SVG のY座標は画像の上から、cubing.jsのスプライト座標は下から数える。
const correctedF2lRightSlotSprite = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">',
    '<rect width="1200" height="900" fill="#bfbfbf"/>',
    '<rect x="500" y="400" width="100" height="100" fill="#ff00ff"/>',
    '<rect x="600" y="400" width="100" height="100" fill="#7fff00"/>',
    '<rect x="500" y="600" width="100" height="100" fill="#007fff"/>',
    '<rect x="600" y="500" width="100" height="100" fill="#7fff00"/>',
    '<rect x="500" y="500" width="100" height="100" fill="#ff00ff"/>',
    '<rect x="400" y="700" width="100" height="100" fill="#007fff"/>',
    '<rect x="400" y="400" width="100" height="100" fill="#ff00ff"/>',
    '<rect x="700" y="400" width="100" height="100" fill="#7fff00"/>',
    '</svg>',
].join("");
embeddedSprites.f2lRightSlot = `data:image/svg+xml,${encodeURIComponent(correctedF2lRightSlotSprite)}`;

function movesFrom(value) {
    return value.trim().split(/\s+/).filter(Boolean);
}

function makeButton(label, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `manual-player-button ${className}`;
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
}

function createManualPlayer(trigger) {
    const moves = movesFrom(trigger.dataset.alg || "");
    const panel = document.createElement("section");
    panel.className = "manual-playback-panel";
    panel.id = trigger.getAttribute("aria-controls");
    panel.setAttribute("aria-label", "手順の3D再生");

    const heading = document.createElement("p");
    heading.className = "manual-player-heading";
    heading.textContent = "3Dでパーツの動きを見る";
    const note = document.createElement("p");
    note.className = "manual-player-note";
    note.textContent = trigger.dataset.focusNote || "今回の手順で扱うパーツだけを色付きで表示しています。";

    const stage = document.createElement("div");
    stage.className = "manual-player-stage";
    const player = document.createElement("twisty-player");
    player.setAttribute("puzzle", "3x3x3");
    player.setAttribute("alg", "");
    player.setAttribute("experimental-setup-alg", trigger.dataset.setup || "");
    player.setAttribute("experimental-stickering", trigger.dataset.stickering || "full");
    if (trigger.dataset.sprite) {
        const sprite = embeddedSprites[trigger.dataset.sprite] || trigger.dataset.sprite;
        player.setAttribute("experimental-sprite", sprite);
    }
    player.setAttribute("background", "none");
    player.setAttribute("hint-facelets", "none");
    player.setAttribute("control-panel", "none");
    player.setAttribute("experimental-drag-input", "auto");
    stage.appendChild(player);

    const controls = document.createElement("div");
    controls.className = "manual-player-controls";
    const progress = document.createElement("div");
    progress.className = "manual-player-progress";
    const status = document.createElement("span");
    status.className = "manual-player-status";
    const moveList = document.createElement("div");
    moveList.className = "manual-player-moves";
    const moveNodes = moves.map((move) => {
        const node = document.createElement("span");
        node.className = "manual-player-move";
        node.textContent = move;
        moveList.appendChild(node);
        return node;
    });
    progress.append(status, moveList);

    let moveIndex = 0;
    let timerId = null;

    function stopPlayback() {
        if (timerId !== null) {
            window.clearInterval(timerId);
            timerId = null;
        }
    }

    function renderPosition() {
        if (typeof player.pause === "function") player.pause();
        const movesSoFar = moves.slice(0, moveIndex).join(" ");
        // cubing.js がまだカスタム要素を登録していない場合は、属性で渡す。
        // 先にプロパティを書き込むと、後の初期化で setter が呼ばれなくなる。
        if ("alg" in player) player.alg = movesSoFar;
        else player.setAttribute("alg", movesSoFar);
        if (typeof player.jumpToEnd === "function") player.jumpToEnd();
        moveNodes.forEach((node, index) => node.classList.toggle("is-active", index === moveIndex - 1));
        status.textContent = moveIndex === 0
            ? `開始位置 / ${moves.length}手`
            : moveIndex === moves.length
                ? "再生完了"
                : `${moveIndex} / ${moves.length} 手目`;
    }

    function nextMove() {
        if (moveIndex >= moves.length) {
            stopPlayback();
            return;
        }
        moveIndex += 1;
        renderPosition();
        if (moveIndex >= moves.length) stopPlayback();
    }

    controls.append(
        makeButton("← 戻る", "", () => {
            stopPlayback();
            moveIndex = Math.max(0, moveIndex - 1);
            renderPosition();
        }),
        makeButton("再生", "is-play", () => {
            stopPlayback();
            if (moveIndex >= moves.length) moveIndex = 0;
            nextMove();
            timerId = window.setInterval(nextMove, playbackInterval);
        }),
        makeButton("進む →", "", () => {
            stopPlayback();
            nextMove();
        }),
        makeButton("最初から", "", () => {
            stopPlayback();
            moveIndex = 0;
            renderPosition();
        })
    );

    panel.append(heading, note, stage, controls, progress);
    renderPosition();
    return panel;
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".manual-playback-trigger").forEach((trigger) => {
        trigger.addEventListener("click", () => {
            const panelId = trigger.getAttribute("aria-controls");
            const existingPanel = document.getElementById(panelId);
            if (existingPanel) {
                existingPanel.remove();
                trigger.setAttribute("aria-expanded", "false");
                trigger.textContent = "3Dで動きを見る";
                return;
            }

            const panel = createManualPlayer(trigger);
            trigger.insertAdjacentElement("afterend", panel);
            trigger.setAttribute("aria-expanded", "true");
            trigger.textContent = "3D再生を閉じる";
        });
    });
});
