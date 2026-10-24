
(() => {
  "use strict";

  /*
   * Uses the browser's native beforeunload confirmation.
   * The setting must be enabled in Bedrock preferences.
   * Browsers control whether the prompt is displayed.
   */

  const STORAGE_KEY = "bedrock.preferences.v1";
  const LEGACY_KEY = "spydr_config_matrix";
  const MARKER = "__bedrockAntiCloseInstalled";

  if (window[MARKER]) return;

  window[MARKER] = true;

  function isEnabled() {
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      const legacy = localStorage.getItem(LEGACY_KEY);

      const value = current
        ? JSON.parse(current)
        : legacy
          ? JSON.parse(legacy)
          : null;

      return (
        !!value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        value.antiCloseEnabled === true
      );
    } catch {
      return false;
    }
  }

  window.addEventListener("beforeunload", event => {
    if (!isEnabled()) return;

    event.preventDefault();
    event.returnValue = "";
  });
})();
