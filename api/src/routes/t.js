//public/t.js - served by Nginx at https://stats.eemami.dev/t.js

(function () {
  var ENDPOINT = "https://stats.eemami.dev/api/collect";
  var SITE = document.currentScript.dataset.site || location.hostname;

  //Getting session id from browser
  function sid() {
    var s = sessionStorage.getItem("_sid");
    var last = +sessionStorage.getItem("_sid_ts") || 0;
    //we assign a uuid for each unique session_id
    if (!s || Date.now() - last > 30 * 60 * 1000) {
      s = crypto.randomUUID();
      sessionStorage.setItem("_sid", s);
    }
    sessionStorage.setItem("_sid_ts", Date.now());
    return s;
  }

  send("pageview");

  var push = history.pushState;
  history.pushState = function () {
    push.apply(this, arguments);
    send("pageview");
  };

  addEventListener("popstate", function () {
    send("pageview");
  });

  ["largest-contentful-paint", "layout-shift", "first-input"].forEach(
    function (t) {
      try {
        new PerformanceObserver(function (list) {
          list.getEntries().forEach(function (e) {
            send("perf", { metric: t, value: e.value ?? e.startTime });
          });
        }).observe({ type: t, buffered: true });
      } catch (e) {}
    },
  );

  addEventListener(
    "click",
    function (e) {
      var el = e.target.closest("[data-track]");
      if (el) send("click", { label: el.dataset.track });
    },
    true,
  );

  addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      send("unload", {
        ms: Math.round(performance.now()),
        scroll: Math.round(
          (100 * scrollY) / (document.body.scrollHeight - innerHeight || 1),
        ),
      });
    }
  });
  window._t = send;
})();
