/* BEDROCK GLOBAL MENU — Spydr's floating dock pattern */
(() => {
  const container = document.getElementById("global-menu");
  if (!container) return;
  const pages = [
    { icon: "ri-home-5-line", title: "Home", page: "/index.html" },
    { icon: "ri-gamepad-line", title: "Games", page: "/games/" },
    { icon: "ri-apps-2-line", title: "Apps", page: "/apps/other/" },
    { icon: "ri-global-line", title: "Proxy", page: "/proxy/" },
    { icon: "ri-settings-3-line", title: "Settings", page: "/settings/" }
  ];
  const dock = document.createElement("nav");
  dock.className = "dock";
  dock.setAttribute("aria-label", "Main navigation");
  const current = window.location.pathname;
  pages.forEach(item => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.title = item.title;
    button.setAttribute("aria-label", item.title);
    if (current === item.page || (item.title === "Home" && (current === "/" || current === "/index.html"))) button.classList.add("active");
    button.innerHTML = `<i class="${item.icon}" aria-hidden="true"></i>`;
    button.addEventListener("click", () => { window.location.href = item.page; });
    dock.appendChild(button);
  });
  container.appendChild(dock);
})();
