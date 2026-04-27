(function () {
  var current = document.currentScript;
  var hrefAttr = current && current.getAttribute("data-style-href");
  var hrefs = hrefAttr ? hrefAttr.split(",").filter(Boolean) : [];
  var loaded = false;
  var cleanup = [];

  function applyAll() {
    if (loaded) return;
    loaded = true;
    for (var i = 0; i < cleanup.length; i += 1) cleanup[i]();

    for (var j = 0; j < hrefs.length; j += 1) {
      var href = hrefs[j];
      if (document.querySelector('link[rel="stylesheet"][href="' + href + '"]')) continue;
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.crossOrigin = "";
      link.href = href;
      document.head.appendChild(link);
    }
  }

  function on(target, eventName, options) {
    target.addEventListener(eventName, applyAll, options);
    cleanup.push(function () {
      target.removeEventListener(eventName, applyAll, options);
    });
  }

  function afterFirstPaint(callback) {
    if (!window.requestAnimationFrame) {
      window.setTimeout(callback, 0);
      return;
    }

    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(callback);
    });
  }

  on(window, "pointerdown", { once: true, passive: true });
  on(window, "keydown", { once: true });
  on(window, "touchstart", { once: true, passive: true });

  afterFirstPaint(applyAll);

  var timer = window.setTimeout(applyAll, 4000);
  cleanup.push(function () {
    window.clearTimeout(timer);
  });
})();
