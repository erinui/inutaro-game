# erinui.com 表示速度改善 TODO

調査日・方針改訂日: 2026-10-17
対象: https://erinui.com/ （トップページ）
参考: ポケモンずかん（https://zukan.pokemon.co.jp/）の高速化手法との比較

> 本資料を今回の改善方針の正本とする。提供された調査値を残し、実ファイル確認に基づいて実施内容を改訂した。通信量・LCPの再計測は未実施。6章は実装上の条件、7章は配信設定・更新運用・既存試験との再レビュー。資料以外のコード・素材・サーバー設定の変更や公開は未実施。

詳細化した実装契約・試験条件は[詳細設計書](home-performance-design.md)、工程・公開単位・切り戻しは[改修計画](home-performance-plan.md)を参照。ハッシュ資産の生成管理、YouTubeの新旧データ互換、ビルド時の最新カード生成、計測スクリプトの修正を具体化した。実装は未着手。

SDDレビュー反映（2026-10-17）: 同一snapshotでも動画カード数を整合させること、保持資産を含む復旧releaseを再公開すること、工程別stage判定と全体final判定を分けること、誤immutable時は復旧URLと以後の更新処理まで連動させることを設計書・計画へ明記した。実装・本番設定の変更は未実施。

---

## 1. 現状サマリー

| 項目 | 現状 | 評価 |
|---|---|---|
| CDN | Cloudflare（`cf-cache-status: HIT`） | ✅ 良好 |
| プロトコル | HTTP/3 | ✅ 良好 |
| HTML | 24KB / Brotli圧縮 | ✅ 良好 |
| CSS / JS | 合計 約13KB（gzip） / フレームワークなし | ✅ 良好 |
| **初回転送量（スマホ）** | **約 7.1MB** | ❌ 重い |
| ブラウザキャッシュ | `max-age=0, must-revalidate`（毎回再検証） | ⚠️ 改善余地 |
| 画像形式 | PNG / JPG / PNG埋め込みSVG | ❌ 最適化なし |
| Webフォント | 1.6MB フル収録 / `font-display: block` | ❌ 重い・初期に文字が非表示になる期間あり |

**結論**: サーバー・配信まわりの土台は良い。重さの原因は **画像とフォントのファイルサイズ** に集中している。

### 転送量の内訳（上位）

| ファイル | 転送量 | 実際の表示サイズ（スマホ） |
|---|---|---|
| `map_sns2.svg` | 1,800KB | 112×112px |
| `keinann-pop-jp.woff2` | 1,597KB | – |
| `map_goods.svg` | 471KB | 156×156px |
| `map_character.svg` | 394KB | 100×125px |
| `map_linestamp.svg` | 379KB | 100×100px |
| `map_note.svg` | 368KB | 109×109px |
| `map_game.svg` | 305KB | 149×149px |
| `map_illast.svg` | 302KB | 93×93px |
| `map_youtube.svg` | 287KB | – |
| `youtube-thumb-1〜3.jpg` | 各 150〜250KB（1280×720） | 約 90×50px |
| `i.ytimg.com/.../maxresdefault.jpg` | 245KB | 同上（重複取得） |
| `chara_*.png` ×5 | 各 130〜620KB | – |

---

## 2. やるべきこと（優先度順）

### 🔴 P1: マップSVG全体の描画結果を軽量なラスター画像にする

**問題**
対象8ファイルには2048×2048の埋め込みPNGがあり、さらにパス・pattern・クリッピング等で描画している。「PNGを埋め込んだだけ」ではない。
- 埋め込みPNGだけを抽出すると、SVGのパス・切り抜き・配置を失う可能性がある
- `map_character.svg` は `viewBox="170 75 650 816"` で、他7枚の正方形とは比率も違う
- 8ファイル合計 約4.3MBは提供された転送量。base64の約33%増は未圧縮の符号化量であり、圧縮後通信量の増加率とは区別する

