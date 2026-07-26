# フォルダ構成・画像素材整理レビュー

最終更新: 2026-07-26

## 1. 目的

現在のリポジトリは、最初にゲーム単体を作成し、その後にトップページ、固定ページ、YouTube最新情報取得、キャラクター紹介ページを追加してきた経緯があります。

そのため、公開サイトとしては動いているものの、以下の観点で整理余地があります。

- ゲーム専用ファイルとサイト共通ファイルの境界
- ゲーム素材、トップ素材、キャラクター素材の配置
- 旧素材、検討用ページ、試作用ページの扱い
- 今後ゲームや固定ページが増えたときの見通し

この資料では、すぐに実装する前の確認資料として、何をどう変えるか、影響がどこに出るか、どう確認・対処するかを明確にします。

## 2. 現在の状態

現在の主な構成は以下です。

```text
/
├── index.html
├── home.css
├── home.js
├── site-nav.js
├── games/
│   ├── index.html
│   ├── inutaro-mushi/
│   │   ├── index.html
│   │   ├── game.js
│   │   └── style.css
│   └── inutaro-3d-prototype/
├── pages/
├── assets/
│   ├── characters/
│   ├── fonts/
│   ├── home-city/
│   └── games/
│       └── inutaro-mushi/
├── functions/
├── scripts/
├── docs/
└── drafts/
```

現在のページ階層自体は大きく崩れていません。

```text
/                         トップページ
/games/                   ゲーム一覧
/games/inutaro-mushi/     犬タローの虫さんまってまって
/pages/characters.html    キャラクター紹介
/pages/blog.html          ブログ導線
/pages/terms.html         利用規約
/pages/privacy.html       プライバシーポリシー
```

`style.css` と `game.js` は `games/inutaro-mushi/` 専用としてゲームフォルダ内へ移動済みです。

## 3. 整理方針

基本方針は以下です。

1. 公開中のページURLは変えない
2. ゲームごとの実装はゲームフォルダ内に寄せる
3. ゲーム素材はゲーム専用アセットフォルダへ寄せる
4. サイト共通ファイルは急いで移動しない
5. 旧素材・検討用素材は、本番参照から切り離して管理する
6. 一度に大きく移動せず、確認しやすい単位で進める

最初に優先するのは、ゲーム専用ファイルとゲーム素材の整理です。

## 4. 推奨する完成形

将来的な完成形は以下です。

```text
/
├── index.html
├── home.css
├── home.js
├── site-nav.js
├── games/
│   ├── index.html
│   └── inutaro-mushi/
│       ├── index.html
│       ├── game.js
│       └── style.css
├── pages/
│   ├── characters.html
│   ├── blog.html
│   ├── terms.html
│   └── privacy.html
├── assets/
│   ├── characters/
│   ├── fonts/
│   ├── home-city/
│   ├── games/
│   │   └── inutaro-mushi/
│   │       ├── bg.jpg
│   │       ├── player_idle.png
│   │       ├── player_jump.png
│   │       ├── enemy_idle.png
│   │       ├── hazard_1.png
│   │       ├── hazard_2.png
│   │       ├── item_a.png
│   │       ├── item_b.png
│   │       ├── item_c.png
│   │       ├── bgm.mp3
│   │       ├── sound_jump.mp3
│   │       ├── sound_itemget.mp3
│   │       └── sound_hazard-hit.mp3
│   └── vendor/
├── functions/
├── scripts/
├── docs/
└── drafts/
```

`home.css`、`home.js`、`site-nav.js` は将来的には `assets/site/` へ移す案もありますが、現在は複数ページから参照されており、影響範囲が広いため後回しにします。

## 5. 今回の実施内容

### 実施A: ゲームJS/CSSをゲームフォルダへ移動

変更前:

```text
/game.js
/style.css
/games/inutaro-mushi/index.html
```

変更後:

```text
/games/inutaro-mushi/game.js
/games/inutaro-mushi/style.css
/games/inutaro-mushi/index.html
```

