const examples = [
    {
        puzzle: "3x3x3",
        label: "3×3 CYCLE",
        title: "中段エッジの3-cycle",
        description: "Portfolioに登録された ME3[FL&gt;BL&gt;FR]。中段のエッジ3個を巡回させる、4手の短い手順です。",
        moves: ["E", "F2", "E'", "F2"],
        setup: "F2 E F2 E'",
    },
    {
        puzzle: "7x7x7",
        label: "7×7 CYCLE",
        title: "ウイングの3-cycle",
        description: "Portfolioの W2-3 系から選んだ例。3つのウイングを巡回させ、多分割キューブのパーツ操作を確認できます。",
        moves: ["R", "U'", "R'", "2U'", "R", "U", "R'", "2U"],
        setup: "2U' R U' R' 2U R U R'",
    },
    {
        puzzle: "megaminx",
        label: "MEGAMINX CYCLE",
        title: "メガミンクスの3-cycle",
        description: "Portfolioに登録された C3[U.bR.R&gt;FLU&gt;RFU]。メガミンクスでも、同じ考え方で3つのパーツを巡回させます。",
        moves: ["F'", "L'", "F", "R'", "F'", "L", "F", "R"],
        setup: "R' F' L' F R F' L F",
    },
];

const playbackInterval = 760;

function makeButton(label, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `puzzle-player-button ${className}`;
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
}

function createExample(example) {
    const card = document.createElement("article");
    card.className = "puzzle-player-card";

    const copy = document.createElement("div");
    copy.className = "puzzle-player-copy";
    copy.innerHTML = `<small>${example.label}</small><h2>${example.title}</h2><p>${example.description}</p>`;

    const stage = document.createElement("div");
    stage.className = "puzzle-player-stage";
    const player = document.createElement("twisty-player");
    player.setAttribute("puzzle", example.puzzle);
    player.setAttribute("alg", "");
    player.setAttribute("experimental-setup-alg", example.setup);
    player.setAttribute("background", "none");
    player.setAttribute("hint-facelets", "none");
    player.setAttribute("control-panel", "none");
    player.setAttribute("experimental-drag-input", "auto");
    stage.appendChild(player);

    let moveIndex = 0;
    let timerId = null;
    const controls = document.createElement("div");
    controls.className = "puzzle-player-controls";
    const progress = document.createElement("div");
    progress.className = "puzzle-player-progress";
    const status = document.createElement("span");
    status.className = "puzzle-player-status";
    const moveList = document.createElement("div");
    moveList.className = "puzzle-player-moves";
    const moveNodes = example.moves.map((move) => {
        const node = document.createElement("span");
        node.className = "puzzle-player-move";
        node.textContent = move;
        moveList.appendChild(node);
        return node;
    });

    function stopPlayback() {
        if (timerId !== null) {
            window.clearInterval(timerId);
            timerId = null;
        }
    }

    function renderPosition() {
        const movesSoFar = example.moves.slice(0, moveIndex).join(" ");
        if (typeof player.pause === "function") player.pause();
        if ("alg" in player) player.alg = movesSoFar;
        else player.setAttribute("alg", movesSoFar);
        if (typeof player.jumpToEnd === "function") player.jumpToEnd();
        moveNodes.forEach((node, index) => node.classList.toggle("is-active", index === moveIndex - 1));
        status.textContent = moveIndex === 0
            ? `開始状態 / ${example.moves.length}手で完成`
            : moveIndex === example.moves.length
                ? "完成"
                : `${moveIndex} / ${example.moves.length} 手目`;
    }

    function nextMove() {
        if (moveIndex >= example.moves.length) {
            stopPlayback();
            return;
        }
        moveIndex += 1;
        renderPosition();
        if (moveIndex >= example.moves.length) stopPlayback();
    }

    controls.append(
        makeButton("← 戻る", "", () => {
            stopPlayback();
            moveIndex = Math.max(0, moveIndex - 1);
            renderPosition();
        }),
        makeButton("再生", "play", () => {
            stopPlayback();
            if (moveIndex >= example.moves.length) moveIndex = 0;
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
    progress.append(status, moveList);
    card.append(copy, stage, controls, progress);
    renderPosition();
    return card;
}

const grid = document.querySelector("#playback-grid");
examples.forEach((example) => grid.appendChild(createExample(example)));