**やること**
- [ ] **既存SVG全体を描画して**透過PNGの中間成果物を作る。viewBox・パス・pattern・clipPath・透明余白を保持する
- [ ] PC/SPのCSS寸法・transform・DPRを含めて必要な解像度を算出。実表示幅の約2倍を出発点とし、必要なら複数サイズを用意する。320px四方へ一律変換しない
- [ ] 同じ中間成果物からWebP候補を作成。品質80前後は比較開始値。ロスレス候補も比較し、輪郭・透過・文字・影を確認する。AVIF追加はWebP採用後の別段階とする
- [ ] 最初は `map_sns2.svg` 1枚で容量とPC/SP表示を比較。採用した描画・変換方法を残り7枚へ展開する
- [ ] 既存のクラス、拡大補正、配置、クリック範囲を維持して参照を差し替える。比率どおりの `width` / `height` を設定する
- [ ] 原本は保持する。本文・配色・構図を変えず、許容する差は実表示で認識できない程度のラスタライズ・圧縮差に限定。候補比較で判断できなければその素材の採用を保留する

```html
<!-- 正方形のSNS画像の例。HASHは実際の内容ハッシュへ置換する。
     出力解像度・srcset・loadingは計測結果で決定する。 -->
<img src="assets/versioned/map_sns2.HASH.webp"
     width="320" height="320" alt="" class="map-image map-image-svg">
```

変換例（SVG全体を検証済みの描画器で透過PNGにした後。切り抜き・余白を変えない）:

```bash
# map_sns2-rendered.png は埋め込みPNGの抽出物ではなくSVG全体の描画結果
magick map_sns2-rendered.png -resize 320x320 -strip map_sns2_320.png
cwebp -q 80 map_sns2_320.png -o map_sns2-candidate.webp
```

**容量予算**: 合計約0.2MBを努力目標とする。1枚10〜30KBは概算であり、必要解像度・画質を確認して実測する。

### 🔴 P1: `swap`単独検証の後、書体を維持してフォントを軽量化する

**問題**
- `keinann-pop-jp.woff2` が全文字収録で **1.6MB**、しかも `preload` 指定
- `font-display: block` により初期に非表示期間がある。その期間を過ぎれば未読込でも代替フォントになる
- `home.css` の `:root` に書体指定があり、見出しだけでなく本文と共有ページにも影響する

**やること**
- [ ] 第1段階は `font-display: swap` だけを変更し、初期表示、フォント切り替え、字幅・改行・CLSを検証。通信容量の削減とは分けて記録する
- [ ] 第2段階はHTML、JS、CSS生成文字、共有ページ、最新JSONから使用文字と利用箇所を調査する
- [ ] 現在の文字だけの単一サブセットは採用せず、固定文言用サブセットと動的文字用の `unicode-range` 分割を検討する。将来のタイトル・記事名に未収録文字が出るケースも試験する
- [ ] 本文のsystemフォント化は今回の対象外。完成後の書体・字形・字幅を維持し、分割で補えない文字の代替表示も確認する

```bash
pip install fonttools brotli
# 固定文言用の候補生成例。これだけで動的文字を含むサイト全体を置換しない:
pyftsubset keinann-pop-jp.ttf --text-file=chars.txt \
  --flavor=woff2 --output-file=keinann-pop-jp.subset.woff2
```

- [ ] preloadは初期表示に必要な分割ファイルだけに絞る。CSSとURL・crossoriginを合わせ、旧フル版を二重取得しない
- [ ] 元TTF、ライセンス、出典を保持する。ゲーム専用フォントと共通サイト用フォントを区別する

**容量予算**: 初期取得フォント合計100KB以下を目標とする。分割ファイル1個だけの容量では判定しない。`swap`段階の容量は原則変わらない。

### 🟠 P2: 画像を表示サイズに合わせる

| 対象 | 現状 | やること |
|---|---|---|
| `youtube-thumb-1〜3.jpg` | 1280×720 / 150〜250KB | 640×360 以下の WebP に（20〜40KB目安） |
| YouTube 外部サムネ | ローカル画像から外部URLへ差し替える構造 | マップ・動画一覧・ニュースを同じ最適化済みローカル画像URLへ統一。実通信で重複解消を確認 |
| `chara_*.png` ×5 | 130〜620KB | 表示幅の2倍にリサイズ＋WebP化 |
| `gameplay-preview.png` | 1200×675 / 260KB | WebP または JPEG に（50KB以下目安） |
| `icon-192.png`（ヘッダーロゴ用途） | 69KB | 最大表示幅×対象DPRからヘッダー版を別途用意。PWAアイコンを置換しない |
| `apple-touch-icon.png` | 61KB | PNG 減色（pngquant 等）で圧縮 |

