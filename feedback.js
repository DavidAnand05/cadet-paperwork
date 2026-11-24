(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const cfg = window.SITE || {};
  const status = $("#fbStatus");

  if (!cfg.feedbackEmail) $("#fbEmail").hidden = true;
  if (!cfg.repo) $("#fbGithub").hidden = true;

  function compose() {
    const msg = $("#fbMessage").value.trim();
    if (!msg) { status.textContent = "Type a message first."; $("#fbMessage").focus(); return null; }
    const title = $("#fbType").value + ": " + $("#fbArea").value;
    const name = $("#fbName").value.trim();
    const body = msg + "\n\n" + (name ? "From: " + name + "\n" : "") + "Page: " + $("#fbArea").value;
    return { title, body };
  }
  $("#fbEmail").addEventListener("click", () => {
    const m = compose(); if (!m) return;
    location.href = "mailto:" + encodeURIComponent(cfg.feedbackEmail) +
      "?subject=" + encodeURIComponent("Cadet Paperwork Builder " + m.title) + "&body=" + encodeURIComponent(m.body);
    status.textContent = "Your email app opened with the message. Review it and select Send.";
  });
  $("#fbGithub").addEventListener("click", () => {
    const m = compose(); if (!m) return;
    const url = "https://github.com/" + cfg.repo + "/issues/new?title=" + encodeURIComponent(m.title) + "&body=" + encodeURIComponent(m.body);
    window.open(url, "_blank", "noopener");
    status.textContent = "GitHub opened in a new tab. Sign in, review the message and select Submit new issue.";
  });
})();
