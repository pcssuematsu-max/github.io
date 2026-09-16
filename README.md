# キューブ王国と、その外側。

ルービックキューブのマニュアルを中心に、制作物や旅の記録をまとめた静的Webサイトです。

## フォルダ構成

```text
.
├── index.html              # トップページ
├── *.html                  # 公開ページ（既存URLを保つため直下に配置）
├── assets/
│   ├── css/                # ページ共通・マニュアル用スタイル
│   ├── js/                 # ページ共通・図版生成スクリプト
│   ├── images/
│   │   ├── cube/           # キューブの手順・パターン図
│   │   └── site/           # ロゴ・プロフィール画像
│   └── projects/           # 制作物ごとの掲載素材
├── docs/                   # 制作メモ・デザイン元データ
│   ├── drafts/              # 検討中の原稿・要件メモ
│   └── references/          # 参照用の下書き・資料
├── downloads/              # 配布用PDF
├── tools/                  # PDF生成などの補助ツール
├── output/                 # 生成済み成果物
└── tmp/                    # 制作・確認用の一時ファイル
```

作品ページの原稿は、用途別に次の2ファイルへ分けています。

- `docs/drafts/ai-lab-playback-requirements.md`：AI Labの手順再生ページに関する要件メモ
- `docs/drafts/3d-puzzle-viewer-spec.md`：独自3Dパズルビューアの仕様窓口。Google Docsの正本リンク、同期情報、設計原則、段階的な開発計画を記録
- `docs/drafts/3d-puzzle-viewer-phase-1.md`：Three.js採用、状態とアニメーションの分離、`PuzzleDefinition` / `PuzzleState`の初期設計
- `docs/drafts/3d-puzzle-viewer-phase-1-ui-and-cube.md`：PC・スマホのUIワイヤー、操作規約、3×3のslot・ピース・面回転の生成規約

3Dパズルビューアに触れる作業では、リポジトリ直下の `AGENTS.md` と上記の仕様窓口を先に確認します。仕様の正本は、仕様窓口からリンクしているGoogle Docsです。

`tmp/` と `output/` は、PDF生成や表示確認で作られるローカル生成物です。公開サイトには使わず、Git管理もしません。

## 3Dパズルビューア試作

[`3d-puzzle-viewer.html`](3d-puzzle-viewer.html) は、独自3Dビューアの2×2〜7×7デモです。外層・中央層・wide move・全体回転を含む手順の入力、再生、一手送り・戻し、視点操作、速度変更、教材向けのF面強調を確認できます。開始状態・手順・現在位置・視点・テーマはURLで再現でき、「この状態をコピー」で共有リンクを作れます。[`twisty-puzzle-ai-lab-playback.html`](twisty-puzzle-ai-lab-playback.html)のAI成果はこのビューアで再生し、自由入力ツールと未対応パズルを含む既存例は`cubing.js`版を維持しています。

### なぜ自前で作るのか

自前の3Dビューアを作る背景と、既存の手段では足りなかった点は、[motivation.md](motivation.md) に記入式でまとめています。教材・portfolio・AI探索結果で同じ部品を使う理由を、自分の言葉で追記していくためのメモです。

## GitHub Pages

`main` ブランチのリポジトリ直下をGitHub Pagesで公開します。公開ページのURLを維持するため、HTMLファイルは直下に残し、画像・CSS・JavaScriptなどの素材だけを用途別に整理しています。

公開URLが決まったら、各ページにcanonical URLとOGPの絶対URLを追加すると、SEOとSNS共有の精度をさらに高められます。
