/* Lightweight starfield inspired by Spydr's background effects */
(() => {
  const canvas = document.getElementById("stars-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  let width = 0, height = 0, stars = [];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth; height = window.innerHeight;
    canvas.width = width * dpr; canvas.height = height * dpr;
    canvas.style.width = width + "px"; canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.min(150, Math.floor(width * height / 8500)) }, () => ({
      x: Math.random() * width, y: Math.random() * height,
      r: Math.random() * 1.3 + .25, a: Math.random() * .65 + .15,
      speed: (Math.random() * .18 + .025) * (Math.random() < .5 ? -1 : 1),
      phase: Math.random() * Math.PI * 2
    }));
  }
  function draw(t = 0) {
    ctx.clearRect(0, 0, width, height);
    for (const s of stars) {
      const twinkle = reduced ? 1 : .7 + Math.sin(t * .0007 + s.phase) * .3;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(235,235,235,${s.a * twinkle})`; ctx.fill();
      if (!reduced) { s.y += s.speed; if (s.y < -2) s.y = height + 2; if (s.y > height + 2) s.y = -2; }
    }
    if (!reduced) requestAnimationFrame(draw);
  }
  resize(); draw();
  window.addEventListener("resize", () => { resize(); if (reduced) draw(); });
})();