- [ ] 上記を変換・差し替え
- [ ] HTMLとJS生成画像に適切な `width` / `height` または確実な枠比率を付与。既存CSS寸法を維持してCLSを確認
- [ ] YouTube最適化は生成・JSON・表示処理・更新時の検証を一体で変更する。先頭5件だけローカル保存・最大6件JSONという現行差も解消する。画像がない項目は既存の代替表示へ進め、異なる動画の画像を流用しない
- [ ] 画像更新の失敗時は現行の正常データ保持・取得先別の障害分離を維持する

### 🟠 P2: 読み込み優先度の整理

- [ ] PC/SPで実際のLCP要素を特定。初期表示に必要な画像はeagerを維持し、必要な画像に絞って `fetchpriority="high"` を付ける
- [ ] 画面外の画像は原則 `loading="lazy" decoding="async"`。マップの一部という理由だけで一律lazyにしない。CSS背景は別途確認する
- [ ] 非表示YouTubeサムネは `src` を保留し、表示前に取得・デコードする。10秒切り替えで空白が出ないよう、直前の画像を次画像の準備完了まで維持する
- [ ] `youtubePanel` / `showStats` による指定表示、読込失敗、JSON更新時も確認する

### 🟡 P3: 長期ブラウザキャッシュを設定する（ずかんから学べる点）

**問題**
Workers Static Assetsの標準は `Cache-Control: public, max-age=0, must-revalidate`。不変資産にも再検証が発生する。一方、HTML・最新JSON・同名更新画像には再検証が必要。

**前提作業**
- [ ] 不変資産だけを内容ハッシュ付きファイル名にし、`/assets/versioned/` に配置する。固定の日付クエリを一度付けるだけの方式は採用しない
- [ ] HTML、CSS内URL、JS生成URL、preload、共有ページの参照を連動して変更する。CSS・JS移動時は画像等の相対URLと `document.currentScript` 依存を確認する
- [ ] HTML、最新JSON、同名更新サムネイルは再検証を維持。自動更新画像は今回の長期キャッシュ移行から外す
- [ ] 旧URL資産と元TTFは保持する。旧ハッシュ資産は少なくとも1年は保持する方針とし、削除時は開いたままの旧ページ・ロールバックへの影響を別途検証する

**設定方針（Cloudflare Workers Static Assets）**

ルートの既存 `_headers` に次の限定ルールを追加し、ビルドで `dist/_headers` へコピーする。既存の検証用ホストのnoindexを保持する。`/assets/*` や `/*.css` / `/*.js` 一括immutableは採用しない。

```
/assets/versioned/*
  Cache-Control: public, max-age=31536000, immutable
```

