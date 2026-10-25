(() => {
  "use strict";

  const container = document.getElementById("global-menu");

  if (
    !container ||
    new URLSearchParams(location.search).get("embed") === "1"
  ) {
    return;
  }

  const pages = [
    {
      icon: "ri-home-5-line",
      title: "Home",
      page: "/main.html"
    },
    {
      icon: "ri-gamepad-line",
      title: "Games",
      page: "/lessons.html"
    },
    {
      icon: "ri-apps-line",
      title: "Apps",
      page: "/flashcards.html"
    },
    {
      icon: "ri-global-line",
      title: "Browser",
      page: "/search.html"
    },
    {
      icon: "ri-settings-3-line",
      title: "Settings",
      page: "/settings.html"
    }
  ];

  const wrap = document.createElement("div");
  wrap.className = "menu-trigger-wrap";

  wrap.innerHTML = `
    <button
      class="dock-trigger"
      type="button"
      aria-label="Open navigation"
      aria-expanded="false"
    >
      <i class="ri-menu-4-line"></i>
    </button>

    <nav class="dock" aria-label="Main navigation"></nav>
  `;

  const trigger = wrap.querySelector(".dock-trigger");
  const dock = wrap.querySelector(".dock");
  const current = location.pathname;

  pages.forEach(item => {
    const button = document.createElement("button");

    button.type = "button";
    button.dataset.title = item.title;
    button.setAttribute("aria-label", item.title);

    button.innerHTML = `
      <i class="${item.icon}" aria-hidden="true"></i>
    `;

    if (
      current === item.page ||
      (current === "/" && item.title === "Home")
    ) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => {
      location.href = item.page;
    });

    dock.appendChild(button);
  });

  trigger.addEventListener("click", () => {
    const open = wrap.classList.toggle("open");
    trigger.setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("pointerdown", event => {
    if (!wrap.contains(event.target)) {
      wrap.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });

  container.appendChild(wrap);
})();
