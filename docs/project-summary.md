# エリカッテシティ / 犬タローゲーム 開発まとめ

最終更新: 2026-10-20（共通デザイン・ゲーム一覧カード・ラベル撤去まで反映）

本資料を現在状態の入口とする。正式名称は「エリカッテシティ」、本番は `https://erinui.com/`。過去の制作記録と現行仕様が異なる場合は、ユーザーの追加指示と[TOP改修SDD](top-redesign-sdd.md)第15〜21節、[総合仕様](site-specification.md)、[画面設計](screen-design-specification.md)を優先する。

### 現在の反映状態

| 改修 | 状態・確認範囲 |
| --- | --- |
| TOP v2・ニュース新着順／最大12件 | GitHub main・本番へ公開済み。仕様と当時の検証はSDD第14〜17節 |
| 共通ヘッダー・下層の背景／傾き／旧ラベル整理 | `6a24d32` で公開確認済み。SDD第18〜19節 |
| ゲーム一覧の共通カード化・ゲーム風景画像 | `4d6d6fe` で公開、検証記録は `5dfa27c`。CI全209件合格・本番PC/SP確認済み。SDD第20節 |
| TOPニュース以外のラベル18件撤去 | ローカル実装・公開用ビルド・関連60試験・8幅×2ページの確認済み。GitHub／本番未反映。SDD第21節 |
| 今回の資料整備 | 資料のみ更新。追加のソース改修・Figma変更・GitHub公開・本番再検証は行っていない |

ラベル撤去はゲームの補足2件・状態2件とキャラクターの特徴14件。ニュース分類、見出し・名前の黄色背景、操作ボタン、ゲームHUD、通常テキストの日付・価格等は維持する。PCのオリジン画像面だけ最小高380pxを確保し、頭のはみ出し演出を保つ。

確認用サーバーの起動方法は `node scripts/preview-site.mjs --built`。直近の確認URLは `http://127.0.0.1:58033/` だが、ポートは起動ごとに変わる。証跡は `drafts/card-label-removal-20261020/` に保存し、公開対象には含めない。物理端末・Safariは今回再検証していない。2026-10-19〜20のWeb追加改修をFigmaへ同期済みとは扱わない。

## 1. 目的

この資料は、現在のサイト全体像を短く把握するための概要資料です。

詳細は以下を参照します。

| 資料 | 内容 |
| --- | --- |
| `docs/site-specification.md` | サイト全体の構成、仕様、技術設計、デザインルール |
| `docs/site-structure.md` | ページ階層と導線 |
| `docs/site-improvement-plan.md` | 未着手項目、改善設計、実装手順 |
| `docs/game-design-spec.md` | ゲーム「犬タローの虫さんまって×2」の詳細仕様 |
| `docs/youtube-latest-api.md` | YouTube最新情報取得の設計 |
| `docs/home-latest-content.md` | トップのYouTube、note、SUZURI、LINEスタンプ最新情報表示 |
| `docs/performance-optimization-review.md` | ゲームパフォーマンス改善検討 |
| `docs/directory-structure-review.md` | フォルダ構成、素材整理、公開対象の確認 |
| `docs/screen-design-specification.md` | 現行の共通・下層デザイン仕様と、Figma制作当時の測定記録 |
| `docs/top-redesign-sdd.md` | 追加要件、実装・試験・本番確認、未公開差分の正本 |
| `docs/top-redesign-design-spec.md` / `docs/top-redesign-detail-spec.md` | TOPの意図・共通パーツ／寸法・操作契約 |
| `docs/figma-copy-change-plan.md` | 改修案の文言差分、確定事項、未確定事項、反映・検証手順 |

## 2. 現在の全体像

現在は `erinui/inutaro-game` リポジトリで、以下をまとめて管理しています。

- エリカッテシティ トップ
- ゲーム一覧
- ゲーム「犬タローの虫さんまって×2」
- キャラクター紹介
- イラスト
- おしらせ・ブログ
- 利用規約
- プライバシーポリシー
- YouTube最新情報取得ロジック

現在の公開URL:

```text
https://erinui.com/
```

旧公開先（移転案内・canonicalで本番へ誘導）:

```text
https://erinui.github.io/inutaro-game/
```

## 3. ページ構成

```text
/
├── index.html
│   └── エリカッテシティ トップ
├── games/
│   ├── index.html
│   └── inutaro-mushi/
│       ├── index.html
│       ├── game.js
│       └── style.css
├── pages/
│   ├── characters.html
│   ├── illustrations.html
│   ├── blog.html
│   ├── terms.html
│   └── privacy.html
└── assets/
    ├── home-city/
    ├── characters/
    ├── fonts/
    └── games/inutaro-mushi/
```

トップページは「まちを歩く」マップ型ナビゲーションを中心に、ゲーム、キャラクター、SNS、YouTube、ブログ、グッズ、LINEスタンプへの導線を持ちます。

## 4. 主要機能

