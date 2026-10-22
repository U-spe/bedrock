(() => {
  "use strict";
  const mount = document.getElementById("global-menu");
  if (!mount) { console.error("BEDROCK: #global-menu mount was not found."); return; }
  mount.innerHTML = `
    <aside class="bedrock-sidebar" id="bedrock-sidebar" aria-label="BEDROCK navigation">
      <a class="sidebar-brand" href="/index.html" aria-label="BEDROCK home"><span class="sidebar-logo">B.</span><span class="sidebar-brand-text">BEDROCK<small>BUILT ON SOLID GROUND</small></span></a>
      <p class="menu-label">WORKSPACE</p>
      <nav class="menu-list" aria-label="Main menu">
        <a class="menu-link" href="/index.html" data-menu-path="/" data-menu-exact="true"><i class="ri-home-5-line"></i><span>Home</span></a>
        <a class="menu-link" href="/games/" data-menu-path="/games/"><i class="ri-gamepad-line"></i><span>Games</span><i class="ri-arrow-right-up-line menu-trailing"></i></a>
        <button class="submenu-toggle" id="apps-menu-toggle" type="button" aria-expanded="false" aria-controls="apps-submenu"><i class="ri-apps-2-line"></i><span>Apps</span><i class="ri-arrow-right-s-line chevron"></i></button>
        <div class="submenu" id="apps-submenu" data-open="false"><div class="submenu-inner">
          <a class="menu-link" href="/apps/proxied-apps/" data-menu-path="/apps/proxied-apps/"><i class="ri-global-line"></i><span>Proxied Apps</span></a>
          <a class="menu-link" href="/apps/youtube-player/" data-menu-path="/apps/youtube-player/"><i class="ri-youtube-line"></i><span>YouTube Player</span></a>
          <a class="menu-link" href="/apps/ai-chat/" data-menu-path="/apps/ai-chat/"><i class="ri-sparkling-2-line"></i><span>AI Chat</span></a>
          <a class="menu-link" href="/apps/chat/" data-menu-path="/apps/chat/"><i class="ri-message-3-line"></i><span>Regular Chat</span></a>
          <a class="menu-link" href="/apps/music/" data-menu-path="/apps/music/"><i class="ri-music-2-line"></i><span>Music</span></a>
          <a class="menu-link" href="/apps/other/" data-menu-path="/apps/other/"><i class="ri-layout-grid-line"></i><span>Other Apps</span></a>
        </div></div>
        <a class="menu-link" href="/proxy/" data-menu-path="/proxy/"><i class="ri-shield-keyhole-line"></i><span>Proxy</span></a>
      </nav>
      <div class="menu-divider"></div><p class="menu-label">PREFERENCES</p>
      <nav class="menu-list" aria-label="Preferences"><button class="menu-link" type="button" data-open-settings><i class="ri-settings-3-line"></i><span>Settings</span><i class="ri-arrow-up-right-line menu-trailing"></i></button></nav>
      <div class="sidebar-spacer"></div>
      <div class="sidebar-status"><span class="status-indicator"></span><span><strong>BEDROCK CORE</strong>Workspace online</span><i class="ri-more-line"></i></div>
    </aside><button class="menu-overlay" id="menu-overlay" type="button" aria-label="Close navigation"></button>`;

  const sidebar = mount.querySelector("#bedrock-sidebar");
  const overlay = mount.querySelector("#menu-overlay");
  const mobileToggle = document.getElementById("menu-toggle");
  const appsToggle = mount.querySelector("#apps-menu-toggle");
  const submenu = mount.querySelector("#apps-submenu");
  function closeMobileMenu() { sidebar.classList.remove("menu-open"); overlay.classList.remove("visible"); mobileToggle?.setAttribute("aria-expanded","false"); }
  function openMobileMenu() { sidebar.classList.add("menu-open"); overlay.classList.add("visible"); mobileToggle?.setAttribute("aria-expanded","true"); }
  mobileToggle?.addEventListener("click", () => sidebar.classList.contains("menu-open") ? closeMobileMenu() : openMobileMenu());
  overlay?.addEventListener("click", closeMobileMenu);
  appsToggle?.addEventListener("click", () => { const expanded = appsToggle.getAttribute("aria-expanded") === "true"; appsToggle.setAttribute("aria-expanded",String(!expanded)); submenu.dataset.open = String(!expanded); });
  const pathname = window.location.pathname;
  const links = [...mount.querySelectorAll("[data-menu-path]")]; let active = null;
  for (const link of links) { const path = link.dataset.menuPath; const match = link.dataset.menuExact === "true" ? pathname === "/" || pathname === "/index.html" : pathname === path || pathname.startsWith(path); if (match && (!active || path.length > active.dataset.menuPath.length)) active = link; }
  if (active) { active.classList.add("active"); active.setAttribute("aria-current","page"); if (active.closest("#apps-submenu")) { appsToggle.setAttribute("aria-expanded","true"); submenu.dataset.open = "true"; } }
  mount.querySelectorAll(".menu-link[href]").forEach(link => link.addEventListener("click",closeMobileMenu));
  document.addEventListener("keydown",event => { if (event.key === "Escape") closeMobileMenu(); });
  window.addEventListener("resize",() => { if (window.innerWidth > 760) closeMobileMenu(); });
})();
