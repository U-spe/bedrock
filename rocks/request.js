(() => {
  "use strict";

  const ENGINES = Object.freeze({
    scramjet: {
      id: "scramjet",
      label: "scramjet",
      shortLabel: "sj",
      origin: "https://sjett.sp1.blitz.cloud",
      prefix: "/scramjet/"
    },

    ultraviolet: {
      id: "ultraviolet",
      label: "ultraviolet",
      shortLabel: "uv",
      origin: "https://ultraviolet-app.sp1.blitz.cloud",
      prefix: "/uv/service/"
    }
  });

  const SETTINGS_KEY = "bedrock.proxy.engine";

  let uvConfigPromise = null;

  function normalizeEngine(value) {
    const engine = String(value || "").trim().toLowerCase();

    if (["uv", "ultraviolet"].includes(engine)) {
      return "ultraviolet";
    }

    return "scramjet";
  }

  function getEngine() {
    try {
      return normalizeEngine(localStorage.getItem(SETTINGS_KEY));
    } catch {
      return "scramjet";
    }
  }

  function setEngine(value) {
    const engine = normalizeEngine(value);

    try {
      localStorage.setItem(SETTINGS_KEY, engine);
    } catch (error) {
      console.warn("[rockz] couldn't persist the proxy engine:", error);
    }

    window.dispatchEvent(
      new CustomEvent("bedrock:proxy-engine-changed", {
        detail: { engine }
      })
    );

    return engine;
  }

  function getEngineConfig(engine = getEngine()) {
    return ENGINES[normalizeEngine(engine)];
  }

  function resolveTarget(value) {
    let target = String(value || "").trim();

    if (!target) {
      throw new Error("enter a URL or search term first");
    }

    if (/[\u0000-\u001f]/.test(target)) {
      throw new Error("that address contains invalid characters");
    }

    if (/^[a-z][a-z\d+.-]*:\/\//i.test(target)) {
      // A scheme is already present.
    } else if (
      /^[\w-]+(?:\.[\w-]+)+(?:\:\d+)?(?:[/?#][^\s]*)?$/i.test(target)
    ) {
      target = `https://${target}`;
    } else {
      target = `https://www.google.com/search?q=${encodeURIComponent(target)}`;
    }

    let parsed;

    try {
      parsed = new URL(target);
    } catch {
      throw new Error("that address is not valid");
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("rockz only supports HTTP and HTTPS addresses");
    }

    if (!parsed.hostname) {
      throw new Error("enter a valid website address");
    }

    return parsed.href;
  }

  function loadScript(src, marker) {
    return new Promise((resolve, reject) => {
      const existing = [...document.scripts].find(
        script => script.dataset.rockzSource === marker
      );

      if (existing?.dataset.loaded === "true") {
        resolve();
        return;
      }

      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error(`could not load proxy asset: ${src}`)),
          { once: true }
        );
        return;
      }

      const script = document.createElement("script");

      script.src = src;
      script.async = true;
      script.dataset.rockzSource = marker;

      script.addEventListener("load", () => {
        script.dataset.loaded = "true";
        resolve();
      }, { once: true });

      script.addEventListener("error", () => {
        script.remove();
        reject(new Error(`could not load proxy asset: ${src}`));
      }, { once: true });

      document.head.appendChild(script);
    });
  }

  async function getUVConfig() {
    const engine = ENGINES.ultraviolet;

    if (
      window.__uv$config &&
      typeof window.__uv$config.encodeUrl === "function" &&
      typeof window.__uv$config.prefix === "string"
    ) {
      return window.__uv$config;
    }

    if (!uvConfigPromise) {
      uvConfigPromise = (async () => {
        await loadScript(
          `${engine.origin}/uv/uv.bundle.js`,
          "uv-bundle"
        );

        await loadScript(
          `${engine.origin}/uv/uv.config.js`,
          "uv-config"
        );

        const config = window.__uv$config;

        if (
          !config ||
          typeof config.encodeUrl !== "function" ||
          typeof config.prefix !== "string"
        ) {
          throw new Error(
            "ultraviolet did not expose a valid configuration. " +
            "check the deployed UV asset paths."
          );
        }

        return config;
      })().catch(error => {
        uvConfigPromise = null;
        throw error;
      });
    }

    return uvConfigPromise;
  }

  function normalizePrefix(prefix) {
    let result = String(prefix || "");

    if (!result.startsWith("/")) {
      result = `/${result}`;
    }

    if (!result.endsWith("/")) {
      result += "/";
    }

    return result;
  }

  async function encode(value, requestedEngine = getEngine()) {
    const engineId = normalizeEngine(requestedEngine);
    const engine = ENGINES[engineId];
    const target = resolveTarget(value);

    let proxyUrl;

    if (engineId === "ultraviolet") {
      const config = await getUVConfig();
      const encoded = config.encodeUrl(target);

      if (typeof encoded !== "string" || !encoded) {
        throw new Error("ultraviolet could not encode this address");
      }

      const prefix = normalizePrefix(config.prefix);

      proxyUrl = new URL(
        `${prefix}${encoded}`,
        engine.origin
      ).href;
      
    } else {
      const encoded = encodeURIComponent(target);

      proxyUrl = new URL(
        `${engine.prefix}${encoded}`,
        engine.origin
      ).href;
    }

    return Object.freeze({
      engine: engineId,
      target,
      proxyUrl
    });
  }

  window.RockzRequest = Object.freeze({
    engines: ENGINES,
    settingsKey: SETTINGS_KEY,
    getEngine,
    setEngine,
    getEngineConfig,
    normalizeEngine,
    resolveTarget,
    encode
  });
})();
