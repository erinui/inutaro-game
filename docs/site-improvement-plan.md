# サイト全体 改善対応計画

最終更新: 2026-07-26

## 1. 目的

この資料は、サイト全体を確認して見つかった未着手項目、実装と資料の不整合、今後改善すべき箇所について、修正前に設計と実装手順を整理するための計画書です。

現時点では実装修正に入らず、以下を明確にします。

- どこを修正対象にするか
- なぜ修正が必要か
- どのような方針で修正するか
- 修正時に影響する範囲
- 実装後に何を確認するか

## 2. 現在の前提

| 項目 | 現在の扱い |
| --- | --- |
| リポジトリ | `erinui/inutaro-game` |
| 現在の公開URL | `https://erinui.github.io/inutaro-game/` |
| 将来的な親ホーム想定 | `https://erinui.github.io/` |
| 開発・反映ブランチ | `main` |
| GitHub Pages公開元 | `main` のルートを前提 |
| YouTube更新 | GitHub Actionsで4時間ごとの10分に実行 |
| Cloudflare移管 | 将来検討。現時点ではGitHub Pagesの静的公開が前提 |

現在の実装では、公開URLがプロジェクトページ配下の `https://erinui.github.io/inutaro-game/` です。

そのため、OGPや共有URLなど、外部サービスから参照される絶対URLは、現時点では `/inutaro-game/` を含める必要があります。

将来的に `https://erinui.github.io/` 直下へ移行する場合は、そのタイミングで絶対URLをまとめて切り替えます。

## 3. 対応対象の一覧

| 優先度 | 対応項目 | 状態 | 修正方針 |
| --- | --- | --- | --- |
| 高 | OGP・共有URLの整理 | 実装済み | 現在の公開URL `https://erinui.github.io/inutaro-game/` に合わせた |
| 高 | 資料の公開ブランチ記述 | 実装済み | `main` 公開前提へ更新した |
| 高 | 本番トップの `draft-*` クラス名 | 実装済み | `site-*` / `hero-*` 系へ統一した |
| 高 | 未追跡ファイルの扱い | 旧素材、検討用、試作が未追跡で残っている | 残す、削除、アーカイブ、管理対象化を分類する |
| 中 | イラスト導線 | 実装済み | 仮ページ `pages/illustrations.html` を作成した |
| 中 | 固定ページのOGP | 実装済み | キャラクター、ブログ、規約、ポリシー、イラストへ基本OGPを追加した |
| 中 | YouTubeリンク表記 | 実装済み | ユーザー向けURLはハンドルURLへ統一した |
| 中 | YouTube看板の初期表示 | 実装済み | `取得中` の初期文言にし、JS/JSONで更新する |
| 低 | Cloudflare用関数の配置説明 | GitHub Pagesでは実行されない | 将来用であることを資料に明記する |
| 低 | `.DS_Store` | ローカル生成ファイルが存在 | `.gitignore` 維持、不要ファイル削除を検討する |

## 4. URL・OGP設計

### 4.1 現在の方針

現時点では、外部共有で使われるURLは以下を基準にします。

```text
https://erinui.github.io/inutaro-game/
```

ページごとのURLは以下です。

| ページ | OGP URL |
| --- | --- |
| トップ | `https://erinui.github.io/inutaro-game/` |
| ゲーム一覧 | `https://erinui.github.io/inutaro-game/games/` |
| 犬タローの虫さんまって×2 | `https://erinui.github.io/inutaro-game/games/inutaro-mushi/` |
| キャラクター紹介 | `https://erinui.github.io/inutaro-game/pages/characters.html` |
| イラスト | `https://erinui.github.io/inutaro-game/pages/illustrations.html` |
| おしらせ・ブログ | `https://erinui.github.io/inutaro-game/pages/blog.html` |
| 利用規約 | `https://erinui.github.io/inutaro-game/pages/terms.html` |
| プライバシーポリシー | `https://erinui.github.io/inutaro-game/pages/privacy.html` |

### 4.2 アセットURL

HTML内の通常画像、CSS、JS、フォントは、現在のように相対パスを使います。

OGP画像やTwitter画像は外部サービスから取得されるため、絶対URLを使います。

```text
https://erinui.github.io/inutaro-game/assets/icon-192.png
```

### 4.3 ゲーム内共有URL

