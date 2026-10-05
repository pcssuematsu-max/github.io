# [ばかとえーあいのすたじお](https://pcssuematsu-max.github.io/github.io/)

スピードキューブ、パズルAI、数学、旅行などの「好き」を、人とAIで作品・知識・体験にする活動拠点です。

公開サイト: [ばかとえーあいのすたじお](https://pcssuematsu-max.github.io/github.io/)

## 主な内容

- **キューブ王国** — 3×3・4×4の初心者向け手順、回転記号、F2L・OLL・PLLの解説
- **パズルとAI** — 自作3Dパズルビューア、探索アルゴリズムの実験、カードゲーム
- **数学と旅の記録** — キューブを題材にした数学記事と、各地を訪ねた旅の記録

## 公開と構成

静的なHTML・CSS・JavaScriptで作成し、`main` ブランチのリポジトリ直下をGitHub Pagesで公開しています。既存URLを保つため、公開ページのHTMLはリポジトリ直下に置き、素材は `assets/`、制作メモは `docs/` にまとめています。

3Dパズルビューアに関わる作業では、リポジトリ直下の [`AGENTS.md`](AGENTS.md) と [`docs/drafts/3d-puzzle-viewer-spec.md`](docs/drafts/3d-puzzle-viewer-spec.md) を先に確認してください。

## 確認

公開ページを変更したときは、次のテストでGoogle Analyticsの共通タグとサイトマップを確認できます。

```bash
python3 tests/analytics_tag_test.py
python3 tests/sitemap_test.py
```

HTMLページ、計測スクリプト、またはテストをGitHubへpushしたときにも、同じテストが自動実行されます。
