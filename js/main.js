
(() => {
  "use strict";

  const time = document.getElementById("time");
  const date = document.getElementById("date");

  function updateClock() {
    const now = new Date();

    if (time) {
      time.textContent = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    }

    if (date) {
      date.textContent = now.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    }
  }

  updateClock();
  window.setInterval(updateClock, 1000);

  const canvas = document.getElementById("stars-canvas");

  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  let stars = [];
  let w = 0;
  let h = 0;
  let dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    w = window.innerWidth;
    h = window.innerHeight;

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);

    canvas.style.width = w + "px";
    canvas.style.height = h + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.min(150, Math.floor(w * h / 9000));

    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.15 + .25,
      a: Math.random() * .48 + .12,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * .012 + .003
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    for (const star of stars) {
      star.phase += star.speed;

      const alpha =
        star.a * (.72 + Math.sin(star.phase) * .28);

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);

      ctx.fillStyle = `rgba(213,235,221,${alpha})`;
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);

  resize();
  draw();
})();