ゲーム内の共有URLは、固定の絶対URLへ書く場合は現在の公開URLに合わせます。

より安全にする場合は、実行中のページURLからクエリ文字列を除いたURLを使う方針にします。

```js
const siteUrl = `${location.origin}${location.pathname}`;
```

ただし、ローカル確認時の共有文言までローカルURLになる可能性があります。公開URLを優先する場合は、環境ごとに扱いを分ける設計が必要です。

## 5. 共通ヘッダー・クラス命名設計

現在はトップページだけ、検討用由来のクラス名が残っています。

| 現在 | 変更案 | 用途 |
| --- | --- | --- |
| `.draft-header` | `.site-header` | 共通ヘッダー |
| `.site-brand` | `.brand` | ブランドリンク |
| `.nav-links` | `.site-nav` | ヘッダーナビ |
| `.draft-page` | `.site-page` | トップページ本文 |
| `.draft-footer` | `.site-footer` | 共通フッター |
| `.draft-label` | `.eyebrow` または `.hero-label` | ヒーロー補助ラベル |

実装時は、トップと下層ページの見た目やSPメニューの挙動が変わらないように、以下の順で進めます。

1. HTML側のクラスを置き換える
2. CSS側のセレクタを置き換える
3. `site-nav.js` が参照するセレクタを確認する
4. PC幅とSP幅でヘッダー表示、メニュー開閉、ホバーを確認する

## 6. 未追跡ファイル・旧素材の整理設計

現時点で確認された未追跡ファイルは以下です。

```text
assets/home-city/city_*.png
assets/home-city/youtube-latest-thumb.jpg
docs/server-migration-plan.md
drafts/
games/inutaro-3d-prototype/
```

### 6.1 分類方針

| 分類 | 方針 |
| --- | --- |
| 旧素材 | 本番参照がなければ削除候補。再利用可能なら `drafts/` または `archive/` へ移す |
| 検討用ページ | 本番に不要ならGit管理しない。残す場合は `drafts/README.md` で役割を明記する |
| 試作ゲーム | 本番ゲーム一覧に載せない限り、公開対象外として扱う |
| サーバー移行メモ | Cloudflare移管を進めるなら正式資料へ昇格。不要なら削除候補 |
| `.DS_Store` | Git管理しない。ローカルから削除してよい |

### 6.2 実装前の確認

削除や移動の前に、必ず以下を確認します。

```text
rg "city_" .
rg "youtube-latest-thumb" .
rg "inutaro-3d-prototype" .
rg "server-migration-plan" docs .
```

本番HTML、CSS、JSから参照がないことを確認してから整理します。

## 7. 未設定ページ・導線設計

### 7.1 イラスト導線

トップマップのイラスト導線は、仮ページ `pages/illustrations.html` へ接続済みです。

候補は以下です。

| 案 | 内容 | メリット | 注意点 |
| --- | --- | --- | --- |
| A | 一旦非リンク化し、準備中表示にする | 誤クリックを防げる | 導線としては弱くなる |
| B | `pages/illustrations.html` を作る | URLが確定する | 中身が少ない場合は寂しく見える |
| C | 外部サービスへリンクする | すぐ公開できる | 外部導線が増える |

現時点ではBを採用し、準備中の仮ページを設置しました。今後はこのページに作品カードやカテゴリを追加していきます。

### 7.2 ブログ

現在はnoteへの導線ページです。

短期的にはそのままで問題ありません。将来的にサイト内記事を持つ場合は、以下を検討します。

```text
pages/blog.html
blog/
└── article-slug/
    └── index.html
```

## 8. YouTube情報設計

### 8.1 リンクURL

ユーザー向けリンクは、読みやすいハンドルURLへ統一します。

```text
https://www.youtube.com/@%E3%81%88%E3%82%8A%E3%81%AC%E3%81%84
```

API内部やフォールバックでは、チャンネルIDを使っても問題ありません。

### 8.2 初期表示

現在HTML側に登録者数の数値が直書きされています。

今後は以下のようにします。

| 状態 | 表示 |
| --- | --- |
| JSON取得前 | `取得中` |
| JSON取得成功 | `登録者数: 約xx人` |
| JSON取得失敗 | `最新情報を取得できませんでした` または前回生成済みJSONの値 |

GitHub Actionsで生成済みの `youtube-latest.json` があるため、GitHub Pagesとローカル確認では静的JSONを優先して最新値を表示します。CloudflareなどAPIが使える環境では、`/api/latest-youtube` も利用できます。

