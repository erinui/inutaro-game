const youtubeCard = document.querySelector(".map-link-youtube");
const sasukeButton = document.querySelector(".map-decoration-sasuke");
const bukuroButton = document.querySelector(".map-decoration-bukurochan");
const contentCarousels = document.querySelectorAll(".content-carousel");
const youtubeCardsTrack = document.querySelector("[data-youtube-cards]");
const noteCardsTrack = document.querySelector("[data-note-cards]");
const suzuriCardsTrack = document.querySelector("[data-suzuri-cards]");
const lineStampCardsTrack = document.querySelector("[data-line-stamp-cards]");
const newsCardsTrack = document.querySelector("[data-news-cards]");
const latestNewsContent = {};
try {
  const snapshot = JSON.parse(document.querySelector("#home-youtube-snapshot-data")?.textContent || "null");
  if (snapshot?.ok && Array.isArray(snapshot.videos)) latestNewsContent.youtube = snapshot;
} catch { /* A missing or invalid snapshot must not prevent live hydration. */ }
const homeJsonRoutes = (() => {
  try { return JSON.parse(document.querySelector("#home-data-routes")?.textContent || "{}"); }
  catch { return {}; }
})();
const boundCardImages = new WeakSet();
const youtubePanelStates = new WeakMap();

document.querySelectorAll(".content-carousel-card img.content-card-media").forEach(image => bindCardImageFallback(image));

if (youtubeCard) {
  hydrateYoutubeContent(youtubeCard);
  startYoutubeDisplayCycle(youtubeCard);
}

bindDecorationAction(sasukeButton, "is-walking", 1600);
bindDecorationAction(bukuroButton, "is-questioning", 1100);
contentCarousels.forEach(bindContentCarousel);
hydrateStaticContent();

function bindDecorationAction(element, className, duration) {
  if (!element) return;

  let timer = 0;
  element.addEventListener("click", () => {
    element.classList.remove(className);
    window.clearTimeout(timer);
    window.requestAnimationFrame(() => {
      element.classList.add(className);
      timer = window.setTimeout(() => {
        element.classList.remove(className);
      }, duration);
    });
  });
}

function bindContentCarousel(carousel) {
  const track = carousel.querySelector(".content-carousel-track");
  const prevButton = carousel.querySelector(".content-carousel-prev");
  const nextButton = carousel.querySelector(".content-carousel-next");

  if (!track || !prevButton || !nextButton) return;

  const updateButtons = () => {
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    const canScroll = maxScroll > 8;
    carousel.classList.toggle("is-scrollable", canScroll);
    prevButton.disabled = !canScroll || track.scrollLeft <= 1;
    nextButton.disabled = !canScroll || track.scrollLeft >= maxScroll - 1;
  };

  const scrollPage = (direction) => {
    track.scrollBy({
      left: direction * track.clientWidth,
      behavior: "smooth",
    });
  };

  prevButton.addEventListener("click", () => scrollPage(-1));
  nextButton.addEventListener("click", () => scrollPage(1));
  track.addEventListener("scroll", updateButtons, { passive: true });
  window.addEventListener("resize", updateButtons);
  updateButtons();
}

async function hydrateYoutubeContent(card) {
  try {
    const data = await fetchYoutubeData();
    if (data?.ok) {
      applyYoutubeMapData(card, data);
      renderLatestCards(youtubeCardsTrack, data.videos, {
        category: "YOUTUBE",
        moreUrl: "https://www.youtube.com/@%E3%81%88%E3%82%8A%E3%81%AC%E3%81%84",
        moreTitle: "まだまだあるよ",
        moreDescription: "えりぬいの動画をもっとみよう。",
        getThumbnail: (video) => youtubeThumbnailUrl(video, data.schemaVersion),
        getMeta: (video) => formatPublishedDate(video.publishedAt),
      });
      renderLatestNews({ youtube: data });
    }
  } catch (_error) {
    // Local static preview keeps the fallback values.
  }
}

