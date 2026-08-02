const DEFAULT_HANDLE = "@えりぬい";
const DEFAULT_MAX_RESULTS = 6;
const DEFAULT_CACHE_SECONDS = 60 * 60;
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const apiKey = env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return jsonResponse(
        {
          ok: false,
          error: "YOUTUBE_API_KEY is not configured.",
        },
        { status: 500, cacheSeconds: 0 },
      );
    }

    const url = new URL(request.url);
    const maxResults = clampNumber(
      Number(url.searchParams.get("maxResults") || env.YOUTUBE_MAX_RESULTS || DEFAULT_MAX_RESULTS),
      1,
      10,
    );
    const cacheSeconds = clampNumber(
      Number(env.YOUTUBE_CACHE_SECONDS || DEFAULT_CACHE_SECONDS),
      60,
      60 * 60 * 24,
    );

    const cache = caches.default;
    const cacheKey = new Request(
      new URL(`/api/latest-youtube?maxResults=${maxResults}`, url.origin).toString(),
      request,
    );
    const cached = await cache.match(cacheKey);
    if (cached) {
      return withCors(cached);
    }

    const channel = await fetchChannel({
      apiKey,
      channelId: env.YOUTUBE_CHANNEL_ID,
      handle: env.YOUTUBE_HANDLE || DEFAULT_HANDLE,
    });

    if (!channel) {
      return jsonResponse(
        {
          ok: false,
          error: "YouTube channel was not found.",
        },
        { status: 404, cacheSeconds: 0 },
      );
    }

    const videos = await fetchLatestVideos({
      apiKey,
      playlistId: channel.uploadsPlaylistId,
      maxResults,
    });

    const response = jsonResponse(
      {
        ok: true,
        fetchedAt: new Date().toISOString(),
        channel: {
          id: channel.id,
          title: channel.title,
          handle: env.YOUTUBE_HANDLE || DEFAULT_HANDLE,
          url: `https://www.youtube.com/channel/${channel.id}`,
          statistics: channel.statistics,
        },
        videos,
      },
      { cacheSeconds },
    );

    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: "Failed to fetch latest YouTube videos.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502, cacheSeconds: 0 },
    );
  }
}

export function onRequestOptions() {
  return withCors(new Response(null, { status: 204 }));
}

async function fetchChannel({ apiKey, channelId, handle }) {
  const params = new URLSearchParams({
    part: "snippet,contentDetails,statistics",
    key: apiKey,
  });

  if (channelId) {
    params.set("id", channelId);
  } else {
    params.set("forHandle", handle);
  }

  const data = await youtubeFetch(`/channels?${params.toString()}`);
  const item = data.items?.[0];
  if (!item) return null;

  return {
    id: item.id,
    title: item.snippet?.title || "",
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads,
    statistics: normalizeChannelStatistics(item.statistics || {}),
  };
}

async function fetchLatestVideos({ apiKey, playlistId, maxResults }) {
  if (!playlistId) {
    throw new Error("Uploads playlist ID is missing.");
  }

  const params = new URLSearchParams({
    part: "snippet,contentDetails",
    playlistId,
    maxResults: String(maxResults),
    key: apiKey,
  });

  const data = await youtubeFetch(`/playlistItems?${params.toString()}`);
  return (data.items || [])
    .map((item) => normalizeVideo(item))
    .filter((video) => Boolean(video.id));
}

async function youtubeFetch(path) {
  const response = await fetch(`${YOUTUBE_API_BASE}${path}`, {
    headers: {
      Accept: "application/json",
    },
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message || `YouTube API request failed: ${response.status}`;
    throw new Error(message);
  }
  return data;
}

function normalizeVideo(item) {
  const snippet = item.snippet || {};
  const videoId = item.contentDetails?.videoId || snippet.resourceId?.videoId || "";
  const thumbnails = snippet.thumbnails || {};
  const thumbnail =
    thumbnails.maxres ||
    thumbnails.standard ||
    thumbnails.high ||
    thumbnails.medium ||
    thumbnails.default ||
    null;

  return {
    id: videoId,
    title: snippet.title || "",
    description: snippet.description || "",
    publishedAt: snippet.publishedAt || item.contentDetails?.videoPublishedAt || "",
    url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : "",
    thumbnail: thumbnail
      ? {
          url: thumbnail.url,
          width: thumbnail.width || null,
          height: thumbnail.height || null,
        }
      : null,
  };
}

function normalizeChannelStatistics(statistics) {
  return {
    subscriberCount: toNullableNumber(statistics.subscriberCount),
    hiddenSubscriberCount: Boolean(statistics.hiddenSubscriberCount),
    viewCount: toNullableNumber(statistics.viewCount),
    videoCount: toNullableNumber(statistics.videoCount),
  };
}

function toNullableNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function jsonResponse(body, { status = 200, cacheSeconds = DEFAULT_CACHE_SECONDS } = {}) {
  return withCors(
    new Response(JSON.stringify(body, null, 2), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control":
          cacheSeconds > 0
            ? `public, max-age=${cacheSeconds}, stale-while-revalidate=${cacheSeconds}`
            : "no-store",
      },
    }),
  );
}

function withCors(response) {
  const next = new Response(response.body, response);
  next.headers.set("Access-Control-Allow-Origin", "*");
  next.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  next.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return next;
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}
