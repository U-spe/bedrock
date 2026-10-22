/* BEDROCK HOME INTERACTIONS */
const search = document.getElementById("home-search");
const cards = [...document.querySelectorAll(".quick-card")];
if (search) {
  search.addEventListener("input", () => {
    const query = search.value.trim().toLowerCase();
    cards.forEach(card => {
      const text = `${card.textContent} ${card.dataset.search || ""}`.toLowerCase();
      card.hidden = !text.includes(query);
    });
  });
  document.addEventListener("keydown", event => {
    if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
      event.preventDefault();
      search.focus();
    }
  });
}
const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();
