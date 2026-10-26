# セキュリティ改修・運用確認（2026-10-27）

状態：サイト側の改修を本番反映。利用者が選択した「PR作成を自動化、検証開始と反映を人が確認」の運用へ移行。API管理側の確認には下記の保留・未確認事項がある。

## 実装

| 対象 | 対策 | 確認 |
| --- | --- | --- |
| 公開ツール | Wrangler 4.151.3、Miniflare内Undici 7.30.1をlock、動的npx廃止 | PR #4。root/deploy監査0件、CLI dry-runとCloudflare preview成功 |
| 実行環境 | 公式Node.js 24.22.1をSHA照合、実版検査 | 起動前guardとbootstrapを維持 |
| CIブラウザ | Playwright 1.64.1＋公式Chrome for Testing 156.0.8078.47、SHAと実版検査 | 既存216件を維持し、境界・CSP検証を追加。全234件合格（最終の承認運用テスト追加後は235件） |
| 外部取得 | provider別URL、DNS公開IPと接続先固定、認証API転送禁止、展開後容量・12秒期限 | 不正URL/内部IP/stream超過を拒否する境界試験 |
| 権限 | 3取得ジョブ、ネットワークなしの画像処理、保存ジョブへ分離 | 実CI run 40353898005で全provider成功。branch実行はpublishをスキップ |
| 画像 | 公式ImageMagick 6.9.13-59をSHA固定でビルド。JPEG/PNG/WebP・寸法・静止画制限、resource/delegate/coder policy | 実CI run 40360976411で全provider成功。noteは上下16pxずつの黒帯のみ除去し、6枚とも更新前後のトリム後全pixel一致 |
| データ保存 | 通常ファイル/容量/URL/SHA再検査、native decodeなし、限定パスのPR | 失敗時保持・不正成果物拒否・base不一致・検証失敗時非マージを確認 |
| 再発防止 | Actions公式SHA、lock、PR/週次audit、Dependabot、公式Node/Chrome/ImageMagick更新検知 | audit0件。必須verifyにも両依存のauditを実行 |
| 防御ヘッダー | nosniff/referrer/frame/permissions、短期HSTS、CSP強制適用 | Report-Onlyの実Cloudflareプレビューで8ページ・259 immutable assets・ゲーム・画像・解析を検証。CSP違反0件 |

更新PRに含めるのはprovider出力と、その正確な世代を記録する2つの受け入れfixture JSONだけ。任意のソース変更を許可する正規化は行わない。画像・コードの過去のhash付きファイルは削除しない。

最新動画の追加で既存フォント分割が100KBの予算を超えていた。元フォント全体の字形・メトリクス・coverageを保ち再分割し、390/1440px×DPR1/2で配置一致、83,160 bytesを確認。新しいデータを古い内容へ戻したり性能基準を緩めたりしていない。

## 権限と秘密情報

- `YOUTUBE_API_KEY`：YouTube取得stepだけ。SUZURI・画像処理・保存に渡さない。
- `SUZURI_ACCESS_TOKEN`：SUZURI取得stepだけ。欠落時はskipし以前の正常データを保持。
- note：API secretなし。対象RSS・記事と実測した画像CDNだけを許可。
- 取得・画像ジョブのGITHUB_TOKENはcontents:read。checkoutの認証を保持しない。
- 保存stepのGITHUB_TOKENはcontents/pull-requestsの書き込み権限。Actionsの書き込み権限は削除。既存mainの信頼したスクリプトで検査し、候補コード・画像デコーダーを起動しない。
- Cloudflare：静的assetsのみ。runtime secret/bindingなし。ビルド用tokenはCloudflare側で管理。
- YouTube APIキーの管理側制限は未確認。既存アカウントでGoogle Cloudへアクセスしたが、2段階認証の有効化が要求され、利用者の希望により今回は保留した。キー・パスワードの送付は不要。再開時は本人が2段階認証を設定し、プロジェクト内の対象キーについてYouTube Data API v3への制限を確認する。
- SUZURIの管理側tokenスコープも未確認。GitHub secret名だけでは個人用APIキーと読み取り専用OAuthを区別できない。公式仕様では個人用キーは読み書き可能なため、管理画面で確認し、必要なら読み取り専用OAuthへの移行を別途行う。漏えいを確認した事実はなく、一斉失効は実施していない。