async function hydrateStaticContent() {
  const [noteData, suzuriData, lineStampData] = await Promise.all([
    hydrateLatestCards(noteCardsTrack, "assets/home-city/note-latest.json", {
      category: "NOTE",
      moreUrl: "https://note.com/erinui",
      moreTitle: "まだまだあるよ",
      moreDescription: "えりぬいのブログをもっとよもう。",
      getThumbnail: (article) => article.thumbnailUrl || "assets/home-city/map_blog.png",
      getMediaMode: (article) => (article.thumbnailUrl ? "cover" : "contain"),
      getMediaClass: (article) => (article.thumbnailUrl ? "" : "content-card-media-note"),
      getDescription: (article) => article.excerpt || formatPublishedDate(article.publishedAt),
      getMeta: (article) => formatPublishedDate(article.publishedAt),
    }),
    hydrateLatestCards(suzuriCardsTrack, "assets/home-city/suzuri-latest.json", {
      category: "SUZURI",
      moreUrl: "https://suzuri.jp/erikanuinui",
      moreTitle: "まだまだあるよ",
      moreDescription: "えりぬいのグッズをもっとみよう。",
      getThumbnail: (product) => product.thumbnailUrl || "",
      getMeta: (product) =>
        product.priceWithTax ? `${formatCount(product.priceWithTax)}円（税込）` : "SUZURIでみる",
      metaKind: "price",
    }),
    hydrateLatestCards(lineStampCardsTrack, "assets/home-city/line-stamps.json", {
      category: "LINE STAMP",
      moreUrl: "https://store.line.me/emojishop/author/2919902/ja",
      moreTitle: "まだまだあるよ",
      moreDescription: "犬タローたちの作品をもっとみよう。",
      getThumbnail: (item) => item.thumbnailUrl || "",
      getCategory: (item) => item.kind || "LINE STAMP",
      mediaMode: "contain",
      mediaClass: "content-card-media-line",
      getMeta: () => "LINE STOREでみる",
    }),
  ]);

  renderLatestNews({ note: noteData, suzuri: suzuriData, lineStamp: lineStampData });
}

async function hydrateLatestCards(track, url, options) {
  if (!track) return null;

  try {
    const data = await fetchStaticData(url);
    if (data?.ok && Array.isArray(data.items) && data.items.length > 0) {
      renderLatestCards(track, data.items, options);
      return data;
    }
  } catch (_error) {
    // The static fallback card remains available.
  }

  return null;
}

async function fetchYoutubeData() {
  const useStaticFirst =
    window.location.hostname === "erinui.com" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.endsWith(".github.io");
  const candidates = useStaticFirst
    ? [fetchYoutubeStaticData, fetchYoutubeApiData]
    : [fetchYoutubeApiData, fetchYoutubeStaticData];

  for (const load of candidates) {
    try {
      const data = await load();
      if (data?.ok === true && Array.isArray(data.videos)) return data;
    } catch (_error) {
      // A failed candidate must not prevent the fallback from being attempted.
    }
  }
  return null;
}

async function fetchYoutubeApiData() {
  const apiResponse = await fetch("/api/latest-youtube?maxResults=6", {
    headers: {
      Accept: "application/json",
    },
  });

  return apiResponse.ok ? apiResponse.json() : null;
}

async function fetchYoutubeStaticData() {
  return fetchStaticData("assets/home-city/youtube-latest.json");
}

async function fetchStaticData(url) {
  const activeUrl = Object.prototype.hasOwnProperty.call(homeJsonRoutes, url) ? homeJsonRoutes[url] : url;
  const staticResponse = await fetch(activeUrl, {
    cache: "no-cache",
    headers: {
      Accept: "application/json",
    },
  });

  if (staticResponse.ok) {
    return staticResponse.json();
  }

  return null;
}

function applyYoutubeMapData(card, data) {
  const state = youtubePanelState(card);
  state.generation++;
  state.items = [...card.querySelectorAll(".youtube-thumb")].map((image, index) => {
    const video = data.videos?.[index], url = youtubeThumbnailUrl(video, data.schemaVersion);
    const previous = state.items[index];
    const item = previous?.url === url && previous?.id === video?.id ? previous : {
      id: video?.id, url, width: video?.localThumbnail?.width || 640, height: video?.localThumbnail?.height || 360,
      status: url ? "idle" : "error", promise: null,
    };
    if (url) image.setAttribute("data-src", url); else image.removeAttribute("data-src");
    if (index !== state.active && index !== state.desired) image.removeAttribute("src");
    return item;
  });
  showYoutubePanel(card, state.desired);

  const stats = data.channel?.statistics || {};
  const subscribers = card.querySelector(".youtube-stat-subscribers");
  const videos = card.querySelector(".youtube-stat-videos");
  if (subscribers) {
    subscribers.textContent = formatSubscribers(stats.subscriberCount, stats.hiddenSubscriberCount);
  }
  if (videos) {
    videos.textContent = `動画：${formatCount(stats.videoCount)}本`;
  }

}

