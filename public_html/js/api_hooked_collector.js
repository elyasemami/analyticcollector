/* api_hooked_collector.js
   Sends:
     - Static    → POST /api/static
     - Perf      → POST /api/perf   (after window load)
     - Activity  → POST /api/activity  (batched)
   Robustness:
     - Local queue in localStorage
     - Retry flush every FLUSH_MS
     - sendBeacon on unload (with application/json Blob)
   Activity captured:
     - mouse move/click, scroll, keydown/up
     - errors + unhandledrejection
     - enter/leave page, idle start/end (≥ 2s)
*/

(() => {
  // ---------- Config ----------
  const API_BASE = "https://stats.eemami.dev/api";
  const STATIC_URL = API_BASE + "/static";
  const PERF_URL = API_BASE + "/perf";
  const ACT_URL = API_BASE + "/activity";

  const QKEY = "queue";
  const SKEY = "session";
  const FLUSH_MS = 5000; // periodic flush
  const MAX_BATCH = 50; // batch size to POST
  const IDLE_MS = 2000; // idle threshold

  // ---------- Session ----------
  function getSessionId() {
    let id = localStorage.getItem(SKEY);
    if (!id) {
      id =
        crypto.randomUUID?.() ||
        Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(SKEY, id);
    }
    return id;
  }
  const SID = getSessionId();
  const PAGE = location.pathname + location.search;

  // ---------- Queue (activity only) ----------
  const loadQ = () => {
    try {
      return JSON.parse(localStorage.getItem(QKEY)) || [];
    } catch {
      return [];
    }
  };
  const saveQ = (arr) => localStorage.setItem(QKEY, JSON.stringify(arr));
  const pushQ = (ev) => {
    const q = loadQ();
    q.push(ev);
    saveQ(q);
  };

  async function postJSON(url, payload, opts = { keepalive: false }) {
    const body = JSON.stringify(payload);

    // Use Beacon on unload or when keepalive requested
    if (opts.keepalive && "sendBeacon" in navigator) {
      const blob = new Blob([body], { type: "application/json" });
      return navigator.sendBeacon(url, blob);
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: !!opts.keepalive,
        credentials: "same-origin",
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function flushQueue() {
    const q = loadQ();
    if (!q.length) return;

    let i = 0;
    while (i < q.length) {
      const chunk = q.slice(i, i + MAX_BATCH);
      const ok = await postJSON(ACT_URL, chunk);
      if (!ok) break; // stop on first failure and keep remaining queued
      i += chunk.length;
    }
    if (i > 0) saveQ(q.slice(i));
  }

  // ---------- Feature detection ----------
  function detectCssAllowed() {
    try {
      const el = document.createElement("div");
      el.style.cssText = "position:absolute;left:-9999px;width:10px;";
      document.body.appendChild(el);
      const computed = getComputedStyle(el);
      document.body.removeChild(el);
      return !!computed;
    } catch {
      return false;
    }
  }

  function detectImagesAllowed(timeout = 1200) {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        let done = false;
        const timer = setTimeout(() => {
          if (!done) {
            done = true;
            resolve(false);
          }
        }, timeout);
        img.onload = () => {
          if (!done) {
            done = true;
            clearTimeout(timer);
            resolve(true);
          }
        };
        img.onerror = () => {
          if (!done) {
            done = true;
            clearTimeout(timer);
            resolve(false);
          }
        };
        // 1x1 transparent GIF data URI
        img.src = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
      } catch {
        resolve(false);
      }
    });
  }

  // ---------- Static ----------
  async function sendStatic() {
    const [imagesAllowed] = await Promise.all([detectImagesAllowed()]);
    const cssAllowed = detectCssAllowed();
    const payload = {
      sessionId: SID,
      page: PAGE,
      ts: Date.now(),
      ua: navigator.userAgent,
      language: navigator.language || null,
      cookiesEnabled: navigator.cookieEnabled,
      jsEnabled: true,
      imagesAllowed,
      cssAllowed,
      screen: {
        w: screen.width,
        h: screen.height,
        dpr: window.devicePixelRatio || 1,
      },
      window: { w: window.innerWidth, h: window.innerHeight },
      connection: navigator.connection?.effectiveType || null,
    };
    await postJSON(STATIC_URL, payload);
  }

  // ---------- Performance (send once, after load) ----------
  async function sendPerf() {
    const nav = performance.getEntriesByType("navigation")[0];
    const t = performance.timing || null;

    // Convert relative timing to absolute using timeOrigin
    const origin =
      performance.timeOrigin || (t ? t.navigationStart : Date.now());
    const relStart = nav?.startTime ?? 0;
    const relEnd = nav?.loadEventEnd ?? nav?.responseEnd ?? performance.now();

    const startedAt = nav
      ? origin + (relStart || 0)
      : (t?.navigationStart ?? null);
    const endedAt = nav ? origin + (relEnd || 0) : (t?.loadEventEnd ?? null);
    const totalLoadMs = Math.round(relEnd || performance.now());

    const payload = {
      sessionId: SID,
      page: PAGE,
      ts: Date.now(),
      startedAt,
      endedAt,
      totalLoadMs,
      navigationEntry: nav || null,
      timing: t || null,
    };
    await postJSON(PERF_URL, payload);
  }

  // ---------- Activity ----------
  const addAct = (type, extra = {}) =>
    pushQ({
      sessionId: SID,
      page: PAGE,
      ts: Date.now(),
      type,
      ...extra,
    });

  // Idle detection
  let lastTs = Date.now();
  let idleStart = null;
  function markActive() {
    const now = Date.now();
    if (idleStart && now - lastTs >= IDLE_MS) {
      addAct("idle_end", { durationMs: now - idleStart });
      idleStart = null;
    }
    lastTs = now;
  }
  setInterval(() => {
    const now = Date.now();
    if (!idleStart && now - lastTs >= IDLE_MS) {
      idleStart = now;
      addAct("idle_start", { at: now });
    }
  }, 500);

  // Mouse move (throttled)
  let lastMove = 0;
  window.addEventListener(
    "mousemove",
    (e) => {
      const t = Date.now();
      if (t - lastMove < 120) return;
      lastMove = t;
      markActive();
      addAct("move", { x: e.clientX, y: e.clientY });
    },
    { passive: true },
  );

  // Click
  window.addEventListener(
    "click",
    (e) => {
      markActive();
      addAct("click", { btn: e.button, x: e.clientX, y: e.clientY });
    },
    { passive: true },
  );

  // Scroll (throttled)
  let lastScroll = 0;
  window.addEventListener(
    "scroll",
    () => {
      const t = Date.now();
      if (t - lastScroll < 200) return;
      lastScroll = t;
      markActive();
      addAct("scroll", { x: window.scrollX, y: window.scrollY });
    },
    { passive: true },
  );

  // Keyboard
  window.addEventListener("keydown", (e) => {
    markActive();
    addAct("keydown", { key: e.key });
  });
  window.addEventListener("keyup", (e) => {
    markActive();
    addAct("keyup", { key: e.key });
  });

  // Errors
  window.addEventListener("error", (e) => {
    addAct("error", {
      msg: e.message,
      src: e.filename,
      line: e.lineno,
      col: e.colno,
    });
  });
  window.addEventListener("unhandledrejection", (e) => {
    addAct("error", {
      msg:
        (e.reason && (e.reason.message || String(e.reason))) ||
        "unhandledrejection",
    });
  });

  // Enter / Leave
  function pageEnter() {
    addAct("enter");
  }
  function pageLeave() {
    addAct("leave");
    // Best-effort final flush with beacon
    const q = loadQ();
    if (q.length) {
      postJSON(ACT_URL, q, { keepalive: true });
      saveQ([]); // optimistic clear
    }
  }
  window.addEventListener("beforeunload", pageLeave);

  // Retry when back online
  window.addEventListener(
    "online",
    () => {
      flushQueue();
    },
    { passive: true },
  );

  // ---------- Start ----------
  function start() {
    pageEnter();
    // Send static immediately
    sendStatic();

    // Send perf once, after full load (timings available)
    if (document.readyState === "complete") sendPerf();
    else window.addEventListener("load", () => sendPerf(), { once: true });

    // Periodic flush of queued activity
    setInterval(flushQueue, FLUSH_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