## 更新と失敗時の対応

1. 4時間ごと（UTC `10 */4`）または手動で3サービスを取得。
2. 画像処理はネットワークnamespaceを分離し、API秘密情報なし・非rootで実行。no-new-privileges・capability全削除を適用し、ホストと異なるnamespace、loopbackのみ、外部routeなしを実行時検証する。
3. provider単位で候補を検証。不正・失敗したproviderは以前の正常ファイルを保持。
4. mainが取得開始時点のbaseと異なる場合は古い候補を破棄し、現在のmainから手動で再実行する。force pushしない。
5. 自分の未処理データPRがある場合は重複作成せず、そのPRの確認を促して終了。未処理PRがなければデータPRを作成して終了。本番配信の完了とは扱わない。main保護が無効ならPR作成前に停止する。保存workflowは検証の承認・直接マージを実施しない。
6. リポジトリのwrite権限を持つ人がPR差分を確認し、GitHubの「Approve workflows to run」でPRイベントのテストを開始する。`verify`成功後に通常のPRマージで反映する。手動dispatchの成功はPR必須チェックを満たさないため、代用しない。
7. 検証不合格ではPRを残しマージしない。baseが進んだ場合は最新mainへ追従し、再検証する。古い候補は閉じて現在のmainから再取得してもよい。force pushや保護の一時解除をしない。

成功した更新はCloudflare Buildsで同じmain commitの成功を確認し、実配信JSON・画像・TOPを確認する。将来の新タイトルでフォント予算が超過した場合もCIを緩めず、分割フォントを字形・配置比較後に再生成する。

## 復旧

公開の不具合では、既知の正常な静的versionへCloudflareのrolloutで戻す。現行参照中のhash画像を失う過去ソースへの単純rollbackや、脆弱なNode/Undici/browserへのdowngradeをしない。更新処理だけの不具合ではworkflowを一時停止して旧正常データを配信し、修正PRを同じverifyで検証する。main保護は緊急時にも原則維持し、CIで合格した修正PRで復旧する。

CSPの互換性問題では対象の必要な配信元を調査し、Report-Onlyへ戻す変更をPR化できる。script-srcへunsafe-inline/unsafe-evalや任意hostを追加しない。HSTSはmax-age=300から開始しincludeSubDomains/preloadなし。解除にも最大5分の残存がある。

## 端末更新

普段使うGoogle Chromeを155.0.8059.85から156.0.8078.48へ公式配布で更新し、保存済みの確認を受けて再起動した。Apple署名・公証を検査し、再起動後のプロセスが156.0.8078.48のframeworkを実際に開いていることを確認した。ユーザープロファイルを維持。ローカル証跡は `.performance-evidence/security-hardening-20261027/chrome-update.json`。

## 確認範囲と残件

Google CloudでのYouTubeキー制限とSUZURIの管理側スコープ確認は残件。これらを確認済み・全対応完了とは扱わない。サイト側の権限分離と入力制限、既知依存の更新とは区別する。Cloudflare管理基盤内部の全コンポーネントや未公表の脆弱性まで安全を保証する検査ではない。

改修は分離した作業コピーからPR経由で反映した。元の作業フォルダにある既存の未コミット変更は、公開コードへ混ぜていない。

## 証跡

