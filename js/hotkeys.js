(() => {
  "use strict";
  const isTyping = target => target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

  function openGuide() {
    let dialog = document.getElementById("br-shortcuts-dialog");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "br-shortcuts-dialog";
      dialog.setAttribute("aria-labelledby", "br-shortcuts-title");
      dialog.innerHTML = `
        <div class="br-shortcuts-content">
          <p class="br-muted">BEDROCK / KEYBOARD</p>
          <h2 id="br-shortcuts-title">Keyboard shortcuts</h2>
          <div class="br-shortcut-row"><span>Focus search</span><kbd>/</kbd></div>
          <div class="br-shortcut-row"><span>Open settings</span><kbd>Ctrl + ,</kbd></div>
          <div class="br-shortcut-row"><span>Show this guide</span><kbd>?</kbd></div>
          <div class="br-shortcut-row"><span>Close menu or guide</span><kbd>Esc</kbd></div>
          <button id="br-close-shortcuts" type="button">Close</button>
        </div>`;
      document.body.append(dialog);
      dialog.querySelector("#br-close-shortcuts").addEventListener("click", () => dialog.close());
      dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
    }
    if (!dialog.open) dialog.showModal();
  }

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      const dialog = document.getElementById("br-shortcuts-dialog");
      if (dialog?.open) dialog.close();
      const wrap = document.querySelector(".menu-trigger-wrap");
      wrap?.classList.remove("open");
      wrap?.querySelector(".dock-trigger")?.setAttribute("aria-expanded", "false");
      return;
    }
    if (isTyping(event.target) || event.altKey || event.metaKey) return;
    if (event.ctrlKey && event.key === ",") {
      event.preventDefault();
      location.href = "/settings.html";
      return;
    }
    if (event.ctrlKey || event.shiftKey) return;
    if (event.key === "/") {
      const search = document.querySelector("#dashboard-search") ||
        document.querySelector('input[type="search"]') ||
        document.querySelector('input[aria-label*="search" i]');
      if (search) { event.preventDefault(); search.focus(); }
    }
    if (event.key === "?") { event.preventDefault(); openGuide(); }
  });
})();