`games/inutaro-mushi/index.html` の参照は以下のように変更します。

```html
<!-- 変更前 -->
<link rel="stylesheet" href="../../style.css?...">
<script src="../../game.js?..."></script>

<!-- 変更後 -->
<link rel="stylesheet" href="./style.css?...">
<script src="./game.js?..."></script>
```

影響:

- ゲームページだけに影響します
- トップページ、ゲーム一覧、キャラクター紹介ページには直接影響しません
- `style.css` 内のフォント参照パスが変わります

対応:

- `style.css` のフォント参照を `../../assets/fonts/...` に変更します
- キャッシュバスターを更新し、古いCSS/JSが残らないようにします

### 実施B: ゲーム素材をゲーム専用アセットフォルダへ移動

変更前:

```text
assets/bg.jpg
assets/player_idle.png
assets/player_jump.png
assets/enemy_idle.png
assets/hazard_1.png
assets/hazard_2.png
assets/item_a.png
assets/item_b.png
assets/item_c.png
assets/bgm.mp3
assets/sound_jump.mp3
assets/sound_itemget.mp3
assets/sound_hazard-hit.mp3
```

変更後:

```text
assets/games/inutaro-mushi/bg.jpg
assets/games/inutaro-mushi/player_idle.png
assets/games/inutaro-mushi/player_jump.png
assets/games/inutaro-mushi/enemy_idle.png
assets/games/inutaro-mushi/hazard_1.png
assets/games/inutaro-mushi/hazard_2.png
assets/games/inutaro-mushi/item_a.png
assets/games/inutaro-mushi/item_b.png
assets/games/inutaro-mushi/item_c.png
assets/games/inutaro-mushi/bgm.mp3
assets/games/inutaro-mushi/sound_jump.mp3
assets/games/inutaro-mushi/sound_itemget.mp3
assets/games/inutaro-mushi/sound_hazard-hit.mp3
```

影響:

- ゲーム画面の描画
- あそびかたモーダル内の画像
- リザルトモーダル内の虫画像
- 共有用リザルト画像生成
- BGM、ジャンプ音、虫ゲット音、カラスの落とし物に当たった音

対応:

`games/inutaro-mushi/index.html` 内の説明画像参照を変更します。

```html
<!-- 変更前 -->
../../assets/item_a.png

<!-- 変更後 -->
../../assets/games/inutaro-mushi/item_a.png
```

`games/inutaro-mushi/game.js` のアセット基準URLを変更します。

```js
// 変更前
const assetBaseUrl = new URL("assets/", scriptUrl);

// 変更後
const assetBaseUrl = new URL("../../assets/games/inutaro-mushi/", scriptUrl);
```

この変更により、`assetUrl("item_a.png")` のようなゲーム内参照はすべてゲーム専用アセットフォルダを見るようになります。

### 実施C: サイト共通ファイルは今回は移動しない

対象:

```text
home.css
home.js
site-nav.js
```

理由:

- トップページ、ゲーム一覧、固定ページが共通で参照しています
- ここを移動すると全ページのCSS/JS参照変更が必要になります
- 現在の課題は主にゲーム専用ファイルと素材の混在であり、共通ファイル移動は急ぎではありません

今後の候補:

```text
assets/site/site.css
assets/site/home.js
assets/site/site-nav.js
```

この整理は、ページ数がさらに増えてから実施する方が安全です。

### 実施D: 旧素材・未使用候補はすぐ削除しない

現在、以下は本番の主要参照から外れている、または旧素材候補です。

```text
assets/home-city/city_*.png
assets/home-city/youtube-latest-thumb.jpg
assets/html2canvas.min.js
data/news.json
drafts/
games/inutaro-3d-prototype/
```

影響:

- すぐ削除すると、検討中デザインや過去案の再利用ができなくなる可能性があります
- `drafts/` は本番導線ではありませんが、検討用ページとして価値があります
- `games/inutaro-3d-prototype/` は現時点では公開対象に含めない方針です

対応:

