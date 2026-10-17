# 表示速度改善 実装・検証記録

日付: 2026-10-17 / 対象HEAD: `8f7563cfcefe7109a1e915fd3d0cf55eb6d34f61`

SDD: [詳細設計書](home-performance-design.md)。工程管理: [改修計画](home-performance-plan.md)。ローカル実装済み。公開前の他ブラウザ・実CI確認を残す。公開済みという意味ではない。

## 実装した内容

| 領域 | 実装 | 検証・制限 |
|---|---|---|
| 地図8枚 | SVG全体をChromeで透過ラスター化し、WebP q90を採用。正方形512px、キャラクター650×816px | 原本のviewBox/パターン/補正を含む。合計233,298 bytes。PC/SP・DPR1/2の配置・リンク一致。Safariは未確認 |
| その他画像 | キャラ5枚、ゲーム紹介、ヘッダー専用96pxロゴをWebP化 | 最大95,858 bytes。TOP/キャラページの配置差は最大0.046875 CSS px。写真を含む比較画像を点検。favicon/PWA/OGPの原本は維持 |
| フォント | swap単独の変更後、142の排他的unicode-rangeへ分割。原本全cmap・字形・hmtx・global boundsを保持 | TOP初期2ファイル84,792 bytes。原本は約1.6MB。見出し・本文の行ボックス、欧文合字・結合文字・かな・低頻度字fixtureをChrome4条件で比較して一致 |
| フォントの機能範囲 | 現行の横書きで使うliga/kern/rtlaを保持。欧文/結合文字・かな/半角かなを同じfaceへ配置 | 縦書き・任意feature指定等の将来変更はpolicy違反として再生成を要求。全layout機能を保持した小容量化ではない |
| YouTube | v2 JSON、動画ID＋SHAのWebPを6件生成、旧JPGと上流URLを保持。新規ハッシュ画像はadd-only | collectorの分離stage・部分失敗・復元・publish契約を維持。更新JSONのfetchedAt・動画内容は今回の移行で変更していない |
| 初期HTML | ビルド時に同じJSONのリンク・タイトル・画像を明示スロットに適用。bootstrapも同じ内容 | JS無効時はmin(3,N)、有効時はmin(5,N)＋N>5のみ「もっと見る」。N=0は汎用案内。再hydrateで既存画像ノードを維持 |
| 読み込み | 非表示YouTube画像のsrcを遅延、8秒時に次画像の取得/decode、10秒周期を維持 | decode待ち中は前画像を維持。世代・予定表示が変わった旧完了を破棄。画像寸法/asyncとJS生成カード枠を確保 |
| LCP | 実測LCPは`.map-stage`の背景。背景SVGを同じURLでhigh preload | 無関係なimgにhighを指定しない。地図は初期表示に必要なのでeager、既存の画面外カードはlazyを継続。背景の二重取得を試験 |
| 配信 | 画像・フォント・共通CSS/JSはSHA付き`assets/versioned/`へ。CSS相対URLとJS内静的画像を対応付け | 原本・旧URLを保存。元ファイル、生成物、HTML/JSの参照の不整合はビルドエラー |
| キャッシュ | `_headers`は`/assets/versioned/*`のみ1年immutable。既存noindexを維持 | HTML・JSON・同名更新画像には長期指定をしない。本番ヘッダーは公開後に確認が必要 |
| 復旧 | JSON aliasはビルド出力でcanonicalから自動生成し、resolverが新URLを取得 | freshな誤キャッシュ、明示no-cache、alias更新、旧ページ遅延画像の和集合の検査を用意 |

AVIF、apple-touch-iconの減色は採用していない。画質・互換性を確認したWebPを使い、既存PNGアイコンを保持する。

## TDDと回帰防止

先に失敗する試験を追加し、manifest/変換、snapshot、codec/collector、スライド、フォント、cache/recoveryを順に実装した。開始時点の既存ブラウザ・保持系85試験は全件合格。古いbaselineファイルの期待値を上書きせず、P0のフルSHAへ戻せる限定変更記録を新設した。

`tests/fixtures/home-performance-changes.json` と `tests/helpers/approved-home-performance-changes.mjs` は、承認済み差分を逆適用し、元の全体SHAと一致することを検査する。旧faviconのビルド試験はアイコン宣言と画像bytesの完全一致を維持し、HTML全体の変換範囲は新しいビルド保持試験で別途検査する。

全体試験 **143/143合格**（失敗・取消・skipともに0、52.6秒）。証跡: `.performance-evidence/20261017/all-tests-final.txt`。その後、同じ試験内の3画像再利用・旧世代decode破棄を強化し、該当4試験も再合格（`runtime-generation-final.txt`）。8ページ×12境界幅の検査と、代表PC/SPの全画像閲覧、ハッシュ変更後の新資産取得、旧ページの遅延画像復旧も含む。

