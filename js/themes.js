
(() => {
  "use strict";

  const STORAGE_KEY = "bedrock.preferences.v1";
  const CONFIG_URL = "/assets/json/themes.json";

  const defaults = {
    theme: "bedrock",
    background: "stars",
    accent: "",
    animations: true
  };

  let config = null;
  let settings = { ...defaults };
  let resizeObserver = null;
  let animationFrame = 0;
  let stars = [];
  let canvasContext = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      settings = { ...defaults, ...saved };

      if (typeof settings.theme !== "string") settings.theme = defaults.theme;
      if (typeof settings.background !== "string") settings.background = defaults.background;
      if (typeof settings.accent !== "string") settings.accent = "";
      settings.animations = settings.animations !== false;
    } catch {
      settings = { ...defaults };
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      console.warn("Bedrock preferences could not be saved in this browser.");
    }
  }

  function validAccent(value) {
    if (!value) return "";
    const test = document.createElement("span");
    test.style.color = "";
    test.style.color = value;
    return test.style.color ? value : "";
  }

  function applyTheme() {
    if (!config?.themes) return;

    const theme = config.themes[settings.theme] || config.themes[config.defaultTheme];
    if (!theme) return;

    const root = document.documentElement;
    root.dataset.brTheme = settings.theme in config.themes ? settings.theme : config.defaultTheme;

    root.style.setProperty("--br-bg", theme.background);
    root.style.setProperty("--br-surface", theme.surface);
    root.style.setProperty("--br-raised", theme.surfaceRaised);
    root.style.setProperty("--br-text", theme.text);
    root.style.setProperty("--br-muted", theme.muted);
    root.style.setProperty("--br-accent", validAccent(settings.accent) || theme.accent);

    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = theme.background;

    $$("[data-theme-choice]").forEach(button => {
      const selected = button.dataset.themeChoice === root.dataset.brTheme;
      button.setAttribute("aria-pressed", String(selected));
    });

    const accentInput = $("#br-accent-picker");
    if (accentInput) {
      accentInput.value = toHex(validAccent(settings.accent) || theme.accent) || "#5fae87";
    }
  }

  function toHex(color) {
    if (!color) return "";
    if (/^#[0-9a-f]{6}$/i.test(color)) return color;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.fillStyle = color;
    const value = ctx.fillStyle;
    return /^#[0-9a-f]{6}$/i.test(value) ? value : "";
  }

  function applyBackground() {
    const root = document.documentElement;
    root.dataset.brBackground = settings.background;
    root.dataset.brAnimations = settings.animations ? "on" : "off";

    const styleSelect = $("#br-background-style");
    if (styleSelect) styleSelect.value = settings.background;

    const animations = $("#br-animations");
    if (animations) animations.checked = settings.animations;

    if (!settings.animations || settings.background !== "stars") {
      stopStars();
    } else {
      startStars();
    }
  }

  function buildBackground() {
    if ($("#br-background-effects")) return;

    const layer = document.createElement("div");
    layer.id = "br-background-effects";
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML = '<canvas id="br-stars"></canvas><div id="br-fog"></div>';
    document.body.prepend(layer);
  }

  function startStars() {
    const canvas = $("#br-stars");
    if (!canvas || !settings.animations || settings.background !== "stars") return;

    stopStars();

    const context = canvas.getContext("2d");
    if (!context) return;
    canvasContext = context;

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * ratio);
      canvas.height = Math.floor(window.innerHeight * ratio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const count = Math.min(140, Math.floor(window.innerWidth / 10));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: Math.random() * 1.4 + 0.3,
        alpha: Math.random() * 0.55 + 0.2,
        speed: Math.random() * 0.12 + 0.025
      }));
    }

    function draw() {
      if (!canvasContext || !settings.animations || settings.background !== "stars") {
        animationFrame = 0;
        return;
      }

      context.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (const star of stars) {
        context.beginPath();
        context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(190, 220, 255, ${star.alpha})`;
        context.fill();

        star.y += star.speed;
        if (star.y > window.innerHeight + 2) {
          star.y = -2;
          star.x = Math.random() * window.innerWidth;
        }
      }

      animationFrame = window.requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });
    resizeObserver = { disconnect: () => window.removeEventListener("resize", resize) };
    animationFrame = window.requestAnimationFrame(draw);
  }

  function stopStars() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;

    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }

    const canvas = $("#br-stars");
    if (canvas) {
      const context = canvas.getContext("2d");
      context?.clearRect(0, 0, canvas.width, canvas.height);
    }
    canvasContext = null;
  }

  function chooseTheme(themeId) {
    if (!config?.themes?.[themeId]) return;
    settings.theme = themeId;
    settings.accent = "";
    saveSettings();
    applyTheme();
  }

  function renderThemeOptions() {
    const container = $("#br-theme-options");
    if (!container || !config?.themes) return;

    container.replaceChildren();

    for (const [id, theme] of Object.entries(config.themes)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "br-theme-option";
      button.dataset.themeChoice = id;
      button.setAttribute("aria-pressed", String(id === settings.theme));

      const swatch = document.createElement("span");
      swatch.className = "br-theme-swatch";
      swatch.style.setProperty("--swatch", theme.accent);

      const label = document.createElement("span");
      const strong = document.createElement("strong");
      strong.textContent = theme.label;
      const small = document.createElement("small");
      small.textContent = id === "bedrock" ? "Original Bedrock colors" : `${theme.label} color palette`;

      label.append(strong, small);
      button.append(swatch, label);
      button.addEventListener("click", () => chooseTheme(id));
      container.append(button);
    }
  }

  function bindSettings() {
    $("#br-background-style")?.addEventListener("change", event => {
      const value = event.currentTarget.value;
      if (!["stars", "fog", "gradient", "none"].includes(value)) return;
      settings.background = value;
      saveSettings();
      applyBackground();
    });

    $("#br-animations")?.addEventListener("change", event => {
      settings.animations = event.currentTarget.checked;
      saveSettings();
      applyBackground();
    });

    $("#br-accent-picker")?.addEventListener("input", event => {
      const value = validAccent(event.currentTarget.value);
      if (!value) return;
      settings.accent = value;
      saveSettings();
      applyTheme();
    });

    $("#br-reset-settings")?.addEventListener("click", () => {
      settings = { ...defaults };
      saveSettings();
      applyTheme();
      applyBackground();
      renderThemeOptions();
    });
  }

  function bindNavigation() {
    document.addEventListener("click", event => {
      const anchor = event.target.closest('a[href^="#"]');
      if (!anchor) return;

      const id = anchor.getAttribute("href");
      const target = id && $(id);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: settings.animations ? "smooth" : "auto" });
      history.replaceState(null, "", id);
    });

    const search = $("#dashboard-search");
    if (search) {
      search.addEventListener("input", () => {
        const query = search.value.trim().toLowerCase();
        let visible = 0;

        $$(".br-card[data-search]").forEach(card => {
          const matches = !query ||
            `${card.textContent} ${card.dataset.search || ""}`.toLowerCase().includes(query);
          card.hidden = !matches;
          if (matches) visible++;
        });

        const empty = $("#br-no-results");
        if (empty) empty.hidden = visible !== 0;
      });
    }

    const dialog = $("#br-shortcuts-dialog");
    $("#br-show-shortcuts")?.addEventListener("click", () => dialog?.showModal());
    $("#br-close-shortcuts")?.addEventListener("click", () => dialog?.close());

    document.addEventListener("keydown", event => {
      const target = event.target;
      const typing = target instanceof HTMLElement &&
        (target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(target.tagName));

      if (event.key === "Escape" && dialog?.open) dialog.close();
      if (typing || event.altKey || event.metaKey) return;

      if (event.key === "/" && !event.ctrlKey) {
        const searchInput = $("#dashboard-search");
        if (searchInput) {
          event.preventDefault();
          searchInput.focus();
        }
      }

      if (event.key === "?" && !event.ctrlKey) {
        if (dialog && !dialog.open) dialog.showModal();
      }

      if (event.ctrlKey && event.key === ",") {
        event.preventDefault();
        window.location.href = "/settings.html";
      }
    });
  }

  async function init() {
    loadSettings();
    buildBackground();

    try {
      const response = await fetch(CONFIG_URL, { cache: "no-cache" });
      if (!response.ok) throw new Error(`Theme configuration returned ${response.status}`);
      config = await response.json();
    } catch (error) {
      console.error("Bedrock themes could not load:", error);
      return;
    }

    if (!config.themes[settings.theme]) settings.theme = config.defaultTheme || defaults.theme;
    if (!["stars", "fog", "gradient", "none"].includes(settings.background)) {
      settings.background = config.defaultBackground || defaults.background;
    }

    applyTheme();
    applyBackground();
    renderThemeOptions();
    bindSettings();
    bindNavigation();

    const year = $("#br-year");
    if (year) year.textContent = new Date().getFullYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.BedrockThemes = Object.freeze({
    setTheme: chooseTheme,
    getSettings: () => ({ ...settings })
  });
})();
