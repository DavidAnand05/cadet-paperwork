/* Fill a form: reads a fillable PDF (standard or Adobe LiveCycle) or a Word template in
   the browser, lists its blanks with Tongue and Quill guidance and writes the answers back. */
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const XMLNS = "http://www.w3.org/XML/1998/namespace";
  const LIB = window.FORM_LIBRARY, DEFS = window.FORM_DEFS;
  const P = PDFLib;

  let formKey = "esss";
  let current = null;   // { kind: "acro"|"xfa"|"docx", name, bytes, items, def }
  let values = {};      // item id -> value
  let dirty = new Set(); // ids changed by the cadet or a preset; only these are written

  /* ---------- Dates and guidance ---------- */
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const now = () => new Date();
  const longDate = d => d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
  const shortDate = d => d.getDate() + " " + MONTHS[d.getMonth()].slice(0, 3) + " " + String(d.getFullYear()).slice(2);
  const isoDate = d => { const z = new Date(d); z.setMinutes(z.getMinutes() - z.getTimezoneOffset()); return z.toISOString().slice(0, 10); };

  function guidance(label) {
    const l = label.toLowerCase();
    if (/signature|signed/.test(l)) return { hint: "Leave this blank. Sign the completed form with your CAC." };
    if (/\bdate|dated\b/.test(l)) return { hint: "Write the date as day, month and year: " + longDate(now()) + ".", today: "long" };
    if (/grade|rank/.test(l)) return { hint: "Use the grade abbreviation, such as C1C, Capt, Maj or MSgt." };
    if (/symbol|organization|\borg\b|office|squadron|\bunit\b/.test(l)) return { hint: "Use capital letters for organizations and office symbols, such as CS-11/CC." };
    if (/subject/.test(l)) return { hint: "Use title case and keep it short." };
    if (/name/.test(l)) return { hint: "Match the format the form asks for, such as Last, First, MI. In a signature block, use all capital letters." };
    if (/narrative|remark|summary|discussion|comment|description|purpose|detail|justification|reason|statement|counsel/.test(l))
      return { hint: "Put the bottom line first. Use active voice, short sentences and specific facts: who, what, when and where.", long: true };
    if (/phone|dsn/.test(l)) return { hint: "Include the area code or DSN prefix." };
    return { hint: "" };
  }

  /* ---------- Choose the form ---------- */
  function renderFormChoices() {
    const box = $("#formChoices"); box.innerHTML = "";
    Object.entries(LIB).forEach(([k, F]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "choice"; b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(k === formKey));
      b.innerHTML = '<span class="dot" aria-hidden="true"></span><strong></strong>';
      b.querySelector("strong").textContent = F.name;
      b.addEventListener("click", () => { formKey = k; renderFormChoices(); });
      box.appendChild(b);
    });
    const F = LIB[formKey];
    $("#formSource").textContent = F.source;
    const lf = $("#libraryFiles"); lf.innerHTML = "";
    (F.files || []).forEach(f => {
      const b = document.createElement("button");
      b.type = "button"; b.className = (F.files.length > 1 ? "btn ghost" : "btn primary"); b.textContent = f.label;
      b.addEventListener("click", () => loadLibrary(f));
      lf.appendChild(b);
    });
    $("#uploadHeading").textContent = F.files ? "2. Or upload your own copy" : "2. Upload the blank form";
    renderOconus(!!F.oconus);
    $("#formGuide").textContent = (current && current.def && current.def.output ? current.def.output + " " : "") +
      (F.guide || "Fill each blank. Blanks left empty stay as they are in the form.");
  }

  /* ---------- OCONUS steps ---------- */
  const OSTORE = "cadet-oconus-steps-v1";
  function renderOconus(show) {
    const box = $("#oconusGuide"); box.hidden = !show;
    if (!show) return;
    let done = {};
    try { done = JSON.parse(localStorage.getItem(OSTORE)) || {}; } catch (e) { /* storage unavailable */ }
    box.innerHTML = "<h4>Steps</h4>";
    const ol = document.createElement("ol"); ol.className = "steps";
    window.OCONUS_STEPS.forEach((s, i) => {
      const li = document.createElement("li");
      const lab = document.createElement("label"); lab.className = "check";
      const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!done[i];
      cb.addEventListener("change", () => { done[i] = cb.checked; try { localStorage.setItem(OSTORE, JSON.stringify(done)); } catch (e) { /* ignore */ } });
      const span = document.createElement("span"); span.textContent = s.text;
      lab.append(cb, span); li.appendChild(lab);
      if (s.link) { const a = document.createElement("a"); a.href = s.link; a.target = "_blank"; a.rel = "noopener"; a.textContent = s.linkText; li.appendChild(a); }
      ol.appendChild(li);
    });
    box.appendChild(ol);
    const d = document.createElement("details"); d.className = "howto";
    d.innerHTML = "<summary>Routing, itinerary and driving rules</summary>";
    const ul = document.createElement("ul");
    window.OCONUS_NOTES.forEach(n => { const li = document.createElement("li"); li.textContent = n; ul.appendChild(li); });
    d.appendChild(ul); box.appendChild(d);
  }

  /* ---------- Load ---------- */
  const status = msg => { $("#fillStatus").textContent = msg; };
  $("#fillFile").addEventListener("change", e => { if (e.target.files[0]) load(e.target.files[0]); e.target.value = ""; });
  const dz = $("#dropzone");
  ["dragenter", "dragover"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("over"); }));
  ["dragleave", "drop"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("over"); }));
  dz.addEventListener("drop", e => { const f = e.dataTransfer.files[0]; if (f) load(f); });

  async function loadLibrary(f) {
    status("Loading " + f.label.replace(/^\d+\.\s*/, "") + "...");
    try {
      const res = await fetch(f.url);
      if (!res.ok) throw new Error("the server answered " + res.status + ".");
      await load({ name: f.name, arrayBuffer: () => res.arrayBuffer() }, { def: f.def, preset: f.preset });
    } catch (err) { status("The site could not load the form: " + err.message + " Reload the page and try again."); }
  }

  async function load(file, opts = {}) {
    $("#fillFieldsWrap").hidden = true;
    values = {}; dirty = new Set();
    status("Reading " + file.name + "...");
    try {
      const bytes = await file.arrayBuffer();
      const ext = file.name.toLowerCase().split(".").pop();
      let raw, kind;
      if (ext === "pdf") ({ raw, kind } = await pdfFields(bytes));
      else if (ext === "docx") { raw = await docxFields(bytes); kind = "docx"; }
      else { status("Upload a .pdf or .docx file. Save other formats as one of these first."); return; }
      if (!raw.length) {
        status(ext === "pdf"
          ? "This PDF has no fillable fields. If it is a scanned page, ask your squadron for the fillable version."
          : "This Word file has no marked blanks. Highlight each blank in yellow or type it in [square brackets], then upload it again.");
        return;
      }
      const def = opts.def ? DEFS[opts.def] : detectDef(raw);
      current = { kind, name: file.name, bytes, def, items: buildItems(raw, def) };
      prefill(raw, def, opts.preset);
      const n = current.items.filter(i => !i.group).length;
      status((def ? def.title : file.name) + ": " + n + (n === 1 ? " blank" : " blanks") + " to fill.");
      renderFields();
    } catch (err) {
      status("The site could not read " + file.name + ": " + err.message + " If the file is password protected, remove the password and try again.");
    }
  }

  function detectDef(raw) {
    const keys = new Set(raw.map(r => r.key));
    return Object.values(DEFS).find(d => d.fields.filter(f => f.keys).every(f => f.keys.every(k => keys.has(k)))) || null;
  }
  function buildItems(raw, def) {
    if (!def) return raw.map(r => Object.assign({ id: r.key, keys: [r.key] }, r));
    const used = new Set(def.fields.flatMap(f => f.keys || []));
    const rest = raw.filter(r => !used.has(r.key) && !(def.skip || []).some(rx => rx.test(r.key)));
    const items = def.fields.map(f => Object.assign({}, f));
    if (rest.length) items.push({ group: "Other fields" }, ...rest.map(r => Object.assign({ id: r.key, keys: [r.key] }, r)));
    return items;
  }
  function prefill(raw, def, preset) {
    const byKey = Object.fromEntries(raw.map(r => [r.key, r.value]));
    current.items.forEach(it => {
      if (it.group) return;
      const v = byKey[it.keys[0]];
      if (v !== undefined && v !== "" && v !== false) values[it.id] = v;
    });
    if (def && preset && def.presets && def.presets[preset]) {
      Object.assign(values, def.presets[preset]);
      Object.keys(def.presets[preset]).forEach(k => dirty.add(k));
    }
  }

  /* ---------- Render the blanks ---------- */
  function renderFields() {
    const box = $("#fillFields"); box.innerHTML = "";
    let rowBox = null, rowNum = null;
    current.items.forEach((f, i) => {
      if (f.group) {
        const h = document.createElement("h4"); h.className = "field-group"; h.textContent = f.group;
        box.appendChild(h); rowBox = null; return;
      }
      const g = guidance(f.label);
      const wrap = document.createElement("div"); wrap.className = "fill-field";
      const id = "ff" + i;
      const lab = document.createElement("label"); lab.htmlFor = id; lab.textContent = f.label;
      wrap.appendChild(lab);
      const v = values[f.id];
      let input;
      if (f.type === "check") {
        input = document.createElement("input"); input.type = "checkbox"; input.checked = !!v;
        const row = document.createElement("div"); row.className = "check";
        row.appendChild(input); row.appendChild(document.createTextNode(" Checked"));
        wrap.appendChild(row);
        input.addEventListener("change", () => { values[f.id] = input.checked; dirty.add(f.id); });
      } else if (f.type === "choice") {
        input = document.createElement("select");
        const opts = f.options.slice(); if (v && !opts.includes(v)) opts.push(v);
        ["", ...opts].forEach(o => { const op = document.createElement("option"); op.value = o; op.textContent = o || "Select"; input.appendChild(op); });
        input.value = v || "";
        wrap.appendChild(input);
        input.addEventListener("change", () => { values[f.id] = input.value; dirty.add(f.id); });
      } else if (f.type === "isodate") {
        input = document.createElement("input"); input.type = "date"; input.value = v || "";
        wrap.appendChild(input);
        input.addEventListener("input", () => { values[f.id] = input.value; dirty.add(f.id); });
      } else {
        const long = f.type === "long" || f.multiline || (!f.type && g.long);
        input = document.createElement(long ? "textarea" : "input");
        if (!long) input.type = "text";
        if (long && f.rows) input.rows = f.rows;
        input.value = v || "";
        if (f.maxLength) input.maxLength = f.maxLength;
        wrap.appendChild(input);
        input.addEventListener("input", () => { values[f.id] = input.value; dirty.add(f.id); });
        const today = f.type === "date" ? "short" : (!f.type && g.today);
        if (today) {
          const t = document.createElement("button"); t.type = "button"; t.className = "icon-btn"; t.textContent = "Insert today's date";
          t.addEventListener("click", () => { input.value = today === "short" ? shortDate(now()) : longDate(now()); values[f.id] = input.value; dirty.add(f.id); });
          wrap.appendChild(t);
        }
      }
      input.id = id;
      const hintText = [f.hint !== undefined ? f.hint : g.hint, f.count > 1 ? "This blank appears " + f.count + " times. One entry fills all of them." : ""].filter(Boolean).join(" ");
      if (hintText) { const p = document.createElement("p"); p.className = "hint"; p.textContent = hintText; wrap.appendChild(p); }
      if (f.row) {
        if (!rowBox || rowNum !== f.row) { rowBox = document.createElement("div"); rowBox.className = "route-row"; box.appendChild(rowBox); rowNum = f.row; }
        rowBox.appendChild(wrap);
      } else { rowBox = null; box.appendChild(wrap); }
    });
    renderFormChoices();
    $("#fillFieldsWrap").hidden = false;
    $("#fillDownloadStatus").textContent = "";
  }

  /* ---------- PDF: standard fields and Adobe LiveCycle (XFA) data ---------- */
  function pdfLabel(field, tuCount) {
    try {
      const tu = field.acroField.dict.lookup(P.PDFName.of("TU"));
      if (tu && tu.decodeText) { const t = tu.decodeText().trim(); if (t && tuCount[t] === 1) return t; }
    } catch (e) { /* no tooltip */ }
    return field.getName().split(".").pop().replace(/\[\d+\]/g, "").replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\s+/g, " ").trim() || field.getName();
  }
  function tooltip(field) {
    try { const tu = field.acroField.dict.lookup(P.PDFName.of("TU")); return tu && tu.decodeText ? tu.decodeText().trim() : ""; } catch (e) { return ""; }
  }
  function xfaDatasets(pdf) {
    const acro = pdf.catalog.lookup(P.PDFName.of("AcroForm"));
    if (!(acro instanceof P.PDFDict)) return null;
    const xfa = acro.lookup(P.PDFName.of("XFA"));
    if (!(xfa instanceof P.PDFArray)) return null;
    for (let i = 0; i < xfa.size(); i += 2) {
      const name = xfa.lookup(i);
      if (name && name.decodeText && name.decodeText() === "datasets") {
        const ref = xfa.get(i + 1);
        const stream = pdf.context.lookup(ref);
        const text = new TextDecoder().decode(P.decodePDFRawStream(stream).decode());
        return { ref, text };
      }
    }
    return null;
  }
  function xfaLeaves(xml) {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const data = Array.from(doc.getElementsByTagNameNS("*", "data"))[0];
    const out = [];
    if (!data) return { doc, out };
    (function walk(el, path) {
      const counts = {};
      Array.from(el.children).forEach(c => {
        const n = c.localName; const idx = counts[n] = (counts[n] === undefined ? 0 : counts[n] + 1);
        const p = path + (path ? "/" : "") + n + "[" + idx + "]";
        if (c.children.length) walk(c, p);
        else out.push({ key: p, el: c });
      });
    })(data, "");
    // Keys are reported relative to the top data group, e.g. "AF1768_unlocked/TOONE[0]".
    out.forEach(o => { o.key = o.key.replace(/^([^\[]+)\[0\]\//, "$1/"); });
    return { doc, out };
  }
  async function pdfFields(bytes) {
    const pdf = await P.PDFDocument.load(bytes, { ignoreEncryption: true });
    // Read LiveCycle data before getForm(), which strips it.
    const ds = xfaDatasets(pdf);
    let fields = [];
    try { fields = pdf.getForm().getFields(); } catch (e) { fields = []; }
    if (fields.length) {
      const tuCount = {};
      fields.forEach(f => { const t = tooltip(f); if (t) tuCount[t] = (tuCount[t] || 0) + 1; });
      const raw = [];
      fields.forEach(f => {
        const key = f.getName();
        if (f.isReadOnly && f.isReadOnly()) return;
        const label = pdfLabel(f, tuCount);
        if (f instanceof P.PDFTextField) raw.push({ key, label, type: f.isMultiline() ? "long" : undefined, value: f.getText() || "", maxLength: f.getMaxLength() });
        else if (f instanceof P.PDFCheckBox) raw.push({ key, label, type: "check", value: f.isChecked() });
        else if (f instanceof P.PDFDropdown || f instanceof P.PDFOptionList) raw.push({ key, label, type: "choice", options: f.getOptions(), value: (f.getSelected() || [])[0] || "" });
        else if (f instanceof P.PDFRadioGroup) raw.push({ key, label, type: "choice", options: f.getOptions(), value: f.getSelected() || "" });
        // Signature fields and buttons stay untouched so the form can still be signed.
      });
      return { raw, kind: "acro" };
    }
    if (!ds) return { raw: [], kind: "acro" };
    const { out } = xfaLeaves(ds.text);
    return { raw: out.map(o => ({ key: o.key, label: o.key.split("/").pop().replace(/\[\d+\]$/, "").replace(/_/g, " "), value: o.el.textContent })), kind: "xfa" };
  }
  const winAnsiSafe = t => String(t).replace(/[‐-‒]/g, "-").replace(/[^\x00-\xFF–—‘’“”•…€]/g, "");
  async function fillPdf() {
    const pdf = await P.PDFDocument.load(current.bytes, { ignoreEncryption: true });
    if (current.kind === "xfa") {
      const ds = xfaDatasets(pdf);
      const { doc, out } = xfaLeaves(ds.text);
      const byKey = Object.fromEntries(out.map(o => [o.key, o.el]));
      current.items.forEach(it => {
        if (it.group || !dirty.has(it.id)) return;
        it.keys.forEach(k => { if (byKey[k]) byKey[k].textContent = String(values[it.id]); });
      });
      let xml = new XMLSerializer().serializeToString(doc);
      pdf.context.assign(ds.ref, pdf.context.flateStream(new TextEncoder().encode(xml)));
      // Editing the data invalidates Reader usage rights, so remove them rather than leave a broken signature.
      pdf.catalog.delete(P.PDFName.of("Perms"));
      return new Blob([await pdf.save({ useObjectStreams: false })], { type: "application/pdf" });
    }
    const form = pdf.getForm();
    try { if (form.hasXFA()) form.deleteXFA(); } catch (e) { /* not XFA */ }
    current.items.forEach(it => {
      if (it.group || !dirty.has(it.id)) return;
      const v = values[it.id];
      it.keys.forEach(k => {
        try {
          const f = form.getField(k);
          if (f instanceof P.PDFTextField) f.setText(winAnsiSafe(v));
          else if (f instanceof P.PDFCheckBox) { v ? f.check() : f.uncheck(); }
          else if ((f instanceof P.PDFDropdown || f instanceof P.PDFOptionList || f instanceof P.PDFRadioGroup) && v) f.select(v);
        } catch (e) { console.warn("Could not fill " + k, e); }
      });
    });
    return new Blob([await pdf.save()], { type: "application/pdf" });
  }

  /* ---------- Word ---------- */
  const PARTS = /^word\/(document|header\d*|footer\d*)\.xml$/;
  function paraRuns(p) {
    return Array.from(p.getElementsByTagNameNS(W, "r")).filter(r => {
      let n = r.parentNode; while (n && !(n.namespaceURI === W && n.localName === "p")) n = n.parentNode; return n === p;
    });
  }
  function segments(p) {
    const segs = []; let pos = 0;
    paraRuns(p).forEach(r => {
      Array.from(r.childNodes).forEach(c => {
        if (c.namespaceURI === W && c.localName === "t") { const len = c.textContent.length; segs.push({ node: c, run: r, start: pos, end: pos + len }); pos += len; }
      });
    });
    return segs;
  }
  const isHighlighted = r => {
    const h = r.getElementsByTagNameNS(W, "highlight")[0];
    return h && h.getAttributeNS(W, "val") !== "none";
  };
  const PH = /\[([^\[\]]{1,80})\]|\{\{([^{}]{1,80})\}\}/g;
  function findInParagraph(p) {
    const segs = segments(p); if (!segs.length) return [];
    const text = segs.map(s => s.node.textContent).join("");
    const found = [];
    let group = null;
    segs.forEach(s => {
      if (isHighlighted(s.run) && s.end > s.start) {
        if (group && group.end === s.start) { group.end = s.end; group.runs.push(s.run); }
        else { group = { start: s.start, end: s.end, runs: [s.run] }; found.push(group); }
      } else if (s.end > s.start) group = null;
    });
    found.forEach(g => { g.label = text.slice(g.start, g.end).trim().replace(/^\[|\]$/g, "").replace(/^\{\{|\}\}$/g, "").trim(); g.highlight = true; });
    let m; PH.lastIndex = 0;
    while ((m = PH.exec(text))) {
      const s = m.index, e = s + m[0].length;
      if (found.some(g => g.highlight && s < g.end && e > g.start)) continue;
      found.push({ start: s, end: e, label: (m[1] || m[2]).trim(), runs: [], highlight: false });
    }
    return found.filter(f => f.label);
  }
  async function docxParts(bytes) {
    const zip = await JSZip.loadAsync(bytes);
    const parts = [];
    for (const name of Object.keys(zip.files)) {
      if (!PARTS.test(name)) continue;
      const xml = await zip.file(name).async("string");
      parts.push({ name, doc: new DOMParser().parseFromString(xml, "application/xml") });
    }
    parts.sort((a, b) => (a.name === "word/document.xml" ? -1 : b.name === "word/document.xml" ? 1 : a.name.localeCompare(b.name)));
    return { zip, parts };
  }
  const docxKey = label => label.toLowerCase().replace(/\s+/g, " ");
  async function docxFields(bytes) {
    const { parts } = await docxParts(bytes);
    const byKey = new Map();
    parts.forEach(part => {
      Array.from(part.doc.getElementsByTagNameNS(W, "p")).forEach(p => {
        findInParagraph(p).forEach(f => {
          const key = docxKey(f.label);
          if (byKey.has(key)) byKey.get(key).count++;
          else byKey.set(key, { key, label: f.label, value: "", count: 1 });
        });
      });
    });
    return Array.from(byKey.values());
  }
  function setText(node, value) { node.textContent = value; node.setAttributeNS(XMLNS, "xml:space", "preserve"); }
  function replaceRange(p, start, end, value) {
    let inserted = false;
    segments(p).forEach(s => {
      const a = Math.max(start, s.start), b = Math.min(end, s.end);
      if (a >= b) return;
      const t = s.node.textContent;
      setText(s.node, t.slice(0, a - s.start) + (inserted ? "" : value) + t.slice(b - s.start));
      inserted = true;
    });
  }
  function splitLineBreaks(doc, p) {
    Array.from(p.getElementsByTagNameNS(W, "t")).forEach(t => {
      if (!/\n/.test(t.textContent)) return;
      const lines = t.textContent.split(/\r?\n/);
      setText(t, lines[0]);
      let ref = t;
      lines.slice(1).forEach(line => {
        const br = doc.createElementNS(W, "w:br");
        const nt = doc.createElementNS(W, "w:t"); setText(nt, line);
        ref.parentNode.insertBefore(br, ref.nextSibling); br.parentNode.insertBefore(nt, br.nextSibling);
        ref = nt;
      });
    });
  }
  async function fillDocx() {
    const { zip, parts } = await docxParts(current.bytes);
    parts.forEach(part => {
      Array.from(part.doc.getElementsByTagNameNS(W, "p")).forEach(p => {
        const blanks = findInParagraph(p).sort((a, b) => b.start - a.start);
        let changed = false;
        blanks.forEach(f => {
          const v = dirty.has(docxKey(f.label)) ? values[docxKey(f.label)] : undefined;
          if (v === undefined || String(v).trim() === "") return;
          replaceRange(p, f.start, f.end, String(v));
          f.runs.forEach(r => Array.from(r.getElementsByTagNameNS(W, "highlight")).forEach(h => h.parentNode.removeChild(h)));
          changed = true;
        });
        if (changed) splitLineBreaks(part.doc, p);
      });
      let xml = new XMLSerializer().serializeToString(part.doc);
      if (!xml.startsWith("<?xml")) xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' + xml;
      zip.file(part.name, xml, { createFolders: false });
    });
    return zip.generateAsync({ type: "blob", compression: "DEFLATE", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  }

  /* ---------- Download ---------- */
  $("#fillDownload").addEventListener("click", async () => {
    const out = $("#fillDownloadStatus");
    if (!current) return;
    out.textContent = "Filling the form...";
    try {
      const blob = current.kind === "docx" ? await fillDocx() : await fillPdf();
      const ext = current.kind === "docx" ? "docx" : "pdf";
      const name = current.name.replace(/\.(pdf|docx)$/i, "") + "_completed." + ext;
      const result = await window.saveFile(blob, name);
      if (result === "declined") { out.textContent = "Download canceled."; return; }
      out.textContent = "Downloaded " + name + ". " + (current.def && current.def.output && /Acrobat/.test(current.def.output) ? "Open it in Adobe Acrobat or Reader, " : "Open it, ") + "proofread it and sign it.";
    } catch (err) {
      out.textContent = "The download failed: " + err.message + " Reload the page and try again.";
    }
  });

  renderFormChoices();
})();
