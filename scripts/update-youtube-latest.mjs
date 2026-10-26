import {safeFetch} from './lib/safe-fetch.mjs';
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createYoutubeImage } from './lib/youtube-images.mjs';

const API_BASE = "https://www.googleapis.com/youtube/v3";
const OUT_DIR = process.env.HOME_LATEST_OUTPUT_DIR || path.join("assets", "home-city");
const DEFAULT_CHANNEL_ID = "UCdnf6zMzSdZuvUxS-CS2REQ";
const DEFAULT_HANDLE = "@えりぬい";
const MAX_RESULTS = clampNumber(Number(process.env.YOUTUBE_MAX_RESULTS || 6), 1, 6);

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
  schemaVersion: 2,
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

await Promise.all(
  videos.map(async (video, index) => {
    if (!video.thumbnail?.url) return;
    const response = await safeFetch(video.thumbnail.url, {kind: 'youtubeImage', signal: AbortSignal.timeout(12_000), headers: {Accept:'image/jpeg'} });
    if (!response.ok) {
      throw new Error(`Failed to download thumbnail ${index + 1}: ${response.status}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if(process.env.INUTARO_FETCH_ONLY==='1'){
      if(!/^[A-Za-z0-9_-]{1,80}$/.test(video.id))throw new Error('Invalid video id');
      const rawFile=`youtube-raw-${video.id}.jpg`;
      await writeFile(path.join(OUT_DIR,rawFile),bytes,{flag:'wx'});
      video.rawThumbnail=rawFile;
    }else video.localThumbnail = await createYoutubeImage({bytes,videoId:video.id,directory:OUT_DIR});
    if(index<5) {
      if(bytes[0]!==255||bytes[1]!==216)throw new Error('Legacy JPEG is unavailable; previous provider output retained');
      await writeFile(path.join(OUT_DIR, `youtube-thumb-${index + 1}.jpg`), bytes);
    }
  }),
);
await writeFile(path.join(OUT_DIR, 'youtube-latest.json'),`${JSON.stringify(data,null,2)}\n`);

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
  if (!Array.isArray(data.items)) throw new Error("Invalid YouTube playlist response.");
  return data.items.map(normalizeVideo).filter((video) => Boolean(video.id));
}

async function youtubeFetch(pathname) {
  const response = await safeFetch(`${API_BASE}${pathname}`, {kind: 'youtubeApi',
    signal: AbortSignal.timeout(12_000),
    headers: {
      Accept: "application/json",
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`YouTube API request failed: ${response.status}`);
  }
  return data;
}

function normalizeVideo(item) {
  const snippet = item.snippet || {};
  const videoId = item.contentDetails?.videoId || snippet.resourceId?.videoId || "";
  const thumbnails = snippet.thumbnails || {};
  const candidates=Object.values(thumbnails).filter(t=>t?.url&&t.width>0&&t.height>0);
  const preferred=candidates.filter(t=>t.width>=640&&Math.abs(t.width/t.height-16/9)<.05).sort((a,b)=>a.width-b.width);
  const thumbnail=preferred[0]||candidates.sort((a,b)=>b.width-a.width)[0]||null;

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
