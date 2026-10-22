(() => {
  "use strict";

  window.SpydrPopup = {
    init() {
      const popup = document.getElementById("spydr-popup");
      const button = document.getElementById("spydr-popup-button");

      if (!popup || !button) {
        throw new Error("BEDROCK popup markup is incomplete.");
      }

      button.addEventListener("click", () => {
        popup.hidden = true;
        window.location.assign("/index.html");
      });
    },

    show() {
      const popup = document.getElementById("spydr-popup");
      if (popup) popup.hidden = false;
    }
  };
})();