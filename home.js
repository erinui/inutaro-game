const youtubeCard = document.querySelector(".map-link-youtube");
const sasukeButton = document.querySelector(".map-decoration-sasuke");
const bukuroButton = document.querySelector(".map-decoration-bukurochan");
const characterCarousel = document.querySelector(".character-carousel");

if (youtubeCard) {
  hydrateYoutubeCard(youtubeCard);
  startYoutubeDisplayCycle(youtubeCard);
}

bindDecorationAction(sasukeButton, "is-walking", 1600);
bindDecorationAction(bukuroButton, "is-questioning", 1100);
bindCharacterCarousel(characterCarousel);

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

function bindCharacterCarousel(carousel) {
  if (!carousel) return;

  const track = carousel.querySelector(".character-carousel-track");
  const section = carousel.closest(".character-section");
  const prevButton = section?.querySelector(".character-carousel-prev");
  const nextButton = section?.querySelector(".character-carousel-next");

  if (!track || !prevButton || !nextButton) return;

  const updateButtons = () => {
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    prevButton.disabled = track.scrollLeft <= 1;
    nextButton.disabled = track.scrollLeft >= maxScroll - 1;
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

async function hydrateYoutubeCard(card) {
  try {
    const data = await fetchYoutubeData();
    if (data?.ok) {
      applyYoutubeData(card, data);
    }
  } catch (_error) {
    // Local static preview keeps the fallback values.
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
  const apiResponse = await fetch("/api/latest-youtube?maxResults=3", {
    headers: {
      Accept: "application/json",
    },
  });

  return apiResponse.ok ? apiResponse.json() : null;
}

async function fetchYoutubeStaticData() {
  const staticResponse = await fetch("assets/home-city/youtube-latest.json", {
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

function applyYoutubeData(card, data) {
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
