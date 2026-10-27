(() => {
  "use strict";

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const landing = $("#landing");
  const browser = $("#browser");

  const landingInput = $("#rockz-address");
  const landingForm = $("#rockz-form");

  const browserInput = $("#browser-url");
  const browserForm = $("#rockz-browser-form");

  const frame = $("#proxy-frame");
  const loading = $("#rockz-loading");
  const loadingDetail = $("#loading-detail");
  const errorPanel = $("#rockz-error");
  const errorMessage = $("#rockz-error-message");
  const progress = $("#browser-progress");

  const backButton = $("#backBtn");
  const forwardButton = $("#forwardBtn");
  const homeButton = $("#homeBtn");
  const browserHomeButton = $("#browserHomeBtn");
  const reloadButton = $("#reloadBtn");
  const fullscreenButton = $("#fullscreenBtn");
  const retryButton = $("#rockz-retry");
  const errorHomeButton = $("#rockz-error-home");

  const engineLabels = [
    $("#landing-engine"),
    $("#landing-engine-hint"),
    $("#landing-engine-version"),
    $("#browser-engine")
  ];

  let historyStack = [];
  let historyIndex = -1;
  let currentTarget = "";
  let currentProxyUrl = "";
  let currentEngine = "scramjet";
  let navigationNumber = 0;
  let loadTimer = 0;
  let disposed = false;

  const LOAD_TIMEOUT = 45000;

  function getRequestModule() {
    if (!window.RockzRequest) {
      throw new Error("rockz's request module did not load. refresh and try again.");
    }

    return window.RockzRequest;
  }

  function syncEngineLabels() {
    const request = window.RockzRequest;

    if (!request) return;

    currentEngine = request.getEngine();

    const shortName = request.getEngineConfig(currentEngine).shortLabel;

    if (engineLabels[0]) {
      engineLabels[0].textContent = currentEngine;
    }

    if (engineLabels[1]) {
      engineLabels[1].textContent = `powered by ${currentEngine}`;
    }

    if (engineLabels[2]) {
      engineLabels[2].textContent = shortName;
    }

    if (engineLabels[3]) {
      engineLabels[3].textContent = shortName;
    }
  }

  function setLoading(active, message = "preparing proxy route") {
    loading?.classList.toggle("is-hidden", !active);
    progress?.classList.toggle("active", active);

    if (loadingDetail) {
      loadingDetail.textContent = message;
    }

    if (active) {
      errorPanel?.classList.add("hidden");
    }
  }

  function showError(message) {
    if (errorMessage) {
      errorMessage.textContent = message;
    }

    errorPanel?.classList.remove("hidden");
    setLoading(false);
  }

  function showLanding() {
    browser?.classList.add("hidden");
    landing?.classList.remove("hidden");

    if (landingInput) {
      window.setTimeout(() => landingInput.focus(), 0);
    }
  }

  function showBrowser() {
    landing?.classList.add("hidden");
    browser?.classList.remove("hidden");
  }

  function updateControls() {
    if (backButton) {
      backButton.disabled = historyIndex <= 0;
    }

    if (forwardButton) {
      forwardButton.disabled = historyIndex >= historyStack.length - 1;
    }

    if (reloadButton) {
      reloadButton.disabled = !currentTarget;
    }
  }

  function updateAddress(value) {
    if (browserInput) browserInput.value = value;
    if (landingInput) landingInput.value = value;
  }

  function addToHistory(target) {
    if (historyStack[historyIndex] === target) {
      updateControls();
      return;
    }

    historyStack = historyStack.slice(0, historyIndex + 1);
    historyStack.push(target);
    historyIndex = historyStack.length - 1;

    updateControls();
  }

  function clearLoadTimer() {
    window.clearTimeout(loadTimer);
    loadTimer = 0;
  }

  async function navigate(value, options = {}) {
    let request;

    try {
      request = getRequestModule();
    } catch (error) {
      showBrowser();
      showError(error.message);
      return;
    }

    const requestId = ++navigationNumber;
    const requestedEngine = request.getEngine();

    clearLoadTimer();
    showBrowser();
    setLoading(true, `connecting through ${requestedEngine}`);

    try {
      const result = await request.encode(value, requestedEngine);

      if (disposed || requestId !== navigationNumber) return;

      currentEngine = result.engine;
      currentTarget = result.target;
      currentProxyUrl = result.proxyUrl;

      updateAddress(result.target);

      if (!options.fromHistory) {
        addToHistory(result.target);
      } else {
        updateControls();
      }

      syncEngineLabels();

      console.info("[rockz] engine:", result.engine);
      console.info("[rockz] target:", result.target);
      console.info("[rockz] proxy route:", result.proxyUrl);

      if (!frame) {
        throw new Error("the proxy frame is missing from the page");
      }

      /*
       * Keep the parent UI on the Bedrock origin.
       * Only the browser iframe navigates to the proxy route.
       */
      frame.src = result.proxyUrl;

      loadTimer = window.setTimeout(() => {
        if (disposed || requestId !== navigationNumber) return;

        if (loading && !loading.classList.contains("is-hidden")) {
          showError(
            "the proxy has not finished loading. check the selected engine, " +
            "its route, and the browser console for network errors."
          );
        }
      }, LOAD_TIMEOUT);
    } catch (error) {
      if (disposed || requestId !== navigationNumber) return;

      console.error("[rockz] navigation failed:", error);

      showError(
        error instanceof Error
          ? error.message
          : "rockz could not prepare this request"
      );
    }
  }

  function goHome() {
    navigationNumber++;
    clearLoadTimer();

    currentTarget = "";
    currentProxyUrl = "";

    if (frame) {
      frame.src = "about:blank";
    }

    if (landingInput) landingInput.value = "";
    if (browserInput) browserInput.value = "";

    errorPanel?.classList.add("hidden");
    setLoading(false);
    updateControls();
    syncEngineLabels();
    showLanding();
  }

  function goBack() {
    if (historyIndex <= 0) return;

    historyIndex--;

    const target = historyStack[historyIndex];

    updateControls();
    navigate(target, { fromHistory: true });
  }

  function goForward() {
    if (historyIndex >= historyStack.length - 1) return;

    historyIndex++;

    const target = historyStack[historyIndex];

    updateControls();
    navigate(target, { fromHistory: true });
  }

  function reloadPage() {
    if (!currentTarget) return;

    navigate(currentTarget, { fromHistory: true });
  }

  function onEngineChanged() {
    syncEngineLabels();

    /*
     * This is the settings integration point.
     * Once settings changes bedrock.proxy.engine, rockz can switch engines
     * without changing its current destination.
     */
    if (currentTarget) {
      navigate(currentTarget, { fromHistory: true });
    }
  }

  landingForm?.addEventListener("submit", event => {
    event.preventDefault();
    navigate(landingInput?.value);
  });

  browserForm?.addEventListener("submit", event => {
    event.preventDefault();
    navigate(browserInput?.value);
  });

  $$(".quick-link").forEach(button => {
    button.addEventListener("click", () => {
      const target = button.dataset.url;

      if (target) {
        navigate(target);
      }
    });
  });

  backButton?.addEventListener("click", goBack);
  forwardButton?.addEventListener("click", goForward);
  homeButton?.addEventListener("click", goHome);
  browserHomeButton?.addEventListener("click", goHome);
  reloadButton?.addEventListener("click", reloadPage);
  retryButton?.addEventListener("click", reloadPage);
  errorHomeButton?.addEventListener("click", goHome);

  fullscreenButton?.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await browser.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.warn("[rockz] fullscreen unavailable:", error);
    }
  });

  frame?.addEventListener("load", () => {
    clearLoadTimer();
    setLoading(false);
    errorPanel?.classList.add("hidden");
  });

  /*
   * Another tab can change the shared localStorage setting.
   */
  window.addEventListener("storage", event => {
    if (event.key !== window.RockzRequest?.settingsKey) return;

    const request = window.RockzRequest;

    if (!request) return;

    const nextEngine = request.normalizeEngine(event.newValue);

    if (nextEngine !== currentEngine) {
      request.setEngine(nextEngine);
      onEngineChanged();
    }
  });

  /*
   * Optional integration for a settings page or parent window.
   *
   * Send:
   * { type: "bedrock:proxy-engine", engine: "ultraviolet" }
   *
   * Or:
   * { type: "bedrock:proxy-engine", engine: "scramjet" }
   */
  window.addEventListener("message", event => {
    if (event.origin !== window.location.origin) return;

    const data = event.data;

    if (!data || data.type !== "bedrock:proxy-engine") return;

    const request = window.RockzRequest;

    if (!request) return;

    request.setEngine(data.engine);
    onEngineChanged();
  });

  window.addEventListener(
    "bedrock:proxy-engine-changed",
    onEngineChanged
  );

  document.addEventListener("keydown", event => {
    const typing = ["INPUT", "TEXTAREA"].includes(
      document.activeElement?.tagName
    );

    if (event.key === "Escape" && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "l") {
      event.preventDefault();
      showBrowser();
      browserInput?.focus();
      browserInput?.select();
    }

    if (!typing && event.altKey && event.key === "ArrowLeft") {
      event.preventDefault();
      goBack();
    }

    if (!typing && event.altKey && event.key === "ArrowRight") {
      event.preventDefault();
      goForward();
    }
  });

  window.addEventListener("pagehide", () => {
    disposed = true;
    clearLoadTimer();
  });

  syncEngineLabels();
  updateControls();
  showLanding();

  console.info("[rockz] frontend initialized");
})();
