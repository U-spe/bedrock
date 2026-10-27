(() => {
    "use strict";

    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => [...document.querySelectorAll(selector)];

    const landing = $("#landing");
    const browser = $("#browser");

    const landingInput = $("#rockz-address");
    const landingForm = $("#rockz-form");

    const browserInput = $("#browser-url");
    const browserForm = $("#rockz-browser-form");

    const frame = $("#proxy-frame");
    const loading = $("#rockz-loading");
    const errorPanel = $("#rockz-error");
    const errorMessage = $("#rockz-error-message");
    const progress = $("#browser-progress");

    const backButton = $("#backBtn");
    const forwardButton = $("#forwardBtn");
    const homeButton = $("#homeBtn");
    const reloadButton = $("#reloadBtn");
    const fullscreenButton = $("#fullscreenBtn");
    const browserHomeButton = $("#browserHomeBtn");
    const retryButton = $("#rockz-retry");

    let historyStack = [];
    let historyIndex = -1;
    let currentTarget = "";
    let navigationNumber = 0;
    let loadTimer = 0;

    function setLoading(active) {
        loading?.classList.toggle("is-hidden", !active);
        progress?.classList.toggle("active", active);

        if (active && errorPanel) {
            errorPanel.classList.add("hidden");
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
        landingInput?.focus();
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

    async function navigate(value, options = {}) {
        if (!window.RockzRequest) {
            showBrowser();
            showError("rockz's request module did not load. refresh the page and try again.");
            return;
        }

        const requestId = ++navigationNumber;

        clearTimeout(loadTimer);
        showBrowser();
        setLoading(true);

        try {
            const result = await window.RockzRequest.encode(value);

            // Ignore an older request if a newer navigation has started.
            if (requestId !== navigationNumber) return;

            currentTarget = result.target;
            updateAddress(result.target);

            if (!options.fromHistory) {
                addToHistory(result.target);
            }

console.log("[rockz] target:", result.target);
console.log("[rockz] generated proxy URL:", result.proxyUrl);

frame.src = result.proxyUrl;

            // Some network failures do not produce a useful iframe error event.
            loadTimer = window.setTimeout(() => {
                if (requestId !== navigationNumber) return;

                if (loading && !loading.classList.contains("is-hidden")) {
                    showError(
                        "the page is taking too long to respond. the ultraviolet service worker or proxy route may not be available on this browser yet."
                    );
                }
            }, 30000);
        } catch (error) {
            if (requestId !== navigationNumber) return;

            console.error("[rockz] navigation failed:", error);

            showError(
                error instanceof Error
                    ? error.message
                    : "could not prepare this proxy request"
            );
        }
    }

    function goHome() {
        navigationNumber++;
        clearTimeout(loadTimer);

        currentTarget = "";
        frame?.removeAttribute("src");

        if (landingInput) landingInput.value = "";
        if (browserInput) browserInput.value = "";

        setLoading(false);
        errorPanel?.classList.add("hidden");
        showLanding();
    }

    function goBack() {
        if (historyIndex <= 0) return;

        historyIndex--;
        updateControls();

        navigate(historyStack[historyIndex], { fromHistory: true });
    }

    function goForward() {
        if (historyIndex >= historyStack.length - 1) return;

        historyIndex++;
        updateControls();

        navigate(historyStack[historyIndex], { fromHistory: true });
    }

    function reloadPage() {
        if (!currentTarget) return;
        navigate(currentTarget, { fromHistory: true });
    }

    landingForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        navigate(landingInput?.value);
    });

    browserForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        navigate(browserInput?.value);
    });

    $$(".quick-link").forEach((button) => {
        button.addEventListener("click", () => {
            const target = button.dataset.url;
            if (target) navigate(target);
        });
    });

    backButton?.addEventListener("click", goBack);
    forwardButton?.addEventListener("click", goForward);
    homeButton?.addEventListener("click", goHome);
    browserHomeButton?.addEventListener("click", goHome);
    reloadButton?.addEventListener("click", reloadPage);
    retryButton?.addEventListener("click", reloadPage);

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
        clearTimeout(loadTimer);
        setLoading(false);
        errorPanel?.classList.add("hidden");
    });

    document.addEventListener("keydown", (event) => {
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

    updateControls();
    showLanding();

    console.info("[rockz] custom frontend initialized");
})();
