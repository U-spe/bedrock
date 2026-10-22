(() => {
  "use strict";
  const search = document.querySelector("#site-search");
  const cards = [...document.querySelectorAll("[data-search]")];
  const noResults = document.querySelector("#no-results");
  const year = document.querySelector("#year");
  if (year) year.textContent = String(new Date().getFullYear());
  const dateLabel = document.querySelector("#today-label");
  if (dateLabel) dateLabel.textContent = `BEDROCK / ${new Date().toLocaleDateString(undefined,{month:"short",day:"2-digit"}).toUpperCase()}`;
  function filterCards() {
    const query = (search?.value || "").trim().toLowerCase(); let count = 0;
    for (const card of cards) { const visible = !query || `${card.dataset.search || ""} ${card.textContent}`.toLowerCase().includes(query); card.hidden = !visible; if (visible) count++; }
    if (noResults) noResults.hidden = count > 0;
  }
  search?.addEventListener("input", filterCards);
  document.addEventListener("keydown", event => {
    const tag = document.activeElement?.tagName; const typing = ["INPUT","TEXTAREA","SELECT"].includes(tag);
    if (event.key === "/" && !typing) { event.preventDefault(); search?.focus(); }
    if (event.key === "Escape" && document.activeElement === search && search.value) { search.value = ""; filterCards(); }
  });
  function openSettings() { const dialog = document.querySelector("#settings-dialog"); if (dialog?.showModal) dialog.showModal(); }
  document.querySelector("#mobile-settings")?.addEventListener("click", openSettings);
  document.addEventListener("click", event => { if (event.target.closest("[data-open-settings]")) openSettings(); });
})();
