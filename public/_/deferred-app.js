(function () {
  var current = document.currentScript;
  var src = current && current.getAttribute("data-app-src");
  if (!src) return;

  var loaded = false;
  var cleanup = [];

  function loadApp() {
    if (loaded) return;
    loaded = true;
    for (var i = 0; i < cleanup.length; i += 1) cleanup[i]();

    var script = document.createElement("script");
    script.type = "module";
    script.crossOrigin = "";
    script.src = src;
    document.head.appendChild(script);
  }

  function on(target, eventName, options) {
    target.addEventListener(eventName, loadApp, options);
    cleanup.push(function () {
      target.removeEventListener(eventName, loadApp, options);
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

  afterFirstPaint(loadApp);

  var timer = window.setTimeout(loadApp, 4000);
  cleanup.push(function () {
    window.clearTimeout(timer);
  });
})();
