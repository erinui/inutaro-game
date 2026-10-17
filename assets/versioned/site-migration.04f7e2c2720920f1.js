(() => {
  if (location.hostname !== "erinui.github.io" || !location.pathname.startsWith("/inutaro-game/")) return;
  const canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical || document.getElementById("site-migration-notice")) return;
  const destination = new URL(canonical.href);
  if (destination.origin !== "https://erinui.com") return;
  try {
    if (location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)))) destination.hash = location.hash;
  } catch { /* An invalid fragment must not prevent the migration notice. */ }

  const link = document.createElement("a");
  link.href = destination.href;
  link.textContent = "公式サイトは erinui.com に移転しました。このページの最新版へ";
  const notice = document.createElement("aside");
  notice.id = "site-migration-notice";
  notice.setAttribute("aria-label", "公式サイトの移転案内");
  notice.append(link);

  // Keep the old game's notice in its idle controls, away from the canvas and HUD.
  const gameActions = document.querySelector(".game-shell .start-actions");
  if (gameActions) {
    link.className = "home-link";
    gameActions.append(notice);
    return;
  }
  notice.style.cssText = "margin:16px auto;padding:12px 16px;max-width:1120px;background:#fff6bd;color:#171717;text-align:center;border:1px solid #171717;border-radius:8px;";
  link.style.cssText = "color:inherit;text-decoration:underline;font:inherit;overflow-wrap:anywhere;";
  const main = document.querySelector("main");
  if (main) main.before(notice);
  else document.body.prepend(notice);
})();