HTMLと最新JSONは再検証を維持する。CDNでのキャッシュとブラウザキャッシュは分けて検証する。重なる `_headers` ルールの同名ヘッダーは結合されるため、広域ルール＋後勝ち上書きに依存しない。[公式仕様](https://developers.cloudflare.com/workers/static-assets/headers/)

---

## 3. ポケモンずかんとの比較で得た指針

| ずかんの手法 | erinui.com への適用 |
|---|---|
| 画像を表示サイズの約2倍で用意（145px表示 → 300px画像） | ✅ 取り入れる（P1・P2） |
| ハッシュ付きファイル名 ＋ CDN 長期キャッシュ | ✅ 取り入れる（P3） |
| 一覧画像の `loading="lazy"` | ✅ 徹底する（P2） |
| アイコン類は本物の SVG（ベクター） | ✅ 単純な図形は SVG、イラストは WebP と使い分ける |
| jQuery / PNG のまま配信 / HTML 非圧縮 | ❌ 真似しない（erinui.com の方が優れている） |

---

## 4. 目標値

| 指標 | 現状 | 目標 |
|---|---|---|
| 初回転送量（トップ / スマホ） | 約 7.1MB | **1MB 未満** |
| 初期取得フォント合計 | 1.6MB | 100KB 以下 |
| 最大の単一画像 | 1.8MB | 100KB 以下 |
| 通常再訪時の不変・ハッシュ付き資産の再検証 | 毎回 | なし（immutable）。HTML・最新JSON・同名更新画像は除く |
| LCP | 今回未計測 | 固定条件のラボ中央値2.5秒以下、かつ前後比較で悪化なし |
| CLS | 今回未計測 | 固定条件のラボ中央値0.1以下、かつ前後比較で悪化なし |

容量は圧縮後のHTTPレスポンス本文の合計で比較し、HTTPヘッダーを含むDevTools転送量も別記する。初期通信1MBは1,000,000 bytes未満と定義する。観測期間は5章に固定する。画像・フォントの容量予算未達を、画質や書体を無条件に変える理由にしない。

LCP 2.5秒・CLS 0.1は良好の目安。上記は今回のラボ受け入れ条件であり、実ユーザーの良好判定にはPC/SP別の75パーセンタイルを確認する。Lighthouseスコアは補助指標として記録し、容量目標や実ユーザー指標の代用にしない。[LCP](https://web.dev/articles/lcp)、[CLS](https://web.dev/articles/cls)

## 5. 確認方法

- [ ] 空キャッシュのPC/SP各3回以上。390×844 / 1440×900、DPR1と2、下り6Mbps・上り1.5Mbps・遅延150ms・CPU4倍を比較条件とする。Chrome版も記録。Slow 4Gプリセットによる別計測は混ぜない
- [ ] 初期計測は操作・スクロールなしの遷移後30秒。10秒の動画切り替えと最新JSONの再描画を含める。終了時に未完了の通信があればURLを記録し、容量達成とは判定しない
- [ ] 全ページ閲覧は別の空キャッシュで、初期30秒後に1画面ずつスクロールし、全カードを表示してからネットワーク安定後まで観測する。外部画像・Analyticsを除外せず、取得量が不明なら不明と記録する
- [ ] 通常再訪はDisable cacheを解除。同一URLのキャッシュ利用、JSONの再検証、更新後の新URL取得を確認。強制再読み込みは別試験とする
- [ ] Lighthouse（モバイル）で LCP / CLS / Performance スコアを改善前後で記録
- [ ] PageSpeed Insights: https://pagespeed.web.dev/ で `https://erinui.com/` を計測
- [ ] `curl -sI https://erinui.com/assets/...` で `Cache-Control` が反映されているか確認

---

## 6. 方針レビュー（2026-10-17・リポジトリ照合）

### 6.1 判断と既存仕様との関係

画像・フォントの容量削減をP1とする方針は妥当。まず現状計測を固定し、マップ画像1枚の候補比較から進める。容量の数値は目標であり、達成実績ではない。ポケモンずかん側の実装や提供された通信量は今回再調査していない。本番ヘッダー確認は7章に別記する。

既存の [SEOと読み込み改善SDD](seo-performance-sdd.md) 13.3・14.3節では、X画像のWebP変換と全グリフWOFF2再圧縮を検証したが、ブラウザ描画差などにより保留としている。今回の縮小・非可逆圧縮・サブセット化は別案なので、旧記録を成功に書き換えず、採用基準を今回の実施仕様で明示する。画素差ゼロを前提とした過去の基準と、今回の品質80・リサイズは両立するとは限らない。候補のPC/SP・DPR別比較を用意し、輪郭、透過、文字、影、hover時の見え方の許容範囲を定めてから採用する。

### 6.2 P3は変更必須: 更新データを長期キャッシュしない

- 現行はCloudflare **Workers Static Assets**。`wrangler.jsonc` が `./dist` を配信し、`scripts/build-site.mjs` がルートの `_headers` をコピーする。Pagesへの移行は不要。既存の検証用ホストの `X-Robots-Tag: noindex` を保持する。
- `/assets/home-city/` に `youtube-latest.json`、`note-latest.json`、`suzuri-latest.json`、`line-stamps.json` がある。一律 `/assets/*` の `immutable` は採用しない。JSONは再検証を維持する。
- `youtube-thumb-1..5.jpg` やnoteサムネは自動更新で同名の内容が変わる。固定の `?v=20261017` を一度付けるだけでは、その後の更新を識別できない。内容ハッシュのファイル名か、内容変更と連動するバージョンが必要。
- 推奨は、内容ハッシュ付きの画像・フォント・CSS・JSを専用の `/assets/versioned/` 等にまとめ、その範囲だけに1年の `immutable` を設定すること。未移行の固定URLは再検証を維持する。HTML、最新JSON、更新サムネは対象外とする。
- CSS内のURL、HTMLのpreload、JSで生成するURL、別ページからの共有参照も一緒に更新する。旧HTMLが保持する旧ハッシュ資産の配信とロールバック方法も決める。

設定の方向性（専用ディレクトリを導入した後の例）:

```
/assets/versioned/*
  Cache-Control: public, max-age=31536000, immutable
```

再訪検証はDevToolsの「Disable cache」を解除して通常遷移で実施し、同一URLのキャッシュ利用と、更新後の新URL取得を両方確認する。強制再読み込みで再検証されることを失敗と判定しない。

### 6.3 P1画像: 一律320pxではなく最大表示幅から決める

- `index.html` には対象8枚のSVG参照がある。変換は**既存SVG全体の描画結果**を基準にする。埋め込みPNGのみの抽出や同名PNGへの置換は、viewBox・パス・クリッピングを保持できないので採用しない。
- PC/SP、hover拡大、DPRを確認し、実際の最大表示サイズから出力解像度を決める。320pxはSP向けの出発点。必要なら `srcset` / `sizes` で複数サイズを用意する。
- 元のアスペクト比・透明余白・CSSの重なりを保持する。`width` / `height` は画像の比率に合わせ、すべて320×320に固定しない。`<picture>` 追加時も既存のCSSセレクタ・配置を確認する。
- 提供値のbase64約33%増は未圧縮時の符号化量。Brotli/gzip後の転送増が常に33%になるという意味ではない。元ファイル容量と圧縮後通信量を分けて比較する。

### 6.4 P1フォント: 動的な文字と共有利用を含める

- `home.css` の `font-display: block` と、`index.html` のJP WOFF2 preloadを確認した。`block` の非表示期間には上限があり、必ず読み込み完了まで非表示になるわけではない。`swap` は文字の早期表示を優先するが、切り替え時の字幅・改行・CLSも検証する。
- HTMLだけでなく、JSの文言、CSS生成文字、最新JSON、他ページの共有利用も対象にする。将来の動画タイトル・記事名など、更新で増える文字があるため、現在の文字だけの単一サブセットでは対応が不足する。
- 固定文言用サブセットと、必要に応じて取得する `unicode-range` 分割などを検討する。未知の文字はフォールバックできる構成にする。100KB以下の目標は「初期に取得するフォントの合計」として計測し、フル版の二重取得を防ぐ。
- 本文のsystemフォント化は対象外。`swap`単独検証と、分割・サブセット化の検証を分ける。元TTF・ライセンス・出典を保持し、preloadとCSSのURLを一致させる。

### 6.5 P2: 更新処理と読み込み制御を一緒に直す

- `home.js` の `updateYoutubeCard` がHTMLのローカル画像をJSONの外部URLに差し替える構造を確認した。二重取得の原因候補として、実通信でURL・時刻・Initiatorを記録する。マップ・動画一覧・ニュースを同じ最適化済みローカル画像URLへ統一し、最新動画との対応を維持する。
- `scripts/update-youtube-latest.mjs` は先頭5件をJPGで保存し、`scripts/update-home-latest.mjs` はJPG名と画像形式を検証する。WebP採用時は生成処理・JSON・許可パス・検証・workflowを連動させ、次の定期更新で元に戻らないようにする。
- キャラ・画面外コンテンツカードの多くはすでに `lazy` / `async`。不足箇所とJS生成画像を確認する。ブラウザのlazyは画面近傍で先読みするため、転送量ゼロを保証しない。
- LCP要素はPC/SPそれぞれ計測して特定する。初期表示に必要な画像はeagerのまま、必要な画像に絞って `fetchpriority="high"` を付ける。CSS背景やテキストがLCPの場合もある。
- 非表示スライドは `src` を最初から設定すると取得されうる。`data-src` 等で待機させ、表示前の取得・デコード、10秒切り替え、失敗時の代替表示を確認する。
- 既存寸法と `aspect-ratio` を踏まえて `width` / `height` を追加する。アイコンは実際に初期取得されているかを確認し、取得しない素材の圧縮を初期通信削減に加算しない。

### 6.6 推奨実施順と受け入れ条件

1. **基準計測**: 本番で空キャッシュ・画面幅・DPR・回線・CPU・ブラウザ・観測時間・スクロール有無を固定し、3回以上の中央値を記録。初期表示と全ページスクロール後の転送量を別記する。外部通信を含む総量と、同一オリジン量を区別する。
2. **マップ画像P1**: 最大容量の `map_sns2.svg` から候補と比較画像を作成。容量・画質・配置の条件を満たした方式を残り7枚へ展開する。
3. **フォントP1・表示方式**: `swap`単独で表示待ち・改行・CLSを比較する。画像変更後の状態を新しい比較基準として保存する。
4. **フォントP1・容量**: 書体を維持し、使用範囲、動的文字、分割方式を確定。初期取得量と表示を検証する。
5. **その他画像・読み込みP2**: サムネ重複、更新パイプライン、非表示スライド、画像寸法と優先度を調整する。
6. **キャッシュP3**: URLバージョン管理を導入した資産に限定して適用する。通常再訪と内容更新後の取得を確認する。
7. **統合確認**: 共有フォント・CSSを使う下層ページもPC/SPで確認。画像の透過・輪郭・改行・リンク・カルーセル・更新失敗時の表示を維持し、変更範囲に対応する既存試験を実行する。

- [ ] 初期通信量1MB未満は同一条件の総転送量で判定。画像1枚100KB以下・初期フォント合計100KB以下は個別予算として記録する。
- [ ] LCP / CLS / Performanceは変更前後の同一条件で比較し、悪化がないことを確認。ラボ結果とPageSpeed Insightsの実ユーザーデータを混同しない。
- [ ] 再訪時の再検証なしの目標は、バージョン管理された不変資産に限定。HTMLと最新JSONの再検証は正常として扱う。
- [ ] 新規素材はGit追跡対象へ追加してからビルドする。現在のビルドは `git ls-files -- assets` のみを採用するため、未追跡ファイルを置くだけでは配信されない。
- [ ] `dist/_headers` と配信ファイルの存在、本番の実レスポンス、更新後の表示を確認する。HEADによるヘッダー確認だけでブラウザキャッシュの検証完了とはしない。

### 6.7 参照資料

- ローカル: `wrangler.jsonc`、`_headers`、`scripts/build-site.mjs`、`index.html`、`home.css`、`home.js`、`scripts/update-youtube-latest.mjs`、`scripts/update-home-latest.mjs`
- 既存方針: [SEOと読み込み改善SDD](seo-performance-sdd.md)、[サイトの更新と操作の信頼性SDD](site-reliability-sdd.md)
- [Cloudflare Workers Static Assets: Headers](https://developers.cloudflare.com/workers/static-assets/headers/)（`_headers` の配置と適用範囲）
- [MDN: Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)（`immutable` とURLのバージョン管理）
- [MDN: font-display](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@font-face/font-display)（`block` / `swap` の表示期間）

## 7. 改訂後の再レビュー（2026-10-17）

### 7.1 結論と確認範囲

**改訂方針は現行のWorkers静的配信構成と整合する。** 配信基盤の移行・DNS変更・APIサーバー新設は不要。実装開始時は、画像変換だけでなく、更新処理・配信対象・保持試験の変更も同じ作業範囲に含める。下表の対応を行う前に、旧参照を直接置換して公開してはならない。

照合したローカルHEAD: `8f7563cfcefe7109a1e915fd3d0cf55eb6d34f61`。本資料は未追跡の作業ファイル。既存の未追跡素材・draftsは今回変更していない。Cloudflare管理画面のCache Rules、DNS、デプロイ済みコミットは未確認であり、リポジトリのHEADが本番と一致するとは断定しない。

### 7.2 実装・配信設定との対応表

| 確認対象 | 現行の実装・設定 | 改訂方針への反映 / 実装時の対応 |
|---|---|---|
| SVG8枚 | 全ファイルに埋め込みPNG・pattern・useがあり、7枚にclipPath、7枚にpathがある。characterだけviewBoxが非正方形 | SVG全体を描画して変換。元PNG抽出だけの方式を取り下げ。透過余白・比率・切り抜き保持を必須化 |
| CSS拡大補正 | `home.css` の `.map-image-svg` と `--map-svg-scale` が1.04〜1.3倍で補正。マップの最大幅は402px | 出力解像度は補正後の描画幅×DPRから決定。フォーマット変更を理由に補正クラスを消さない |
| Webフォント | `:root` で共通書体。WOFF2→TTFのsrc、全体WOFF2のpreload、`block` | `swap`単独→分割の二段階。本文のsystemフォント化を除外。TTF原本とゲーム用フォントは保持 |
| YouTube表示 | `updateYoutubeCard`、`hydrateYoutubeContent`、`renderLatestNews` が外部thumbnail URLを使用。初期HTMLはローカルJPG | マップ・一覧・ニュースで同一の最適化済みローカル画像を使う。HTML仮画像→最新画像の重複も通信ログで確認する |
| YouTube更新 | JSONは最大6件、画像保存は先頭5件。`validateOutput` は `youtube-thumb-[1-5].jpg` とJPEG形式を検証 | 全表示項目の対応画像を生成し、JSONにローカル画像・寸法を伝える契約を定める。0件・画像なし・6件・失敗を試験。バージョンは内容変更に連動させる |
| 更新workflow | Node20、4時間ごとの統合処理。収集→検証→保存→結果報告。取得先別の許可パスでstage | WebP変換ランタイムをCIにも明示。許可パス・参照整合・形式検証を更新し、正常分のみ反映・失敗先保持を継続 |
| 配信構成 | `wrangler.jsonc` はWorkers Static Assets、`assets.directory=./dist`。Functions用のWorker入口指定はない | 静的応答は `_headers` で設定。将来Worker応答を作る場合、そのレスポンスには別のヘッダー実装が必要 |
| `_headers` | 現在はworkers.devの2ルールにnoindexだけ。Cache-Controlの明示指定なし | `/assets/versioned/*` にだけimmutableを追加。既存2ルールを保持。広域Cache-Controlと例外の重複ルールは作らない |
| ビルド | `buildSite` は列挙した公開ファイル＋Git追跡assetsをコピー。既存出力先があると停止 | 新素材はGit追跡に含める。root CSS/JSの旧版を残したまま新ハッシュ版をassets配下へ追加できる。相対URLを修正し、必ず新規一時ディレクトリで試験ビルドする |
| ローカルHTTP | `tests/helpers/site-server.mjs` にWebP/AVIFのMIME定義なし。圧縮・本番 `_headers` の適用も行わない | 使用形式のMIME定義を追加。ローカルの通信容量やヘッダーを本番の実証と扱わず、Workersプレビュー／本番で別途確認 |
| 保持試験 | `site-design.test.mjs` は旧フォントURL・CSSバージョン・素材SHAを固定。`seo.test.mjs` はbody SHA、`site-reliability.test.mjs` は旧ソース復元を確認 | 今回の変更だけを記録するmanifestと限定的な検証を追加。旧baselineを丸ごと再取得して合格にせず、元記録への照合と今回の変更先資産検証を両立する |
| アイコン保持試験 | `seo-favicon.test.mjs` は公開PNGのハッシュ・URLを検証 | ヘッダー専用画像を追加して既存PWAアイコンと分離。apple-touch-iconを圧縮するなら変更記録と実描画確認を併せて更新 |

補足: 自動更新サムネは `/assets/versioned/` に入れず、再検証を維持する。ローカル画像の内容変更時は表示側のURLも内容に連動させる。固定インデックス画像と古いJSONの組合せで別動画の画像を表示しないよう、JSON・画像・初期HTMLの対応を試験する。内容連動URLを実装する際は、少なくとも更新処理内の画像ハッシュを使い、固定日付やJSON取得時刻だけを内容ハッシュと呼ばない。

### 7.3 本番HTTPの読み取り確認

確認時刻: **2026-10-17 18:37 JST**。ブラウザ相当の `User-Agent: Mozilla/5.0`、`Accept-Encoding: br, gzip` を使ったGET。以下7URLのヘッダーを確認し、本文全体の取得や通信量・表示速度の測定はしていない。

| パス | HTTP | Cache-Control | その他 |
|---|---|---|---|
| `/` | 200 | `public, max-age=0, must-revalidate` | HTML / Brotli / CF HIT |
| `/home.css?v=20261010-city-copy` | 200 | 同上 | CSS / Brotli / ETagあり / CF HIT |
| `/assets/home-city/map_sns2.svg?v=20260809-map-sns2` | 200 | 同上 | SVG / Brotli / ETagあり / CF HIT |
| `/assets/fonts/keinann-pop-jp.woff2` | 200 | 同上 | font/woff2 / Content-Length: 1,635,088 / ETagあり / CF HIT |
| `/assets/home-city/youtube-latest.json` | 200 | 同上 | JSON / Brotli / ETagあり / CF HIT / 条件付きGET 304 |
| `/assets/home-city/youtube-thumb-1.jpg` | 200 | 同上 | JPEG / Content-Length: 250,552 / ETagあり / CF HIT |
| `/data/news.json` | 200 | 同上 | JSON / Brotli / ETagあり / CF MISS / 条件付きGET 304 |

条件付きGETは、各200応答のETagを `If-None-Match` に入れて確認した。JSON本文が変わった場合の200やブラウザの通常再訪は未試験。他の最新JSON・全画像へこの確認結果を拡張しない。

初回の標準User-AgentによるHEADは403だったが、User-Agentとメソッドを変えたGETでは200を確認した。原因は切り分けていないため、HEAD非対応やサーバー障害とは断定しない。公開後確認は成功したGET方式でも実施する。

`alt-svc` にh3広告はあったが、今回のクライアントがHTTP/3で通信した実証ではない。CF HITはCDN側の観測であり、ブラウザの再訪キャッシュや継続的なHIT保証とは別。管理画面のルール変更は行っていない。

### 7.4 残る検証と実装開始条件

- [ ] 5章の条件で現状通信量・LCP要素・CLSを実測する。過去資料の7.1MBやLCP値を今回の基準に転記しない
- [ ] SVG描画器と変換環境を選定し、元SVGのPC/SP・DPR1/2・通常/hoverとの比較成果物を作る。画素差ゼロだった過去の採用条件は今回の別方針で置き換え、過去記録を改変しない
- [ ] フォント分割で初期100KB以下を満たせるか候補を測定。満たせない場合は未達を報告し、書体変更を暗黙に追加しない
- [ ] YouTube画像の6件目、JSONに画像がない項目、更新後の対応、部分失敗、初期HTML仮画像との重複を確認する
- [ ] ハッシュ資産の生成・保持と、CSS移動後の画像/フォントURL、共有ページ、旧GitHub Pages配下のパスを確認する
- [ ] 今回の変更manifest、必要なMIME定義、更新処理・ブラウザ・ビルドの既存試験を更新する。キャッシュ試験はローカルHTTPと実配信を分ける

この再レビューで判明した設計上の問題は本資料へ反映済み。実装候補の画質・フォント容量・実ブラウザ性能は未検証のため、達成や公開可能とはまだ判定しない。

今回の検証: `node --test tests/site-build.test.mjs` の2件成功。新規一時ディレクトリでの配信対象限定・コピー整合と、検証ホストに限定したnoindexルールを確認した。資料の章構成・コードフェンス・ローカル参照リンク・旧推奨文の除去も確認済み。画像変換・ブラウザ描画・自動更新の実行試験は今回行っていない。
