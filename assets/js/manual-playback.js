const playbackInterval = 900;
const halfTurnPlaybackInterval = 1500;
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

const f2lLeftSlotSprite = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">',
    '<rect width="1200" height="900" fill="#bfbfbf"/>',
    '<rect x="300" y="400" width="100" height="100" fill="#ff00ff"/>',
    '<rect x="200" y="400" width="100" height="100" fill="#7fff00"/>',
    '<rect x="300" y="600" width="100" height="100" fill="#007fff"/>',
    '<rect x="300" y="500" width="100" height="100" fill="#ff00ff"/>',
    '<rect x="200" y="500" width="100" height="100" fill="#7fff00"/>',
    '<rect x="400" y="700" width="100" height="100" fill="#007fff"/>',
    '<rect x="400" y="400" width="100" height="100" fill="#ff00ff"/>',
    '<rect x="100" y="400" width="100" height="100" fill="#7fff00"/>',
    '</svg>',
].join("");
embeddedSprites.f2lLeftSlot = `data:image/svg+xml,${encodeURIComponent(f2lLeftSlotSprite)}`;

function makeF2lSprite(side, centerColorsKnown) {
    const isRight = side === "right";
    const tiles = [
        // 追いかけるF2Lペア
        isRight ? [500, 400, "#ff00ff"] : [300, 400, "#ff00ff"],
        isRight ? [600, 400, "#7fff00"] : [200, 400, "#7fff00"],
        isRight ? [500, 600, "#007fff"] : [300, 600, "#007fff"],
        isRight ? [600, 500, "#7fff00"] : [200, 500, "#7fff00"],
        isRight ? [500, 500, "#ff00ff"] : [300, 500, "#ff00ff"],
        // 下段クロスの2エッジ：下面は常にクロス色
        [400, 600, "#007fff"],
        isRight ? [500, 700, "#007fff"] : [300, 700, "#007fff"],
    ];

    if (centerColorsKnown) {
        // センター色が確定するケースでは、側面も対応する色で示す。
        tiles.push(
            [400, 700, "#007fff"],
            [400, 400, "#ff00ff"],
            isRight ? [700, 400, "#7fff00"] : [100, 400, "#7fff00"],
            [400, 500, "#ff00ff"],
            isRight ? [700, 500, "#7fff00"] : [100, 500, "#7fff00"],
        );
    }

    const rectangles = tiles.map(([x, y, color]) =>
        `<rect x="${x}" y="${y}" width="100" height="100" fill="${color}"/>`
    );
    const svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">',
        '<rect width="1200" height="900" fill="#bfbfbf"/>',
        ...rectangles,
        '</svg>',
    ].join("");
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// B型以降は、どのセンター色に揃うかが手順だけでは確定しない。
const centerlessDiagrams = new Set([
    "F2L-B1.svg", "F2L-B2.svg", "F2L-G1.svg", "F2L-G2.svg", "F2L-H1.svg", "F2L-H2.svg",
    "F2L-A1.svg", "F2L-A2.svg", "F2L-E1.svg", "F2L-E2.svg", "F2L-F1.svg", "F2L-F2.svg",
    "F2L-A0.svg", "F2L-C1.svg", "F2L-C2.svg", "F2L-D1.svg", "F2L-D2.svg",
]);

embeddedSprites.f2lRightSlot = makeF2lSprite("right", true);
embeddedSprites.f2lLeftSlot = makeF2lSprite("left", true);
embeddedSprites.f2lRightSlotNoCenters = makeF2lSprite("right", false);
embeddedSprites.f2lLeftSlotNoCenters = makeF2lSprite("left", false);

function movesFrom(value) {
    return value.trim().split(/\s+/).filter(Boolean);
}