function renderLatestCards(track, items, options) {
  if (!track || !Array.isArray(items)) return;
  if (items.length === 0) {
    if (options.category === "YOUTUBE") reconcileCards(track, [{item: {title: "YouTubeでみる", url: options.moreUrl}, category: "YOUTUBE"}]);
    return;
  }
  const cards = items.slice(0, 5).map(item => ({
    item,
    category: options.getCategory?.(item) || options.category,
    thumbnailUrl: options.getThumbnail?.(item) || "",
    description: options.getDescription?.(item) || "",
    meta: options.getMeta?.(item) || "",
    metaKind: options.metaKind || "",
    mediaMode: options.getMediaMode?.(item) || options.mediaMode || "cover",
    mediaClass: options.getMediaClass?.(item) || options.mediaClass || "",
  }));
  if (items.length > 5) cards.push({item: {title: options.moreTitle, url: options.moreUrl}, category: "AND MORE", description: options.moreDescription, mediaMode: options.mediaMode || "cover", isMore: true});
  reconcileCards(track, cards);
}

function youtubeThumbnailUrl(video, version) {
  const image = video?.localThumbnail;
  if (image) {
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(video.id || "") || !/^[a-f0-9]{64}$/.test(image.sha256 || "") ||
        image.url !== `assets/home-city/youtube-thumb-${video.id}-${image.sha256.slice(0,16)}.webp` ||
        !Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width < 1 || image.height < 1) return "";
    return image.url;
  }
  if (version === 2) return "";
  const url = video?.thumbnail?.url || "";
  return /^https?:\/\//.test(url) ? url : "";
}

function reconcileCards(track, specs) {
  const scrollLeft = track.scrollLeft;
  const old = [...track.children];
  const desired = specs.map(spec => {
    const key = `${spec.category}:${spec.item.id || spec.item.url}`;
    const signature = JSON.stringify(spec);
    const node = old.find(n => n.getAttribute("data-card-key") === key ||
      (spec.item.id && n.getAttribute("data-video-id") === spec.item.id) ||
      (!n.getAttribute("data-card-key") && n.getAttribute("href") === spec.item.url));
    if (node?.getAttribute("data-render-signature") === signature) return node;
    const image = node?.querySelector("img.content-card-media");
    const reuseImage = image?.getAttribute("src") === spec.thumbnailUrl ? image : null;
    const fresh = createLatestCard({...spec, reuseImage});
    let card = fresh;
    if (node) {
      for (const name of ["class", "href", "target", "rel", "aria-label"]) {
        const value = fresh.getAttribute(name);
        if (value === null) node.removeAttribute(name); else node.setAttribute(name, value);
      }
      node.replaceChildren(...fresh.childNodes);
      card = node;
    }
    card.setAttribute("data-card-key", key);
    card.setAttribute("data-render-signature", signature);
    return card;
  });
  desired.forEach((node, i) => { if (track.children[i] !== node) track.insertBefore(node, track.children[i] || null); });
  for (const node of [...track.children]) if (!desired.includes(node)) node.remove();
  // Inserting before fallback cards must not anchor the carousel at its end.
  track.scrollTo({left: Math.min(scrollLeft, Math.max(0, track.scrollWidth - track.clientWidth)), behavior: "instant"});
  window.dispatchEvent(new Event("resize"));
}

