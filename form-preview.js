/* Form preview for Fill a form: draws the real PDF pages with pdf.js and lays a box over
   each blank. The blank being filled is outlined, the rest of its section is tinted and
   typed answers appear in their boxes. Everything runs in the browser. */
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let pdfjs = null, token = 0;
  let boxesByKey = new Map();   // field key -> [div]
  let lastActive = [];

  async function lib() {
    if (pdfjs) return pdfjs;
    pdfjs = await import(new URL("assets/pdfjs/pdf.min.mjs", location.href).href);
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("assets/pdfjs/pdf.worker.min.mjs", location.href).href;
    return pdfjs;
  }

  function body() { return $("#formPreview"); }
  function message(text) {
    token++;
    boxesByKey = new Map(); lastActive = [];
    const b = body(); b.innerHTML = "";
    const p = document.createElement("p"); p.className = "fp-empty"; p.textContent = text;
    b.appendChild(p);
  }

  /* boxes: Map of field key -> [{ page: index, rect: [x1, y1, x2, y2] }] in PDF units */
  async function show(bytes, boxes) {
    const my = ++token;
    const b = body();
    b.innerHTML = '<p class="fp-empty">Drawing the form...</p>';
    try {
      const pj = await lib();
      const doc = await pj.getDocument({ data: new Uint8Array(bytes.slice(0)), isEvalSupported: false }).promise;
      if (my !== token) return;
      const wrap = document.createDocumentFragment();
      const pages = [];
      for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n);
        const vp = page.getViewport({ scale: 1 });
        const div = document.createElement("div"); div.className = "fp-page";
        div.style.aspectRatio = vp.width + " / " + vp.height;
        div.dataset.w = vp.width;
        const canvas = document.createElement("canvas");
        canvas.setAttribute("aria-hidden", "true");
        div.appendChild(canvas);
        wrap.appendChild(div);
        pages.push({ page, vp, div, canvas });
      }
      if (my !== token) return;
      b.innerHTML = ""; b.appendChild(wrap);
      boxesByKey = new Map(); lastActive = [];
      boxes.forEach((list, key) => {
        list.forEach(({ page, rect }) => {
          const P = pages[page]; if (!P) return;
          const [x1, y1, x2, y2] = P.vp.convertToViewportRectangle(rect);
          const box = document.createElement("div"); box.className = "fp-box";
          box.style.left = (Math.min(x1, x2) / P.vp.width * 100) + "%";
          box.style.top = (Math.min(y1, y2) / P.vp.height * 100) + "%";
          box.style.width = (Math.abs(x2 - x1) / P.vp.width * 100) + "%";
          box.style.height = (Math.abs(y2 - y1) / P.vp.height * 100) + "%";
          const t = document.createElement("span"); t.className = "fp-text"; box.appendChild(t);
          P.div.appendChild(box);
          if (!boxesByKey.has(key)) boxesByKey.set(key, []);
          boxesByKey.get(key).push(box);
        });
      });
      // Draw each page sharp at its current width; scale the overlay text with it.
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      for (const P of pages) {
        if (my !== token) return;
        const cssW = P.div.clientWidth || 600;
        const scale = cssW * ratio / P.vp.width;
        const v = P.page.getViewport({ scale });
        P.canvas.width = Math.round(v.width); P.canvas.height = Math.round(v.height);
        P.div.style.setProperty("--fp-scale", String(cssW / P.vp.width));
        // Draw only the printed page; the boxes show the answers, so the PDF's own field widgets stay off.
        await P.page.render({ canvasContext: P.canvas.getContext("2d"), viewport: v, annotationMode: pj.AnnotationMode.DISABLE }).promise;
      }
      window.dispatchEvent(new CustomEvent("formpreview:ready"));
    } catch (e) {
      if (my === token) message("The site could not draw this form (" + e.message + "). You can still fill in every blank.");
    }
  }

  function focus(active, section) {
    lastActive.forEach(b => b.classList.remove("on", "in"));
    lastActive = [];
    (section || []).forEach(k => (boxesByKey.get(k) || []).forEach(b => { b.classList.add("in"); lastActive.push(b); }));
    const first = [];
    (active || []).forEach(k => (boxesByKey.get(k) || []).forEach(b => { b.classList.add("on"); lastActive.push(b); first.push(b); }));
    const target = first[0] || lastActive[0];
    if (!target) return;
    const sc = $(".form-preview-col .fp-scroll");
    if (!sc || !sc.offsetParent) return;
    const r = target.getBoundingClientRect(), c = sc.getBoundingClientRect();
    if (r.top < c.top + 24 || r.bottom > c.bottom - 24) {
      sc.scrollTo({ top: sc.scrollTop + r.top - c.top - c.height / 3, behavior: reduce ? "auto" : "smooth" });
    }
  }

  function setValue(key, text) {
    (boxesByKey.get(key) || []).forEach(b => {
      const t = b.querySelector(".fp-text");
      t.textContent = text || "";
      b.classList.toggle("filled", !!text);
    });
  }

  // Redraw pages after the column changes width, so text stays sharp.
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => document.querySelectorAll(".fp-page").forEach(d => d.style.setProperty("--fp-scale", String(d.clientWidth / Number(d.dataset.w || 600)))), 150);
  });

  // Phones: open the form over the page, like the memorandum preview.
  function setOpen(open) {
    document.body.classList.toggle("form-preview-open", open);
    $("#formPreviewOpen").setAttribute("aria-expanded", String(open));
    if (open) {
      $("#formPreviewClose").focus();
      const d = document.querySelector(".fp-page");
      if (d) window.dispatchEvent(new Event("resize"));
      const on = document.querySelector(".fp-box.on");
      if (on) on.scrollIntoView({ block: "center" });
    } else $("#formPreviewOpen").focus();
  }
  $("#formPreviewOpen").addEventListener("click", () => setOpen(true));
  $("#formPreviewClose").addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", e => { if (e.key === "Escape" && document.body.classList.contains("form-preview-open")) setOpen(false); });

  window.FormPreview = { show, message, focus, setValue };
})();
