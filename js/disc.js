/* BEDROCK WELCOME POPUP */
(() => {
  "use strict";
  function init() {
    const popup = document.getElementById("spydr-popup");
    const button = document.getElementById("spydr-popup-button");
    if (!popup || popup.dataset.discInitialized === "true") return;
    popup.dataset.discInitialized = "true";

    function close() {
      popup.hidden = true;
      document.body.style.overflow = "";
    }
    function enterBedrock() {
      button.disabled = true;
      button.innerHTML = 'loading bedrock <i class="ri-loader-4-line"></i>';
      window.location.href = "/index.html";
    }
    if (button) button.addEventListener("click", enterBedrock);
    popup.addEventListener("click", event => { if (event.target === popup) close(); });
    document.addEventListener("keydown", event => { if (event.key === "Escape" && !popup.hidden) close(); });
    window.BedrockPopup = { init, show() { popup.hidden = false; document.body.style.overflow = "hidden"; }, close };
  }
  window.BedrockPopup = {
    init,
    show() { init(); const popup = document.getElementById("spydr-popup"); if (popup) { popup.hidden = false; document.body.style.overflow = "hidden"; } },
    close() { const popup = document.getElementById("spydr-popup"); if (popup) { popup.hidden = true; document.body.style.overflow = ""; } }
  };
  init();
})();
