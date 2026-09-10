const beginnerPlaybackInterval = 900;
const beginnerHalfTurnPlaybackInterval = 1500;

const beginnerFaceOrigins = {
    U: [300, 0],
    L: [0, 300],
    F: [300, 300],
    R: [600, 300],
    B: [900, 300],
    D: [300, 600],
};

const crossFaceColors = {
    F: "#d92d2d",
    R: "#3d9a4a",
    B: "#f57c00",
    L: "#1976d2",
};

// 下1段・下2段の図に合わせた、追いかける2色の配色。
const layerGuideColors = {
    F: "#ff00ff",
    R: "#7fff00",
    B: "#f57c00",
    L: "#1976d2",
};

function spriteCoordinate(face, row, column) {
    const [originX, originY] = beginnerFaceOrigins[face];
    return [originX + column * 100, originY + row * 100];
}

function makeCrossSprite(showSideColors) {
    const tiles = [];
    const crossColor = showSideColors ? "#ffffff" : "#007fff";
    const addTile = (face, row, column, color) => {
        const [x, y] = spriteCoordinate(face, row, column);
        tiles.push(`<rect x="${x}" y="${y}" width="100" height="100" fill="${color}"/>`);
    };

    // クロス色のセンターと4つのエッジだけを追えるようにする。
    addTile("U", 1, 1, crossColor);
    [[0, 1], [1, 0], [1, 2], [2, 1]].forEach(([row, column]) => {
        addTile("U", row, column, crossColor);
    });

    if (showSideColors) {
        Object.entries(crossFaceColors).forEach(([face, color]) => {
            // センターと、U面のクロスエッジに対応する側面ステッカー。
            addTile(face, 1, 1, color);
            addTile(face, 0, 1, color);
        });
    }

    const svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">',
        '<rect width="1200" height="900" fill="#bfbfbf"/>',
        ...tiles,
        '</svg>',
    ].join("");
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function makeFirstLayerSprite() {
    const tiles = [];
    const addTile = (face, row, column, color) => {
        const [x, y] = spriteCoordinate(face, row, column);
        tiles.push(`<rect x="${x}" y="${y}" width="100" height="100" fill="${color}"/>`);
    };

    // 完成済みクロスを下に置き、右手前スロットへ入れるコーナーを追う。
    for (let row = 0; row < 3; row += 1) {
        for (let column = 0; column < 3; column += 1) addTile("D", row, column, "#007fff");
    }
    Object.entries(layerGuideColors).forEach(([face, color]) => {
        // 完成済みクロスの側面ステッカーと、色を照合するセンター。
        addTile(face, 1, 1, color);
        addTile(face, 2, 1, color);
    });
    // 右手前スロットに入れるコーナーの側面ステッカー。
    addTile("F", 2, 2, layerGuideColors.F);
    addTile("R", 2, 0, layerGuideColors.R);

    const svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">',
        '<rect width="1200" height="900" fill="#bfbfbf"/>',
        ...tiles,
        '</svg>',
    ].join("");
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function makeSecondLayerSprite() {
    const tiles = [];
    const addTile = (face, row, column, color) => {
        const [x, y] = spriteCoordinate(face, row, column);
        tiles.push(`<rect x="${x}" y="${y}" width="100" height="100" fill="${color}"/>`);
    };

    // 完成済みの下1段と、右手前スロットへ入れる中段エッジを表示する。
    for (let row = 0; row < 3; row += 1) {
        for (let column = 0; column < 3; column += 1) addTile("D", row, column, "#007fff");
    }
    Object.entries(layerGuideColors).forEach(([face, color]) => {
        addTile(face, 1, 1, color);
        for (let column = 0; column < 3; column += 1) addTile(face, 2, column, color);
    });
    addTile("F", 1, 2, layerGuideColors.F);
    addTile("R", 1, 0, layerGuideColors.R);

    const svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">',
        '<rect width="1200" height="900" fill="#bfbfbf"/>',
        ...tiles,
        '</svg>',
    ].join("");
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function makeLastLayerCrossSprite() {
    const tiles = [];
    const addTile = (face, row, column, color) => {
        const [x, y] = spriteCoordinate(face, row, column);
        tiles.push(`<rect x="${x}" y="${y}" width="100" height="100" fill="${color}"/>`);
    };

    // 下二段は通常色で表示する。完成済みクロスは白。
    for (let row = 0; row < 3; row += 1) {
        for (let column = 0; column < 3; column += 1) addTile("D", row, column, "#ffffff");
    }
    Object.entries(crossFaceColors).forEach(([face, color]) => {
        for (let row = 1; row < 3; row += 1) {
            for (let column = 0; column < 3; column += 1) addTile(face, row, column, color);
        }
    });

    // 上段では、クロス対象エッジの黄色ステッカーだけを追う。
    addTile("U", 1, 1, "#ffff00");
    [[0, 1], [1, 0], [1, 2], [2, 1]].forEach(([row, column]) => {
        addTile("U", row, column, "#ffff00");
    });

    const svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">',
        '<rect width="1200" height="900" fill="#bfbfbf"/>',
        ...tiles,
        '</svg>',
    ].join("");
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function makeLastLayerFaceSprite() {
    const tiles = [];
    const addTile = (face, row, column, color) => {
        const [x, y] = spriteCoordinate(face, row, column);
        tiles.push(`<rect x="${x}" y="${y}" width="100" height="100" fill="${color}"/>`);
    };

    // 完成済みの下二段。
    for (let row = 0; row < 3; row += 1) {
        for (let column = 0; column < 3; column += 1) addTile("D", row, column, "#ffffff");
    }
    Object.entries(crossFaceColors).forEach(([face, color]) => {
        for (let row = 1; row < 3; row += 1) {
            for (let column = 0; column < 3; column += 1) addTile(face, row, column, color);
        }
    });

    // 上段では、黄色ステッカーだけを追う。
    for (let row = 0; row < 3; row += 1) {
        for (let column = 0; column < 3; column += 1) addTile("U", row, column, "#ffff00");
    }

    const svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">',
        '<rect width="1200" height="900" fill="#bfbfbf"/>',
        ...tiles,
        '</svg>',
    ].join("");
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function makeLastLayerCornerSprite() {
    const tiles = [];
    const addTile = (face, row, column, color) => {
        const [x, y] = spriteCoordinate(face, row, column);
        tiles.push(`<rect x="${x}" y="${y}" width="100" height="100" fill="${color}"/>`);
    };

    // 完成済みの下二段と上面。
    for (let row = 0; row < 3; row += 1) {
        for (let column = 0; column < 3; column += 1) {
            addTile("D", row, column, "#ffffff");
            addTile("U", row, column, "#ffff00");
        }
    }
    Object.entries(crossFaceColors).forEach(([face, color]) => {
        for (let row = 1; row < 3; row += 1) {
            for (let column = 0; column < 3; column += 1) addTile(face, row, column, color);
        }
        // 上段コーナーの側面ステッカーだけを表示する。
        addTile(face, 0, 0, color);
        addTile(face, 0, 2, color);
    });

    const svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">',
        '<rect width="1200" height="900" fill="#bfbfbf"/>',
        ...tiles,
        '</svg>',
    ].join("");
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function makeFullCubeSprite() {
    const colors = {
        U: "#ffff00",
        D: "#ffffff",
        ...crossFaceColors,
    };
    const tiles = [];
    Object.entries(colors).forEach(([face, color]) => {
        for (let row = 0; row < 3; row += 1) {
            for (let column = 0; column < 3; column += 1) {
                const [x, y] = spriteCoordinate(face, row, column);
                tiles.push(`<rect x="${x}" y="${y}" width="100" height="100" fill="${color}"/>`);
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

const beginnerSprites = {
    upperCross: makeCrossSprite(false),
    completeCross: makeCrossSprite(true),
    firstLayer: makeFirstLayerSprite(),
    secondLayer: makeSecondLayerSprite(),
    lastLayerCross: makeLastLayerCrossSprite(),
    lastLayerFace: makeLastLayerFaceSprite(),
    lastLayerCorners: makeLastLayerCornerSprite(),
    fullCube: makeFullCubeSprite(),
};

function parseMoveFilename(source) {
    const filename = source.split("/").pop()?.replace(/\.svg$/i, "") || "";
    const matched = filename.match(/^[URFDLBMESxyz](?:w)?(?:2)?'?$/);
    if (!matched) return "";
    return filename.endsWith("2'") ? filename.slice(0, -1) : filename;
}

function inverseBeginnerMove(move) {
    if (move.endsWith("2")) return move;
    return move.endsWith("'") ? move.slice(0, -1) : `${move}'`;
}

function beginnerSetupFor(moves) {
    return moves.slice().reverse().map(inverseBeginnerMove).join(" ");
}

function createBeginnerButton(label, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `manual-player-button ${className}`;
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
}

function createBeginnerPlayer(trigger) {
    const moves = (trigger.dataset.alg || "").split(" ").filter(Boolean);
    const panel = document.createElement("section");
    panel.className = "manual-playback-panel";
    panel.id = trigger.getAttribute("aria-controls");
    panel.setAttribute("aria-label", "手順の3D再生");

    const heading = document.createElement("p");
    heading.className = "manual-player-heading";
    heading.textContent = "3Dで動きを見る";
    const note = document.createElement("p");
    note.className = "manual-player-note";
    note.textContent = trigger.dataset.note || "今回の手順に必要なパーツだけを色付きで表示しています。";

    const stage = document.createElement("div");
    stage.className = "manual-player-stage";
    const player = document.createElement("twisty-player");
    player.setAttribute("puzzle", "3x3x3");
    player.setAttribute("alg", "");
    player.setAttribute("experimental-setup-alg", trigger.dataset.setup || "");
    player.setAttribute("experimental-stickering", "picture");
    player.setAttribute("experimental-sprite", beginnerSprites[trigger.dataset.sprite] || beginnerSprites.upperCross);
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
        }, currentMove.includes("2") ? beginnerHalfTurnPlaybackInterval : beginnerPlaybackInterval);
    }

    function playSequence() {
        if (moveIndex >= moves.length) moveIndex = 0;
        const playFollowingMove = () => {
            if (moveIndex < moves.length) animateNextMove(playFollowingMove);
        };
        playFollowingMove();
    }

    controls.append(
        createBeginnerButton("← 戻る", "", () => {
            stopPlayback();
            moveIndex = Math.max(0, moveIndex - 1);
            renderPosition();
        }),
        createBeginnerButton("再生", "is-play", () => playSequence()),
        createBeginnerButton("進む →", "", () => animateNextMove()),
        createBeginnerButton("最初から", "", () => {
            stopPlayback();
            moveIndex = 0;
            renderPosition();
        }),
    );

    panel.append(heading, note, stage, controls, progress);
    renderPosition();
    return panel;
}

function moveGroupsInSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return [];

    const groups = [];
    for (let node = section.nextElementSibling; node && !node.matches(".section-title"); node = node.nextElementSibling) {
        if (node.matches(".move-images")) groups.push(node);
        groups.push(...node.querySelectorAll(".move-images"));
    }
    return groups;
}

function addCrossPlayback() {
    const notes = {
        upperCross: "水色はクロス色です。前半ではクロス色だけを表示します。",
        completeCross: "白はクロス色です。後半ではクロスエッジの側面と、対応するセンターも色付きで表示します。",
    };

    moveGroupsInSection("Section1").forEach((moveGroup, index) => {
        const moves = [...moveGroup.querySelectorAll("img.moves")]
            .map((image) => parseMoveFilename(image.getAttribute("src") || ""))
            .filter(Boolean);
        if (!moves.length) return;

        const sprite = index < 5 ? "upperCross" : "completeCross";
        const trigger = document.createElement("button");
        trigger.id = `beginner-cross-trigger-${index + 1}`;
        trigger.className = "manual-playback-trigger";
        trigger.type = "button";
        trigger.textContent = "3Dで動きを見る";
        trigger.setAttribute("aria-expanded", "false");
        trigger.setAttribute("aria-controls", `beginner-cross-player-${index + 1}`);
        trigger.dataset.alg = moves.join(" ");
        trigger.dataset.setup = beginnerSetupFor(moves);
        trigger.dataset.sprite = sprite;
        trigger.dataset.note = notes[sprite];
        moveGroup.insertAdjacentElement("afterend", trigger);
    });
}

function addLayerPlayback(sectionId, sprite, note, idPrefix) {
    moveGroupsInSection(sectionId).forEach((moveGroup, index) => {
        const moves = [...moveGroup.querySelectorAll("img.moves")]
            .map((image) => parseMoveFilename(image.getAttribute("src") || ""))
            .filter(Boolean);
        if (!moves.length) return;

        const trigger = document.createElement("button");
        trigger.id = `${idPrefix}-trigger-${index + 1}`;
        trigger.className = "manual-playback-trigger";
        trigger.type = "button";
        trigger.textContent = "3Dで動きを見る";
        trigger.setAttribute("aria-expanded", "false");
        trigger.setAttribute("aria-controls", `${idPrefix}-player-${index + 1}`);
        trigger.dataset.alg = moves.join(" ");
        trigger.dataset.setup = beginnerSetupFor(moves);
        trigger.dataset.sprite = sprite;
        trigger.dataset.note = note;
        moveGroup.insertAdjacentElement("afterend", trigger);
    });
}

document.addEventListener("click", (event) => {
    const trigger = event.target.closest(".manual-playback-trigger");
    if (!trigger || !trigger.id.startsWith("beginner-")) return;

    const existing = document.getElementById(trigger.getAttribute("aria-controls"));
    if (existing) {
        const isHidden = existing.hidden;
        existing.hidden = !isHidden;
        trigger.setAttribute("aria-expanded", String(isHidden));
        return;
    }

    const panel = createBeginnerPlayer(trigger);
    trigger.insertAdjacentElement("afterend", panel);
    trigger.setAttribute("aria-expanded", "true");
});

addCrossPlayback();
addLayerPlayback(
    "Section2",
    "firstLayer",
    "水色はクロス色です。完成済みクロスの側面・センターと、右手前スロットへ入れるコーナーを色付きで表示します。",
    "beginner-first-layer",
);
addLayerPlayback(
    "Section3",
    "secondLayer",
    "水色はクロス色です。完成済みの下1段と、右手前スロットへ入れる中段エッジを色付きで表示します。",
    "beginner-second-layer",
);
addLayerPlayback(
    "Section4",
    "lastLayerCross",
    "下二段は完成状態の色で表示します。白は完成済みクロス色です。上段では、クロス対象エッジの黄色ステッカーだけを色付きで表示します。",
    "beginner-last-layer-cross",
);
addLayerPlayback(
    "Section5",
    "lastLayerFace",
    "下二段は完成状態の色で表示します。上段では、黄色ステッカーだけを色付きで表示します。",
    "beginner-last-layer-face",
);
addLayerPlayback(
    "Section6",
    "lastLayerCorners",
    "下二段と上面は完成状態の色で表示します。上段では、コーナーの側面ステッカーだけを色付きで表示します。",
    "beginner-last-layer-corners",
);
addLayerPlayback(
    "Section7",
    "fullCube",
    "全面を通常色で表示します。上面＝黄色、手前＝赤、左＝青、右＝緑です。",
    "beginner-last-layer-edges",
);