function algorithmMovesFromText(value) {
    const notation = value.split(/[\u3040-\u30ff\u3400-\u9fff]/, 1)[0];
    return notation.match(/[URFDLB](?:w)?(?:2)?'?/g) || [];
}

function inverseMove(move) {
    if (move.endsWith("2")) return move;
    return move.endsWith("'") ? move.slice(0, -1) : `${move}'`;
}

function setupFor(moves) {
    return moves.slice().reverse().map(inverseMove).join(" ");
}

function slotFor(moves) {
    const notation = moves.join(" ");
    if (notation === "F U F'") return "left";
    return moves.some((move) => move.startsWith("L")) && !moves.some((move) => move.startsWith("R"))
        ? "left"
        : "right";
}

// 手順の逆回転だけでは、図で示す2パーツの位置・向きは決まらない。
// 図から確認できたケースは、図と同じ開始姿勢を明示的に指定する。
// right / left は、同じ図を左右対称のスロットとして見せるための開始姿勢。
const diagramSetups = {
    "F2L-I1.svg": { right: "R U", left: "L' U'" },
    "F2L-I2.svg": { right: "R U", left: "L' U'" },
    "F2L-T1.svg": { right: "R2 U2 F B", left: "F U2 R2 F2" },
    "F2L-T2.svg": { right: "R2 U2 F B", left: "F U2 R2 F2" },
    "F2L-ISp1.svg": { right: "F'", left: "F" },
    "F2L-ISp2.svg": { right: "F'", left: "F" },
    "F2L-ISp3.svg": { right: "R", left: "L'" },
    "F2L-ISp4.svg": { right: "R", left: "L'" },
    "F2L-TSp1.svg": { right: "F' U F", left: "F U' F'" },
    "F2L-TSp2.svg": { right: "F' U F", left: "F U' F'" },
    "F2L-U1.svg": { right: "R F2 L'", left: "D2 R2 L'" },
    "F2L-U2.svg": { right: "R F2 L'", left: "D2 R2 L'" },
    "F2L-J1.svg": { right: "F D F R2 F2", left: "F U B D2 F2" },
    "F2L-J2.svg": { right: "F D F R2 F2", left: "F U B D2 F2" },
    "F2L-K1.svg": { right: "R2 U B U F", left: "F U B2 D' F2" },
    "F2L-K2.svg": { right: "R2 U B U F", left: "F U B2 D' F2" },
    "F2L-L1.svg": { right: "R F D' F2", left: "D L' D' F" },
    "F2L-L2.svg": { right: "R F D' F2", left: "D L' D' F" },
    "F2L-M1.svg": { right: "R F U R", left: "D2 L' B2 U'" },
    "F2L-M2.svg": { right: "R F U R", left: "D2 L' B2 U'" },
    "F2L-N1.svg": { right: "D' R F2", left: "D L' F2" },
    "F2L-N2.svg": { right: "D' R F2", left: "D L' F2" },
    "F2L-B1.svg": { right: "D B2 L2 B2 L2 D' U2", left: "D F R2 F' R2 D' U2" },
    "F2L-B2.svg": { right: "B' R2 B R' U R'", left: "B L2 B' L U' L" },
    "F2L-G1.svg": { right: "D B U B' D'", left: "D' B' U' B D" },
    "F2L-G2.svg": { right: "D B U B' D'", left: "D' B' U' B D" },
    "F2L-H1.svg": { right: "F' R' F R U F U'", left: "F L F' L' U' F' U" },
    "F2L-H2.svg": { right: "F' R' F R U F U'", left: "F L F' L' U' F' U" },
    "F2L-A0.svg": { right: "B' D' R' D' F' D2 B", left: "B D L D F D2 B'" },
    "F2L-A1.svg": { right: "B' D' R D B", left: "B D L' D' B'" },
    "F2L-A2.svg": { right: "B' D' R D B", left: "B D L' D' B'" },
    "F2L-C1.svg": { right: "F' U R' F2 U' R F", left: "F U' L F2 U L' F'" },
    "F2L-C2.svg": { right: "F' R' U F2 R U' F", left: "F L U' F2 L' U F'" },
    "F2L-D1.svg": { right: "F D' L' D L F L' F2", left: "F R U2 R' F' L' U' L" },
    "F2L-D2.svg": { right: "F' R' F R' F' R2 U F", left: "F L F' L F L2 U' F'" },
    "F2L-E1.svg": { right: "F R' F' R2 U R'", left: "F' L F L2 U' L" },
    "F2L-E2.svg": { right: "F R' F' R2 U R'", left: "F' L F L2 U' L" },
    "F2L-F1.svg": { right: "R B U2 B' U R' U", left: "L' B' U2 B U' L U'" },
    "F2L-F2.svg": { right: "R B U2 B' U R' U", left: "L' B' U2 B U' L U'" },
};

function diagramNameFor(content) {
    const diagram = content.parentElement?.previousElementSibling;
    if (diagram?.tagName !== "IMG") return "";
    return diagram.getAttribute("src")?.split("/").pop() || "";
}

function addPlaybackButtons() {
    const note = "図と同じ配色です。水色＝クロス色、ピンク＝手前、黄緑＝横。グレーは今回追わないパーツです。";
    const centerlessNote = "水色＝クロス色、ピンク＝手前、黄緑＝横です。このケースではセンター色を確定できないため、センターと下段エッジの側面はグレーにしています。";
    let number = 0;

    document.querySelectorAll(".details .content").forEach((content) => {
        const sourceText = content.querySelector("p")?.textContent || "";
        const baseAlgorithm = algorithmMovesFromText(sourceText);
        if (!baseAlgorithm.length) return;
        const slot = slotFor(baseAlgorithm);
        const algorithm = baseAlgorithm;
        const diagramName = diagramNameFor(content);
        const centerColorsKnown = !centerlessDiagrams.has(diagramName);
        // B型より前は、手順の逆回転がクロスを保った開始状態になる。
        // B型以降だけは、図のペア配置とクロス固定を両立する個別の開始状態を使う。
        const diagramSetup = centerColorsKnown ? "" : diagramSetups[diagramName]?.[slot];
        const paletteNote = centerColorsKnown ? note : centerlessNote;

        number += 1;
        let trigger = content.querySelector(".manual-playback-trigger");
        if (!trigger) {
            trigger = document.createElement("button");
            trigger.className = "manual-playback-trigger";
            trigger.type = "button";
            trigger.textContent = "3Dで動きを見る";
            content.appendChild(trigger);
        }
        trigger.setAttribute("aria-expanded", "false");
        if (!trigger.getAttribute("aria-controls")) {
            trigger.setAttribute("aria-controls", `f2l-player-${number}`);
        }
        trigger.dataset.alg = algorithm.join(" ");
        trigger.dataset.setup = diagramSetup || setupFor(algorithm);
        trigger.dataset.stickering = "picture";
        trigger.dataset.sprite = centerColorsKnown
            ? slot === "left" ? "f2lLeftSlot" : "f2lRightSlot"
            : slot === "left" ? "f2lLeftSlotNoCenters" : "f2lRightSlotNoCenters";
        trigger.dataset.diagramMatched = diagramSetup ? "true" : "false";
        trigger.dataset.focusNote = content.textContent.includes("I型に帰着") || content.textContent.includes("T型に帰着")
            ? `${paletteNote} ${diagramSetup ? "開始位置は図の配置です。" : "このケースの開始位置は、現在は手順の逆回転から作っています。"} この再生は基本形へ帰着するところまでです。続きの位置・向きは、確認でき次第追加します。`
            : diagramSetup ? `${paletteNote} 開始位置は図の配置です。` : paletteNote;
    });
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
    player.setAttribute("tempo-scale", "0.65");
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
    const baseSetup = trigger.dataset.setup || "";

    function stopPlayback() {
        if (timerId !== null) {
            window.clearTimeout(timerId);
            timerId = null;
        }
        if (typeof player.pause === "function") player.pause();
    }

    function setPlayerAlgorithm(algorithm) {
        // cubing.js がまだカスタム要素を登録していない場合は、属性で渡す。
        // 先にプロパティを書き込むと、後の初期化で setter が呼ばれなくなる。
        if ("alg" in player) player.alg = algorithm;
        else player.setAttribute("alg", algorithm);
    }

    function updateProgress() {
        moveNodes.forEach((node, index) => node.classList.toggle("is-active", index === moveIndex - 1));
        status.textContent = moveIndex === 0
            ? `開始位置 / ${moves.length}手`
            : moveIndex === moves.length
                ? "再生完了"
                : `${moveIndex} / ${moves.length} 手目`;
    }

    function renderPosition() {
        if (typeof player.pause === "function") player.pause();
        player.setAttribute("experimental-setup-alg", baseSetup);
        setPlayerAlgorithm(moves.slice(0, moveIndex).join(" "));
        if (typeof player.jumpToEnd === "function") player.jumpToEnd();
        updateProgress();
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

    function animateNextMove(onFinished) {
        stopPlayback();
        if (moveIndex >= moves.length) {
            onFinished?.();
            return;
        }

        const previousMoves = moves.slice(0, moveIndex).join(" ");
        player.setAttribute("experimental-setup-alg", [baseSetup, previousMoves].filter(Boolean).join(" "));
        const currentMove = moves[moveIndex];
        setPlayerAlgorithm(currentMove);
        if (typeof player.jumpToStart === "function") player.jumpToStart();
        moveIndex += 1;
        updateProgress();
        if (typeof player.play === "function") player.play();

        timerId = window.setTimeout(() => {
            timerId = null;
            renderPosition();
            onFinished?.();
        }, currentMove.includes("2") ? halfTurnPlaybackInterval : playbackInterval);
    }

    function playSequence() {
        if (moveIndex >= moves.length) moveIndex = 0;
        const playFollowingMove = () => {
            if (moveIndex < moves.length) animateNextMove(playFollowingMove);
        };
        playFollowingMove();
    }

    controls.append(
        makeButton("← 戻る", "", () => {
            stopPlayback();
            moveIndex = Math.max(0, moveIndex - 1);
            renderPosition();
        }),
        makeButton("再生", "is-play", () => {
            stopPlayback();
            playSequence();
        }),
        makeButton("進む →", "", () => {
            animateNextMove();
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
    addPlaybackButtons();
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
