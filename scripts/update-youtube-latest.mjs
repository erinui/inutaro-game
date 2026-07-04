import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const API_BASE = "https://www.googleapis.com/youtube/v3";
const OUT_DIR = path.join("assets", "home-city");
const DEFAULT_CHANNEL_ID = "UCdnf6zMzSdZuvUxS-CS2REQ";
const DEFAULT_HANDLE = "@えりぬい";
const MAX_RESULTS = clampNumber(Number(process.env.YOUTUBE_MAX_RESULTS || 3), 1, 10);

const apiKey = process.env.YOUTUBE_API_KEY;
const channelId = process.env.YOUTUBE_CHANNEL_ID || DEFAULT_CHANNEL_ID;
const handle = process.env.YOUTUBE_HANDLE || DEFAULT_HANDLE;

if (!apiKey) {
  throw new Error("YOUTUBE_API_KEY is required.");
}

await mkdir(OUT_DIR, { recursive: true });

const channel = await fetchChannel();
const videos = await fetchLatestVideos(channel.uploadsPlaylistId);

const data = {
  ok: true,
  fetchedAt: new Date().toISOString(),
  channel: {
    id: channel.id,
    title: channel.title,
    handle,
    url: `https://www.youtube.com/channel/${channel.id}`,
    statistics: channel.statistics,
  },
  videos,
};

await writeFile(
  path.join(OUT_DIR, "youtube-latest.json"),
  `${JSON.stringify(data, null, 2)}\n`,
);

await Promise.all(
  videos.slice(0, 3).map(async (video, index) => {
    if (!video.thumbnail?.url) return;
    const response = await fetch(video.thumbnail.url);
    if (!response.ok) {
      throw new Error(`Failed to download thumbnail ${index + 1}: ${response.status}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(path.join(OUT_DIR, `youtube-thumb-${index + 1}.jpg`), bytes);
  }),
);

console.log(
  JSON.stringify(
    {
      fetchedAt: data.fetchedAt,
      subscriberCount: data.channel.statistics.subscriberCount,
      videoCount: data.channel.statistics.videoCount,
      videos: videos.map((video) => ({
        title: video.title,
        publishedAt: video.publishedAt,
      })),
    },
    null,
    2,
  ),
);

async function fetchChannel() {
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
  if (!item) {
    throw new Error("YouTube channel was not found.");
  }

  return {
    id: item.id,
    title: item.snippet?.title || "",
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads,
    statistics: normalizeChannelStatistics(item.statistics || {}),
  };
}

async function fetchLatestVideos(playlistId) {
  if (!playlistId) {
    throw new Error("Uploads playlist ID is missing.");
  }

  const params = new URLSearchParams({
    part: "snippet,contentDetails",
    playlistId,
    maxResults: String(MAX_RESULTS),
    key: apiKey,
  });

  const data = await youtubeFetch(`/playlistItems?${params.toString()}`);
  return (data.items || []).map(normalizeVideo).filter((video) => Boolean(video.id));
}

async function youtubeFetch(pathname) {
  const response = await fetch(`${API_BASE}${pathname}`, {
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

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}
