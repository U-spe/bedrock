(() => {
  "use strict";

  const ENGINE_URL = "https://ultraviolet-app.sp1.blitz.cloud/";

  const frame = document.getElementById("rockz-uv");
  const loading = document.getElementById("rockz-loading");
  const errorPanel = document.getElementById("rockz-frame-error");

  const reloadButton = document.getElementById("rockz-reload");
  const popoutButton = document.getElementById("rockz-popout");
  const retryButton = document.getElementById("rockz-retry");

  let loadTimer = 0;

  function showLoading() {
    loading?.classList.remove("is-hidden");

    if (errorPanel) {
      errorPanel.hidden = true;
    }

    window.clearTimeout(loadTimer);

    loadTimer = window.setTimeout(() => {
      loading?.classList.add("is-hidden");
    }, 12000);
  }

  function loadEngine() {
    showLoading();

    if (frame) {
      frame.src = ENGINE_URL;
    }
  }

  frame?.addEventListener("load", () => {
    window.clearTimeout(loadTimer);

    loading?.classList.add("is-hidden");

    if (errorPanel) {
      errorPanel.hidden = true;
    }
  });

  frame?.addEventListener("error", () => {
    window.clearTimeout(loadTimer);

    loading?.classList.add("is-hidden");

    if (errorPanel) {
      errorPanel.hidden = false;
    }
  });

  reloadButton?.addEventListener("click", loadEngine);
  retryButton?.addEventListener("click", loadEngine);

  popoutButton?.addEventListener("click", () => {
    window.open(
      ENGINE_URL,
      "_blank",
      "noopener,noreferrer"
    );
  });

  function syncBedrockTheme() {
    const settings = window.BedrockSettings;

    if (!settings || typeof settings.getAll !== "function") {
      return;
    }

    const prefs = settings.getAll();

    document.documentElement.dataset.rockzTheme =
      prefs.theme || "bedrock";

    document.documentElement.style.setProperty(
      "--rockz-user-accent",
      prefs.accent || ""
    );
  }

  function startThemeSync() {
    syncBedrockTheme();

    window.BedrockSettings?.subscribe?.(syncBedrockTheme);

    window.addEventListener("storage", (event) => {
      if (
        event.key === "bedrock.preferences.v1" ||
        event.key === "spydr_config_matrix"
      ) {
        syncBedrockTheme();
      }
    });

    window.addEventListener(
      "bedrock:settingschange",
      syncBedrockTheme
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      startThemeSync,
      { once: true }
    );
  } else {
    startThemeSync();
  }
})();