追加試験は `tests/home-*.test.mjs`、`tests/youtube-images.test.mjs`。142分割フォントは固定集合から再生成し、全ファイルのSHAが採用品と一致した。最終260公開ファイルも計測対象releaseと完全一致。証跡: `final-release-verification.json`。

復旧inventoryは新releaseの174資産で一致し、旧releaseへの直接切り戻しは不足資産を検出して拒否した。

## 計測条件と証跡

開始時のソース・データSHAと未追跡一覧を `.performance-evidence/20261017/start.json` に固定し、旧配信物を同ディレクトリの `baseline/site/` に保存した。証跡は公開ビルドに含めない。

Chrome、390×844 / 1440×900、DPR1/2、下り6Mbps・上り1.5Mbps・遅延150ms・CPU4倍、キャッシュ無効、スクロール・操作なし30秒を各3回。文書・外部通信を含む圧縮後本文合計と、CDPのtransferBytesは区別する。外部の圧縮なし画像は完了レスポンスのContent-Lengthまたは実体長で補完する。CLSは最大セッションウィンドウを使う。

旧版はローカル仮サムネから外部画像への切り替えにより中断要求がある。未確定分を0と見なさずunknownへ記録し、改修前の本文量は確認済み下限として扱う。改修前全量を確定値として性能合格には使わない。LCP/CLSの比較と、確認済み量に対する削減下限は報告できる。

予備計測を最終判定に流用しない。計測途中の同時ブラウザ試験を避け、最終結果は`acceptance-before/runs.json` / `acceptance-after/runs.json`と集計JSONに残す。

## 最終ラボ計測結果

各条件3回の中央値。容量の判定は各回の最大値でも確認し、改修後12回はunknown・未完了ともに0。以下の数値ゲートは4条件とも合格した。公開前ゲート全体の完了とは区別する。

| 条件 | 改修前本文量（確認済み下限） | 改修後本文量 | LCP 改修前→後 | CLS 改修前→後 | 初期フォント |
|---|---:|---:|---:|---:|---:|
| SP 390px / DPR1 | 7,743,464 B | 644,634 B | 2,608→540 ms | 0.0494→0.0494 | 84,792 B |
| SP 390px / DPR2 | 7,739,572 B | 644,634 B | 2,580→516 ms | 0.0494→0.0494 | 84,792 B |
| PC 1440px / DPR1 | 9,465,328 B | 1,029,343 B | 688→540 ms | 0.0849→0.0849 | 84,792 B |
| PC 1440px / DPR2 | 9,462,328 B | 1,029,343 B | 696→540 ms | 0.0849→0.0849 | 84,792 B |

SPの確認できる削減率は少なくとも91.6%。1MBはSPの目標であり、PCが1.03MBであることを隠さない。最大単一画像はSP 66,458 B、PC 95,858 Bで100KB以下。フォントは原本1,635,088 Bに対し約94.8%削減。地図8枚233,298 Bは約200KBという努力目標を約33KB上回るが、画質比較を優先した。

集計: `.performance-evidence/20261017/acceptance-summary.json`。改修前には各回2〜3件の画像中断があり、本文量は全量の確定値ではない。独自ラボのLCP/CLSと、Lighthouseのシミュレーション値・PSIの実ユーザー指標は混同しない。

### Lighthouse（独立した補助計測）

Lighthouse 13.5.0の標準モバイル・simulated throttling（約1.64Mbps、CPU4倍、412px/DPR1.75）を同じ圧縮配信で各1回実行した。SDD指定の6Mbps・30秒観測とは条件が違い、3回中央値の代用にしない。

| 指標 | 改修前 | 改修後 |
|---|---:|---:|
| Performance | 70 | 87 |
| シミュレーションLCP | 20.92秒 | 4.00秒 |
| CLS | 0 | 0.00468 |

runtimeError・警告は両版ともなし。この追加条件ではLCP2.5秒未満には未達で、CLSもわずかに増えている。改善済みと未達を区別する。次の検討対象はrender-blocking CSS、フォントの依存チェーン、より低速な回線条件での描画待ち。現行書体やレイアウトを変更してスコアだけを上げる改修は含めていない。

