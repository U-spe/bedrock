
(() => {
  "use strict";

  const CLASSLINK_URL = "https://launchpad.classlink.com/";
  const QUICKCARD_SELECTOR = "[data-bedrock-quickcard]";
  let navigating = false;

  function isCloakPage() {
    return document.body?.dataset.bedrockCloak === "true";
  }

  function navigateToClassLink() {
    window.location.href = CLASSLINK_URL;
  }

  async function loadPage(url) {
    if (navigating) return;
    navigating = true;

    try {
      const target = new URL(url, window.location.href);

      if (target.origin !== window.location.origin) {
        window.location.href = target.href;
        return;
      }

      const response = await fetch(target.href, {
        credentials: "same-origin",
        cache: "no-cache"
      });

      if (!response.ok) {
        throw new Error(`Page request failed: ${response.status}`);
      }

      let html = await response.text();

      // Make relative CSS, image, script, and link paths resolve
      // against the page being loaded, not the unchanged address bar.
      const baseTag = `<base href="${target.href.replace(/"/g, "&quot;")}">`;

      if (/<head(?:\s[^>]*)?>/i.test(html)) {
        if (/<base(?:\s[^>]*)?>/i.test(html)) {
          html = html.replace(
            /<base(?:\s[^>]*)?>/i,
            baseTag
          );
        } else {
          html = html.replace(
            /<head(?:\s[^>]*)?>/i,
            match => `${match}\n${baseTag}`
          );
        }
      } else {
        throw new Error("The requested page has no HTML head.");
      }

      // Keep the current address bar URL. The fetched document's
      // own scripts and styles load normally when it is written.
      document.open();
      document.write(html);
      document.close();
    } catch (error) {
      console.error("[bedrock navigation]", error);
      navigating = false;
      alert("Couldn't load that bedrock page. Check that the file exists.");
    }
  }

  // Use delegated events so navigation works on every page.
  document.addEventListener("click", event => {
    const quickcard = event.target.closest(QUICKCARD_SELECTOR);

    if (quickcard) {
      event.preventDefault();
      event.stopPropagation();
      loadPage(quickcard.getAttribute("href") || "/main.html");
      return;
    }

    // On the ClassLink-style landing page, every other control
    // opens the real ClassLink website in the same tab.
    if (isCloakPage()) {
      const control = event.target.closest(
        "a, button, input, select, textarea, [role='button']"
      );

      if (control) {
        event.preventDefault();
        event.stopPropagation();
        navigateToClassLink();
      }

      return;
    }

    const link = event.target.closest("a[href]");

    if (!link) return;
    if (event.defaultPrevented) return;
    if (link.hasAttribute("download")) return;
    if (link.target && link.target !== "_self") return;

    const href = link.getAttribute("href");

    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("javascript:")
    ) {
      return;
    }

    const target = new URL(href, window.location.href);

    if (target.origin !== window.location.origin) return;

    // Keep in-page anchor links working normally.
    if (
      target.pathname === window.location.pathname &&
      target.search === window.location.search &&
      target.hash
    ) {
      return;
    }

    event.preventDefault();
    loadPage(target.href);
  }, true);

  // The cloak's search form should also redirect to ClassLink.
  document.addEventListener("submit", event => {
    if (!isCloakPage()) return;

    event.preventDefault();
    navigateToClassLink();
  }, true);
})();
