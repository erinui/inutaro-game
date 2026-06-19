const newsFeed = document.querySelector("#news-feed");
const newsSourceStyles = {
  x: "X",
  youtube: "YouTube",
  blog: "Blog",
  game: "Game",
};

function formatNewsDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function isExternalUrl(url) {
  try {
    return new URL(url, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
}

function markExternalLinks(root = document) {
  const links = root.matches?.("a[href]") ? [root] : [...root.querySelectorAll("a[href]")];
  for (const link of links) {
    if (!isExternalUrl(link.href)) {
      continue;
    }
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }
}

function createNewsCard(item) {
  const article = document.createElement("article");
  article.className = `news-card news-card-${item.source || "blog"}`;

  const meta = document.createElement("div");
  meta.className = "news-meta";

  const source = document.createElement("span");
  source.className = "news-source";

  const icon = document.createElement("span");
  icon.className = `social-icon social-icon-${item.source || "news"}`;
  icon.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.textContent = item.sourceLabel || newsSourceStyles[item.source] || "News";

  source.append(icon, label);

  const date = document.createElement("time");
  date.dateTime = item.date || "";
  date.textContent = item.date ? formatNewsDate(item.date) : "";

  meta.append(source, date);

  const title = document.createElement("h3");
  title.textContent = item.title || "おしらせ";

  const body = document.createElement("p");
  body.textContent = item.body || "";

  const link = document.createElement("a");
  link.className = "news-link";
  link.href = item.url || "pages/blog.html";
  link.textContent = item.cta || "詳しく見る";
  markExternalLinks(link);

  article.append(meta, title, body, link);
  return article;
}

function renderNews(items) {
  const sortedItems = [...items]
    .filter((item) => item && item.title)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    .slice(0, 6);

  newsFeed.replaceChildren();

  if (!sortedItems.length) {
    const empty = document.createElement("article");
    empty.className = "news-card";
    empty.innerHTML = "<span class=\"news-source\">News</span><h3>おしらせ準備中</h3><p>新しい更新情報を準備しています。</p>";
    newsFeed.append(empty);
    return;
  }

  for (const item of sortedItems) {
    newsFeed.append(createNewsCard(item));
  }
}

async function loadNews() {
  if (!newsFeed) {
    return;
  }

  try {
    const response = await fetch("data/news.json?v=20260619-news-local", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load news: ${response.status}`);
    }
    renderNews(await response.json());
  } catch {
    renderNews([
      {
        source: "blog",
        sourceLabel: "News",
        date: "2026-06-19",
        title: "おしらせを読み込めませんでした",
        body: "時間をおいてからもう一度確認してください。",
        url: "pages/blog.html",
        cta: "ブログを見る",
      },
    ]);
  }
}

loadNews();
markExternalLinks();
