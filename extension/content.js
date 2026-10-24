// doomscroll tax: the longer you scroll a feed, the slower the page scrolls. close the tab and it resets.

const tax = {
  SITES: [
    "x.com", "twitter.com", "reddit.com", "facebook.com", "instagram.com",
    "linkedin.com", "threads.net", "threads.com", "bsky.app", "tumblr.com",
    "pinterest.com", "youtube.com", "news.ycombinator.com"
  ],

  GRACE_SECONDS: 60,   // first minute of scrolling is free
  FLOOR: 0.1,          // never slower than 10% speed

  // speed multiplier for a given number of seconds spent scrolling
  speed(seconds) {
    const over = Math.max(0, seconds - tax.GRACE_SECONDS) / 60;
    return Math.max(tax.FLOOR, 1 / (1 + over / 2)); // 3 min: 50%, 5 min: 33%, 9 min: 20%
  },

  // which listed site a hostname belongs to, or null
  site(hostname, sites = tax.SITES) {
    const host = String(hostname || "").toLowerCase().replace(/^www\./, "");
    return sites.find((d) => host === d || host.endsWith("." + d)) || null;
  },

  // wheel delta in pixels
  pixels(delta, mode, pageHeight) {
    if (mode === 1) return delta * 16;
    if (mode === 2) return delta * pageHeight;
    return delta;
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = tax;
} else if (window.top === window) {
  (() => {
    const here = tax.site(location.hostname);
    let on = true;
    let skip = [];

    const KEY = "doomscroll-tax:seconds";
    let seconds = 0;
    try { seconds = Number(sessionStorage.getItem(KEY)) || 0; } catch (e) {}
    let last = 0, saved = 0, dirty = false;
    const write = () => { try { sessionStorage.setItem(KEY, String(seconds)); } catch (e) {} };
    const tick = () => {
      dirty = true;
      const now = performance.now();
      if (last) seconds += Math.min((now - last) / 1000, 1);
      last = now;
      if (now - saved > 2000) { saved = now; write(); }
    };
    addEventListener("pagehide", () => { if (dirty) write(); });

    const taxing = () => on && here && !skip.includes(here);

    const canScroll = (el, dy) =>
      dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0;
    const scroller = (start, dy) => {
      for (let el = start; el && el.nodeType === 1; el = el.parentElement) {
        if (el === document.body || el === document.documentElement) break;
        const oy = getComputedStyle(el).overflowY;
        if ((oy === "auto" || oy === "scroll" || oy === "overlay") &&
            el.scrollHeight > el.clientHeight + 1 && canScroll(el, dy)) return el;
      }
      return document.scrollingElement || document.documentElement;
    };

    const owed = new WeakMap(); // fractional pixels carried over per element
    const move = (el, dy) => {
      const total = (owed.get(el) || 0) + dy;
      const step = Math.trunc(total);
      owed.set(el, total - step);
      if (step) el.scrollBy({ top: step, behavior: "instant" });
    };

    addEventListener("wheel", (e) => {
      if (!taxing() || e.ctrlKey || e.defaultPrevented) return;
      const dy = tax.pixels(e.deltaY, e.deltaMode, innerHeight);
      const dx = tax.pixels(e.deltaX, e.deltaMode, innerWidth);
      if (!dy || Math.abs(dx) > Math.abs(dy)) return; // leave sideways scrolling alone
      tick();
      const f = tax.speed(seconds);
      if (f >= 0.999) return;
      e.preventDefault();
      move(scroller(e.target, dy), dy * f);
    }, { capture: true, passive: false });

    const KEYS = { ArrowDown: 40, ArrowUp: -40, PageDown: 0.85, PageUp: -0.85, " ": 0.85 };
    addEventListener("keydown", (e) => {
      if (!taxing() || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!(e.key in KEYS)) return;
      const a = document.activeElement;
      if (a && a !== document.body && a !== document.documentElement) return;
      let dy = KEYS[e.key];
      if (Math.abs(dy) < 1) dy *= innerHeight;
      if (e.key === " " && e.shiftKey) dy = -dy;
      tick();
      const f = tax.speed(seconds);
      if (f >= 0.999) return;
      e.preventDefault();
      move(document.scrollingElement || document.documentElement, dy * f);
    }, { capture: true });

    try {
      const load = (s) => {
        if (s.on !== undefined) on = s.on;
        if (s.skip !== undefined) skip = s.skip || [];
      };
      chrome.storage.local.get(["on", "skip"], load);
      chrome.storage.onChanged.addListener((c, area) => {
        if (area !== "local") return;
        const next = {};
        for (const k in c) next[k] = c[k].newValue;
        load(next);
      });
    } catch (e) {}
  })();
}
