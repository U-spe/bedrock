(() => {
  "use strict";

  if (window.BedrockSettings) return;

  const STORAGE_KEY = "bedrock.preferences.v1";
  const LEGACY_KEY = "spydr_config_matrix";
  const CONFIG_URL = "/assets/json/themes.json";

  const DEFAULTS = Object.freeze({
    autoSave: true,
    theme: "bedrock",
    background: "stars",
    starsEnabled: true,
    animations: true,
    accent: "",
    customTheme: {
      color1: "#7c3aed",
      color2: "#3f5efb",
      color3: "#ff4fd8",
      useColor3: false
    },
    panicKey: "`",
    bossKey: "Escape",
    devModeKey: "F4",
    quickSettingsKey: "F9",
    cloakEnabled: false,
    cloakTarget: "bedrock",
    cloakTitle: "bedrock",
    cloakIcon: "/assets/images/logo.png"
  });

  const VALID_BACKGROUNDS = new Set([
    "none",
    "stars",
    "fog",
    "gradient",
    "theme"
  ]);

  const CLOAK_PRESETS = {
    bedrock: {
      title: "bedrock",
      icon: "/assets/images/logo.png"
    },
    google: {
      title: "Google",
      icon: "https://www.google.com/favicon.ico"
    },
    classroom: {
      title: "Home - Classroom",
      icon: "https://ssl.gstatic.com/classroom/favicon.png"
    },
    classlink: {
      title: "My Apps - ClassLink",
      icon: "https://www.classlink.com/favicon.ico"
    }
  };

  let config = { themes: {} };
  let state = cloneDefaults();
  let listeners = new Set();
  let initialized = false;
  let animationFrame = 0;
  let resizeHandler = null;
  let stars = [];
  let canvas = null;
  let context = null;
  let devPanel = null;
  let devMode = false;
  let recordingHotkey = null;
  let originalTitle = document.title;
  let originalFavicon = "";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [
    ...root.querySelectorAll(selector)
  ];

  function cloneDefaults() {
    return {
      ...DEFAULTS,
      customTheme: { ...DEFAULTS.customTheme }
    };
  }

  function safeParse(value) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : null;
    } catch {
      return null;
    }
  }

  function normalize(input) {
    const result = {
      ...cloneDefaults(),
      ...(input || {}),
      customTheme: {
        ...DEFAULTS.customTheme,
        ...(input?.customTheme || {})
      }
    };

    if (typeof result.autoSave !== "boolean") {
      result.autoSave = DEFAULTS.autoSave;
    }

    if (typeof result.animations !== "boolean") {
      result.animations = DEFAULTS.animations;
    }

    if (typeof result.starsEnabled !== "boolean") {
      result.starsEnabled = DEFAULTS.starsEnabled;
    }

    if (typeof result.cloakEnabled !== "boolean") {
      result.cloakEnabled = false;
    }

    if (typeof result.theme !== "string") {
      result.theme = DEFAULTS.theme;
    }

    if (!VALID_BACKGROUNDS.has(result.background)) {
      result.background = DEFAULTS.background;
    }

    for (const key of [
      "panicKey",
      "bossKey",
      "devModeKey",
      "quickSettingsKey"
    ]) {
      if (typeof result[key] !== "string" || !result[key]) {
        result[key] = DEFAULTS[key];
      }
    }

    return result;
  }

  function readSavedSettings() {
    const current = safeParse(localStorage.getItem(STORAGE_KEY));

    if (current) return normalize(current);

    const legacy = safeParse(localStorage.getItem(LEGACY_KEY));

    if (legacy) {
      const migrated = normalize({
        ...legacy,
        background: legacy.bgStyle || legacy.background,
        animations: legacy.animations ?? true
      });

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      } catch {
        /* Storage can be disabled by browser policy. */
      }

      return migrated;
    }

    return cloneDefaults();
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      console.warn("bedrock settings: unable to save preferences", error);
      return false;
    }
  }

  function emit(key) {
    for (const callback of [...listeners]) {
      try {
        callback(key, get(key), getAll());
      } catch (error) {
        console.error("bedrock settings listener failed:", error);
      }
    }

    window.dispatchEvent(new CustomEvent("bedrock:settingschange", {
      detail: {
        key,
        value: get(key),
        settings: getAll()
      }
    }));
  }

  function validColor(value) {
    if (typeof value !== "string") return "";

    const probe = document.createElement("span");
    probe.style.color = "";
    probe.style.color = value.trim();

    return probe.style.color ? value.trim() : "";
  }

  function toHex(value) {
    const color = validColor(value);
    if (!color) return "";

    if (/^#[\da-f]{6}$/i.test(color)) return color;

    const probe = document.createElement("canvas");
    const ctx = probe.getContext("2d");
    if (!ctx) return "";

    ctx.fillStyle = color;
    const normalized = ctx.fillStyle;

    return /^#[\da-f]{6}$/i.test(normalized) ? normalized : "";
  }

  function getActiveTheme() {
    const themeId = state.theme;

    if (themeId === "custom") {
      const custom = state.customTheme;

      return {
        label: "Custom",
        background: "#090909",
        surface: "#111111",
        surfaceRaised: "#171717",
        text: "#ffffff",
        muted: "#bdbdbd",
        accent: custom.color1 || "#7c3aed",
        secondary: custom.color2 || "#3f5efb"
      };
    }

    return config.themes?.[themeId] ||
      config.themes?.[config.defaultTheme] ||
      {
        label: "Bedrock",
        background: "#090909",
        surface: "#111111",
        surfaceRaised: "#171717",
        text: "#ffffff",
        muted: "#bdbdbd",
        accent: "#ffffff"
      };
  }

  function applyTheme() {
    const root = document.documentElement;
    const theme = getActiveTheme();
    const accent = validColor(state.accent) || theme.accent || "#ffffff";
    const secondary = theme.secondary || accent;
    const background = theme.background || "#090909";
    const surface = theme.surface || "#111111";
    const raised = theme.surfaceRaised || "#171717";
    const text = theme.text || "#ffffff";
    const muted = theme.muted || "#bdbdbd";
    const border = `color-mix(in srgb, ${text} 12%, transparent)`;
    const glow = `color-mix(in srgb, ${accent} 25%, transparent)`;

    root.dataset.brTheme = state.theme;
    root.dataset.theme = state.theme;

    root.style.setProperty("--br-bg", background);
    root.style.setProperty("--br-surface", surface);
    root.style.setProperty("--br-raised", raised);
    root.style.setProperty("--br-text", text);
    root.style.setProperty("--br-muted", muted);
    root.style.setProperty("--br-accent", accent);
    root.style.setProperty("--br-border", border);
    root.style.setProperty("--br-glow", glow);

    root.style.setProperty("--theme-primary", text);
    root.style.setProperty("--theme-secondary", accent);
    root.style.setProperty("--theme-background", background);
    root.style.setProperty("--theme-surface", surface);
    root.style.setProperty("--theme-text", text);
    root.style.setProperty("--theme-muted", muted);
    root.style.setProperty("--theme-border", border);
    root.style.setProperty("--theme-glow", glow);

    root.style.setProperty("--primary-color", text);
    root.style.setProperty("--secondary-color", accent);
    root.style.setProperty("--background-color", background);
    root.style.setProperty("--surface-color", surface);
    root.style.setProperty("--text-color", text);
    root.style.setProperty("--muted-color", muted);
    root.style.setProperty("--border-color", border);
    root.style.setProperty("--accent-color", accent);
    root.style.setProperty("--accent-glow", glow);

    root.style.setProperty("--bg", background);
    root.style.setProperty("--bg2", secondary);
    root.style.setProperty("--card", surface);
    root.style.setProperty("--border", border);
    root.style.setProperty("--white", text);
    root.style.setProperty("--gray", muted);
    root.style.setProperty("--darkgray", muted);
    root.style.setProperty("--accent", accent);

    root.style.setProperty("--gradient-1", background);
    root.style.setProperty("--gradient-2", accent);
    root.style.setProperty("--gradient-3", secondary);

    root.style.colorScheme = state.theme === "light" ? "light" : "dark";

    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = background;

    if (document.body) {
      document.body.dataset.theme = state.theme;
      document.body.dataset.spydrTheme = state.theme;
      document.body.style.backgroundColor = background;
    }

    $$("[data-theme-choice]").forEach(button => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.themeChoice === state.theme)
      );
    });

    const accentPicker = $("#br-accent-picker");
    if (accentPicker) {
      accentPicker.value = toHex(accent) || "#ffffff";
    }

    const custom1 = $("#custom-color-1");
    const custom2 = $("#custom-color-2");
    const custom3 = $("#custom-color-3");
    const custom3Enabled = $("#custom-color-3-enabled");

    if (custom1) custom1.value = state.customTheme.color1;
    if (custom2) custom2.value = state.customTheme.color2;
    if (custom3) custom3.value = state.customTheme.color3;
    if (custom3Enabled) {
      custom3Enabled.checked = Boolean(state.customTheme.useColor3);
    }
  }

  function ensureBackground() {
    let layer = $("#br-background-effects");

    if (!layer) {
      layer = document.createElement("div");
      layer.id = "br-background-effects";
      layer.setAttribute("aria-hidden", "true");
      layer.innerHTML = `
        <canvas id="br-stars"></canvas>
        <div id="br-fog"></div>
      `;
      document.body.prepend(layer);
    }

    canvas = $("#br-stars");
    context = canvas?.getContext("2d") || null;
  }

  function stopStars() {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }

    if (resizeHandler) {
      window.removeEventListener("resize", resizeHandler);
      resizeHandler = null;
    }

    if (context && canvas) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    stars = [];
  }

  function startStars() {
    stopStars();

    if (!canvas || !context) return;
    if (!state.animations || !state.starsEnabled) return;
    if (state.background !== "stars") return;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(window.innerWidth * ratio);
      canvas.height = Math.floor(window.innerHeight * ratio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;

      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const count = Math.min(
        150,
        Math.max(35, Math.floor(window.innerWidth / 9))
      );

      stars = Array.from({ length: count }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: Math.random() * 1.25 + 0.25,
        alpha: Math.random() * 0.55 + 0.2,
        speed: Math.random() * 0.14 + 0.025
      }));
    };

    const draw = () => {
      if (!context || !canvas || !state.animations ||
          !state.starsEnabled || state.background !== "stars") {
        animationFrame = 0;
        return;
      }

      context.clearRect(0, 0, window.innerWidth, window.innerHeight);

      const theme = getActiveTheme();
      const color = validColor(state.accent) || theme.accent || "#ffffff";

      for (const star of stars) {
        context.beginPath();
        context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        context.fillStyle = color;
        context.globalAlpha = star.alpha;
        context.fill();
        context.globalAlpha = 1;

        star.y += star.speed;

        if (star.y > window.innerHeight + 2) {
          star.y = -2;
          star.x = Math.random() * window.innerWidth;
        }
      }

      animationFrame = requestAnimationFrame(draw);
    };

    resize();
    resizeHandler = resize;
    window.addEventListener("resize", resize, { passive: true });
    animationFrame = requestAnimationFrame(draw);
  }

  function applyBackground() {
    const root = document.documentElement;

    root.dataset.brBackground = state.background;
    root.dataset.bgStyle = state.background;
    root.dataset.brAnimations = state.animations ? "on" : "off";

    if (document.body) {
      document.body.dataset.bgStyle = state.background;
      document.body.dataset.bg = state.background;
    }

    const selector = $("#br-background-style");
    if (selector) selector.value = state.background;

    const animationsToggle = $("#br-animations");
    if (animationsToggle) animationsToggle.checked = state.animations;

    const starsToggle = $("#toggle-stars");
    if (starsToggle) starsToggle.checked = state.starsEnabled;

    const effects = $("#br-background-effects");
    if (effects) {
      effects.style.display =
        state.background === "none" ? "none" : "block";
    }

    const fog = $("#br-fog");
    if (fog) {
      fog.style.opacity =
        state.background === "fog" ||
        state.background === "gradient" ||
        state.background === "theme"
          ? "1"
          : "0";

      fog.style.animation =
        state.animations && state.background === "gradient"
          ? "br-drift 16s ease-in-out infinite alternate"
          : "none";
    }

    if (state.background === "stars") {
      startStars();
    } else {
      stopStars();
    }
  }

  function applyCloak() {
    if (!document.head) return;

    let icon = $('link[rel~="icon"]');

    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      document.head.appendChild(icon);
    }

    if (!originalFavicon) originalFavicon = icon.href;

    if (!state.cloakEnabled) {
      document.title = originalTitle || "bedrock";
      if (originalFavicon) icon.href = originalFavicon;
      return;
    }

    const preset = CLOAK_PRESETS[state.cloakTarget] ||
      CLOAK_PRESETS.bedrock;

    document.title = state.cloakTitle || preset.title;
    icon.href = state.cloakIcon || preset.icon;
  }

  function applyAll() {
    applyTheme();
    applyBackground();
    applyCloak();
    syncSettingsControls();
  }

  function syncSettingsControls() {
    const map = {
      "toggle-autosave": "autoSave",
      "toggle-stars": "starsEnabled",
      "toggle-cloak": "cloakEnabled"
    };

    for (const [id, key] of Object.entries(map)) {
      const control = document.getElementById(id);
      if (control) control.checked = Boolean(state[key]);
    }

    const background = $("#br-background-style") ||
      $("#bg-fx-variant") ||
      $("#bg-style-select");

    if (background) {
      background.value = state.background;
    }

    const cloakTarget = $("#cloak-target-select");
    if (cloakTarget) cloakTarget.value = state.cloakTarget;

    for (const key of [
      "panicKey",
      "bossKey",
      "devModeKey",
      "quickSettingsKey"
    ]) {
      const button = document.querySelector(`[data-hotkey="${key}"]`);
      if (button) button.textContent = state[key] === " " ? "Space" : state[key];
    }

    const themeRadios = $$('input[name="ui-theme"]');
    themeRadios.forEach(radio => {
      radio.checked = radio.value === state.theme;
    });

    const accentRadios = $$('input[name="accent-color"]');
    accentRadios.forEach(radio => {
      radio.checked = radio.value === state.accent;
    });
  }

  function get(key) {
    return state[key];
  }

  function getAll() {
    return {
      ...state,
      customTheme: { ...state.customTheme }
    };
  }

  function set(key, value, options = {}) {
    if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) return false;

    const previous = state[key];

    if (key === "background" && !VALID_BACKGROUNDS.has(value)) {
      return false;
    }

    if (key === "accent" && value && !validColor(value)) {
      return false;
    }

    state[key] = value;

    if (key === "theme" && value !== "custom" &&
        !config.themes?.[value]) {
      state[key] = previous;
      return false;
    }

    if (key === "customTheme") {
      state.customTheme = {
        ...DEFAULTS.customTheme,
        ...(value || {})
      };
    }

    if (options.apply !== false) applyAll();

    if (options.save !== false && state.autoSave) save();

    emit(key);
    return true;
  }

  function setCustomTheme(key, value) {
    const allowed = new Set([
      "color1",
      "color2",
      "color3",
      "useColor3"
    ]);

    if (!allowed.has(key)) return false;

    if (key !== "useColor3" && !validColor(value)) return false;

    state.customTheme[key] = value;

    if (state.autoSave) save();

    applyTheme();
    applyBackground();
    emit("customTheme");
    return true;
  }

  function reset() {
    state = cloneDefaults();
    save();
    applyAll();
    emit("*");
  }

  function subscribe(callback) {
    if (typeof callback !== "function") return () => {};
    listeners.add(callback);
    return () => listeners.delete(callback);
  }

  function chooseTheme(themeId) {
    if (themeId !== "custom" && !config.themes?.[themeId]) return false;
    return set("theme", themeId);
  }

  function renderThemeOptions() {
    const container = $("#br-theme-options");
    if (!container) return;

    container.replaceChildren();

    const themes = {
      ...(config.themes || {}),
      custom: {
        label: "Custom",
        accent: state.customTheme.color1 || "#7c3aed",
        background: "#090909"
      }
    };

    for (const [id, theme] of Object.entries(themes)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "br-theme-option";
      button.dataset.themeChoice = id;
      button.setAttribute("aria-pressed", String(state.theme === id));

      const swatch = document.createElement("span");
      swatch.className = "br-theme-swatch";
      swatch.style.setProperty("--swatch", theme.accent || "#ffffff");

      const label = document.createElement("span");
      const strong = document.createElement("strong");
      const small = document.createElement("small");

      strong.textContent = theme.label || id;
      small.textContent = id === "custom"
        ? "Your custom palette"
        : `${theme.label || id} palette`;

      label.append(strong, small);
      button.append(swatch, label);
      button.addEventListener("click", () => chooseTheme(id));
      container.append(button);
    }
  }

  function startHotkeyRecording(button, settingName) {
    if (recordingHotkey) {
      recordingHotkey.button.classList.remove("recording");
      recordingHotkey.button.textContent =
        state[recordingHotkey.settingName];
    }

    recordingHotkey = { button, settingName };
    button.classList.add("recording");
    button.textContent = "PRESS A KEY";

    const onKey = event => {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === "Tab" || event.key === "Shift" ||
          event.key === "Control" || event.key === "Alt" ||
          event.key === "Meta") {
        return;
      }

      window.removeEventListener("keydown", onKey, true);

      const current = recordingHotkey;
      recordingHotkey = null;

      if (!current) return;

      current.button.classList.remove("recording");

      const recorded = event.key === " " ? " " : event.key;
      set(current.settingName, recorded);
      current.button.textContent = recorded === " " ? "Space" : recorded;
    };

    window.addEventListener("keydown", onKey, true);
  }

  function openQuickSettings() {
    if (typeof window.BedrockOpenSettings === "function") {
      window.BedrockOpenSettings();
      return;
    }

    if (!location.pathname.endsWith("/settings.html")) {
      location.href = "/settings.html";
      return;
    }

    const firstSection = $("#appearance");
    firstSection?.scrollIntoView({
      behavior: state.animations ? "smooth" : "auto"
    });
  }

  function toggleDevMode() {
    devMode = !devMode;

    if (!devPanel) {
      devPanel = document.createElement("aside");
      devPanel.id = "bedrock-dev-panel";
      devPanel.setAttribute("aria-live", "polite");

      Object.assign(devPanel.style, {
        position: "fixed",
        right: "16px",
        bottom: "16px",
        zIndex: "999999",
        display: "none",
        flexDirection: "column",
        gap: "5px",
        padding: "12px 14px",
        background: "rgba(8,8,8,.92)",
        color: "#fff",
        border: "1px solid rgba(255,255,255,.2)",
        borderRadius: "12px",
        font: "12px/1.6 'JetBrains Mono', monospace",
        pointerEvents: "none",
        backdropFilter: "blur(12px)"
      });

      document.body.appendChild(devPanel);
    }

    devPanel.style.display = devMode ? "flex" : "none";

    if (devMode) {
      let last = performance.now();
      let frames = 0;

      const update = now => {
        if (!devMode) return;

        frames++;

        if (now - last >= 1000) {
          devPanel.textContent =
            `BEDROCK SYSTEM\nFPS: ${frames}\nTHEME: ${state.theme}\nBACKGROUND: ${state.background}`;
          frames = 0;
          last = now;
        }

        requestAnimationFrame(update);
      };

      requestAnimationFrame(update);
    }
  }

  function runHotkey(event) {
    if (recordingHotkey) return;

    const target = event.target;
    const typing = target instanceof HTMLElement &&
      (target.isContentEditable ||
       /INPUT|TEXTAREA|SELECT/.test(target.tagName));

    if (typing || event.altKey || event.ctrlKey || event.metaKey) return;

    if (event.key === state.panicKey) {
      event.preventDefault();
      set("cloakEnabled", true);
      set("cloakTarget", "classroom");
      location.replace("https://google.com");
      return;
    }

    if (event.key === state.bossKey && state.cloakEnabled) {
      event.preventDefault();
      set("cloakEnabled", false);
      return;
    }

    if (event.key === state.devModeKey) {
      event.preventDefault();
      toggleDevMode();
      return;
    }

    if (event.key === state.quickSettingsKey) {
      event.preventDefault();
      openQuickSettings();
    }
  }

  function bindSettingsPage() {
    $("#br-background-style")?.addEventListener("change", event => {
      set("background", event.currentTarget.value);
    });

    $("#bg-fx-variant")?.addEventListener("change", event => {
      set("background", event.currentTarget.value);
    });

    $("#br-animations")?.addEventListener("change", event => {
      set("animations", event.currentTarget.checked);
    });

    $("#toggle-stars")?.addEventListener("change", event => {
      set("starsEnabled", event.currentTarget.checked);
    });

    $("#toggle-autosave")?.addEventListener("change", event => {
      set("autoSave", event.currentTarget.checked);
      save();
    });

    $("#br-accent-picker")?.addEventListener("input", event => {
      set("accent", event.currentTarget.value);
    });

    $("#toggle-cloak")?.addEventListener("change", event => {
      set("cloakEnabled", event.currentTarget.checked);
    });

    $("#cloak-target-select")?.addEventListener("change", event => {
      set("cloakTarget", event.currentTarget.value);
    });

    $("#custom-color-1")?.addEventListener("input", event => {
      setCustomTheme("color1", event.currentTarget.value);
    });

    $("#custom-color-2")?.addEventListener("input", event => {
      setCustomTheme("color2", event.currentTarget.value);
    });

    $("#custom-color-3")?.addEventListener("input", event => {
      setCustomTheme("color3", event.currentTarget.value);
    });

    $("#custom-color-3-enabled")?.addEventListener("change", event => {
      setCustomTheme("useColor3", event.currentTarget.checked);
    });

    $("#br-reset-settings")?.addEventListener("click", reset);

    $$("[data-hotkey]").forEach(button => {
      button.addEventListener("click", () => {
        startHotkeyRecording(button, button.dataset.hotkey);
      });
    });

    $$('input[name="ui-theme"]').forEach(radio => {
      radio.addEventListener("change", () => chooseTheme(radio.value));
    });

    $$('input[name="accent-color"]').forEach(radio => {
      radio.addEventListener("change", () => set("accent", radio.value));
    });

    const search = $("#dashboard-search");

    if (search) {
      search.addEventListener("input", () => {
        const query = search.value.trim().toLowerCase();
        let visible = 0;

        $$(".br-card[data-search]").forEach(card => {
          const matches = !query ||
            `${card.textContent} ${card.dataset.search || ""}`
              .toLowerCase()
              .includes(query);

          card.hidden = !matches;
          if (matches) visible++;
        });

        const empty = $("#br-no-results");
        if (empty) empty.hidden = visible !== 0;
      });
    }
  }

  async function init() {
    if (initialized) return;
    initialized = true;

    state = readSavedSettings();

    try {
      const response = await fetch(CONFIG_URL, { cache: "no-cache" });

      if (response.ok) {
        const data = await response.json();
        config = data && typeof data === "object"
          ? data
          : { themes: {} };
      }
    } catch (error) {
      console.warn("bedrock theme config unavailable", error);
    }

    if (state.theme !== "custom" && !config.themes?.[state.theme]) {
      state.theme = config.defaultTheme || "bedrock";
    }

    if (!document.body) return;

    ensureBackground();
    applyAll();
    renderThemeOptions();
    bindSettingsPage();

    const year = $("#br-year");
    if (year) year.textContent = new Date().getFullYear();

    const favicon = $('link[rel~="icon"]');
    originalFavicon = favicon?.href || "";
    originalTitle = document.title;

    applyCloak();
    window.addEventListener("keydown", runHotkey);

    window.addEventListener("storage", event => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;

      const incoming = safeParse(event.newValue);
      if (!incoming) return;

      state = normalize(incoming);
      applyAll();
      renderThemeOptions();
      emit("*");
    });

    save();
  }

  window.BedrockSettings = Object.freeze({
    get,
    getAll,
    set,
    setCustomTheme,
    reset,
    save,
    subscribe,
    chooseTheme,
    applyTheme,
    applyBackground,
    applyAll,
    openQuickSettings,
    getThemes: () => ({ ...(config.themes || {}) })
  });

  window.BedrockOpenSettings = openQuickSettings;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