- 今回の整理では削除しません
- 本番参照に使われていないことだけ確認します
- 後続で「削除」「draftsへ移動」「archiveへ移動」を決めます

## 6. 変更によるリスクと対応

| リスク | 内容 | 対応 |
| --- | --- | --- |
| 画像が表示されない | HTMLまたはJSの参照パス変更漏れ | `rg` で旧パスを検索し、ゲーム画面とあそびかたを目視確認 |
| 音が鳴らない | 音声ファイルの移動後に `assetUrl()` が誤った場所を見る | ジャンプ、虫ゲット、ゲームオーバー、BGMをローカルで確認 |
| フォントが戻る | `style.css` 移動により `assets/fonts` の相対パスが変わる | `../../assets/fonts/...` に修正し、初期表示を確認 |
| 共有画像が崩れる | Canvas生成時に移動後の画像を取得できない | リザルト保存、共有画像生成を確認 |
| GitHub Pagesのキャッシュ | 公開直後に古いHTMLが旧JS/CSSを参照する可能性 | CSS/JSのクエリを更新。必要なら旧ルートJS/CSSを1リリースだけ残す |
| 今後の素材更新ミス | HTMLとJSで同じ素材を別々に参照している | 移動後の素材置き場を `assets/games/inutaro-mushi/` に統一 |

## 7. 実装・確認順序

今回は以下の順で実装・確認します。

### Step 1: 準備

- 現在の参照を `rg` で確認
- 移動対象の画像・音声・CSS・JSを確定
- 旧素材や検討用フォルダは触らない

### Step 2: ゲームファイル移動

- `game.js` を `games/inutaro-mushi/game.js` へ移動
- `style.css` を `games/inutaro-mushi/style.css` へ移動
- `games/inutaro-mushi/index.html` のCSS/JS参照を更新
- `style.css` のフォント参照を更新

### Step 3: ゲーム素材移動

- ゲーム用画像・音声を `assets/games/inutaro-mushi/` へ移動
- `game.js` の `assetBaseUrl` を更新
- `games/inutaro-mushi/index.html` の説明画像・リザルト画像参照を更新

### Step 4: ローカル確認

確認対象:

- ゲームスタート画面
- あそびかたモーダル
- PC操作
- SP固定横画面
- ジャンプ、左右移動、虫ゲット、カラスの落とし物
- BGMと効果音
- クリア、ゲームオーバー、リザルト
- 保存、共有、フォロー導線

確認URL例:

```text
http://127.0.0.1:8780/games/inutaro-mushi/?asset-refactor-local=20260705
```

### Step 5: 静的確認

```text
rg "assets/(bg|player_|item_|hazard_|enemy_|sound_|bgm)" .
rg "game.js|style.css" games/inutaro-mushi index.html games/index.html pages
git diff --check
```

旧パスが残っている場合は、その参照が意図したものか確認します。

## 8. 今回はやらないこと

以下は今回の整理では実施しません。

- `home.css`、`home.js`、`site-nav.js` の移動
- `drafts/` の削除
- `games/inutaro-3d-prototype/` の削除
- 旧 `city_*` 素材の削除
- `html2canvas.min.js` の削除
- `data/news.json` の削除
- OGP画像URLの公開ドメイン方針変更

理由は、ゲームファイル・ゲーム素材の整理と同時に行うと確認範囲が広くなりすぎるためです。

## 9. 実施後の状態

今回、最も効果が大きく、影響範囲を管理しやすい以下の修正を実施しました。

```text
game.js / style.css を games/inutaro-mushi/ に移動
ゲーム画像・音声を assets/games/inutaro-mushi/ に移動
```

これにより、次の状態になります。

- ゲーム単位のファイルがまとまる
- 画像・音声の所属が明確になる
- 次のゲームを追加したときに素材が混ざりにくくなる
- トップページやキャラクター紹介ページへの影響を抑えられる

公開影響としては、ゲームページの画像・音声・フォント参照が主な確認対象です。

そのため、実装後は必ずローカルでゲームプレイとモーダル表示を確認し、問題がなければGitHubへ反映します。

