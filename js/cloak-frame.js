
(() => {
  "use strict";

  /*
   * Reuse Bedrock's existing navigation controller.
   * This avoids creating a second, competing QuickCard/iframe system.
   */

  const sourcePath = "/js/navigation.js";
  const marker = "data-bedrock-navigation-loader";

  function loadNavigationController() {
    if (document.querySelector(`script[${marker}]`)) return;

    const alreadyLoaded = [...document.scripts].some(script => {
      if (!script.src) return false;

      try {
        return new URL(script.src, location.href).pathname === sourcePath;
      } catch {
        return false;
      }
    });

    if (alreadyLoaded) return;

    const script = document.createElement("script");

    script.src = sourcePath;
    script.setAttribute(marker, "");

    script.onerror = () => {
      console.error(
        "[bedrock cloak] Failed to load /js/navigation.js"
      );
    };

    (document.head || document.documentElement).appendChild(script);
  }

  loadNavigationController();
})();