証跡: `.performance-evidence/20261017/lighthouse/{before,after}.report.html`、同JSON、`summary.json`。[公式CLI手順](https://github.com/GoogleChrome/lighthouse#using-the-node-cli)に従い、一時領域へ導入した。Lighthouseは配信・通常ビルドの依存に追加していない。

```sh
HOME_LIGHTHOUSE_CLI=<lighthouse/cli/index.js> HOME_LIGHTHOUSE_OUTPUT=<新規出力> HOME_LIGHTHOUSE_BEFORE=<before証跡> HOME_LIGHTHOUSE_AFTER=<after証跡> node scripts/check-home-lighthouse.mjs
```

## 再現・運用コマンド

通常ビルドには外部パッケージや画像変換ツールは不要。生成物とmanifestを含むcheckoutでNode20以降を使う。

```sh
node scripts/build-site.mjs
node scripts/preview-site.mjs --built
```

`dist/`は新規作成先であること。既存distの上書き・自動削除はしない。ソース直配信のpreviewは最適化版の最終確認に使わない。

元のCSS/JS、画像対応付け、font policyを変更した場合は明示的にコード資産を再生成する。

```sh
node --input-type=module -e 'import {refreshCodeAssets} from "./scripts/lib/generate-home-code.mjs"; await refreshCodeAssets(process.cwd());'
```

フォントはFontTools 4.63.0とBrotliを使い、固定済み文字集合から再生成する。

```sh
python3 scripts/generate-home-font-candidates.py /tmp/erinui-font-candidates --partition config/home-font-partitions.json
```

採用には字形/寸法の機械比較とブラウザ比較が必要。生成スクリプトは候補を作り、adoptスクリプトが比較結果・元SHA・容量を検証して登録する。新しいタイトルが多数の残余faceを使うと初期100KBを超え得るため、文字集合を削除せず再計測してグループ構成を見直す。

分割ファイル全体の保存量は2,316,640 bytesで、初期取得量とは異なる。原本9,868コードポイントを保持し、必要なfaceだけを取得する。今回のPython実行環境は `/opt/homebrew/bin/python3.10`。

ローカル生成はChrome 155.0.8059.80、cwebp/dwebp 1.6.0、sharp 0.35.5/libvips 8.18.7、FontTools 4.63.0。試験はPlaywright 1.62.1とxml-jsを使用。今回のローカルNodeは25.8.2、更新CIはNode20とubuntu-24.04。CIのWebPソースは1.6.0のtar SHAを検証する。GitHub Actions上の実行は未確認。

```sh
NODE_PATH=<検証依存のnode_modules> CHROME_EXECUTABLE=<Chromeの実行パス> node --test --test-concurrency=1 tests/*.test.mjs
HOME_PERFORMANCE_OUTPUT=<新規証跡ディレクトリ> NODE_PATH=<検証依存のnode_modules> node scripts/check-home-performance.mjs
node scripts/summarize-home-performance.mjs <before>/runs.json <after>/runs.json <新規集計.json>
```

## キャッシュ事故・切り戻し

通常時の `config/home-data-recovery.json` は空。誤ってfreshになったJSONを復旧するときはcanonicalごとに`active`と`aliases`を設定する。aliasの例は`assets/home-city/youtube-latest.recovery-20261017-01.json`。ビルドは全aliasへその時点のcanonical bytesを原子的に生成し、HTMLのresolverへactive URLを埋める。データ更新の公開も必ずビルドを経由する。

既に開いた旧クライアントそのものを新コードへ書き換える機構ではない。旧URLがfreshな間はaliasを継続し、HTMLを再取得したクライアントを復旧させる。

切り戻しは旧正常コード＋最新正常データ＋保持資産の和集合で新規releaseを組む。公開済み各releaseのハッシュ資産inventoryを保存し、候補の存在・完全SHAを検査する。

```sh
node scripts/check-home-recovery.mjs capture <公開するビルド> <新規inventory.json>
node scripts/check-home-recovery.mjs verify <復旧候補ビルド> <公開済みinventory1.json> <公開済みinventory2.json>
```

inventory検査はハッシュ付き資産が対象。旧PNG/JPG・元フォントの保持、最新データとsnapshotの対応は通常ビルドと既存保持試験でも確認する。検査失敗の旧releaseへ直接戻さない。URLだけを戻しても、開いたページが遅延要求する新版ファイルは必要である。

## 公開前に残すゲート

- Chrome以外、特にSafariで画像・フォント・10秒周期を確認。
- GitHub ActionsのNode20/Linuxで新collector・codec導入を確認。
- 全変更・生成物を同じ公開単位に含め、クリーンなcheckoutでビルド。Git index・commit/pushは今回未変更。
- 本番でimmutable、JSON再検証、noindexのホスト制限、404と相対URLを確認。
- 公開後のLighthouse・PageSpeed Insightsと継続観測。今回のローカルLighthouseは上記のとおり実施済み。ラボ測定を実ユーザー指標と扱わない。

本番公開・DNS/Cloudflare設定操作は実施していない。
