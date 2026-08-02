const youtubeCard = document.querySelector(".map-link-youtube");
const sasukeButton = document.querySelector(".map-decoration-sasuke");
const bukuroButton = document.querySelector(".map-decoration-bukurochan");
const contentCarousels = document.querySelectorAll(".content-carousel");
const youtubeCardsTrack = document.querySelector("[data-youtube-cards]");
const noteCardsTrack = document.querySelector("[data-note-cards]");
const suzuriCardsTrack = document.querySelector("[data-suzuri-cards]");
const lineStampCardsTrack = document.querySelector("[data-line-stamp-cards]");

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
        getThumbnail: (video) => video.thumbnail?.url || "",
        getDescription: (video) => formatPublishedDate(video.publishedAt),
      });
    }
  } catch (_error) {
    // Local static preview keeps the fallback values.
  }
}

async function hydrateStaticContent() {
  await Promise.all([
    hydrateLatestCards(noteCardsTrack, "assets/home-city/note-latest.json", {
      category: "NOTE",
      moreUrl: "https://note.com/erinui",
      moreTitle: "まだまだあるよ",
      moreDescription: "えりぬいのブログをもっとよもう。",
      getDescription: (article) => article.excerpt || formatPublishedDate(article.publishedAt),
    }),
    hydrateLatestCards(suzuriCardsTrack, "assets/home-city/suzuri-latest.json", {
      category: "SUZURI",
      moreUrl: "https://suzuri.jp/erikanuinui",
      moreTitle: "まだまだあるよ",
      moreDescription: "えりぬいのグッズをもっとみよう。",
      getThumbnail: (product) => product.thumbnailUrl || "",
      getDescription: (product) =>
        product.priceWithTax ? `${formatCount(product.priceWithTax)}円（税込）` : "SUZURIでみる",
    }),
    hydrateLatestCards(lineStampCardsTrack, "assets/home-city/line-stamps.json", {
      category: "LINE STAMP",
      moreUrl: "https://store.line.me/emojishop/author/2919902/ja",
      moreTitle: "まだまだあるよ",
      moreDescription: "犬タローたちの作品をもっとみよう。",
      getThumbnail: (item) => item.thumbnailUrl || "",
      getCategory: (item) => item.kind || "LINE STAMP",
      getDescription: () => "LINE STOREでみる",
    }),
  ]);
}

async function hydrateLatestCards(track, url, options) {
  if (!track) return;

  try {
    const data = await fetchStaticData(url);
    if (data?.ok && Array.isArray(data.items) && data.items.length > 0) {
      renderLatestCards(track, data.items, options);
    }
  } catch (_error) {
    // The static fallback card remains available.
  }
}

async function fetchYoutubeData() {
  const useStaticFirst =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.endsWith(".github.io");

  if (!useStaticFirst) {
    const apiData = await fetchYoutubeApiData();
    if (apiData) return apiData;
  }

  const staticData = await fetchYoutubeStaticData();
  if (staticData) return staticData;

  return useStaticFirst ? fetchYoutubeApiData() : null;
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
  const staticResponse = await fetch(url, {
    cache: "no-store",
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
  const thumbnails = card.querySelectorAll(".youtube-thumb");
  data.videos?.slice(0, thumbnails.length).forEach((video, index) => {
    const thumbnailUrl = video?.thumbnail?.url;
    if (thumbnailUrl && thumbnails[index]) {
      thumbnails[index].src = thumbnailUrl;
    }
  });

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
  if (!track || !Array.isArray(items) || items.length === 0) return;

  const visibleItems = items.slice(0, 5);
  const fragment = document.createDocumentFragment();
  visibleItems.forEach((item) => {
    fragment.append(
      createLatestCard({
        item,
        category: options.getCategory?.(item) || options.category,
        thumbnailUrl: options.getThumbnail?.(item) || "",
        description: options.getDescription?.(item) || "",
      }),
    );
  });

  if (items.length > visibleItems.length) {
    fragment.append(
      createLatestCard({
        item: { title: options.moreTitle, url: options.moreUrl },
        category: "AND MORE",
        description: options.moreDescription,
        isMore: true,
      }),
    );
  }

  track.replaceChildren(fragment);
  window.dispatchEvent(new Event("resize"));
}

function createLatestCard({ item, category, thumbnailUrl, description, isMore = false }) {
  const card = document.createElement("a");
  card.className = `content-carousel-card content-card-with-media${isMore ? " content-card-more" : ""}`;
  card.href = item.url;
  card.target = "_blank";
  card.rel = "noopener noreferrer";

  if (thumbnailUrl) {
    const image = document.createElement("img");
    image.className = "content-card-media content-card-media-cover";
    image.src = thumbnailUrl;
    image.alt = "";
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
    copy.textContent = description;
    card.append(copy);
  }

  card.setAttribute("aria-label", `${item.title || "最新情報"}を開く`);
  return card;
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

function startYoutubeDisplayCycle(card) {
  const params = new URLSearchParams(window.location.search);
  const panelParam = params.get("youtubePanel");
  if (panelParam !== null) {
    showYoutubePanel(card, Number(panelParam));
    return;
  }

  if (params.get("showStats") === "1") {
    showYoutubePanel(card, card.querySelectorAll(".youtube-thumb").length);
    return;
  }

  let activeIndex = 0;
  window.setInterval(() => {
    const panelCount = card.querySelectorAll(".youtube-thumb").length + 1;
    activeIndex = (activeIndex + 1) % panelCount;
    showYoutubePanel(card, activeIndex);
  }, 10000);
}

function showYoutubePanel(card, activeIndex) {
  const thumbnails = card.querySelectorAll(".youtube-thumb");
  thumbnails.forEach((thumbnail, index) => {
    thumbnail.classList.toggle("is-active", index === activeIndex);
  });
  card.classList.toggle("is-showing-stats", activeIndex >= thumbnails.length);
}
