
(() => {
  "use strict";

  const PAGES = [
    { title: "Home", icon: "ri-home-5-line", href: "/main.html" },
    { title: "Games", icon: "ri-gamepad-line", href: "/lessons.html" },
    { title: "Apps", icon: "ri-apps-line", href: "/flashcards.html" },
    { title: "Browser", icon: "ri-global-line", href: "/search.html" },
    { title: "Settings", icon: "ri-settings-3-line", href: "/settings.html" }
  ];

  function init() {
    const container = document.getElementById("global-menu");

    if (
      !container ||
      new URLSearchParams(location.search).get("embed") === "1"
    ) return;

    if (container.querySelector(".menu-trigger-wrap")) return;

    const wrap = document.createElement("div");
    wrap.className = "menu-trigger-wrap";

    wrap.innerHTML = `
      <button
        class="dock-trigger"
        type="button"
        aria-label="Open navigation"
        aria-expanded="false"
        aria-controls="bedrock-navigation-dock"
      >
        <i class="ri-menu-4-line" aria-hidden="true"></i>
      </button>

      <nav
        class="dock"
        id="bedrock-navigation-dock"
        aria-label="Main navigation"
      ></nav>
    `;

    const trigger = wrap.querySelector(".dock-trigger");
    const dock = wrap.querySelector(".dock");

    const normalize = path =>
      (!path || path === "/")
        ? "/main.html"
        : path.replace(/\/+$/, "");

    const current = normalize(location.pathname);

    function closeMenu() {
      wrap.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    }

    function toggleMenu() {
      const open = !wrap.classList.contains("open");

      wrap.classList.toggle("open", open);
      trigger.setAttribute("aria-expanded", String(open));
    }

    for (const page of PAGES) {
      const link = document.createElement("a");

      link.className = "dock-link";
      link.href = page.href;
      link.dataset.title = page.title;
      link.setAttribute("aria-label", page.title);

      link.innerHTML = `
        <i class="${page.icon}" aria-hidden="true"></i>
        <span class="dock-label">${page.title}</span>
      `;

      if (current === normalize(page.href)) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      }

      link.addEventListener("click", closeMenu);
      dock.appendChild(link);
    }

    trigger.addEventListener("click", toggleMenu);

    document.addEventListener("pointerdown", event => {
      if (!wrap.contains(event.target)) closeMenu();
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeMenu();
    });

    container.appendChild(wrap);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