## 9. Cloudflare移管用関数の扱い

`functions/api/latest-youtube.js` は、GitHub Pagesでは実行されません。

現時点では以下の扱いにします。

- GitHub Pages: `scripts/update-youtube-latest.mjs` とGitHub Actionsで静的更新
- Cloudflare移管後: `functions/api/latest-youtube.js` をAPIとして利用

実装上の混乱を避けるため、資料では「将来用」と明記します。

必要に応じて、将来的に以下のような配置へ変更します。

```text
functions/
└── cloudflare/
    └── api/latest-youtube.js
```

## 10. 固定ページのOGP設計

下層固定ページにも、トップやゲーム一覧と同じ基本OGPを追加します。

対象:

```text
pages/characters.html
pages/blog.html
pages/terms.html
pages/privacy.html
```

共通方針:

- `og:type` は `website`
- `og:site_name` は `erinui`
- `og:title` はページタイトル
- `og:description` は既存のdescriptionを流用
- `og:url` は現在の公開URLに合わせる
- `og:image` は当面 `assets/icon-192.png`
- `twitter:card` は `summary`

## 11. 実装手順

実装修正に入る場合は、以下の順で進めます。

### Phase 1: 低リスクの整合性修正（実装済み）

1. OGP URLと画像URLを現在の公開URLに合わせる
2. ゲーム内共有URLを現在の公開URL、または実行URLベースに整理する
3. 固定ページへ基本OGPを追加する
4. YouTubeリンクをハンドルURLへ統一する
5. YouTube看板の初期表示を `取得中` に変更する

確認:

- トップ、ゲーム一覧、ゲーム本体、キャラクター、ブログ、規約、ポリシーがHTTP 200
- HTML内の `https://erinui.github.io/` が意図しない形で残っていない
- 外部リンクが別タブで開く
- 共有文言のURLが正しい

### Phase 2: クラス命名整理（実装済み）

1. トップページの `draft-*` クラスを本番用に変更する
2. CSSセレクタを同じ意味の本番クラスへ変更する
3. SPメニュー開閉に影響がないか確認する

確認:

- PCヘッダーの高さ、ホバー、リンク配置
- SP三本線メニューの開閉アニメーション
- トップのヒーロー、マップ、フッターの見た目

### Phase 3: 未設定導線の扱い決定（実装済み）

1. イラスト導線の扱いを決める
2. 仮ページを作る場合は `pages/illustrations.html` を追加する
3. 非リンク化する場合は見た目と文言で準備中と分かるようにする

確認:

- `href="#"` が本番導線に残らない
- キーボード操作で意味のないリンクにフォーカスしない

### Phase 4: 未追跡ファイル整理

1. 未追跡ファイルを分類する
2. 本番参照がない旧素材を削除候補にする
3. 検討用として残すものは `drafts/` にまとめる
4. Git管理しないものは `.gitignore` 対象にする

確認:

- `git status --short` が意図した状態になっている
- 本番ページで画像欠けがない
- YouTube更新ファイルはGitHub Actionsが更新できる

### Phase 5: 中長期拡張

1. イラストページを本実装する
2. ブログをサイト内記事化するか判断する
3. 利用規約、プライバシーポリシーを外部サービス追加に合わせて更新する
4. Cloudflare移管時にAPI設計を再確認する

## 12. 実装後の確認コマンド

```text
git diff --check
git status --short
rg "gh-pages" docs .github
rg "https://erinui.github.io/" index.html games pages docs
rg "href=\"#\"" index.html games pages
rg "draft-" index.html home.css docs
```

ローカル確認URL:

```text
http://127.0.0.1:8780/
http://127.0.0.1:8780/games/
http://127.0.0.1:8780/games/inutaro-mushi/
http://127.0.0.1:8780/pages/characters.html
http://127.0.0.1:8780/pages/blog.html
http://127.0.0.1:8780/pages/terms.html
http://127.0.0.1:8780/pages/privacy.html
```

## 13. 今回まだ実装しないこと

この資料更新段階では、以下は実装しません。

- HTML、CSS、JSの修正
- 未追跡ファイルの削除
- 画像素材の移動
- 新規ページ作成
- GitHubへの反映

次の段階で、上記のPhase 1から順に実装します。
