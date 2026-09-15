# 3Dパズルビューア｜Phase 1 技術設計

> 関連する上位仕様: [3d-puzzle-viewer-spec.md](3d-puzzle-viewer-spec.md)
>
> 決定日: 2026-09-15

## この段階で決めたこと

Phase 1では、3D描画に **Three.js** を採用する。既存サイトはビルド工程なしで公開する静的サイトなので、Three.js本体と必要なアドオンを`assets/vendor/three/`へバージョン固定で配置し、ネイティブESモジュールとして読み込む。CDNへの依存は持ち込まない。

採用する最小構成は以下。

- `WebGLRenderer`: Canvasへの描画
- `OrbitControls`: 将来のドラッグによる視点回転とズームの基盤（現在は直接操作を一時停止）
- `RoundedBoxGeometry`: 控えめな丸みを持つキューブ本体
- `MeshPhysicalMaterial`、環境光、方向光: 光沢のある面キャップを教材として色を読み取りやすい陰影で描く

Three.jsはシーン・カメラ・レンダラーを明確に分けられ、`OrbitControls`を追加読込してカメラを回せる。丸みのある直方体も公式アドオンで作れるため、3×3のキュービーから将来の独自形状まで同じ描画基盤で扱える。[Three.jsの導入方法](https://threejs.org/manual/en/installation.html)・[OrbitControls](https://threejs.org/docs/pages/OrbitControls.html)・[RoundedBoxGeometry](https://threejs.org/docs/pages/RoundedBoxGeometry.html)

現行Three.jsの`WebGLRenderer`はWebGL 2を前提とする。そのため起動時にWebGL 2を確認し、使えない環境では代替の説明表示を出す。Phase 1ではWebGL 1向けの描画経路は作らない。[WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)・[WebGL対応確認](https://threejs.org/docs/pages/WebGL.html)

## 採用しない案

| 案 | 今回採用しない理由 |
| --- | --- |
| `cubing.js`を拡張する | 既存の再生ページには適切だが、独自ステッカー・教材用の強調・ピース寸法・異形パズルを自前設計する主目的には自由度が足りない。 |
| CSS 3D | 3×3だけなら可能だが、陰影・ピース選択・異形パズル・多数ピースに早期に限界が来る。 |
| 生のWebGL | 描画・入力・リソース管理をすべて自前にする負担が、ビューア固有の価値に見合わない。 |
| React等のUI基盤 | 現在の素のHTML/JavaScript構成に対して導入コストが高い。公開APIを小さく保てば、必要になった時点でUI基盤を替えられる。 |

## 配置と責務

現状は最小デモを優先して`cube3-viewer.js`に同居させているが、公開ページごとの処理ではなく、次の責務へ分ける。外部向けの入口はすでに`createPuzzleViewer()`として公開しており、将来ファイルを分割してもこの名前と契約を維持する。

```text
assets/
├── js/puzzle-viewer/
│   ├── cube3-viewer.js          # 状態、描画、createPuzzleViewer（現在の最小実装）
│   └── demo.js                  # 公開デモ固有のUI
└── vendor/three/<固定版>/        # Three.js本体と使用アドオン
```

`cube3-viewer.js`の論理状態部分は描画の状態を参照しない。NxNや異形パズルを実装する段階で、ここを`core/`（Three.jsやDOMをimportしない）、`definitions/`、`render/`へ分割する。そうすれば同じ状態計算を、将来Python側の出力検証・テスト・別の描画方式でも再利用できる。

## 状態とアニメーションの契約

論理状態はアニメーションの途中で変更しない。

```text
状態 A ── move R を要求 ──> Animatorが対象ピースをturn groupへ移す
  │                                │ 0° → 90° を描画
  │                                ▼
  └─────────────── アニメーション完了後にのみ ──> 状態 B を確定して通常sceneへ反映
```

1. `PlaybackController`が現在の論理状態Aから、次の手による状態Bを計算する。
2. `Renderer`は状態Aのまま、対象ピースだけを一時的な`turnGroup`へ移し、指定角度まで回す。
3. 完了したら`turnGroup`を解体し、状態Bを基準に全ピースの位置・向きを再設定する。
4. 途中で次の手を受け付けない。停止は「現在の一手を終えてから停止」とする。

これにより一手戻し・先頭へ戻す・速度変更は状態履歴だけを基準に実装でき、見た目の回転誤差が論理状態へ混入しない。

## `PuzzleDefinition` v1

`PuzzleDefinition`は、パズル固有の静的な情報だけを持つ。再生位置・配色の選択・カメラ位置は含めない。

```js
const cube3Definition = {
  schemaVersion: 1,
  id: "cube-3x3",
  title: "3×3×3 キューブ",

  coordinateFrame: {
    right: "+x",
    up: "+y",
    front: "+z",
  },

  faces: {
    U: { normal: [0, 1, 0], colorKey: "U" },
    D: { normal: [0, -1, 0], colorKey: "D" },
    R: { normal: [1, 0, 0], colorKey: "R" },
    L: { normal: [-1, 0, 0], colorKey: "L" },
    F: { normal: [0, 0, 1], colorKey: "F" },
    B: { normal: [0, 0, -1], colorKey: "B" },
  },

  geometry: {
    kind: "cube-grid",
    layerWidths: { x: [1, 1, 1], y: [1, 1, 1], z: [1, 1, 1] },
    cubieGap: 0.01,
    cubieCornerRadius: 0.17, // 面を詰めつつ、コーナーカットの丸い逃げを残す
    surfaceModel: "single-rounded-resin-shell-per-cubie",
    innerMechanismColor: "#77766f",
  },

  slots: [/* UFR、UF、… を表す、中心座標を持つ26個のslot */],
  pieces: [
    {
      id: "corner-UFR",
      homeSlotId: "slot-UFR",
      stickers: { U: "U", F: "F", R: "R" },
    },
    // 8 corner / 12 edge / 6 center
  ],

  orientations: [/* 有限個の離散的な向き。3×3では24通り */],
  baseMoves: {
    R: {
      rotation: { axis: [1, 0, 0], degrees: 90 },
      affectedSlotIds: [/* R層の9 slot */],
    },
    // U, F, L, D, B。' と 2 はnotation層で派生する。
  },
};
```

3×3の基準造形は、中国製ステッカーレスキューブらしい印象を目標にする。各キュービーは、面ごとに色を変えられる一体の丸い樹脂シェルとして描く。これにより、エッジの2面が接する辺、コーナーの3面が交差する頂点まで、面色が丸い立体形状の上を連続して回り込み、単に平面パネルを重ねた見た目にしない。太い黒線や色付きの縁は使わず、キュービー同士の細い隙間から中性の内部機構が見えることで境界を作る。センターのロゴは表示しない。

### 定義から生成するもの

生の定義に「個々のピースの現在位置」や、手ごとの手書きの置換表は入れない。`compileDefinition()`が次を生成・検証する。

- 各手の`slotMap`: 回転後に各slotがどのslotへ移るか
- 各手の`orientationMap`: 向きIDがどう変わるか
- 逆手と2回転の派生定義
- 手が全単射であること、4回で元に戻ること、対象外slotが不変であること

これにより、4×4以上では`layerWidths`を変えるだけで座標を作れ、将来の多面体では異なるslot群と回転角を定義して同じ状態エンジンへ渡せる。

## `PuzzleState` v1

状態はJSON化でき、浮動小数のQuaternionを保存しない。各ピースは「どのslotにいるか」と「離散的な向きID」だけを持つ。

```js
const solvedState = {
  definitionId: "cube-3x3",
  pieces: {
    "corner-UFR": { slotId: "slot-UFR", orientationId: 0 },
    "edge-UF": { slotId: "slot-UF", orientationId: 0 },
    // …全26ピース
  },
};
```

ステッカーの表示色は、`pieces[].stickers`と現在の`orientationId`を組み合わせて描画時に求める。つまり「色の配列」を状態の正本にしない。教材用の色変更やグレー化は、別の`ViewerTheme`で上書きする。

```js
// F2Lを載せ替える際に組み直す、設定形式の仮例。
const viewerTheme = {
  stickerColors: { U: "#f4f4f0", R: "#d51f73", F: "#2d9a75" },
  cubieColor: "#77766f", // ピース間の隙間に見える内部機構
  emphasis: {
    // pieceId:face。回転しても、同じ物理ステッカーを追い続ける。
    stickerIds: ["corner-DFR:D", "corner-DFR:F", "corner-DFR:R", "edge-FR:F", "edge-FR:R"],
    colors: {
      "corner-DFR:D": "#007fff", // クロス色
      "corner-DFR:F": "#ff00ff", "edge-FR:F": "#ff00ff", // 手前
      "corner-DFR:R": "#7fff00", "edge-FR:R": "#7fff00", // 横
    },
    inactiveColor: "#bfbfbf",
    dimOthers: true,
  },
  uiMode: "portfolio",
};
```

`emphasis.stickerIds`は物理ステッカーを選ぶ配列で、`emphasis.colors`にはページ固有の色を指定する。指定がないステッカーは`inactiveColor`へ寄せられる。外部ページは`createPuzzleViewer()`の`theme`へ渡すか、生成後に`viewer.setEmphasis()`で更新する。既存Web教材のF2L配色（水色＝クロス色、ピンク＝手前、黄緑＝横、グレー＝今回追わないパーツ）は、この形式が扱えることを確認するための仮例である。F2Lを独自ビューアへ移すときは、ケースごとの開始状態・注目ステッカー・配色を改めて組み直し、この仮例を引き継がない。

## 手順・再生の最小API

3×3の手順入力は、外層手`U D R L F B`、中央層`M E S`、全体回転`x y z`、2層wide move`Rw Lw Uw Dw Fw Bw`（小文字の`r l u d f b`も同義）、逆手、2回転を読める。wideと全体回転は個別の置換表ではなく、対象層を同時に回す定義で表す。画面に最初から置くショートカットボタンは`R / U / F`中心でよい。

```js
const viewer = createPuzzleViewer(document.querySelector("#viewer"), {
  puzzleId: "cube-3x3",
  initialState: solvedState,
  algorithm: "R U R' U'",
  theme: viewerTheme,
});

viewer.play();
viewer.pause();
viewer.seek(2);       // 0始まり。論理状態と表示をそろえて移動
viewer.setAlgorithm("F R U R' U' F'");
viewer.resetCamera();
viewer.destroy();
```

このAPIの入力はすべてJSON相当のデータに限定する。portfolio側の`puzzle / moves / setup`という既存のWeb再生データとも対応付けやすく、ブラウザへPythonの実行環境を持ち込まない。

## Phase 1の検証基準

- `R`を4回、または任意の手とその逆手を続けて適用すると元の状態へ戻る。
- 同じ初期状態と同じ手順は、どの再生速度でも同じ終端状態になる。
- 回転中の論理状態は開始状態のまま、完了フレームでだけ次の状態へ変わる。
- 手順位置`0〜総手数`のどこへ移動しても、表示するピース配置と状態エンジンの結果が一致する。
- 320px幅程度の画面でも、ビュー・現在手・前後移動が一度に利用できる。
- WebGL 2が使えない環境では、空のCanvasではなく説明メッセージを表示する。

## 実装済みの最小デモ

最小デモは [`3d-puzzle-viewer.html`](../../3d-puzzle-viewer.html) に実装した。共通の状態計算・定義・Three.js描画は [`assets/js/puzzle-viewer/cube3-viewer.js`](../../assets/js/puzzle-viewer/cube3-viewer.js)、画面固有の再生UIは [`assets/js/puzzle-viewer/demo.js`](../../assets/js/puzzle-viewer/demo.js) に分けている。

- Three.js r180と必要な公式アドオンは、`assets/vendor/three/r180/`に固定配置した。
- 3×3の26 slot / 26ピースと24通りの離散的な向きに加え、2×2〜7×7の表面ピース構成と各対応手の4回転・逆手を起動時に検証する。[`tests/puzzle-viewer-state.mjs`](../../tests/puzzle-viewer-state.mjs) は、wide move・全体回転を含む表記も検証する。
- 2×2〜7×7の外層、奇数層の中央層、wide、全体回転を共通の状態遷移と描画で再生できる。3Rwなどの複数層wide moveも盤面サイズに応じて使える。4×4以上の外側列は内側列より太くし、[`Rubiks_portfolio/core/cube_constants.py`](../../../Python/Rubiks_portfolio/core/cube_constants.py)の`outside_size` / `inside_size`比を表示サイズへ正規化している。前後移動、速度、視点リセット、F面の強調、基本手ボタンを実装した。ドラッグ／スワイプによる直接操作は、FRUコーナーのF面を上へ動かした際にR面が回る期待へ合わせて層選択を再設計するまで無効化している。
- キュービーを面ごとに色を変えられる一体の丸い樹脂シェルとして描き、隙間に見える中性の内部機構でステッカーレスらしい境界表現を実装した。
- WebGL 2が使えないブラウザでは、3D Canvasの代わりに対応環境を案内する。

## portfolio・教材から使う入口（実装済み）

最小デモは、外部から利用するための`createPuzzleViewer()`を持つ。初期状態はJSON化できる論理状態として渡せるほか、既存portfolioの出力に合わせ、`setup`用の手順を別に適用できる。

```js
const viewer = createPuzzleViewer(host, {
  puzzleId: "cube-3x3",
  algorithm: "R U R' U'",
  theme: DEFAULT_THEME,
  themeId: "standard",
  cameraState: { position: [5.6, 5.2, 7.4], target: [0, 0, 0] },
  speed: 1,
  onChange: (snapshot) => updateUi(snapshot),
});

viewer.setSetupAlgorithm("F2 D");
viewer.seek(2);
viewer.play();
```

`teachingSteps`を渡すと、手順位置ごとの説明文と強調設定を外部ページが所有できる。実例は[`3d-puzzle-viewer-embed-example.html`](../../3d-puzzle-viewer-embed-example.html)に置く。画面固有の操作UI・色・文章を共通部品へ混ぜず、portfolioや教材ページごとに変えられるようにする。

公開ページ [`3d-puzzle-viewer.html`](../../3d-puzzle-viewer.html) は次のURLを受け取る。`2x2`〜`7x7`と`2x2x2`〜`7x7x7`は既存データとの互換用の別名で、URLは正規の`cube-2x2`〜`cube-7x7`へ更新される。

```text
?puzzle=cube-3x3&setup=F2+D&moves=R+U+R%27+U%27&position=2&theme=focus-front&view=6.1,5.4,7.8,0,0,0
```

- `puzzle`: `cube-2x2`〜`cube-7x7`
- `setup`: 解けた状態へ先に適用する手順（省略可）
- `moves`: 再生する手順（省略可）
- `position`: 先頭を0とする現在位置（省略時は0）
- `theme`: 表示テーマ。現在は`standard`（省略時）または`focus-front`
- `view`: カメラの`x,y,z`と注視点の`x,y,z`。ページは常にこの値をURLへ書き戻す。

ツールバーの「この状態をコピー」は、その時点の手順・再生位置・テーマ・視点を含むリンクをクリップボードへコピーする。

Python側は[`core/web_playback.py`](../../../Python/Rubiks_portfolio/core/web_playback.py) の`build_own_3d_viewer_url()`で同じURLを作れる。解答画面には、3×3のときだけ有効になる「独自3Dで開く」ボタンを追加した。既存のcubing.js再生ページ用`build_web_playback_url()`と「Web で再生」ボタンは変更せず、3×3以外では引き続きそちらを使う。

## 次の設計対象

次は、NxNの見た目を実機へ寄せるための外側／内側列幅と、既存教材を独自ビューアへ載せ替えるときの開始状態・注目ステッカー・説明テキストを、手順の各位置に結び付けるデータ形式を決める。
