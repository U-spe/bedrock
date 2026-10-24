
/* =========================================================
   BEDROCK / GAME SYSTEM
   Source registry, game discovery, search, and player
========================================================= */

"use strict";

(() => {
  const $ = (id) => document.getElementById(id);

  const state = {
    sources: [],
    source: null,
    games: [],
    filtered: [],
    sourceRequest: 0,
    playerRequest: 0,
    loaderTimer: null,
    loaderStarted: 0,
    currentGame: null
  };

  const MIN_LOADER_TIME = 1200;
  const FALLBACK_COVER = "/assets/images/no-image.png";

  const elements = {
    grid: $("game-grid"),
    count: $("game-count"),
    results: $("results-label"),
    search: $("search"),
    sourceText: $("sourceText"),
    dropdown: $("dropdownButton"),
    menu: $("dropdownMenu"),
    view: $("game-view"),
    stage: $("game-stage"),
    frame: $("game-frame"),
    loader: $("game-loader"),
    loadingStatus: $("loading-status"),
    playerName: $("player-game-name"),
    close: $("closeGameBtn"),
    fullscreen: $("fullscreenBtn"),
    reload: $("reloadGameBtn")
  };

  /* -------------------------------------------------------
     HELPERS
  ------------------------------------------------------- */

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function absoluteURL(value, base = location.href) {
    try {
      return new URL(String(value), base).href;
    } catch {
      return "";
    }
  }

  function setStatus(message) {
    if (!elements.grid) return;

    elements.grid.innerHTML = "";

    const status = document.createElement("div");
    status.className = "grid-status";
    status.textContent = message;

    elements.grid.appendChild(status);
  }

  function getCover(game) {
    return (
      game.cover ||
      game.thumbnail ||
      game.thumb ||
      game.image ||
      game.img ||
      game.icon ||
      FALLBACK_COVER
    );
  }

  function getGameURL(game) {
    return (
      game.url ||
      game.game ||
      game.game_url ||
      game.file_name ||
      game.embed_url ||
      game.link ||
      game.src ||
      game.play ||
      ""
    );
  }

  function normalizeGame(game, index) {
    const name =
      game.name ||
      game.title ||
      game.app ||
      game.slug ||
      game.id ||
      `Game ${index + 1}`;

    return {
      ...game,
      id: game.id ?? `${name}-${index}`,
      name: String(name),
      cover: String(getCover(game)),
      url: String(getGameURL(game)),
      prx: Boolean(game.prx || game.proxy),
      lumin: Boolean(game.lumin),
      luminId: game.luminId ?? game.id
    };
  }

  function setCount(number) {
    if (elements.count) {
      elements.count.textContent = String(number).padStart(2, "0");
    }
  }

  /* -------------------------------------------------------
     SOURCE REGISTRY
     IMPORTANT: preserve the existing JSON location.
  ------------------------------------------------------- */

  async function init() {
    setStatus("Initializing Bedrock game systems...");

    try {
      const registryURL =
        "/assets/json/gzone-main.json?t=" + Date.now();

      const response = await fetch(registryURL, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`Registry returned HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("gzone-main.json must contain an array");
      }

      state.sources = data.filter(
        (source) => source && source.Name && source.File
      );

      if (!state.sources.length) {
        throw new Error("No valid game sources were found");
      }

      buildSourceMenu();

      await setSource(0);
    } catch (error) {
      console.error("[Bedrock] Initialization failed:", error);
      setStatus("Unable to initialize the game library. Check the JSON path and console.");
      setCount(0);
      if (elements.results) elements.results.textContent = "SYSTEM ERROR";
    }
  }

  function buildSourceMenu() {
    if (!elements.menu) return;

    elements.menu.innerHTML = "";

    state.sources.forEach((source, index) => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "dropdown-item";
      button.setAttribute("role", "menuitem");
      button.dataset.sourceIndex = String(index);

      const icon = document.createElement("i");
      icon.className = source.Icon || "ri-folder-line";
      icon.setAttribute("aria-hidden", "true");

      const label = document.createElement("span");
      label.textContent = source.Name;

      button.append(icon, label);

      button.addEventListener("click", () => {
        setSource(index);
      });

      elements.menu.appendChild(button);
    });
  }

  async function setSource(index) {
    const source = state.sources[index];
    if (!source) return;

    state.source = source;
    state.games = [];
    state.filtered = [];

    if (elements.sourceText) {
      elements.sourceText.textContent = source.Name;
    }

    if (elements.search) {
      elements.search.value = "";
    }

    if (elements.dropdown) {
      elements.dropdown.setAttribute("aria-expanded", "false");
    }

    elements.menu?.classList.remove("active");

    elements.menu?.querySelectorAll(".dropdown-item").forEach((item) => {
      item.classList.toggle(
        "selected",
        Number(item.dataset.sourceIndex) === index
      );
    });

    await loadGames(source);
  }

  /* -------------------------------------------------------
     GAME DATA
  ------------------------------------------------------- */

  async function loadGames(source) {
    const requestId = ++state.sourceRequest;

    setStatus(`Loading ${source.Name}...`);
    setCount(0);

    if (elements.results) {
      elements.results.textContent = "FETCHING DATA";
    }

    try {
      let rawGames = [];

      /* Lumin is a special source, not a JSON file. */
      if (source.File === "lumin") {
        rawGames = await loadLuminGames();

      } else {
        const fileURL = new URL(
          source.File,
          location.origin + "/"
        );

        fileURL.searchParams.set("t", Date.now());

        const response = await fetch(fileURL.href, {
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error(`${source.Name} returned HTTP ${response.status}`);
        }

        const data = await response.json();

        if (Array.isArray(data)) {
          rawGames = data;
        } else if (data && typeof data === "object") {
          for (const key of ["games", "items", "apps"]) {
            if (Array.isArray(data[key])) {
              rawGames = data[key];
              break;
            }
          }

          if (!rawGames.length) {
            const candidate = Object.values(data).find(Array.isArray);
            if (candidate) rawGames = candidate;
          }
        }
      }

      /* Ignore an older response if the user switched sources. */
      if (
        requestId !== state.sourceRequest ||
        state.source !== source
      ) {
        return;
      }

      state.games = rawGames.map(normalizeGame);
      state.filtered = [...state.games];

      renderGames();

      console.info(
        `[Bedrock] Loaded ${state.games.length} games from ${source.Name}`
      );
    } catch (error) {
      if (
        requestId !== state.sourceRequest ||
        state.source !== source
      ) {
        return;
      }

      console.error(`[Bedrock] Failed to load ${source.Name}:`, error);

      state.games = [];
      state.filtered = [];

      setStatus(`Could not load ${source.Name}. Check the source file path.`);
      setCount(0);

      if (elements.results) {
        elements.results.textContent = "LOAD FAILED";
      }
    }
  }

  async function loadLuminGames() {
    if (!window.Lumin) {
      throw new Error("Lumin SDK is not available");
    }

    await window.Lumin.init({
      headless: true,
      onError(error) {
        console.error("[Bedrock] Lumin error:", error);
      }
    });

    const allGames = [];
    const pageLimit = 100;
    const maxPages = 10;

    for (let page = 1; page <= maxPages; page++) {
      const result = await Promise.race([
        window.Lumin.getGames({
          page,
          limit: pageLimit
        }),
        new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error("Lumin request timed out")),
            25000
          );
        })
      ]);

      const pageGames = result?.games ||
        (Array.isArray(result) ? result : []);

      if (!pageGames.length) break;

      allGames.push(...pageGames);

      const totalPages = Number(result?.pages) || page;
      if (page >= totalPages) break;
    }

    return Promise.all(
      allGames.map(async (game) => {
        let cover = game.cover || FALLBACK_COVER;

        if (game.image_token && typeof window.Lumin.getImageUrl === "function") {
          try {
            cover = await window.Lumin.getImageUrl(game.image_token) || cover;
          } catch (error) {
            console.warn("[Bedrock] Lumin cover unavailable:", game.name);
          }
        }

        return {
          ...game,
          name: game.name || game.title || "Unknown Game",
          cover,
          url: "",
          prx: false,
          lumin: true,
          luminId: game.id
        };
      })
    );
  }

  /* -------------------------------------------------------
     RENDER THE GAME LIBRARY
  ------------------------------------------------------- */

  function renderGames() {
    if (!elements.grid) return;

    elements.grid.innerHTML = "";
    setCount(state.filtered.length);

    if (elements.results) {
      elements.results.textContent =
        `${state.filtered.length} ${state.filtered.length === 1 ? "RESULT" : "RESULTS"}`;
    }

    if (!state.filtered.length) {
      setStatus("No games found. Try another search or game source.");
      return;
    }

    const fragment = document.createDocumentFragment();

    state.filtered.forEach((game, index) => {
      const card = document.createElement("button");

      card.type = "button";
      card.className = "game-card" + (index === 0 ? " featured" : "");
      card.style.animationDelay = `${Math.min(index * 25, 350)}ms`;
      card.setAttribute("aria-label", `Play ${game.name}`);

      const art = document.createElement("div");
      art.className = "game-art";

      const image = document.createElement("img");
      image.src = absoluteURL(getCover(game)) || FALLBACK_COVER;
      image.alt = "";
      image.loading = index < 5 ? "eager" : "lazy";
      image.decoding = "async";

      image.addEventListener("error", () => {
        if (!image.dataset.fallback) {
          image.dataset.fallback = "true";
          image.src = FALLBACK_COVER;
        }
      });

      const number = document.createElement("span");
      number.className = "game-number";
      number.textContent = String(index + 1).padStart(2, "0");

      const play = document.createElement("span");
      play.className = "game-play-icon";
      play.innerHTML = '<i class="ri-play-fill" aria-hidden="true"></i>';

      art.append(image, number, play);

      const meta = document.createElement("div");
      meta.className = "game-meta";

      const copy = document.createElement("div");
      copy.className = "game-meta-copy";

      const title = document.createElement("h3");
      title.textContent = game.name;

      const subtitle = document.createElement("p");
      subtitle.textContent = index === 0
        ? "FEATURED GAME / READY TO PLAY"
        : `${state.source?.Name || "GAME LIBRARY"} / PLAY NOW`;

      copy.append(title, subtitle);

      const launch = document.createElement("span");
      launch.className = "game-launch";
      launch.innerHTML = '<i class="ri-arrow-up-right-line" aria-hidden="true"></i>';

      meta.append(copy, launch);
      card.append(art, meta);

      card.addEventListener("click", () => openGame(game));

      fragment.appendChild(card);
    });

    elements.grid.appendChild(fragment);
  }

  function searchGames() {
    const query = (elements.search?.value || "").trim().toLowerCase();

    state.filtered = state.games.filter((game) =>
      game.name.toLowerCase().includes(query)
    );

    renderGames();
  }

  /* -------------------------------------------------------
     GAME PLAYER
  ------------------------------------------------------- */

  async function resolveGameURL(game) {
    if (game.lumin && game.luminId) {
      if (!window.Lumin) {
        throw new Error("Lumin SDK is not available");
      }

      if (typeof window.Lumin.getGameUrl === "function") {
        const result = await window.Lumin.getGameUrl(game.luminId);
        if (typeof result === "string") return result;
        if (result?.url) return result.url;
      }

      if (typeof window.Lumin.loadGame === "function") {
        const result = await window.Lumin.loadGame(game.luminId);
        if (typeof result === "string") return result;
        if (result?.url) return result.url;
      }

      throw new Error("Lumin could not resolve this game's URL");
    }

    const url = getGameURL(game);

    if (!url) {
      throw new Error(`No playable URL is configured for ${game.name}`);
    }

    return absoluteURL(url);
  }

  function showPlayerLoader(message = "Establishing connection...") {
    clearTimeout(state.loaderTimer);

    state.loaderStarted = performance.now();

    if (elements.loadingStatus) {
      elements.loadingStatus.textContent = message;
    }

    elements.loader?.classList.add("active");
    elements.frame?.classList.remove("loaded");

    const progress = elements.loader?.querySelector(".loading-progress span");

    if (progress) {
      progress.style.animation = "none";
      void progress.offsetWidth;
      progress.style.animation = "";
    }
  }

  function hidePlayerLoader() {
    elements.loader?.classList.remove("active");
    elements.frame?.classList.add("loaded");
  }

  async function openGame(game) {
    const requestId = ++state.playerRequest;

    state.currentGame = game;

    elements.view?.classList.add("open");
    elements.view?.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    if (elements.playerName) {
      elements.playerName.textContent = game.name;
    }

    showPlayerLoader("Preparing " + game.name + "...");

    try {
      let url = await resolveGameURL(game);

      if (requestId !== state.playerRequest) return;

      if (!url || url === "#") {
        throw new Error("No valid game URL was returned");
      }

      if (game.prx) {
        url = absoluteURL(
          "/embed.html?url=" + encodeURIComponent(url)
        );
      }

      if (!url) {
        throw new Error("The game URL could not be resolved");
      }

      /* Keep the original Spydr loading behavior, without requiring its MP4. */
      showPlayerLoader("Launching game...");

      elements.frame.onload = () => {
        if (requestId !== state.playerRequest) return;

        const elapsed = performance.now() - state.loaderStarted;
        const remaining = Math.max(0, MIN_LOADER_TIME - elapsed);

        clearTimeout(state.loaderTimer);

        state.loaderTimer = setTimeout(() => {
          if (requestId !== state.playerRequest) return;
          hidePlayerLoader();

          if (elements.loadingStatus) {
            elements.loadingStatus.textContent = "Game ready";
          }
        }, remaining);
      };

      elements.frame.onerror = () => {
        if (requestId !== state.playerRequest) return;

        if (elements.loadingStatus) {
          elements.loadingStatus.textContent = "The game frame could not load.";
        }
      };

      elements.frame.src = url;

      document.querySelector(".dock")?.classList.add("hidden");

      console.info(`[Bedrock] Opening ${game.name}`, url);
    } catch (error) {
      if (requestId !== state.playerRequest) return;

      console.error("[Bedrock] Could not launch game:", error);

      elements.loader?.classList.add("active");

      if (elements.loadingStatus) {
        elements.loadingStatus.textContent =
          error.message || "Unable to launch this game.";
      }
    }
  }

  function closeGame() {
    ++state.playerRequest;
    clearTimeout(state.loaderTimer);

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    if (elements.frame) {
      elements.frame.onload = null;
      elements.frame.onerror = null;
      elements.frame.src = "about:blank";
      elements.frame.classList.remove("loaded");
    }

    elements.loader?.classList.remove("active");
    elements.view?.classList.remove("open");
    elements.view?.setAttribute("aria-hidden", "true");

    document.body.style.overflow = "";
    document.querySelector(".dock")?.classList.remove("hidden");

    state.currentGame = null;
  }

  async function toggleFullscreen() {
    if (!elements.view) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (elements.view.requestFullscreen) {
        await elements.view.requestFullscreen();
      } else {
        throw new Error("Fullscreen is not supported by this browser");
      }
    } catch (error) {
      console.warn("[Bedrock] Fullscreen request failed:", error);
      if (elements.loadingStatus) {
        elements.loadingStatus.textContent =
          "Fullscreen was blocked. Try the browser fullscreen controls.";
      }
    }
  }

  function updateFullscreenButton() {
    const active = document.fullscreenElement === elements.view;

    if (!elements.fullscreen) return;

    elements.fullscreen.innerHTML = active
      ? '<i class="ri-fullscreen-exit-line"></i><span>EXIT FULLSCREEN</span>'
      : '<i class="ri-fullscreen-line"></i><span>FULLSCREEN</span>';

    elements.fullscreen.setAttribute(
      "aria-label",
      active ? "Exit fullscreen" : "Enter fullscreen"
    );
  }

  function reloadGame() {
    if (!state.currentGame) return;
    openGame(state.currentGame);
  }

  /* -------------------------------------------------------
     EVENTS
  ------------------------------------------------------- */

  elements.dropdown?.addEventListener("click", () => {
    const expanded =
      elements.dropdown.getAttribute("aria-expanded") === "true";

    elements.dropdown.setAttribute("aria-expanded", String(!expanded));
    elements.menu?.classList.toggle("active", !expanded);
  });

  document.addEventListener("click", (event) => {
    if (
      !event.target.closest(".dropdown") &&
      elements.menu?.classList.contains("active")
    ) {
      elements.menu.classList.remove("active");
      elements.dropdown?.setAttribute("aria-expanded", "false");
    }
  });

  elements.search?.addEventListener("input", searchGames);
  elements.close?.addEventListener("click", closeGame);
  elements.fullscreen?.addEventListener("click", toggleFullscreen);
  elements.reload?.addEventListener("click", reloadGame);

  document.addEventListener("fullscreenchange", updateFullscreenButton);

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "/" &&
      !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName) &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      elements.search?.focus();
    }

    if (event.key === "Escape" && elements.view?.classList.contains("open")) {
      if (!document.fullscreenElement) {
        closeGame();
      }
    }
  });

  /* -------------------------------------------------------
     START
  ------------------------------------------------------- */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
