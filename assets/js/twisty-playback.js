import { DEFAULT_THEME, createPuzzleViewer } from "./puzzle-viewer/cube3-viewer.js?v=20260916-11";

const examples = [
    {
        id: "portfolio-3x3-cycle",
        puzzle: "3x3x3",
        label: "3×3 CYCLE",
        title: "中段エッジの3-cycle",
        description: "Portfolioに登録された ME3[FL&gt;BL&gt;FR]。中段のエッジ3個を巡回させる、4手の短い手順です。",
        moves: ["E", "F2", "E'", "F2"],
        setup: "F2 E F2 E'",
    },
    {
        id: "portfolio-7x7-cycle",
        puzzle: "7x7x7",
        label: "7×7 CYCLE",
        title: "ウイングの3-cycle",
        description: "Portfolioの W2-3 系から選んだ例。3つのウイングを巡回させ、多分割キューブのパーツ操作を確認できます。",
        moves: ["R", "U'", "R'", "2U'", "R", "U", "R'", "2U"],
        setup: "2U' R U' R' 2U R U R'",
    },
    {
        id: "portfolio-megaminx-cycle",
        puzzle: "megaminx",
        label: "MEGAMINX CYCLE",
        title: "メガミンクスの3-cycle",
        description: "Portfolioに登録された C3[U.bR.R&gt;FLU&gt;RFU]。メガミンクスでも、同じ考え方で3つのパーツを巡回させます。",
        moves: ["F'", "L'", "F", "R'", "F'", "L", "F", "R"],
        setup: "R' F' L' F R F' L F",
    },
    {
        id: "basic-sexy-move",
        puzzle: "3x3x3",
        label: "BASIC MOVE",
        title: "セクシームーブ",
        description: "R U R' U' の基本4手。完成状態から、手の動きとパーツの変化を観察できます。",
        moves: ["R", "U", "R'", "U'"],
        setup: "",
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

function createPlayerCard(example) {
    const card = document.createElement("article");
    card.className = "puzzle-player-card";

    const copy = document.createElement("div");
    copy.className = "puzzle-player-copy";
    const label = document.createElement("small");
    label.textContent = example.label;
    const title = document.createElement("h2");
    title.textContent = example.title;
    const description = document.createElement("p");
    description.textContent = example.description;
    copy.append(label, title, description);

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
        const goal = example.setup ? "開始状態" : "完成状態";
        status.textContent = moveIndex === 0
            ? `${goal} / ${example.moves.length}手`
            : moveIndex === example.moves.length
                ? "再生完了"
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
    return { card, stopPlayback };
}

function normaliseMoves(value) {
    return value.trim().split(/\s+/).filter(Boolean);
}

const grid = document.querySelector("#playback-grid");
examples.slice(0, 3).forEach((example) => grid.appendChild(createPlayerCard(example).card));

const form = document.querySelector("#algorithm-form");
const presetSelect = document.querySelector("#algorithm-preset");
const puzzleSelect = document.querySelector("#algorithm-puzzle");
const algorithmInput = document.querySelector("#algorithm-input");
const setupInput = document.querySelector("#setup-input");
const message = document.querySelector("#algorithm-message");
const customPlayerHost = document.querySelector("#custom-player");
const discoveriesStatus = document.querySelector("#discoveries-status");
const discoveriesPicker = document.querySelector("#discoveries-picker");
const discoveryEffectTypeSelect = document.querySelector("#discovery-effect-type");
const discoveryEffectNameSelect = document.querySelector("#discovery-effect-name");
const discoveriesGrid = document.querySelector("#discoveries-grid");
const aiDiscoveryHost = document.querySelector("#ai-discovery-viewer");
const aiDiscoveryStage = document.querySelector("#ai-discovery-stage");
const aiDiscoveryFallback = document.querySelector("#ai-discovery-fallback");
const aiDiscoveryTitle = document.querySelector("#ai-discovery-viewer-title");
const aiDiscoveryDescription = document.querySelector("#ai-discovery-viewer-description");
const aiDiscoveryStatus = document.querySelector("#ai-discovery-status");
const aiDiscoveryTokens = document.querySelector("#ai-discovery-tokens");
const aiDiscoveryControls = {
    start: document.querySelector("#ai-discovery-start"),
    previous: document.querySelector("#ai-discovery-previous"),
    play: document.querySelector("#ai-discovery-play"),
    next: document.querySelector("#ai-discovery-next"),
    resetView: document.querySelector("#ai-discovery-reset-view"),
};
const DISCOVERIES_PER_EFFECT_LIMIT = 3;
let customPlayback = null;
let aiDiscoveryViewer = null;

examples.forEach((example) => {
    const option = document.createElement("option");
    option.value = example.id;
    option.textContent = `${example.label} — ${example.title}`;
    presetSelect.appendChild(option);
});

function selectPreset() {
    const example = examples.find((item) => item.id === presetSelect.value);
    if (!example) return;
    puzzleSelect.value = example.puzzle;
    algorithmInput.value = example.moves.join(" ");
    setupInput.value = example.setup;
    message.textContent = "再生例を読み込みました。「この手順を表示する」で確認できます。";
}

function showCustomPlayer() {
    const moves = normaliseMoves(algorithmInput.value);
    if (!moves.length) {
        message.textContent = "再生する手順を入力してください。例: R U R' U'";
        algorithmInput.focus();
        return;
    }

    if (customPlayback) customPlayback.stopPlayback();
    customPlayerHost.replaceChildren();
    const customExample = {
        puzzle: puzzleSelect.value,
        label: "YOUR ALGORITHM",
        title: `${puzzleSelect.options[puzzleSelect.selectedIndex].text} の手順`,
        description: setupInput.value.trim()
            ? "指定した開始状態から、この手順を一手ずつ再生します。"
            : "完成状態から、この手順を一手ずつ再生します。",
        moves,
        setup: setupInput.value.trim(),
    };
    customPlayback = createPlayerCard(customExample);
    customPlayerHost.appendChild(customPlayback.card);
    message.textContent = `${moves.length}手の再生を用意しました。パズルをドラッグして見やすい向きにできます。`;
}

function loadPlaybackFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const moves = params.get("moves");
    if (!moves || !moves.trim()) return false;

    const requestedPuzzle = params.get("puzzle");
    const hasPuzzle = Array.from(puzzleSelect.options).some(
        (option) => option.value === requestedPuzzle
    );
    if (hasPuzzle) puzzleSelect.value = requestedPuzzle;
    presetSelect.value = "custom";
    algorithmInput.value = moves;
    setupInput.value = params.get("setup") || "";
    showCustomPlayer();
    if (!hasPuzzle && requestedPuzzle) {
        message.textContent = `「${requestedPuzzle}」はこのページで未対応のため、現在選ばれているパズルで表示しています。`;
    }
    return true;
}

function displayPuzzleName(puzzle) {
    const option = Array.from(puzzleSelect.options).find((item) => item.value === puzzle);
    return option ? option.textContent : puzzle;
}

function renderAiDiscovery(snapshot) {
    const current = snapshot.position === 0 ? "開始状態" : `現在の手: ${snapshot.currentMove}`;
    aiDiscoveryStatus.textContent = `${current}。${snapshot.position}手目 / ${snapshot.totalMoves}手中。`;
    aiDiscoveryControls.start.disabled = !snapshot.available || snapshot.isBusy || snapshot.position === 0;
    aiDiscoveryControls.previous.disabled = !snapshot.available || snapshot.isBusy || snapshot.position === 0;
    aiDiscoveryControls.next.disabled = !snapshot.available || snapshot.isBusy || snapshot.position >= snapshot.totalMoves;
    aiDiscoveryControls.play.disabled = !snapshot.available || snapshot.isBusy || snapshot.totalMoves === 0;
    aiDiscoveryControls.play.textContent = snapshot.isPlaying ? "停止" : "再生";
    aiDiscoveryTokens.replaceChildren(...snapshot.algorithm.split(" ").filter(Boolean).map((move, index) => {
        const token = document.createElement("button");
        token.type = "button";
        token.className = "cube3-token";
        token.textContent = move;
        token.disabled = snapshot.isBusy;
        token.classList.toggle("is-complete", index < snapshot.position);
        token.classList.toggle("is-current", index === snapshot.position - 1);
        token.addEventListener("click", () => aiDiscoveryViewer?.seek(index + 1));
        return token;
    }));
}

function showAiDiscovery(discovery) {
    aiDiscoveryViewer?.destroy();
    aiDiscoveryViewer = null;
    aiDiscoveryHost.hidden = false;
    aiDiscoveryTitle.textContent = `${displayPuzzleName(discovery.puzzle)} / ${discovery.effectLabel}`;
    aiDiscoveryDescription.textContent = discovery.setup.length
        ? `${discovery.setup.length}手の開始局面から、AIが発見した${discovery.moves.length}手を再生します。`
        : `完成状態から、AIが発見した${discovery.moves.length}手を再生します。`;
    aiDiscoveryFallback.hidden = true;
    aiDiscoveryStage.replaceChildren(aiDiscoveryFallback);
    try {
        aiDiscoveryViewer = createPuzzleViewer(aiDiscoveryStage, {
            puzzleId: discovery.puzzle,
            setupAlgorithm: discovery.setup.join(" "),
            algorithm: discovery.moves.join(" "),
            theme: {
                ...DEFAULT_THEME,
                canvasBackground: "#f4f8fa",
                cubieColor: "#77766f",
            },
            themeId: "ai-discovery",
            onChange: renderAiDiscovery,
        });
        renderAiDiscovery(aiDiscoveryViewer.getSnapshot());
    } catch (caught) {
        aiDiscoveryFallback.textContent = `3Dビューアを起動できませんでした: ${caught.message}`;
        aiDiscoveryFallback.hidden = false;
        aiDiscoveryStage.replaceChildren(aiDiscoveryFallback);
        aiDiscoveryControls.play.disabled = true;
        aiDiscoveryControls.start.disabled = true;
        aiDiscoveryControls.previous.disabled = true;
        aiDiscoveryControls.next.disabled = true;
        aiDiscoveryTokens.replaceChildren();
    }
}

function loadDiscoveryIntoTool(discovery) {
    puzzleSelect.value = discovery.puzzle;
    presetSelect.value = "custom";
    algorithmInput.value = discovery.moves.join(" ");
    setupInput.value = discovery.setup.join(" ");
    showAiDiscovery(discovery);
    aiDiscoveryHost.scrollIntoView({ behavior: "smooth", block: "start" });
}

function discoveryScore(discovery) {
    return discovery.effectCount ** 2 * discovery.moves.length;
}

function compareDiscoveries(first, second) {
    return discoveryScore(first) - discoveryScore(second)
        || first.moves.length - second.moves.length
        || first.effectCount - second.effectCount
        || String(first.updatedAt).localeCompare(String(second.updatedAt));
}

function selectDiscoveryShowcase(discoveries) {
    return discoveries
        .slice()
        .sort(compareDiscoveries)
        .slice(0, DISCOVERIES_PER_EFFECT_LIMIT);
}

function createOption(value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
}

function groupDiscoveriesByEffectType(discoveries) {
    const types = new Map();
    discoveries.forEach((discovery) => {
        const type = discovery.effectLabel;
        if (!types.has(type)) types.set(type, []);
        types.get(type).push(discovery);
    });
    return types;
}

function groupDiscoveriesByEffectName(discoveries) {
    const names = new Map();
    discoveries.forEach((discovery) => {
        if (!names.has(discovery.effectName)) names.set(discovery.effectName, []);
        names.get(discovery.effectName).push(discovery);
    });
    return names;
}

function smallestDiscoveryScore(discoveries) {
    const smallest = selectDiscoveryShowcase(discoveries)[0];
    return smallest ? discoveryScore(smallest) : 0;
}

function sortedGroups(groups) {
    return Array.from(groups.entries()).sort(([, first], [, second]) =>
        smallestDiscoveryScore(first) - smallestDiscoveryScore(second)
        || first.length - second.length
    );
}

function sortedEffectTypes(groups) {
    return Array.from(groups.entries()).sort(([, first], [, second]) =>
        second.length - first.length
        || smallestDiscoveryScore(first) - smallestDiscoveryScore(second)
    );
}

function createDiscoveryCard(discovery) {
    const card = document.createElement("article");
    card.className = "discovery-card";
    const label = document.createElement("small");
    label.textContent = "AI DISCOVERY";
    const title = document.createElement("h3");
    title.textContent = `${displayPuzzleName(discovery.puzzle)} / ${discovery.effectLabel}`;
    const metrics = document.createElement("p");
    metrics.className = "discovery-metrics";
    const orientation = discovery.orientationCount
        ? `・向き変化 ${discovery.orientationCount}`
        : "";
    metrics.textContent = `効果 ${discovery.effectCount}² × ${discovery.moves.length}手 = ${discoveryScore(discovery)}${orientation}`;
    const description = document.createElement("p");
    description.textContent = discovery.setup.length
        ? `開始局面: ${discovery.setup.length}手のスクランブル`
        : "完成状態からの手順";
    const moves = document.createElement("code");
    moves.className = "discovery-moves";
    moves.textContent = discovery.moves.join(" ");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "discovery-button";
    button.textContent = "新ビューアで再生する";
    button.addEventListener("click", () => loadDiscoveryIntoTool(discovery));
    card.append(label, title, metrics, description, moves, button);
    return card;
}

function isDiscovery(value) {
    return value
        && Array.isArray(value.moves)
        && Array.isArray(value.setup)
        && value.moves.length > 0
        && Array.from(puzzleSelect.options).some((option) => option.value === value.puzzle)
        && value.moves.every((move) => typeof move === "string")
        && value.setup.every((move) => typeof move === "string")
        && typeof value.effectName === "string"
        && typeof value.effectClass === "string"
        && typeof value.effectLabel === "string"
        && Number.isInteger(value.effectCount)
        && value.effectCount > 0
        && Number.isInteger(value.orientationCount)
        && value.orientationCount >= 0;
}

async function loadDiscoveries() {
    try {
        const response = await fetch("assets/data/ai-discoveries.json", { cache: "no-store" });
        if (!response.ok) throw new Error("discovery feed unavailable");
        const payload = await response.json();
        const discoveries = Array.isArray(payload.discoveries)
            ? payload.discoveries.filter(isDiscovery)
            : [];
        const effectTypes = groupDiscoveriesByEffectType(discoveries);
        const typeGroups = sortedEffectTypes(effectTypes);

        function renderSelectedEffect() {
            const selectedType = effectTypes.get(discoveryEffectTypeSelect.value) || [];
            const effectNames = groupDiscoveriesByEffectName(selectedType);
            const isAllNames = discoveryEffectNameSelect.value === "__all__";
            const selectedName = isAllNames
                ? selectedType
                : effectNames.get(discoveryEffectNameSelect.value) || [];
            const showcase = selectDiscoveryShowcase(selectedName);
            discoveriesGrid.replaceChildren(...showcase.map(createDiscoveryCard));
            const selectedScope = isAllNames
                ? `選択中の効果タイプには${selectedName.length}件あり`
                : `選択中の EffectName には${selectedName.length}件あり`;
            discoveriesStatus.textContent = `${effectTypes.size}種類の効果タイプ・${discoveries.length}件の成果から選べます。${selectedScope}、効果数² × 手数が小さい順に最大${DISCOVERIES_PER_EFFECT_LIMIT}件を表示しています。`;
            if (showcase.length) showAiDiscovery(showcase[0]);
        }

        function populateEffectNames() {
            const selectedType = effectTypes.get(discoveryEffectTypeSelect.value) || [];
            const effectNames = sortedGroups(groupDiscoveriesByEffectName(selectedType));
            discoveryEffectNameSelect.replaceChildren(
                createOption("__all__", `この効果タイプの手順をまとめて比較 — ${selectedType.length}件`),
                ...effectNames.map(([name, items]) =>
                    createOption(name, `${name} — 最小値 ${smallestDiscoveryScore(items)} / ${items.length}件`)
                )
            );
            renderSelectedEffect();
        }

        discoveryEffectTypeSelect.replaceChildren(...typeGroups.map(([type, items]) => {
            const effectNameCount = groupDiscoveriesByEffectName(items).size;
            return createOption(type, `${type} — ${effectNameCount}種類 / ${items.length}件`);
        }));
        discoveryEffectTypeSelect.addEventListener("change", populateEffectNames);
        discoveryEffectNameSelect.addEventListener("change", renderSelectedEffect);
        discoveriesPicker.hidden = !typeGroups.length;
        if (typeGroups.length) populateEffectNames();
        else {
            discoveriesGrid.replaceChildren();
            discoveriesStatus.textContent = "まだ公開するAI成果はありません。Pythonアプリで解法が見つかると、ここに追加されます。";
        }
    } catch (error) {
        discoveriesPicker.hidden = true;
        discoveriesStatus.textContent = "AI成果は公開後にここへ表示されます。";
    }
}

presetSelect.addEventListener("change", selectPreset);
form.addEventListener("submit", (event) => {
    event.preventDefault();
    showCustomPlayer();
});
aiDiscoveryControls.start.addEventListener("click", () => aiDiscoveryViewer?.seek(0));
aiDiscoveryControls.previous.addEventListener("click", () => aiDiscoveryViewer?.stepPrevious());
aiDiscoveryControls.play.addEventListener("click", () => aiDiscoveryViewer?.play());
aiDiscoveryControls.next.addEventListener("click", () => aiDiscoveryViewer?.stepNext());
aiDiscoveryControls.resetView.addEventListener("click", () => aiDiscoveryViewer?.resetCamera());

presetSelect.value = examples[0].id;
selectPreset();
if (!loadPlaybackFromUrl()) showCustomPlayer();
loadDiscoveries();
