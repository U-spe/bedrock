
(() => {
  "use strict";

  const CLASSLINK_URL = "https://launchpad.classlink.com/";
  const QUICKCARD_SELECTOR = "[data-bedrock-quickcard]";
  let navigating = false;

  /* =========================================
     RANDOM INTERACTIVE BACKGROUND
     ========================================= */

  function initInteractiveBackground() {
    if (document.getElementById("bedrock-cursor-background")) return;

    const canvas = document.createElement("canvas");
    canvas.id = "bedrock-cursor-background";
    canvas.setAttribute("aria-hidden", "true");

    Object.assign(canvas.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "10",
      opacity: "0.28",
      mixBlendMode: "screen"
    });

    document.body.prepend(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let particles = [];
    let mouse = { x: -1000, y: -1000 };
    let frame = 0;

    // Every page initialization gets its own random arrangement and palette.
    const palettes = [
      ["#5fae87", "#b1f5d0", "#2c8963"],
      ["#70b7ff", "#c0e4ff", "#5279ff"],
      ["#a98aff", "#e1caff", "#7156cf"],
      ["#f2bd75", "#ffe4b4", "#e38d69"],
      ["#75e2df", "#c4fff5", "#5598d4"]
    ];

    const palette = palettes[Math.floor(Math.random() * palettes.length)];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(
        100,
        Math.max(35, Math.floor((width * height) / 16000))
      );

      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 2 + 0.6,
        color: palette[Math.floor(Math.random() * palette.length)],
        phase: Math.random() * Math.PI * 2
      }));
    }

    function movePointer(event) {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    }

    function leavePointer() {
      mouse.x = -1000;
      mouse.y = -1000;
    }

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", movePointer, { passive: true });
    window.addEventListener("pointerleave", leavePointer, { passive: true });

    function draw() {
      frame++;
      ctx.clearRect(0, 0, width, height);

      // Soft glow follows the cursor.
      if (mouse.x >= 0 && mouse.y >= 0) {
        const glow = ctx.createRadialGradient(
          mouse.x, mouse.y, 0,
          mouse.x, mouse.y, 190
        );

        glow.addColorStop(0, palette[0] + "35");
        glow.addColorStop(0.5, palette[0] + "12");
        glow.addColorStop(1, palette[0] + "00");

        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;
        p.phase += 0.018;

        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Particles gently move away from the cursor.
        if (distance > 0 && distance < 125) {
          const force = (125 - distance) / 125;

          p.x -= (dx / distance) * force * 1.2;
          p.y -= (dy / distance) * force * 1.2;
        }

        const pulse = 0.65 + Math.sin(p.phase) * 0.35;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * pulse, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.45 + pulse * 0.45;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Connect nearby particles for a subtle constellation effect.
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const lx = p.x - q.x;
          const ly = p.y - q.y;
          const lineDistance = Math.sqrt(lx * lx + ly * ly);

          if (lineDistance < 95) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = (1 - lineDistance / 95) * 0.22;
            ctx.lineWidth = 0.7;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }

      requestAnimationFrame(draw);
    }

    resize();
    draw();
  }

  function isCloakPage() {
    return document.body?.dataset.bedrockCloak === "true";
  }

  function goToClassLink() {
    window.location.assign(CLASSLINK_URL);
  }

  /* =========================================
     LOAD LOCAL PAGES WITHOUT CHANGING THE URL
     ========================================= */

  async function loadPage(url) {
    if (navigating) return;
    navigating = true;

    try {
      const target = new URL(url, window.location.href);

      if (target.origin !== window.location.origin) {
        window.location.assign(target.href);
        return;
      }

      const response = await fetch(target.href, {
        credentials: "same-origin",
        cache: "no-cache"
      });

      if (!response.ok) {
        throw new Error(`Page request failed: HTTP ${response.status}`);
      }

      let html = await response.text();
      const base = `<base href="${target.href.replace(/"/g, "&quot;")}">`;

      if (!/<head(?:\s[^>]*)?>/i.test(html)) {
        throw new Error("The requested page has no HTML head.");
      }

      if (/<base(?:\s[^>]*)?>/i.test(html)) {
        html = html.replace(/<base(?:\s[^>]*)?>/i, base);
      } else {
        html = html.replace(/<head(?:\s[^>]*)?>/i, match => match + base);
      }

      // Re-render the fetched HTML at the existing address.
      // The current browser URL is intentionally not changed.
      document.open();
      document.write(html);
      document.close();
    } catch (error) {
      console.error("[bedrock navigation]", error);
      navigating = false;
      alert("Couldn't load that bedrock page. Check that the file exists.");
    }
  }

  /* =========================================
     SHARED CLICK HANDLERS
     ========================================= */

  document.addEventListener("click", event => {
    const quickcard = event.target.closest(QUICKCARD_SELECTOR);

    // IMPORTANT: handle QuickCard FIRST, before cloak redirects.
    if (quickcard) {
      event.preventDefault();
      event.stopImmediatePropagation();

      loadPage(quickcard.getAttribute("href") || "/main.html");
      return;
    }

    if (isCloakPage()) {
      const control = event.target.closest(
        "a, button, input, select, textarea, [role='button']"
      );

      if (control) {
        event.preventDefault();
        event.stopImmediatePropagation();
        goToClassLink();
      }

      return;
    }

    const link = event.target.closest("a[href]");

    if (!link || event.defaultPrevented) return;
    if (link.hasAttribute("download")) return;
    if (link.target && link.target !== "_self") return;

    const href = link.getAttribute("href");

    if (
      !href ||
      href.startsWith("#") ||
      /^(mailto:|tel:|javascript:|data:)/i.test(href)
    ) {
      return;
    }

    const target = new URL(href, window.location.href);

    if (target.origin !== window.location.origin) return;

    if (
      target.pathname === window.location.pathname &&
      target.search === window.location.search &&
      target.hash
    ) {
      return;
    }

    event.preventDefault();
    loadPage(target.href);
  }, true);

  document.addEventListener("submit", event => {
    if (!isCloakPage()) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    goToClassLink();
  }, true);

  // Start the background after the document body exists.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initInteractiveBackground, {
      once: true
    });
  } else {
    initInteractiveBackground();
  }
})();
