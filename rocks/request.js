(() => {
    "use strict";

    const ENGINE_ORIGIN = "https://ultraviolet-app.sp1.blitz.cloud";

    let configPromise = null;

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const existing = [...document.scripts].find(
                (script) => script.dataset.rockzSource === src
            );

            if (existing?.dataset.loaded === "true") {
                resolve();
                return;
            }

            if (existing) {
                existing.addEventListener("load", resolve, { once: true });
                existing.addEventListener(
                    "error",
                    () => reject(new Error(`could not load ${src}`)),
                    { once: true }
                );
                return;
            }

            const script = document.createElement("script");
            script.src = src;
            script.async = true;
            script.dataset.rockzSource = src;

            script.addEventListener("load", () => {
                script.dataset.loaded = "true";
                resolve();
            }, { once: true });

            script.addEventListener("error", () => {
                script.remove();
                reject(new Error(`could not load ultraviolet asset: ${src}`));
            }, { once: true });

            document.head.appendChild(script);
        });
    }

    async function getConfig() {
        if (window.__uv$config?.encodeUrl) {
            return window.__uv$config;
        }

        if (!configPromise) {
            configPromise = (async () => {
                await loadScript(`${ENGINE_ORIGIN}/uv/uv.bundle.js`);
                await loadScript(`${ENGINE_ORIGIN}/uv/uv.config.js`);

                const config = window.__uv$config;

                if (
                    !config ||
                    typeof config.encodeUrl !== "function" ||
                    typeof config.prefix !== "string"
                ) {
                    throw new Error(
                        "ultraviolet did not expose a valid proxy configuration"
                    );
                }

                return config;
            })().catch((error) => {
                configPromise = null;
                throw error;
            });
        }

        return configPromise;
    }

    function resolveTarget(value) {
        let target = String(value || "").trim();

        if (!target) {
            throw new Error("enter a url or search term first");
        }

        if (/\s/.test(target) && !/^[a-z][a-z0-9+.-]*:\/\//i.test(target)) {
            return `https://www.google.com/search?q=${encodeURIComponent(target)}`;
        }

        if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(target)) {
            if (/^[\w-]+(\.[\w-]+)+(?::\d+)?(?:[/?#].*)?$/i.test(target)) {
                target = `https://${target}`;
            } else {
                return `https://www.google.com/search?q=${encodeURIComponent(target)}`;
            }
        }

        let parsed;

        try {
            parsed = new URL(target);
        } catch {
            throw new Error("that address is not valid");
        }

        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            throw new Error("rockz only supports http and https addresses");
        }

        return parsed.href;
    }

    async function encode(target) {
        const config = await getConfig();
        const resolved = resolveTarget(target);
        const encoded = config.encodeUrl(resolved);

        if (typeof encoded !== "string" || !encoded) {
            throw new Error("ultraviolet could not encode this address");
        }

        const prefix = config.prefix.startsWith("/")
            ? config.prefix
            : `/${config.prefix}`;

        return {
            target: resolved,
            encoded,
            proxyUrl: `${ENGINE_ORIGIN}${prefix}${encoded}`
        };
    }

    window.RockzRequest = Object.freeze({
        engineOrigin: ENGINE_ORIGIN,
        resolveTarget,
        encode
    });
})();