function renderLatestNews(content) {
  if (!newsCardsTrack) return;

  Object.assign(latestNewsContent, content);

  const cards = [
    {
      item: {
        title: "犬タローの虫さんまって×2",
        url: "games/inutaro-mushi/",
      },
      category: "GAME",
      thumbnailUrl: "assets/versioned/gameplay-preview.529ffff67ed0440d.webp",
      description: "40秒間で虫さんをたくさん捕まえよう。",
      mediaMode: "cover",
      openInNewTab: false,
    },
  ];

  const latestVideo = latestNewsContent.youtube?.videos?.[0];
  if (latestVideo) {
    cards.push({
      item: latestVideo,
      category: "YOUTUBE",
      thumbnailUrl: youtubeThumbnailUrl(latestVideo, latestNewsContent.youtube?.schemaVersion),
      meta: formatPublishedDate(latestVideo.publishedAt),
      mediaMode: "cover",
    });
  }

  const latestArticle = latestNewsContent.note?.items?.[0];
  if (latestArticle) {
    cards.push({
      item: latestArticle,
      category: "NOTE",
      thumbnailUrl: latestArticle.thumbnailUrl || "assets/home-city/map_blog.png",
      description: latestArticle.excerpt || "",
      meta: formatPublishedDate(latestArticle.publishedAt),
      mediaMode: latestArticle.thumbnailUrl ? "cover" : "contain",
      mediaClass: latestArticle.thumbnailUrl ? "" : "content-card-media-note",
    });
  }

  const latestProduct = latestNewsContent.suzuri?.items?.[0];
  if (latestProduct) {
    cards.push({
      item: latestProduct,
      category: "SUZURI",
      thumbnailUrl: latestProduct.thumbnailUrl || "",
      meta: latestProduct.priceWithTax ? `${formatCount(latestProduct.priceWithTax)}円（税込）` : "SUZURIでみる",
      metaKind: "price",
      mediaMode: "cover",
    });
  }

  const latestLineStamp = latestNewsContent.lineStamp?.items?.[0];
  if (latestLineStamp) {
    cards.push({
      item: latestLineStamp,
      category: latestLineStamp.kind || "LINE STAMP",
      thumbnailUrl: latestLineStamp.thumbnailUrl || "",
      meta: "LINE STOREでみる",
      mediaMode: "contain",
      mediaClass: "content-card-media-line",
    });
  }

  reconcileCards(newsCardsTrack, cards);
  window.dispatchEvent(new Event("resize"));
}

function createLatestCard({ item, category, thumbnailUrl, description, meta, metaKind, mediaMode, mediaClass, isMore = false, openInNewTab = true, reuseImage = null }) {
  const card = document.createElement("a");
  card.className = `content-carousel-card content-card-with-media${isMore ? " content-card-more" : ""}`;
  card.href = item.url;
  if (openInNewTab) {
    card.target = "_blank";
    card.rel = "noopener noreferrer";
  }

  if (thumbnailUrl) {
    const image = reuseImage || document.createElement("img");
    image.className = `content-card-media${mediaMode === "contain" ? "" : " content-card-media-cover"}${mediaClass ? ` ${mediaClass}` : ""}`;
    image.loading = "lazy";
    image.decoding = "async";
    bindCardImageFallback(image, category);
    image.setAttribute("width", "640");
    image.setAttribute("height", "360");
    if (image.getAttribute?.("src") !== thumbnailUrl) image.src = thumbnailUrl;
    image.alt = `${item.title || category}の画像`;
    card.append(image);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "content-card-media content-card-media-placeholder";
    placeholder.textContent = isMore ? "+" : category;
    placeholder.setAttribute("aria-hidden", "true");
    card.append(placeholder);
  }

  const kicker = document.createElement("p");
  kicker.className = "content-card-kicker";
  kicker.textContent = category;
  card.append(kicker);

  const title = document.createElement("h3");
  title.textContent = item.title || "最新情報";
  card.append(title);

  if (description) {
    const copy = document.createElement("p");
    copy.className = "content-card-description";
    copy.textContent = description;
    card.append(copy);
  }

  if (meta) {
    const metaText = document.createElement("p");
    metaText.className = `content-card-meta${metaKind ? ` content-card-meta-${metaKind}` : ""}`;
    metaText.textContent = meta;
    card.append(metaText);
  }

  card.setAttribute("aria-label", `${item.title || "最新情報"}を開く`);
  return card;
}

