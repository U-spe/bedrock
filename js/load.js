/* BEDROCK INTRO LOADER — based on Spydr's original loader */
(() => {
  "use strict";
  const loader = document.getElementById("loader");
  if (!loader) return;

  loader.innerHTML = `<div id="loading-screen"><video id="loadVideo" autoplay muted playsinline preload="auto"><source src="/assets/images/load.mp4" type="video/mp4"></video></div>`;
  const loadingScreen = document.getElementById("loading-screen");
  const loadVideo = document.getElementById("loadVideo");
  let introFinished = false;

  async function launchPopup() {
    try {
      const response = await fetch("/assets/static/popup.html", { cache: "no-cache" });
      if (!response.ok) throw new Error(`Popup request failed: ${response.status}`);
      const html = await response.text();
      const container = document.createElement("div");
      container.id = "bedrock-popup-container";
      container.innerHTML = html;
      document.body.appendChild(container);

      if (!window.BedrockPopup) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "/js/disc.js";
          script.onload = resolve;
          script.onerror = () => reject(new Error("Failed to load popup controller"));
          document.body.appendChild(script);
        });
      }
      window.BedrockPopup.init();
      window.BedrockPopup.show();
    } catch (error) {
      console.error("BEDROCK: Could not launch welcome popup.", error);
    }
  }

  function finishIntro() {
    if (introFinished) return;
    introFinished = true;
    if (loadingScreen) loadingScreen.classList.add("hide");
    launchPopup();
    if (loadingScreen) {
      loadingScreen.addEventListener("transitionend", event => {
        if (event.target === loadingScreen && event.propertyName === "opacity") loadingScreen.remove();
      });
      setTimeout(() => loadingScreen.remove(), 700);
    }
  }

  loadVideo.addEventListener("ended", finishIntro);
  loadVideo.addEventListener("error", () => {
    console.warn("BEDROCK: Intro video missing or failed. Continuing to welcome popup.");
    finishIntro();
  });
  window.addEventListener("load", () => {
    setTimeout(() => { if (!introFinished) finishIntro(); }, 5000);
  });
  loadVideo.play().catch(() => finishIntro());
})();
