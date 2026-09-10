const playbackInterval = 900;
const halfTurnPlaybackInterval = 1500;

const faceColors = {
    U: "#f5c400",
    D: "#f5f5f5",
    F: "#d92d2d",
    B: "#f57c00",
    R: "#3d9a4a",
    L: "#1976d2",
};

const faceOrigins = {
    U: [300, 0],
    L: [0, 300],
    F: [300, 300],
    R: [600, 300],
    B: [900, 300],
    D: [300, 600],
};

function stickerSprite(mode) {
    const tiles = [];
    Object.entries(faceOrigins).forEach(([face, [originX, originY]]) => {
        for (let row = 0; row < 3; row += 1) {
            for (let column = 0; column < 3; column += 1) {
                const isOllUpperSide = mode === "oll" && ["F", "R", "B", "L"].includes(face) && row === 0;
                tiles.push(`<rect x="${originX + column * 100}" y="${originY + row * 100}" width="100" height="100" fill="${isOllUpperSide ? "#bfbfbf" : faceColors[face]}"/>`);
            }
        }
    });
    const svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">',
        '<rect width="1200" height="900" fill="#bfbfbf"/>',
        ...tiles,
        '</svg>',
    ].join("");
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const sprites = {
    oll: stickerSprite("oll"),
    pll: stickerSprite("pll"),
};

function movesFromText(value) {
    const notation = value.split(/[\u3040-\u30ff\u3400-\u9fff]/, 1)[0];
    const tokens = notation.match(/[URFDLBMESxyzurfdlb](?:w)?(?:2)?'?|[()]|\d+/g) || [];

    function readGroup(startIndex) {
        const moves = [];
        let index = startIndex;
        while (index < tokens.length) {
            const token = tokens[index];
            if (token === ")") return { moves, index: index + 1 };
            if (token === "(") {
                const group = readGroup(index + 1);
                index = group.index;
                const times = /^\d+$/.test(tokens[index] || "") ? Number(tokens[index++]) : 1;
                for (let repeat = 0; repeat < times; repeat += 1) moves.push(...group.moves);
                continue;
            }
            if (!/^\d+$/.test(token)) moves.push(token);
            index += 1;
        }
        return { moves, index };
    }

    return readGroup(0).moves;
}

function inverseMove(move) {
    if (move.endsWith("2")) return move;
    return move.endsWith("'") ? move.slice(0, -1) : `${move}'`;
}

function setupFor(moves) {
    return moves.slice().reverse().map(inverseMove).join(" ");
}

function restoreXOrientation(moves) {
    const xTurns = moves.reduce((total, move) => {
        if (!move.startsWith("x")) return total;
        if (move.includes("2")) return total + 2;
        return total + (move.endsWith("'") ? -1 : 1);
    }, 0);
    const remainder = ((xTurns % 4) + 4) % 4;
    if (remainder === 0) return moves;

    const restore = remainder === 1 ? "x'" : remainder === 2 ? "x2" : "x";
    return [...moves, restore];
}

function makeButton(label, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `manual-player-button ${className}`;
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
}

function createPlayer(trigger) {
    const moves = (trigger.dataset.alg || "").split(" ").filter(Boolean);
    const panel = document.createElement("section");
    panel.className = "manual-playback-panel";
    panel.id = trigger.getAttribute("aria-controls");
    panel.setAttribute("aria-label", "手順の3D再生");

    const heading = document.createElement("p");
    heading.className = "manual-player-heading";
    heading.textContent = "3Dで手順を見る";
    const note = document.createElement("p");
    note.className = "manual-player-note";
    note.textContent = trigger.dataset.note;

    const stage = document.createElement("div");
    stage.className = "manual-player-stage";
    const player = document.createElement("twisty-player");
    player.setAttribute("puzzle", "3x3x3");
    player.setAttribute("alg", "");
    player.setAttribute("experimental-setup-alg", trigger.dataset.setup || "");
    player.setAttribute("experimental-stickering", "picture");
    player.setAttribute("experimental-sprite", sprites[trigger.dataset.mode]);
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

    const baseSetup = trigger.dataset.setup || "";
    let moveIndex = 0;
    let timerId = null;

    function setPlayerAlgorithm(algorithm) {
        if ("alg" in player) player.alg = algorithm;
        else player.setAttribute("alg", algorithm);
    }

    function updateProgress() {
        moveNodes.forEach((node, index) => node.classList.toggle("is-active", index === moveIndex - 1));
        status.textContent = moveIndex === 0
            ? `開始位置 / ${moves.length}手`
            : moveIndex === moves.length ? "再生完了" : `${moveIndex} / ${moves.length} 手目`;
    }

    function stopPlayback() {
        if (timerId !== null) {
            window.clearTimeout(timerId);
            timerId = null;
        }
        if (typeof player.pause === "function") player.pause();
    }

    function renderPosition() {
        if (typeof player.pause === "function") player.pause();
        player.setAttribute("experimental-setup-alg", baseSetup);
        setPlayerAlgorithm(moves.slice(0, moveIndex).join(" "));
        if (typeof player.jumpToEnd === "function") player.jumpToEnd();
        updateProgress();
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
        makeButton("再生", "is-play", () => playSequence()),
        makeButton("進む →", "", () => animateNextMove()),
        makeButton("最初から", "", () => {
            stopPlayback();
            moveIndex = 0;
            renderPosition();
        }),
    );

    panel.append(heading, note, stage, controls, progress);
    renderPosition();
    return panel;
}

function addPlaybackButtons() {
    const mode = document.body.classList.contains("manual-oll") ? "oll" : "pll";
    const note = mode === "oll"
        ? "下二段は通常色、最後の層は黄色ステッカーだけを表示します。上面＝黄色、手前＝赤、左＝青、右＝緑です。"
        : "全面を通常色で表示します。上面＝黄色、手前＝赤、左＝青、右＝緑です。";
    let number = 0;

    document.querySelectorAll(".details .content").forEach((content) => {
        const algorithm = restoreXOrientation(movesFromText(content.querySelector("p")?.textContent || ""));
        if (!algorithm.length) return;

        number += 1;
        const trigger = document.createElement("button");
        trigger.className = "manual-playback-trigger";
        trigger.type = "button";
        trigger.textContent = "3Dで動きを見る";
        trigger.setAttribute("aria-expanded", "false");
        trigger.setAttribute("aria-controls", `last-layer-player-${number}`);
        trigger.dataset.alg = algorithm.join(" ");
        trigger.dataset.setup = setupFor(algorithm);
        trigger.dataset.mode = mode;
        trigger.dataset.note = note;
        content.appendChild(trigger);
    });

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
            const panel = createPlayer(trigger);
            trigger.insertAdjacentElement("afterend", panel);
            trigger.setAttribute("aria-expanded", "true");
            trigger.textContent = "3D再生を閉じる";
        });
    });
}

document.addEventListener("DOMContentLoaded", addPlaybackButtons);
