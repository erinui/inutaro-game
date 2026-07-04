const menuToggles = document.querySelectorAll(".site-menu-toggle");

menuToggles.forEach((toggle) => {
  const menuId = toggle.getAttribute("aria-controls");
  const menu = menuId ? document.getElementById(menuId) : null;
  const header = toggle.closest("header");
  if (!menu || !header) return;

  const closeMenu = () => {
    header.classList.remove("is-menu-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "メニューを開く");
  };

  const openMenu = () => {
    header.classList.add("is-menu-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "メニューを閉じる");
  };

  toggle.addEventListener("click", () => {
    if (header.classList.contains("is-menu-open")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  const desktopQuery = window.matchMedia("(min-width: 761px)");
  const handleDesktopChange = (event) => {
    if (event.matches) {
      closeMenu();
    }
  };

  if (desktopQuery.addEventListener) {
    desktopQuery.addEventListener("change", handleDesktopChange);
  } else {
    desktopQuery.addListener(handleDesktopChange);
  }
});
