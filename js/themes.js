(() => {
  "use strict";
  if (window.BedrockSettings) return;

  const STORAGE_KEY = "bedrock.preferences.v1";
  const LEGACY_KEY = "spydr_config_matrix";
  const CONFIG_URL = "/assets/json/themes.json";
  const VIDEO_ROOT = "/assets/images/b/";
  const VIDEO_COUNT = 6;
  const DEFAULTS = {
    autoSave: true,
    theme: "bedrock",
    background: "stars",
    starsEnabled: true,
    animations: true,
    accent: "",
    customTheme: { color1: "#7c3aed", color2: "#3f5efb", color3: "#ff4fd8", useColor3: false },
    videoBackground: 1,
    videoBackgroundEnabled: false,
    panicKey: "`",
    bossKey: "Escape",
    devModeKey: "F4",
    quickSettingsKey: "F9",
    panicUrl: "https://www.google.com",
    cloakEnabled: false,
    cloakTarget: "bedrock",
    cloakTitle: "",
    cloakIcon: "",
    antiCloseEnabled: false
  };
  const CLOAK_PRESETS = {
    bedrock: { title: "bedrock", icon: "/assets/images/logo.png" },
    google: { title: "Google", icon: "https://www.google.com/favicon.ico" },
    classroom: { title: "Home - Classroom", icon: "https://ssl.gstatic.com/classroom/favicon.png" },
    classlink: { title: "My Apps - ClassLink", icon: "https://www.classlink.com/favicon.ico" }
  };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  let themeConfig = { defaultTheme: "bedrock", themes: {} };
  let state = readState();
  let listeners = new Set();
  let recording = null;
  let originalTitle = document.title;
  let originalIcon = "";
  let devPanel = null;
  let devVisible = false;
  let starsCanvas = null;
  let starsCtx = null;
  let stars = [];
  let frame = 0;
  let resizeFn = null;

  function cloneDefaults() {
    return { ...DEFAULTS, customTheme: { ...DEFAULTS.customTheme } };
  }
  function parseObject(raw) {
    try {
      const value = JSON.parse(raw);
      return value && typeof value === "object" && !Array.isArray(value) ? value : null;
    } catch { return null; }
  }
  function normalize(input) {
    const next = { ...cloneDefaults(), ...(input || {}) };
    next.customTheme = { ...DEFAULTS.customTheme, ...(input?.customTheme || {}) };
    if (typeof next.autoSave !== "boolean") next.autoSave = true;
    if (typeof next.starsEnabled !== "boolean") next.starsEnabled = true;
    if (typeof next.animations !== "boolean") next.animations = true;
    if (typeof next.videoBackgroundEnabled !== "boolean") next.videoBackgroundEnabled = false;
    if (typeof next.antiCloseEnabled !== "boolean") next.antiCloseEnabled = false;
    if (!Number.isInteger(next.videoBackground) || next.videoBackground < 1 || next.videoBackground > VIDEO_COUNT) next.videoBackground = 1;
    if (!["none", "stars", "fog", "gradient", "theme"].includes(next.background)) next.background = "stars";
    for (const key of ["panicKey", "bossKey", "devModeKey", "quickSettingsKey"]) {
      if (typeof next[key] !== "string" || !next[key]) next[key] = DEFAULTS[key];
    }
    if (typeof next.theme !== "string") next.theme = "bedrock";
    if (typeof next.accent !== "string") next.accent = "";
    if (typeof next.cloakTitle !== "string") next.cloakTitle = "";
    if (typeof next.cloakIcon !== "string") next.cloakIcon = "";
    if (typeof next.panicUrl !== "string") next.panicUrl = DEFAULTS.panicUrl;
    return next;
  }
  function readState() {
    try {
      const current = parseObject(localStorage.getItem(STORAGE_KEY));
      if (current) return normalize(current);
      const old = parseObject(localStorage.getItem(LEGACY_KEY));
      if (old) return normalize({ ...old, background: old.background || old.bgStyle || "stars" });
    } catch {}
    return cloneDefaults();
  }
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      console.warn("bedrock settings: could not save preferences", error);
      return false;
    }
  }
  function emit(key) {
    const detail = { key, value: get(key), settings: getAll() };
    for (const callback of [...listeners]) {
      try { callback(key, detail.value, detail.settings); } catch (error) { console.error("bedrock settings subscriber failed", error); }
    }
    window.dispatchEvent(new CustomEvent("bedrock:settingschange", { detail }));
  }
  function validColor(value) {
    if (typeof value !== "string") return "";
    const probe = document.createElement("span");
    probe.style.color = "";
    probe.style.color = value.trim();
    return probe.style.color ? value.trim() : "";
  }
  function toHex(value) {
    const probe = document.createElement("canvas").getContext("2d");
    if (!probe) return "#ffffff";
    probe.fillStyle = validColor(value) || "#ffffff";
    const result = probe.fillStyle;
    return /^#[\da-f]{6}$/i.test(result) ? result : "#ffffff";
  }
  function getTheme() {
    if (state.theme === "custom") {
      const c = state.customTheme;
      return {
        label: "Custom", background: "#090c10", surface: "#11161d",
        surfaceRaised: "#171f29", text: "#edf3fa", muted: "#91a0b2",
        accent: c.color1, secondary: c.color2
      };
    }
    return themeConfig.themes?.[state.theme] || themeConfig.themes?.[themeConfig.defaultTheme] || {
      label: "Bedrock", background: "#090c10", surface: "#11161d",
      surfaceRaised: "#171f29", text: "#edf3fa", muted: "#91a0b2", accent: "#5fae87"
    };
  }
  function applyTheme() {
    const root = document.documentElement;
    const t = getTheme();
    const accent = validColor(state.accent) || t.accent || "#5fae87";
    const secondary = t.secondary || accent;
    const border = `color-mix(in srgb, ${t.text || "#fff"} 12%, transparent)`;
    const glow = `color-mix(in srgb, ${accent} 26%, transparent)`;
    root.dataset.brTheme = state.theme;
    root.dataset.theme = state.theme;
    root.style.colorScheme = state.theme === "light" ? "light" : "dark";
    const vars = {
      "--br-bg": t.background || "#090c10", "--br-surface": t.surface || "#11161d",
      "--br-raised": t.surfaceRaised || "#171f29", "--br-text": t.text || "#edf3fa",
      "--br-muted": t.muted || "#91a0b2", "--br-accent": accent,
      "--br-secondary": secondary, "--br-border": border, "--br-glow": glow,
      "--theme-primary": t.text || "#edf3fa", "--theme-secondary": accent,
      "--theme-background": t.background || "#090c10", "--theme-surface": t.surface || "#11161d",
      "--theme-text": t.text || "#edf3fa", "--theme-muted": t.muted || "#91a0b2",
      "--theme-border": border, "--theme-glow": glow, "--bg": t.background || "#090c10",
      "--bg2": secondary, "--card": t.surface || "#11161d", "--border": border,
      "--white": t.text || "#edf3fa", "--gray": t.muted || "#91a0b2", "--accent": accent,
      "--primary-color": t.text || "#edf3fa", "--secondary-color": accent,
      "--background-color": t.background || "#090c10", "--surface-color": t.surface || "#11161d",
      "--text-color": t.text || "#edf3fa", "--muted-color": t.muted || "#91a0b2",
      "--border-color": border, "--accent-color": accent, "--accent-glow": glow,
      "--gradient-1": t.background || "#090c10", "--gradient-2": accent, "--gradient-3": secondary
    };
    for (const [key, value] of Object.entries(vars)) root.style.setProperty(key, value);
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = t.background || "#090c10";
    if (document.body) {
      document.body.dataset.theme = state.theme;
      document.body.style.backgroundColor = t.background || "#090c10";
    }
    $$("[data-theme-choice]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.themeChoice === state.theme)));
    const picker = $("#br-accent-picker");
    if (picker) picker.value = toHex(accent);
    const c1 = $("#custom-color-1"); if (c1) c1.value = state.customTheme.color1;
    const c2 = $("#custom-color-2"); if (c2) c2.value = state.customTheme.color2;
    const c3 = $("#custom-color-3"); if (c3) c3.value = state.customTheme.color3;
    const c3e = $("#custom-color-3-enabled"); if (c3e) c3e.checked = !!state.customTheme.useColor3;
  }
  function ensureBackground() {
    let layer = $("#br-background-effects");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "br-background-effects";
      layer.setAttribute("aria-hidden", "true");
      layer.innerHTML = '<canvas id="br-stars"></canvas><div id="br-fog"></div>';
      document.body.prepend(layer);
    }
    starsCanvas = $("#br-stars");
    starsCtx = starsCanvas?.getContext("2d") || null;
    let video = $("#br-video-background");
    if (!video) {
      video = document.createElement("video");
      video.id = "br-video-background";
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute("aria-hidden", "true");
      video.preload = "metadata";
      document.body.prepend(video);
    }
    let shade = $("#br-video-shade");
    if (!shade) {
      shade = document.createElement("div");
      shade.id = "br-video-shade";
      shade.setAttribute("aria-hidden", "true");
      document.body.prepend(shade);
    }
  }
  function stopStars() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (resizeFn) window.removeEventListener("resize", resizeFn);
    resizeFn = null;
    if (starsCtx && starsCanvas) starsCtx.clearRect(0, 0, starsCanvas.width, starsCanvas.height);
    stars = [];
  }
  function startStars() {
    stopStars();
    if (!starsCanvas || !starsCtx || !state.animations || !state.starsEnabled || state.background !== "stars") return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      starsCanvas.width = Math.floor(innerWidth * dpr);
      starsCanvas.height = Math.floor(innerHeight * dpr);
      starsCanvas.style.width = `${innerWidth}px`;
      starsCanvas.style.height = `${innerHeight}px`;
      starsCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = Array.from({ length: Math.min(150, Math.max(35, Math.floor(innerWidth / 9)) ) }, () => ({
        x: Math.random() * innerWidth, y: Math.random() * innerHeight,
        r: Math.random() * 1.2 + .25, a: Math.random() * .55 + .18,
        speed: Math.random() * .14 + .025
      }));
    };
    const draw = () => {
      if (!starsCtx || !state.animations || !state.starsEnabled || state.background !== "stars") { frame = 0; return; }
      starsCtx.clearRect(0, 0, innerWidth, innerHeight);
      const color = validColor(state.accent) || getTheme().accent || "#fff";
      for (const s of stars) {
        starsCtx.beginPath(); starsCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        starsCtx.globalAlpha = s.a; starsCtx.fillStyle = color; starsCtx.fill(); starsCtx.globalAlpha = 1;
        s.y += s.speed;
        if (s.y > innerHeight + 2) { s.y = -2; s.x = Math.random() * innerWidth; }
      }
      frame = requestAnimationFrame(draw);
    };
    resizeFn = resize;
    window.addEventListener("resize", resize, { passive: true });
    resize(); frame = requestAnimationFrame(draw);
  }
  function applyBackground() {
    const root = document.documentElement;
    root.dataset.brBackground = state.background;
    root.dataset.bgStyle = state.background;
    root.dataset.brAnimations = state.animations ? "on" : "off";
    root.dataset.brVideo = state.videoBackgroundEnabled ? "on" : "off";
    if (document.body) {
      document.body.dataset.bgStyle = state.background;
      document.body.dataset.bg = state.background;
    }
    const bgSelect = $("#br-background-style"); if (bgSelect) bgSelect.value = state.background;
    const anim = $("#br-animations"); if (anim) anim.checked = state.animations;
    const starsToggle = $("#toggle-stars"); if (starsToggle) starsToggle.checked = state.starsEnabled;
    const videoToggle = $("#br-video-enabled"); if (videoToggle) videoToggle.checked = state.videoBackgroundEnabled;
    const video = $("#br-video-background");
    const shade = $("#br-video-shade");
    if (video) {
      const source = `${VIDEO_ROOT}v${state.videoBackground}.mp4`;
      if (video.dataset.source !== source) {
        video.dataset.source = source;
        video.src = source;
        video.load();
      }
      video.style.display = state.videoBackgroundEnabled ? "block" : "none";
      if (state.videoBackgroundEnabled && state.animations) {
        const play = video.play();
        if (play && typeof play.catch === "function") play.catch(() => {});
      } else video.pause();
    }
    if (shade) shade.style.display = state.videoBackgroundEnabled ? "block" : "none";
    const effects = $("#br-background-effects");
    if (effects) effects.style.display = state.background === "none" || state.videoBackgroundEnabled ? "none" : "block";
    const fog = $("#br-fog");
    if (fog) {
      fog.style.opacity = ["fog", "gradient", "theme"].includes(state.background) ? "1" : "0";
      fog.style.animation = state.animations && state.background === "gradient" ? "br-drift 16s ease-in-out infinite alternate" : "none";
    }
    if (state.background === "stars" && !state.videoBackgroundEnabled) startStars(); else stopStars();
    $$("[data-video-choice]").forEach(button => {
      button.setAttribute("aria-pressed", String(Number(button.dataset.videoChoice) === state.videoBackground));
    });
  }
  function applyCloak() {
    const icon = $('link[rel~="icon"]') || (() => {
      const node = document.createElement("link"); node.rel = "icon"; document.head.append(node); return node;
    })();
    if (!originalIcon) originalIcon = icon.href || "";
    if (!state.cloakEnabled) {
      document.title = originalTitle || "bedrock";
      if (originalIcon) icon.href = originalIcon;
      return;
    }
    const preset = CLOAK_PRESETS[state.cloakTarget] || CLOAK_PRESETS.bedrock;
    document.title = state.cloakTitle.trim() || preset.title;
    icon.href = state.cloakIcon.trim() || preset.icon;
  }
  function syncControls() {
    const values = {
      "toggle-autosave": "autoSave", "toggle-stars": "starsEnabled",
      "toggle-cloak": "cloakEnabled", "br-anti-close-enabled": "antiCloseEnabled",
      "br-video-enabled": "videoBackgroundEnabled", "br-animations": "animations"
    };
    for (const [id, key] of Object.entries(values)) {
      const el = document.getElementById(id);
      if (el) el.checked = Boolean(state[key]);
    }
    const bg = $("#br-background-style"); if (bg) bg.value = state.background;
    const target = $("#cloak-target-select"); if (target) target.value = state.cloakTarget;
    const title = $("#br-cloak-title"); if (title) title.value = state.cloakTitle;
    const icon = $("#br-cloak-icon"); if (icon) icon.value = state.cloakIcon;
    const url = $("#br-panic-url"); if (url) url.value = state.panicUrl;
    for (const key of ["panicKey", "bossKey", "devModeKey", "quickSettingsKey"]) {
      const btn = $(`[data-hotkey="${key}"]`);
      if (btn) btn.textContent = state[key] === " " ? "Space" : state[key];
    }
    const accent = $("#br-accent-picker"); if (accent) accent.value = toHex(validColor(state.accent) || getTheme().accent);
    const year = $("#br-year"); if (year) year.textContent = new Date().getFullYear();
  }
  function applyAll() { applyTheme(); applyBackground(); applyCloak(); syncControls(); }
  function get(key) { return state[key]; }
  function getAll() { return { ...state, customTheme: { ...state.customTheme } }; }
  function set(key, value, options = {}) {
    if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) return false;
    if (key === "background" && !["none", "stars", "fog", "gradient", "theme"].includes(value)) return false;
    if (key === "videoBackground" && (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > VIDEO_COUNT)) return false;
    if (key === "accent" && value && !validColor(value)) return false;
    if (["autoSave", "starsEnabled", "animations", "videoBackgroundEnabled", "antiCloseEnabled", "cloakEnabled"].includes(key) && typeof value !== "boolean") return false;
    if (key === "theme" && value !== "custom" && !themeConfig.themes?.[value]) return false;
    if (key === "customTheme") state.customTheme = { ...DEFAULTS.customTheme, ...(value || {}) };
    else state[key] = key === "videoBackground" ? Number(value) : value;
    if (options.apply !== false) applyAll();
    if (options.save !== false && (state.autoSave || key === "autoSave")) save();
    emit(key);
    return true;
  }
  function setCustomTheme(key, value) {
    if (!["color1", "color2", "color3", "useColor3"].includes(key)) return false;
    if (key !== "useColor3" && !validColor(value)) return false;
    state.customTheme[key] = value;
    if (state.autoSave) save();
    applyTheme(); applyBackground(); renderThemeOptions(); emit("customTheme");
    return true;
  }
  function reset() {
    state = cloneDefaults();
    save(); applyAll(); renderThemeOptions(); emit("*");
    setStatus("Preferences reset.");
  }
  function subscribe(callback) {
    if (typeof callback !== "function") return () => {};
    listeners.add(callback);
    return () => listeners.delete(callback);
  }
  function chooseTheme(id) {
    if (id !== "custom" && !themeConfig.themes?.[id]) return false;
    if (id === "custom") state.accent = "";
    const ok = set("theme", id);
    renderThemeOptions();
    return ok;
  }
  function renderThemeOptions() {
    const container = $("#br-theme-options");
    if (!container) return;
    container.replaceChildren();
    const themes = { ...(themeConfig.themes || {}), custom: { label: "Custom", accent: state.customTheme.color1, background: "#090c10" } };
    for (const [id, theme] of Object.entries(themes)) {
      const button = document.createElement("button");
      button.type = "button"; button.className = "br-theme-option"; button.dataset.themeChoice = id;
      button.setAttribute("aria-pressed", String(state.theme === id));
      const swatch = document.createElement("span"); swatch.className = "br-theme-swatch"; swatch.style.setProperty("--swatch", theme.accent || "#fff");
      const text = document.createElement("span"); const strong = document.createElement("strong"); const small = document.createElement("small");
      strong.textContent = theme.label || id; small.textContent = id === "custom" ? "Your own palette" : `${theme.label || id} palette`;
      text.append(strong, small); button.append(swatch, text); button.addEventListener("click", () => chooseTheme(id)); container.append(button);
    }
  }
  function renderVideoOptions() {
    const container = $("#br-video-options");
    if (!container) return;
    container.replaceChildren();
    for (let i = 1; i <= VIDEO_COUNT; i++) {
      const button = document.createElement("button");
      button.type = "button"; button.className = "br-video-option"; button.dataset.videoChoice = String(i);
      button.setAttribute("aria-pressed", String(state.videoBackground === i));
      const img = document.createElement("img"); img.src = `${VIDEO_ROOT}v${i}p.jpg`; img.alt = `Video background ${i} preview`; img.loading = "lazy";
      img.addEventListener("error", () => { img.hidden = true; button.classList.add("br-preview-missing"); });
      const label = document.createElement("span"); label.textContent = `Background ${String(i).padStart(2, "0")}`;
      const check = document.createElement("i"); check.className = "ri-check-line"; check.setAttribute("aria-hidden", "true");
      button.append(img, label, check);
      button.addEventListener("click", () => set("videoBackground", i));
      container.append(button);
    }
  }
  function setStatus(message) {
    const el = $("#br-settings-status");
    if (el) el.textContent = message;
  }
  function startRecording(button, keyName) {
    if (recording) {
      window.removeEventListener("keydown", recording.listener, true);
      recording.button.classList.remove("recording");
      recording.button.textContent = state[recording.keyName] === " " ? "Space" : state[recording.keyName];
    }
    const record = { button, keyName, listener: null };
    button.classList.add("recording"); button.textContent = "PRESS A KEY";
    record.listener = event => {
      event.preventDefault(); event.stopPropagation();
      if (["Tab", "Shift", "Control", "Alt", "Meta", "CapsLock"].includes(event.key)) return;
      window.removeEventListener("keydown", record.listener, true);
      recording = null; button.classList.remove("recording");
      const key = event.key === " " ? " " : event.key;
      set(keyName, key); button.textContent = key === " " ? "Space" : key;
    };
    recording = record;
    window.addEventListener("keydown", record.listener, true);
  }
  function openQuickSettings() {
    if (location.pathname.endsWith("/settings.html")) {
      $("#appearance")?.scrollIntoView({ behavior: state.animations ? "smooth" : "auto" });
    } else location.href = "/settings.html";
  }
  function toggleDevPanel() {
    devVisible = !devVisible;
    if (!devPanel) {
      devPanel = document.createElement("aside"); devPanel.id = "br-dev-panel";
      document.body.append(devPanel);
    }
    devPanel.hidden = !devVisible;
    if (devVisible) devPanel.textContent = `BEDROCK SYSTEM\nTHEME: ${state.theme}\nBACKGROUND: ${state.background}\nVIDEO: ${state.videoBackgroundEnabled ? state.videoBackground : "off"}`;
  }
  function runHotkey(event) {
    if (recording) return;
    const target = event.target;
    const typing = target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
    if (typing || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === state.panicKey) {
      event.preventDefault();
      try { location.assign(new URL(state.panicUrl || DEFAULTS.panicUrl, location.href).href); } catch { location.assign(DEFAULTS.panicUrl); }
    } else if (event.key === state.bossKey) {
      event.preventDefault();
      location.href = "/main.html";
    } else if (event.key === state.devModeKey) {
      event.preventDefault(); toggleDevPanel();
    } else if (event.key === state.quickSettingsKey) {
      event.preventDefault(); openQuickSettings();
    }
  }
  function bindSettings() {
    $("#br-background-style")?.addEventListener("change", e => set("background", e.currentTarget.value));
    $("#br-animations")?.addEventListener("change", e => set("animations", e.currentTarget.checked));
    $("#toggle-stars")?.addEventListener("change", e => set("starsEnabled", e.currentTarget.checked));
    $("#br-video-enabled")?.addEventListener("change", e => set("videoBackgroundEnabled", e.currentTarget.checked));
    $("#br-accent-picker")?.addEventListener("input", e => set("accent", e.currentTarget.value));
    $("#toggle-autosave")?.addEventListener("change", e => { set("autoSave", e.currentTarget.checked); save(); });
    $("#toggle-cloak")?.addEventListener("change", e => set("cloakEnabled", e.currentTarget.checked));
    $("#cloak-target-select")?.addEventListener("change", e => set("cloakTarget", e.currentTarget.value));
    $("#br-cloak-title")?.addEventListener("input", e => set("cloakTitle", e.currentTarget.value));
    $("#br-cloak-icon")?.addEventListener("input", e => set("cloakIcon", e.currentTarget.value));
    $("#br-panic-url")?.addEventListener("change", e => set("panicUrl", e.currentTarget.value.trim() || DEFAULTS.panicUrl));
    $("#br-anti-close-enabled")?.addEventListener("change", e => set("antiCloseEnabled", e.currentTarget.checked));
    $("#custom-color-1")?.addEventListener("input", e => setCustomTheme("color1", e.currentTarget.value));
    $("#custom-color-2")?.addEventListener("input", e => setCustomTheme("color2", e.currentTarget.value));
    $("#custom-color-3")?.addEventListener("input", e => setCustomTheme("color3", e.currentTarget.value));
    $("#custom-color-3-enabled")?.addEventListener("change", e => setCustomTheme("useColor3", e.currentTarget.checked));
    $("#br-use-custom-theme")?.addEventListener("click", () => { set("accent", ""); chooseTheme("custom"); setStatus("Custom theme applied."); });
    $("#br-reset-settings")?.addEventListener("click", reset);
    $$("[data-hotkey]").forEach(button => button.addEventListener("click", () => startRecording(button, button.dataset.hotkey)));
  }
  async function init() {
    if (!document.body) return;
    originalTitle = document.title || "bedrock";
    const initialIcon = $('link[rel~="icon"]'); originalIcon = initialIcon?.href || "";
    try {
      const response = await fetch(CONFIG_URL, { cache: "no-cache" });
      if (response.ok) {
        const data = await response.json();
        if (data && typeof data === "object") themeConfig = data;
      }
    } catch (error) { console.warn("bedrock theme config unavailable", error); }
    if (state.theme !== "custom" && !themeConfig.themes?.[state.theme]) state.theme = themeConfig.defaultTheme || "bedrock";
    ensureBackground(); applyAll(); renderThemeOptions(); renderVideoOptions(); bindSettings();
    window.addEventListener("keydown", runHotkey);
    window.addEventListener("storage", event => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      const incoming = parseObject(event.newValue); if (!incoming) return;
      state = normalize(incoming); applyAll(); renderThemeOptions(); renderVideoOptions(); emit("*");
    });
    // Apply the optional browser-native leave-page warning without disabling browser controls.
    const antiClose = document.createElement("script");
    antiClose.src = "/js/anti-close.js";
    antiClose.defer = true;
    document.head.append(antiClose);
    save();
  }
  window.BedrockSettings = Object.freeze({
    get, getAll, set, setCustomTheme, reset, save, subscribe, chooseTheme,
    applyTheme, applyBackground, applyAll, openQuickSettings,
    getThemes: () => ({ ...(themeConfig.themes || {}) })
  });
  window.BedrockOpenSettings = openQuickSettings;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