function bindCardImageFallback(image, category) {
  if (boundCardImages.has(image)) return;
  boundCardImages.add(image);
  let triedNoteFallback = false;
  const onError = () => {
    const card = image.closest(".content-carousel-card");
    if (!card || !image.isConnected) return;
    const label = category || card.querySelector(".content-card-kicker")?.textContent.trim() || "";
    const isNoteFallback = image.src.split(/[?#]/, 1)[0].endsWith("/assets/home-city/map_blog.png");
    if (label === "NOTE" && !triedNoteFallback && !isNoteFallback) {
      triedNoteFallback = true;
      image.className = "content-card-media content-card-media-note";
      image.src = "assets/home-city/map_blog.png";
      return;
    }
    const placeholder = document.createElement("div");
    placeholder.className = "content-card-media content-card-media-placeholder";
    if (image.classList.contains("content-card-media-line")) placeholder.classList.add("content-card-media-line");
    placeholder.textContent = label;
    placeholder.setAttribute("aria-hidden", "true");
    image.replaceWith(placeholder);
  };
  image.addEventListener("error", onError);
  if (image.complete && image.naturalWidth === 0) onError();
}

function formatSubscribers(count, isHidden) {
  if (isHidden || count === null || count === undefined) {
    return "公開まち";
  }
  return `約${formatCount(count)}人`;
}

function formatCount(count) {
  if (count === null || count === undefined || Number.isNaN(Number(count))) {
    return "0";
  }
  return new Intl.NumberFormat("ja-JP").format(Number(count));
}

function formatPublishedDate(value) {
  if (!value) return "YouTubeでみる";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "YouTubeでみる";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function youtubePanelState(card) {
  if (!youtubePanelStates.has(card)) {
    const items = [...card.querySelectorAll(".youtube-thumb")].map(image => ({
      id: image.getAttribute("data-video-id"), url: image.getAttribute("data-src") || image.getAttribute("src") || "",
      width: Number(image.getAttribute("width")) || 640, height: Number(image.getAttribute("height")) || 360,
      status: image.complete && image.naturalWidth > 0 ? "ready" : "idle", promise: null,
    }));
    youtubePanelStates.set(card, {items, generation: 0, desired: 0, active: 0, preloadTimer: null});
  }
  return youtubePanelStates.get(card);
}

function prepareYoutubePanel(card, index) {
  const state = youtubePanelState(card), item = state.items[index];
  if (!item?.url || item.status === "error") return Promise.reject(new Error("Unavailable thumbnail"));
  if (item.status === "ready") return Promise.resolve(item);
  if (item.promise) return item.promise;
  const image = card.querySelectorAll(".youtube-thumb")[index];
  const keepPrevious = index === state.active && image.getAttribute("src") && image.getAttribute("src") !== item.url;
  const loader = keepPrevious ? new Image() : image;
  loader.decoding = "async";
  if (loader.getAttribute("src") !== item.url) loader.src = item.url;
  item.status = "loading";
  item.promise = loader.decode().then(() => {
    if (state.items[index] === item) item.status = "ready";
    return item;
  }).catch(error => {
    if (state.items[index] === item) item.status = "error";
    throw error;
  });
  return item.promise;
}

function startYoutubeDisplayCycle(card) {
  const params = new URLSearchParams(window.location.search);
  const state = youtubePanelState(card);
  const panelParam = params.get("youtubePanel");
  if (panelParam !== null) {
    showYoutubePanel(card, Number(panelParam));
    return;
  }

  if (params.get("showStats") === "1") {
    showYoutubePanel(card, state.items.length);
    return;
  }

  const schedule = () => {
    window.clearTimeout(state.preloadTimer);
    state.preloadTimer = window.setTimeout(() => {
      const next = (state.desired + 1) % (state.items.length + 1);
      if (next < state.items.length) prepareYoutubePanel(card, next).catch(() => {});
    }, 8000);
  };
  showYoutubePanel(card, 0);
  schedule();
  window.setInterval(() => {
    showYoutubePanel(card, (state.desired + 1) % (state.items.length + 1));
    schedule();
  }, 10000);
}

function showYoutubePanel(card, activeIndex) {
  const state = youtubePanelState(card);
  const index = Number.isInteger(activeIndex) && activeIndex >= 0 && activeIndex <= state.items.length ? activeIndex : 0;
  const generation = state.generation;
  state.desired = index;
  const displayStats = () => {
    card.querySelectorAll(".youtube-thumb").forEach(image => image.classList.remove("is-active"));
    card.classList.add("is-showing-stats");
    state.active = state.items.length;
  };
  if (index === state.items.length) return displayStats();
  prepareYoutubePanel(card, index).then(item => {
    if (state.generation !== generation || state.desired !== index || state.items[index] !== item) return;
    const images = card.querySelectorAll(".youtube-thumb"), image = images[index];
    if (image.getAttribute("src") !== item.url) image.src = item.url;
    image.removeAttribute("data-src");
    if (item.id) image.setAttribute("data-video-id", item.id);
    image.setAttribute("width", item.width); image.setAttribute("height", item.height);
    images.forEach((thumbnail, i) => thumbnail.classList.toggle("is-active", i === index));
    card.classList.remove("is-showing-stats");
    state.active = index;
  }).catch(() => {
    if (state.generation === generation && state.desired === index) displayStats();
  });
}
