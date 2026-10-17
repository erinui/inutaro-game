const menuToggles = document.querySelectorAll(".site-menu-toggle");

menuToggles.forEach((toggle) => {
  const menuId = toggle.getAttribute("aria-controls");
  const menu = menuId ? document.getElementById(menuId) : null;
  const header = toggle.closest("header");
  if (!menu || !header) return;
  const desktopQuery = window.matchMedia("(min-width: 761px)");
  menu.inert = !desktopQuery.matches;

  const closeMenu = () => {
    header.classList.remove("is-menu-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "メニューを開く");
    menu.inert = !desktopQuery.matches;
  };

  const openMenu = () => {
    header.classList.add("is-menu-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "メニューを閉じる");
    menu.inert = false;
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
    const focusIsInside = document.activeElement === toggle || menu.contains(document.activeElement);
    if (event.key === "Escape" && !event.defaultPrevented && !desktopQuery.matches && header.classList.contains("is-menu-open") && focusIsInside) {
      event.preventDefault();
      closeMenu();
      toggle.focus();
    }
  });

  const handleDesktopChange = (event) => {
    if (event.matches) {
      closeMenu();
    } else if (!header.classList.contains("is-menu-open")) {
      menu.inert = true;
    }
  };

  if (desktopQuery.addEventListener) {
    desktopQuery.addEventListener("change", handleDesktopChange);
  } else {
    desktopQuery.addListener(handleDesktopChange);
  }
});
