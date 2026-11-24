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
  let byName = false;
  let xfaItems = [];            // { el, box, layer, w }: LiveCycle blanks and their boxes, re-measured when shown           // LiveCycle forms match boxes by field name, such as TOONE
  const keyOf = k => byName ? String(k).split("/").pop().replace(/\[\d+\]$/, "") : k;

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
    byName = false;
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

  /* Adobe LiveCycle (XFA) forms, such as the eSSS, have no ordinary page to draw. pdf.js rebuilds
     the form's layout from its LiveCycle design; it is shown read-only, with the same boxes on top. */
  function loadCss() {
    if (document.getElementById("xfaCss")) return;
    const l = document.createElement("link"); l.id = "xfaCss"; l.rel = "stylesheet"; l.href = "assets/pdfjs/xfa_layer.css";
    document.head.appendChild(l);
  }
  // designBoxes: Map of field name -> [{ page, x, y, w, h }] in points from the top left, from the form's
  // LiveCycle design. pdf.js draws the printed lines correctly but can misplace the blanks, so the boxes
  // come from the design when it is available.
  async function showXfa(bytes, designBoxes) {
    const my = ++token;
    byName = true;
    const b = body();
    b.innerHTML = '<p class="fp-empty">Drawing the form...</p>';
    try {
      loadCss();
      const pj = await lib();
      const doc = await pj.getDocument({ data: new Uint8Array(bytes.slice(0)), enableXfa: true, isEvalSupported: false }).promise;
      if (my !== token) return;
      if (!doc.isPureXfa) throw new Error("this LiveCycle form has no layout to draw");
      const frag = document.createDocumentFragment(), layers = [];
      for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n);
        const xfa = await page.getXfa();
        // Tag each blank with its field name, taken from the LiveCycle field around it.
        (function walk(node, name) {
          if (!node || typeof node !== "object") return;
          const a = node.attributes || {};
          const here = a.xfaName || name;
          if (["input", "textarea", "select"].includes(node.name)) { a["data-key"] = here; a.tabindex = -1; node.attributes = a; }
          (node.children || []).forEach(c => walk(c, here));
        })(xfa, "");
        const vp = page.getViewport({ scale: 1 });
        const outer = document.createElement("div"); outer.className = "fp-page fp-xfa";
        outer.style.aspectRatio = vp.width + " / " + vp.height;
        const layer = document.createElement("div"); layer.className = "xfaLayer";
        layer.setAttribute("aria-hidden", "true");
        layer.style.width = vp.width + "px"; layer.style.height = vp.height + "px";
        outer.appendChild(layer); frag.appendChild(outer);
        layers.push({ outer, layer, vp, xfa, doc, index: n - 1 });
      }
      if (my !== token) return;
      b.innerHTML = ""; b.appendChild(frag);
      boxesByKey = new Map(); lastActive = []; xfaItems = [];
      const link = { getDestinationHash: () => "#", getAnchorUrl: () => "#", addLinkAttributes: () => {} };
      layers.forEach(({ outer, layer, vp, xfa, doc, index }) => {
        pj.XfaLayer.render({ viewport: vp.clone({ dontFlip: true }), div: layer, xfaHtml: xfa, annotationStorage: doc.annotationStorage, linkService: link, intent: "print" });
        fitXfa(outer);
        // The drawn form is a picture: hide it from screen readers so each blank is announced once, on the left.
        layer.setAttribute("aria-hidden", "true"); layer.setAttribute("inert", "");
        layer.querySelectorAll("[aria-label]").forEach(el => el.removeAttribute("aria-label"));
        if (designBoxes) {
          outer.classList.add("fp-design");
          designBoxes.forEach((list, name) => list.forEach(d => {
            if (d.page !== index) return;
            const box = document.createElement("div"); box.className = "fp-box" + (d.h < 20 ? " fp-line" : "");
            box.style.left = d.x + "px"; box.style.top = d.y + "px"; box.style.width = d.w + "px"; box.style.height = d.h + "px";
            const t = document.createElement("span"); t.className = "fp-text"; box.appendChild(t);
            layer.appendChild(box);
            if (!boxesByKey.has(name)) boxesByKey.set(name, []);
            boxesByKey.get(name).push(box);
          }));
          return;
        }
        layer.querySelectorAll("[data-key]").forEach(el => {
          el.readOnly = true; el.disabled = true;
          const box = document.createElement("div"); box.className = "fp-box" + (el.tagName === "INPUT" ? " fp-line" : "");
          const t = document.createElement("span"); t.className = "fp-text"; box.appendChild(t);
          layer.appendChild(box);
          xfaItems.push({ el, box, layer, w: vp.width });
          const k = el.getAttribute("data-key");
          if (!boxesByKey.has(k)) boxesByKey.set(k, []);
          boxesByKey.get(k).push(box);
        });
      });
      placeXfa();
    } catch (e) {
      if (my === token) message("The site could not draw this form (" + e.message + "). You can still fill in every blank.");
    }
  }
  // Put each box over its LiveCycle blank. Hidden previews (phones) have no size yet; they are placed when opened.
  function placeXfa() {
    xfaItems.forEach(({ el, box, layer, w }) => {
      const base = layer.getBoundingClientRect();
      if (!base.width) return;
      const s = base.width / w, r = el.getBoundingClientRect();
      box.style.left = (r.left - base.left) / s + "px"; box.style.top = (r.top - base.top) / s + "px";
      box.style.width = r.width / s + "px"; box.style.height = r.height / s + "px";
    });
  }
  // Scale a LiveCycle page, laid out in points, to the width of its column.
  function fitXfa(outer) {
    const layer = outer.querySelector(".xfaLayer"); if (!layer) return;
    const w = parseFloat(layer.style.width) || 612, s = (outer.clientWidth || 600) / w;
    layer.style.transform = "scale(" + s + ")";
  }

  function focus(active, section) {
    lastActive.forEach(b => b.classList.remove("on", "in"));
    lastActive = [];
    (section || []).forEach(k => (boxesByKey.get(keyOf(k)) || []).forEach(b => { b.classList.add("in"); lastActive.push(b); }));
    const first = [];
    (active || []).forEach(k => (boxesByKey.get(keyOf(k)) || []).forEach(b => { b.classList.add("on"); lastActive.push(b); first.push(b); }));
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
    (boxesByKey.get(keyOf(key)) || []).forEach(b => {
      const t = b.querySelector(".fp-text");
      t.textContent = text || "";
      b.classList.toggle("filled", !!text);
    });
  }

  // Redraw pages after the column changes width, so text stays sharp.
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => document.querySelectorAll(".fp-page").forEach(d => {
      if (d.classList.contains("fp-xfa")) fitXfa(d);
      else d.style.setProperty("--fp-scale", String(d.clientWidth / Number(d.dataset.w || 600)));
    }) || placeXfa(), 150);
  });

  // Phones: open the form over the page, like the memorandum preview.
  function setOpen(open) {
    document.body.classList.toggle("form-preview-open", open);
    $("#formPreviewOpen").setAttribute("aria-expanded", String(open));
    if (open) {
      $("#formPreviewClose").focus();
      document.querySelectorAll(".fp-xfa").forEach(fitXfa);
      placeXfa();
      const d = document.querySelector(".fp-page");
      if (d) window.dispatchEvent(new Event("resize"));
      const on = document.querySelector(".fp-box.on");
      if (on) on.scrollIntoView({ block: "center" });
    } else $("#formPreviewOpen").focus();
  }
  $("#formPreviewOpen").addEventListener("click", () => setOpen(true));
  $("#formPreviewClose").addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", e => { if (e.key === "Escape" && document.body.classList.contains("form-preview-open")) setOpen(false); });

  window.FormPreview = { show, showXfa, message, focus, setValue };
})();
