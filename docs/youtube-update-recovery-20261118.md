# YouTube更新の復旧（2026-11-18）

## 原因

10月27日に作成されたデータPR #23で実際のPR検証がaction_requiredのまま滞留した。以降の収集・隔離画像処理は正常だったが、保存処理は既存PRを検知すると正常終了し、新しい候補を保存しなかった。本番JSONは2026-10-26T17:27:59.240Zのままだった。

11月18日の調査で、11月10日「【くら寿司】食レポ練習！」、11月9日「My Pokémon Party にはしゃぐ金銀世代」、11月4日「今川焼カフェラテ」の3本がYouTube API・定期処理成果物に含まれることを確認。YouTubeのショートタブのIDとも照合した。6件全てのローカルWebP SHA-256が一致した。ショートの除外や画像取得失敗が原因ではない。

## 自動化の範囲

利用者の指示により、従来の手動検証開始・マージから、検証済みデータ限定の自動反映へ変更する。

- 収集・秘密情報・ネットワークなし画像処理・保存のジョブ分離を維持する。保存ジョブにはActions書き込み権限を与えない。
- `reconcile-home-updates.yml` は収集・verify・auditの完了時、4時間ごとの補完実行、手動実行で動く。workflow_runのPRコードや成果物を実行せず、必ずmainをcheckoutする。npm導入も画像デコードも不要。
- 操作対象は同一リポジトリのgithub-actions[bot]作成・所定のタイトル・main向け・automation/home-latest-{runId}のPRだけ。
- 収集元runがmainの正規収集workflowの成功runであること、PRがそのbaseを親とする単一commitであること、全差分がprovider出力と2つの世代fixtureのみであることを確認する。過去のハッシュ画像は削除しない。
- 上記条件を満たしたデータPRだけ実際のpull_requestイベントのverify/auditを開始する。workflow_dispatchによる代替チェックやチェック成功の偽装は行わない。
- 両workflowとGitHub Actions app ID 15368の両チェックが正確なheadで成功したら、head SHAを指定して通常マージする。main保護・最新base必須・conversation解消などの条件はGitHubにも強制させる。保護解除・force push・管理者バイパス・リポジトリ全体のauto-merge設定変更は行わない。
- baseが進んだPRは閉じ、最新mainから収集workflowを再実行する。既存headを上書きせず、新規候補として再検証する。
- 失敗した検証、不正差分、収集元不一致、権限不足はエラー終了し、本番の正常データを保持する。実行ログとActionsの失敗通知で追跡する。任意の将来障害まで無停止を保証するものではない。

## 検証

回帰テストは成功時の通常マージ、実PR検証開始、実行中の待機、古いbaseの再収集、ソース変更・偽の収集元・別appのチェック・検証失敗・保護解除時の拒否を対象とする。本番反映は必須verify成功後に行い、Cloudflare Buildsの同じmain commitと配信JSON・画像を照合する。