| 領域 | 内容 |
| --- | --- |
| トップ | 1100px以上は左固定マップ＋右7枠、未満は縦積み。ニュース→キャラクター紹介→ゲーム→YouTube→ブログ→グッズ→LINEスタンプ |
| ゲーム一覧 | TOPと共通の枠・影・余白、ゲーム風景画像上／本文下。PC2列、700px以下1列。状態・補足ラベルはローカルで撤去済み |
| ゲーム本体 | 40秒の虫さん捕獲ゲーム、固定横画面、保存・共有、音声 |
| キャラクター紹介 | 画像込みプロフィールカード、左右交互配置、犬タローのはみ出し演出 |
| イラスト | 将来のイラスト掲載用ページ。現在は準備中表示 |
| 外部リンク | X、YouTube、note、SUZURI、LINEスタンプ |
| YouTube | マップ看板では最新3本と登録者数を10秒ごとに切り替え、カルーセルでは最新5本とand moreを表示 |
| ブログ・グッズ・LINEスタンプ | note、SUZURI、LINE STOREの最新導線をカルーセルで表示。noteはRSSと記事OGP画像を定期取得し、サイト内へ保存したサムネイルを使用 |

## 5. デザイン方針

- 手描き感のあるポップな公式サイト
- 黒い枠と影、黄色の見出し・名前背景、共通ルールのカード
- サイト全体で `けいなんポップ体` を使用
- テキストの白・灰色ドロップシャドウは控え、読みやすさを優先
- トップと下層ページで共通ヘッダーの見た目を統一
- SPでは三本線メニューに集約
- 下層もTOPと同じキャラクターパターン。丸い背景装飾・見出しの傾きは使わない
- 補足ラベルはTOPニュースのカテゴリだけ。ゲーム・キャラクターの撤去はローカル検証済みで、本番反映は別工程

## 6. 技術構成

| ファイル | 役割 |
| --- | --- |
| `index.html` | トップページ |
| `home.css` | トップ、下層ページ、共通ヘッダーのスタイル |
| `home.js` | YouTube看板、マップ装飾、最新コンテンツカルーセル |
| `site-nav.js` | SPメニュー |
| `games/index.html` | ゲーム一覧 |
| `games/inutaro-mushi/index.html` | ゲーム本体HTML |
| `games/inutaro-mushi/style.css` | ゲームUI |
| `games/inutaro-mushi/game.js` | ゲームロジック |
| `functions/api/latest-youtube.js` | 旧Pages Functions用API。現行の静的アセットWorkerでは実行しない |
| `scripts/build-site.mjs` | 公開8HTML・許可ファイル、ハッシュ付きコード／画像・分割フォント・初期データを組み立てる |
| `config/home-performance-assets.json` | 入力素材から公開用出力への参照・SHA・寸法の管理 |
| `scripts/update-home-latest.mjs` | 取得先別に検証し、正常分のみをmainへ反映する通常更新の入口 |
| `scripts/update-youtube-latest.mjs` | GitHub Actions用YouTube更新 |
| `scripts/update-note-latest.mjs` | GitHub Actions用note RSS更新 |
| `scripts/update-suzuri-latest.mjs` | GitHub Actions用SUZURI商品更新 |

## 7. 公開・更新

- 開発元は `main`
- 本番はCloudflare Workers Buildsがmainから公開用distを生成・配信。旧GitHub Pagesはmainのルート公開を維持
- YouTube、note、SUZURIはGitHub Actions `10 */4 * * *`（UTC基準、JSTの01/05/09/13/17/21時10分。実行遅延あり）で更新。LINEは手動JSON管理
- 本番ブラウザは静的JSONを優先し、秘密情報や取得トークンを配信しない。取得失敗時は直前の正常データを保持
- 資料・テスト・drafts・試作・functions・秘密設定は本番distへ入れない

## 8. 未設定・検討中

| 項目 | 状態 |
| --- | --- |
| イラストページ | 仮ページを設置済み。内容は今後追加 |
| ブログ内製化 | 現在はnoteへの外部導線 |
| ラベル撤去の公開 | ローカルで完了。本番公開は別途依頼後、最新mainの自動更新データを保持して実施 |
| Figma同期 | 今回のWeb追加改修を反映していない。資料の更新をFigma更新と混同しない |
| 問い合わせ・ファンアート用途 | 未確定。新規ページや送信機能を実装済みとは扱わない |
| `drafts/home-wireframe/` | 検討用。本番導線とは分離 |
| `games/inutaro-3d-prototype/` | 試作。本番ゲーム一覧には未掲載 |

## 9. 過去の改善対応計画（2026-07-26）

以下は2026-07-26時点の記録。旧ドメインや移管予定を現行仕様に戻さない。直近の状態は冒頭の表、改善設計の履歴は `docs/site-improvement-plan.md` を参照する。

| 優先度 | 項目 | 方針 |
| --- | --- | --- |
| 高 | OGP・共有URL | 現在の公開URL `https://erinui.github.io/inutaro-game/` に合わせて実装済み |
| 高 | 公開ブランチ記述 | 監査時に見つかった `gh-pages` 前提を `main` 公開前提へ更新済み |
| 高 | `draft-*` クラス名 | 本番トップの検討用命名を `site-*` 系へ整理済み |
| 高 | 未追跡ファイル | 旧素材、検討用、試作を分類して扱いを決める |
| 中 | イラスト導線 | `href="#"` を解消し、仮ページへ接続済み |
| 中 | 固定ページOGP | キャラクター、ブログ、規約、ポリシー、イラストに基本OGPを追加済み |
| 中 | YouTubeリンク | ユーザー向けリンクをハンドルURLへ統一済み |
