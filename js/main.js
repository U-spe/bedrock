/* BEDROCK / SPYDR-STYLE CLOCK */
function updateClock() {
  const now = new Date();
  const time = document.getElementById("time");
  const date = document.getElementById("date");
  if (time) time.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  if (date) date.textContent = now.toDateString();
}
updateClock();
setInterval(updateClock, 1000);

const introLines = [
  "made for the ones who build.",
  "your space. your rules.",
  "all your stuff, one foundation.",
  "welcome to bedrock."
];
let introLineIndex = 0;
setInterval(() => {
  const line = document.getElementById("constText");
  if (!line) return;
  introLineIndex = (introLineIndex + 1) % introLines.length;
  line.textContent = introLines[introLineIndex];
}, 2400);