- [依存更新 PR #4](https://github.com/erinui/inutaro-game/pull/4)
- [取得・画像・保存の分離 PR #5](https://github.com/erinui/inutaro-game/pull/5)
- [3サービス実取得と隔離画像処理](https://github.com/erinui/inutaro-game/actions/runs/40353898005)
- [公式Undici勧告](https://github.com/nodejs/undici/security/advisories/GHSA-xjj6-f33q-929c)
- [Google Chrome修正情報](https://chromereleases.googleblog.com/2026/10/stable-channel-update-for-desktop_02018666648.html)

- [防御ヘッダー・運用検証 PR #12](https://github.com/erinui/inutaro-game/pull/12)
- [修正済み画像処理・OS隔離 PR #13](https://github.com/erinui/inutaro-game/pull/13)
- [最終233件回帰テスト](https://github.com/erinui/inutaro-game/actions/runs/40360986303)
- [修正済みImageMagick・隔離環境の3サービス実処理](https://github.com/erinui/inutaro-game/actions/runs/40360976411)
- [公式バイナリ更新検知の実行](https://github.com/erinui/inutaro-game/actions/runs/40359605128)

- [画像6枚の厳密な世代記録 PR #15](https://github.com/erinui/inutaro-game/pull/15)
- [最終234件回帰テスト](https://github.com/erinui/inutaro-game/actions/runs/40364304683)

初回の本番経路検証では、note画像2〜6の世代記録不足を既存テストが検出し、データPR #14はマージされなかった。PR #15で元のbaseline履歴を保持した各画像のSHA記録を追加し、画像が変わる実際の保存経路の回帰テストを追加した。既存検査を除外せず、全234件で再検証した。6枚とも1280×670から上下16pxずつの黒帯だけを除き1280×638となり、残る全画素は一致した。

## 自動更新とmain保護の実績

- 改修後の実更新：[run 40364788698](https://github.com/erinui/inutaro-game/actions/runs/40364788698)で3サービスを取得・隔離変換し、[データPR #16](https://github.com/erinui/inutaro-game/pull/16)の正確なheadに対する[verify](https://github.com/erinui/inutaro-game/actions/runs/40365006874)成功後、自動マージ。main `4d0a7b146279f9e72db240117c9ecb8f2c5f280d`。
- main保護：PR必須、`verify`必須（GitHub Actions app ID 15368）、最新baseとの一致必須、管理者にも適用。force pushと削除を禁止、未解決conversationを禁止。単独運用のため必須レビュー承認人数は0。ActionsによるPR作成・承認を許可する一体の設定は利用者の明示承認を受けたが、本workflowはレビュー承認を実施しない。
- 収集・画像・保存以外のソース改修も、同じverifyを通るPR経由で反映する。Dependabotのmajor更新などは別途互換性をレビューし、今回の対策と混ぜて自動マージしない。

## 保護下での実反映と運用上の選択

main保護後の[run 40365482060](https://github.com/erinui/inutaro-game/actions/runs/40365482060)は[データPR #17](https://github.com/erinui/inutaro-game/pull/17)を作成。手動dispatchの234件は合格したが、GitHubの仕様によりPR必須チェックを満たさず、マージAPIが405で拒否された。保護は解除していない。

対象PRのワークフローだけを人の権限で承認し、PRイベントの[audit](https://github.com/erinui/inutaro-game/actions/runs/40365724641)と[verify 234件](https://github.com/erinui/inutaro-game/actions/runs/40365724809)が合格した後、通常のPRマージでmain `2b517d2`へ反映した。

利用者は今後の運用として「PR作成は自動、検証開始を人が承認する」を選択。直接マージと手動dispatchを保存スクリプトから削除し、Actionsの書き込み権限も削除した。自動更新workflowの成功は「候補PRの作成完了」を意味する。PRの承認・テスト合格・通常マージを経るまで本番は以前の正常データを維持する。

GitHub標準auto-mergeをリポジトリ全体で有効にする操作は、具体的な承認がない設定変更として自動承認レビューに拒否され、設定を変更しなかった。今回の選択に従い有効化しない。専用GitHub App等による完全自動化は今回の対象外。将来変更するときも必須チェック・main保護を維持して別途設計する。

仕様根拠：[GITHUB_TOKENが作成するPRの承認](https://docs.github.com/en/actions/concepts/security/github_token)、[必須チェックと手動dispatchの制約](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks)。
