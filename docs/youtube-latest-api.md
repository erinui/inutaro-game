# YouTube最新動画取得API 設計メモ

最終更新: 2026-06-28

## 目的

ホーム検討案のSNSエリアで、YouTubeチャンネル「えりぬい」の最新動画サムネイルを表示できるようにする。

ブラウザ側にYouTube APIキーを置かず、Cloudflare Pages Functions / Workers 側でYouTube Data APIを呼び出す。

## 対象チャンネル

| 項目 | 値 |
| --- | --- |
| ハンドル | `@えりぬい` |
| URL | `https://www.youtube.com/@%E3%81%88%E3%82%8A%E3%81%AC%E3%81%84` |
| 既知のチャンネルID | `UCdnf6zMzSdZuvUxS-CS2REQ` |

## 実装ファイル

```text
functions/
└── api/
    └── latest-youtube.js

scripts/
└── update-youtube-latest.mjs

.github/
└── workflows/
    └── update-youtube-latest.yml
```

Cloudflare Pagesへ移管した場合、次のURLでJSONを返す想定。

```text
/api/latest-youtube
```

GitHub Pagesではサーバー処理を実行できないため、GitHub Actionsで定期取得し、静的ファイルとして次のファイルを更新する。

```text
assets/home-city/youtube-latest.json
assets/home-city/youtube-thumb-1.jpg
assets/home-city/youtube-thumb-2.jpg
assets/home-city/youtube-thumb-3.jpg
```

## 取得フロー

```text
ブラウザ
  -> /api/latest-youtube
  -> Cloudflare Function
  -> YouTube Data API channels.list
  -> uploads playlist ID を取得
  -> YouTube Data API playlistItems.list
  -> 最新動画情報をJSONで返す
```

GitHub Pages運用時:

```text
GitHub Actions
  -> scripts/update-youtube-latest.mjs
  -> YouTube Data API channels.list
  -> uploads playlist ID を取得
  -> YouTube Data API playlistItems.list
  -> youtube-latest.json と youtube-thumb-*.jpg を更新
  -> 変更がある場合のみ自動コミット

ブラウザ
  -> /api/latest-youtube を試す
  -> 404等の場合 assets/home-city/youtube-latest.json を読む
  -> 最新3本のサムネイルと登録者数を表示
```

## Cloudflare環境変数

| 名前 | 必須 | 内容 |
| --- | --- | --- |
| `YOUTUBE_API_KEY` | 必須 | YouTube Data API v3 のAPIキー。Secretとして登録する |
| `YOUTUBE_CHANNEL_ID` | 任意 | チャンネルID。指定するとハンドル解決を省略できる |
| `YOUTUBE_HANDLE` | 任意 | 省略時は `@えりぬい` |
| `YOUTUBE_MAX_RESULTS` | 任意 | 省略時は `3` |
| `YOUTUBE_CACHE_SECONDS` | 任意 | 省略時は `3600` 秒 |

推奨は `YOUTUBE_CHANNEL_ID=UCdnf6zMzSdZuvUxS-CS2REQ` も設定しておくこと。これにより、ハンドル変更時も取得が安定する。

GitHub Actionsでの設定:

| 種別 | 名前 | 内容 |
| --- | --- | --- |
| Repository Secret | `YOUTUBE_API_KEY` | YouTube Data API v3 のAPIキー |
| Repository Variable | `YOUTUBE_CHANNEL_ID` | 任意。未設定時は `UCdnf6zMzSdZuvUxS-CS2REQ` |
| Repository Variable | `YOUTUBE_HANDLE` | 任意。未設定時は `@えりぬい` |

Workflowは4時間ごとの10分に実行し、GitHub画面から手動実行もできる。

## レスポンス例

```json
{
  "ok": true,
  "fetchedAt": "2026-06-28T00:00:00.000Z",
  "channel": {
    "id": "UCdnf6zMzSdZuvUxS-CS2REQ",
    "title": "えりぬい",
    "handle": "@えりぬい",
    "url": "https://www.youtube.com/channel/UCdnf6zMzSdZuvUxS-CS2REQ",
    "statistics": {
      "subscriberCount": 100,
      "hiddenSubscriberCount": false,
      "viewCount": 12000,
      "videoCount": 30
    }
  },
  "videos": [
    {
      "id": "VIDEO_ID",
      "title": "動画タイトル",
      "description": "動画説明",
      "publishedAt": "2026-06-28T00:00:00Z",
      "url": "https://www.youtube.com/watch?v=VIDEO_ID",
      "thumbnail": {
        "url": "https://i.ytimg.com/vi/VIDEO_ID/hqdefault.jpg",
        "width": 480,
        "height": 360
      }
    }
  ]
}
```

## フロント表示方針

ホームのマップ内では、YouTube掲示板イラストを前面に置き、くり抜き部分の背面に直近3本の動画サムネイルとチャンネル公開統計を10秒ごとに切り替えて表示する。

公開統計は YouTube Data API の `channels.list?part=statistics` で取得できる範囲に限定する。総再生時間は YouTube Analytics API とチャンネル所有者のOAuth認証が必要なため、この表示対象には含めない。

レイヤー例:

```text
上: map_youtube.png
中: YouTubeサムネイル3枚 / チャンネル公開統計
下: マップ背景
```

## 注意点

- APIキーはフロントエンドJavaScriptへ直接書かない。
- YouTube APIの呼び出し回数を抑えるため、Cloudflare側で最低1時間程度キャッシュする。
- 表示崩れやAPI障害時に備えて、フロント側では固定サムネイルまたはチャンネルリンクへのフォールバックを用意する。
