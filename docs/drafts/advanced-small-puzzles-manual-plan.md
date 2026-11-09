# 2x2・ピラミンクス・スキューブ上級手順書｜構成と資料

確認日: 2026-11-06

## 読者と編集方針

読者は3x3のCFOP（フルOLL・PLL）を使え、3種目とも完走できる。各章は「何を見てケースを決めるか」「次のピースをいつ見るか」「手順をどう検証するか」の順に書く。手順集の各図は完成状態から掲載手順を逆実行して作り、その状態で掲載手順を再実行して完成することを確認する。2x2とピラミンクスの元資料の手順は、面名を回転対称で置き換えた教材用の同型手順として掲載し、図もその手順から生成する。

## 分冊

| 冊 | 章構成 | ケース範囲 |
| --- | --- | --- |
| 2x2 | 記法、first faceの分類、CLL/EG-1/EG-2、認識図鑑、先読み演習 | CubingAppの非自明40ケース×3=120件 |
| ピラミンクス | 記法、V字構築、L4E、解法選択、認識図鑑、先読み演習 | CubingApp L4Eの35件 |
| スキューブ | 記法の相違、Advanced Sarah、NS、認識と練習、状態演習 | 独自アプリの回転定義で往復検証した演習6件。Sarah/NSの全ケース表は参照先を示す |

## 記法の統一

- 大文字の面回転はその面／頂点を正面から見て時計回り。プライムは逆方向、2は180°（2x2のみ）。手順は左から右へ実行。
- 2x2: U D F B L R。x/yは持ち替えとして説明するが、本文の掲載手順には使わない。
- ピラミンクス: U L R Bは大きな層の120°回転、小文字はチップの120°回転。掲載手順は大文字のみ。
- スキューブ: WCA方式のR/U/L/Bを優先し、対角線反対側の頂点はoR/oU/oL/oB（oはopposite）と書く。旧3面表記（例 URF、ULB）は読み込み時に変換する。SarahのS/HとNS/FCNの字面を直接混ぜず、換算が必要な場合は別途状態検証する。

## 数え方の差

- 2x2は資料によりCLL・EG-1・EG-2を各42とする一方、CubingAppの一覧は各40の非自明ケースを並べる。資料の「40」は掲載された非自明ケース数、「42」は別の集計慣習による総数として併記し、差を同一集合の誤差と扱わない。EG-2を43と示す資料もあるため、AUF・解決済み・派生セットを含む境界を確認せず数だけ比較しない。
- ピラミンクスはCubingAppのL4E分類で5+6+8+8+8=35件。別資料は37件と数える。AUF、対称形、L3Eへ還元する例の数え方が一致しない。
- スキューブはSarah本人のAdvanced Variationで最終段階134ケース。NS2 trainerは131と表示されるが、同じ分類表だと仮定しない。NSは最終段階の高速な手順体系として参照し、SarahのS/H手順と同一視しない。

## 主な資料

1. [CubingApp 2x2 CLL](https://cubingapp.com/algorithms/2x2-CLL)、[EG1](https://cubingapp.com/algorithms/2x2-EG1)、[EG2](https://cubingapp.com/algorithms/2x2-EG2): ケース名と手順の照合。
2. [J Perm: 2x2 faster](https://www.jperm.net/2x2/faster): first faceの分類と手順数の別表記。
3. [CubingApp Pyraminx L4E](https://cubingapp.com/algorithms/Pyraminx-L4E): 35件の分類と手順。
4. [Cubing Pro: V first / L4E](https://www.cubingpro.com/static/cubingpro.com_pyraminx_v_first_alg.pdf): V firstの工程とAUFの扱い。
5. [Sarah Strong: Sarah's Method](https://sarah.cubing.net/skewb/my-method)、[Sarah's case PDF](https://sarah.cubing.net/skewb/advanced-variation-by-case.pdf): 開発者による記法・Advanced Variation・134件。
6. [Cubing Pro: Skewb notation and Advanced Sarah](https://cubingpro.com/skewb/sarah_advanced): FCN、NS、S/Hの記法上の区別。
7. [CubingApp Sarah Advanced](https://cubingapp.com/algorithms/Sarah-Advanced)、[NS2 Trainer](https://mihlefeld.github.io/Skewb-NS2-Trainer/): ケース体系と数え方の比較。

## 既存資産との接点

- [3Dパズルビューア仕様](3d-puzzle-viewer-spec.md)では2x2以降をPuzzleDefinitionとして拡張し、ピラミンクスとスキューブの120°回転をPhase 3の検証対象にしている。Skewbビューアと教材データで同じ回転記号を使う。
- 公開Webには[3d-puzzle-viewer.html](../../3d-puzzle-viewer.html)と[cubing.js再生ページ](../../twisty-puzzle-ai-lab-playback.html)がある。既存再生は維持する。
- Python portfolioの `cube/rubiks_cube.py`、`pyraminx/cube.py`、`skewb/cube.py` の状態遷移をPDF図の生成と往復検証に使う。将来の教材機能では `puzzleId / notation / caseId / setup / algorithm / focusPieces / source` を1ケースのデータとして渡せる。
- その形式の教材データを `assets/data/advanced-small-puzzles/2x2.json`、`pyraminx.json`、`skewb.json` に保存した。PDFは同じデータから `tools/build_advanced_small_puzzles_manuals.py` で再生成する。
- PDFのケース図はPython portfolioのStateViewerと同じ面配置・ステッカー向きを持つ、共有辺でつながる展開図とする。日本語本文は通常ウェイトの読みやすいフォントをPDFに埋め込む。

## 検証の限界

逆手順で生成した状態から元手順で完成する往復検証は、図と文字列の整合を示す。掲載元が意図した最短性、指使いの速さ、個々のケース名の分類境界まで証明するものではない。スキューブのSarah/NS原表は本版では機械的な記法変換を行わず、未検証手順を掲載しない。