## 10. 実装後の確認結果

2026-07-05時点で、以下を確認済みです。

| 確認項目 | 結果 |
| --- | --- |
| ゲームHTML | `http://127.0.0.1:8780/games/inutaro-mushi/` で表示 |
| CSS | `games/inutaro-mushi/style.css` を読み込み |
| JS | `games/inutaro-mushi/game.js` を読み込み |
| ゲーム画像 | `assets/games/inutaro-mushi/` 配下から読み込み |
| ゲーム音声 | BGM、ジャンプ、虫さん取得、カラスの落とし物命中音がHTTP 200 |
| あそびかた | 説明内の画像が新パスで読み込み |
| ゲーム開始 | `はじめる` から開始 |
| 結果表示 | 制限時間終了後に `けっかへ`、リザルト表示 |
| ブラウザコンソール | 警告・エラーなし |
| 静的チェック | `git diff --check` 問題なし |

この整理により、ゲーム追加時は以下の2か所をセットで追加するルールになります。

```text
games/{game-slug}/
assets/games/{game-slug}/
```

## 11. 2026-07-26時点の追加確認

サイト全体のページ拡張後に、改めてフォルダ構成と素材管理を確認しました。

主要ページは以下の構成で維持します。

```text
/                         えりぬいシティ トップ
/games/                   ゲーム一覧
/games/inutaro-mushi/     犬タローの虫さんまってまって
/pages/characters.html    キャラクター紹介
/pages/blog.html          おしらせ・ブログ
/pages/terms.html         利用規約
/pages/privacy.html       プライバシーポリシー
```

ゲーム本体ファイルとゲーム素材はすでに以下へ整理済みです。

```text
games/inutaro-mushi/
assets/games/inutaro-mushi/
```

この部分は現時点で大きな追加整理は不要です。

## 12. 現在の未追跡ファイル

2026-07-26時点で、以下の未追跡ファイルがあります。

```text
assets/home-city/city_blog1.png
assets/home-city/city_character.png
assets/home-city/city_game.png
assets/home-city/city_linestamp.png
assets/home-city/city_shop.png
assets/home-city/city_sns1.png
assets/home-city/city_sns2.png
assets/home-city/city_youtube.png
assets/home-city/youtube-latest-thumb.jpg
docs/server-migration-plan.md
drafts/
games/inutaro-3d-prototype/
```

これらは、現在の本番トップで使っている `map_*` 素材や、ゲーム本体の素材とは別の扱いです。

## 13. 未追跡ファイルの整理方針

| 対象 | 現状 | 方針 |
| --- | --- | --- |
| `assets/home-city/city_*.png` | 旧マップ素材候補 | 本番参照がなければ削除、または `drafts/` へ移動 |
| `assets/home-city/youtube-latest-thumb.jpg` | 旧YouTubeサムネ候補 | `youtube-thumb-1..3.jpg` 運用へ統一し、未使用なら削除 |
| `drafts/` | 検討用ホームワイヤー | Git管理しない検討用として残すか、必要ならREADMEを付けて正式管理 |
| `games/inutaro-3d-prototype/` | 3Dゲーム試作 | 本番ゲーム一覧に載せない限り公開対象外。残すなら試作用と明記 |
| `docs/server-migration-plan.md` | サーバー移行メモ | Cloudflare移管資料として正式化するか削除候補にする |

削除または移動の前に、以下で参照がないことを確認します。

```text
rg "city_" .
rg "youtube-latest-thumb" .
rg "inutaro-3d-prototype" .
rg "server-migration-plan" docs .
```

## 14. 次回実装時の注意点

未追跡ファイル整理は、本番ページの見た目変更とは分けて行います。

推奨順序:

1. OGP・共有URLなど公開情報の整合性修正
2. トップページの `draft-*` クラス名整理
3. イラスト導線の未設定解消
4. 未追跡ファイルの分類と削除・アーカイブ判断

これにより、公開ページの表示確認とファイル整理の影響範囲を分けて確認できます。
