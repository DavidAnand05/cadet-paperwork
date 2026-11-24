/* Color theme: Auto follows the device setting; Light and Dark override it. */
(function () {
  "use strict";
  const KEY = "cadet-theme";
  const select = document.getElementById("themeSelect");
  const mq = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  let choice = "auto";
  try { choice = localStorage.getItem(KEY) || "auto"; } catch (e) { /* storage unavailable */ }

  function apply() {
    const dark = choice === "dark" || (choice === "auto" && mq && mq.matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }
  select.value = choice;
  apply();
  select.addEventListener("change", () => {
    choice = select.value;
    try { localStorage.setItem(KEY, choice); } catch (e) { /* storage unavailable */ }
    apply();
  });
  // In Auto, follow the device when it switches between light and dark.
  if (mq) {
    const onChange = () => { if (choice === "auto") apply(); };
    if (mq.addEventListener) mq.addEventListener("change", onChange); else mq.addListener(onChange);
  }
})();
