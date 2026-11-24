/* Builds a Tongue and Quill official memorandum from the form state.
   buildBlocks() produces a neutral list of lines used by both the live
   preview and the .docx export, so what you see is what you download. */
(function () {
  "use strict";

  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function pad2(n) { n = String(parseInt(n, 10) || 0); return n.length < 2 ? "0" + n : n; }
  function sqSymbol(sq) { return "CS-" + pad2(sq); }
  function longDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    return d + " " + MONTHS[m - 1] + " " + y;
  }
  function shortDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    return pad2(d) + MONTHS[m - 1].slice(0, 3).toUpperCase() + y;
  }
  function personName(first, mi, last) {
    return [first, mi ? mi.replace(/\.$/, "") + "." : "", last].filter(Boolean).join(" ");
  }

  const seg = (value, placeholder) =>
    value && String(value).trim() ? { text: String(value).trim() } : { text: placeholder, ph: true };

  function buildBlocks(s) {
    const B = [];
    const blank = () => B.push({ t: "blank" });
    const line = (t, ...segs) => B.push({ t, segs });
    const sym = sqSymbol(s.me.sq);

    line("right", seg(longDate(s.date), "Date"));
    blank();

    if (s.to.kind === "record") line("plain", { text: "MEMORANDUM FOR RECORD" });
    else line("plain", { text: "MEMORANDUM FOR  " }, seg(s.to.symbol, "OFFICE/SYMBOL"));
    blank();

    const meName = personName(s.me.first, s.me.mi, s.me.last);
    // A character letter comes from a person, not an office: "FROM:  C1C Firstname M. Lastname".
    if (s.type === "character") line("from", { text: "FROM:  " + s.me.cls + " " }, seg(meName, "Firstname M. Lastname"));
    else line("from", { text: "FROM:  " + sym + "/" + s.me.cls + " " }, seg(meName, "Firstname M. Lastname"));
    blank();

    line("subject", { text: "SUBJECT:  " }, seg(s.subject, "Subject in Title Case"));
    blank();

    const refs = s.refs.map(r => r.trim()).filter(Boolean);
    if (refs.length) {
      refs.forEach((r, i) => {
        const tag = "(" + String.fromCharCode(97 + i) + ")  ";
        if (i === 0) line("plain", { text: (refs.length > 1 ? "References:  " : "Reference:  ") + tag + r });
        else line("refcont", { text: tag + r });
      });
      blank();
    }

    const paras = s.paras;
    const mains = paras.filter(p => !p.sub).length;
    const numbered = !(mains <= 1 && paras.length <= 1);
    let n = 0, sub = 0;
    paras.forEach((p, i) => {
      let tag = "";
      if (p.sub) { tag = String.fromCharCode(97 + sub) + ".  "; sub++; }
      else { n++; sub = 0; tag = numbered ? n + ".  " : ""; }
      line(p.sub ? "sub" : "plain", { text: tag }, seg(p.text, p.prompt || "Paragraph text"));
      if (i < paras.length - 1) blank();
    });

    blank(); blank(); blank(); blank();
    const sigName = personName(s.me.first, s.me.mi, s.me.last);
    line("sig", seg(sigName ? sigName.toUpperCase() + ", " + s.me.cls + ", USAFA" : "", "FIRSTNAME M. LASTNAME, " + s.me.cls + ", USAFA"));
    line("sig", { text: (s.me.title || "").trim() || "Cadet, " + sym });

    const atts = s.atts.map(a => a.trim()).filter(Boolean);
    if (atts.length) {
      blank(); blank();
      line("plain", { text: atts.length > 1 ? atts.length + " Attachments:" : "Attachment:" });
      atts.forEach((a, i) => line("plain", { text: (atts.length > 1 ? (i + 1) + ".  " : "") + a }));
    }

    if (s.approval.on) {
      const ap = s.approval;
      const apName = personName(ap.first, ap.mi, ap.last);
      blank();
      line("plain", { text: "APPROVED / DISAPPROVED" });
      blank(); blank(); blank();
      line("sig", seg(apName ? apName.toUpperCase() + ", " + ap.grade + ", " + ap.service : "", "APPROVER NAME, Grade, Service"));
      line("sig", seg(ap.title, "Duty Title"));
      line("sig", { text: "Date:  ____________________" });
    }
    return B;
  }

  /* ---------- .docx export ---------- */
  function xmlEscape(t) {
    return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function typeset(t) {
    // Curly quotes and apostrophes, and keep "CS-11" from breaking across lines.
    t = t.replace(/(^|[\s(\[{])"/g, "$1“").replace(/"/g, "”");
    t = t.replace(/(^|[\s(\[{])'/g, "$1‘").replace(/'/g, "’");
    t = xmlEscape(t);
    return t.replace(/\bCS-(\d+)/g, "CS‑$1");
  }
  function run(segment) {
    const rpr = segment.ph ? '<w:rPr><w:highlight w:val="yellow"/></w:rPr>' : "<w:rPr/>";
    return '<w:r>' + rpr + '<w:t xml:space="preserve">' + typeset(segment.text) + "</w:t></w:r>";
  }
  const PPR = {
    right: '<w:jc w:val="right"/>',
    plain: '<w:ind w:left="0" w:firstLine="0"/>',
    from: '<w:pStyle w:val="From"/>',
    subject: '<w:pStyle w:val="Subject"/>',
    refcont: '<w:ind w:left="1080"/>',
    sub: '<w:ind w:left="0" w:firstLine="360"/>',
    sig: '<w:ind w:left="5040"/>'
  };
  function blocksToXml(blocks) {
    return blocks.map(b => b.t === "blank" ? "<w:p/>" :
      "<w:p><w:pPr>" + PPR[b.t] + "</w:pPr>" + b.segs.map(run).join("") + "</w:p>").join("");
  }

  async function exportDocx(state, templateUrl, patch) {
    // Load the letterhead template. Some hosts do not serve .docx files, so fall back
    // to a base64 text copy of the same template.
    let zip;
    const res = await fetch(templateUrl).catch(() => null);
    if (res && res.ok) zip = await JSZip.loadAsync(await res.arrayBuffer());
    else {
      const alt = await fetch(templateUrl + ".b64.txt").catch(() => null);
      if (!alt || !alt.ok) throw new Error("The site could not load the letterhead template.");
      zip = await JSZip.loadAsync((await alt.text()).trim(), { base64: true });
    }

    // Body
    let doc = await zip.file("word/document.xml").async("string");
    const bs = doc.indexOf("<w:body>") + "<w:body>".length;
    const se = doc.indexOf("<w:sectPr");
    doc = doc.slice(0, bs) + blocksToXml(buildBlocks(state)) + doc.slice(se);
    zip.file("word/document.xml", doc, { createFolders: false });

    // Letterhead: squadron number and patch
    let hdr = await zip.file("word/header3.xml").async("string");
    hdr = hdr.replace('<w:t xml:space="preserve"> 11</w:t>', '<w:t xml:space="preserve"> ' + pad2(state.me.sq) + "</w:t>");
    if (patch.mode === "none") {
      const i = hdr.indexOf('r:embed="rId2"');
      if (i > -1) {
        const a = Math.max(hdr.lastIndexOf("<w:r>", i), hdr.lastIndexOf("<w:r ", i));
        const e = hdr.indexOf("</w:r>", i) + 6;
        hdr = hdr.slice(0, a) + hdr.slice(e);
      }
    } else if (patch.mode === "upload" && patch.bytes) {
      const ext = patch.type === "image/png" ? "png" : "jpeg";
      zip.remove("word/media/image2.jpeg");
      zip.file("word/media/image2." + ext, patch.bytes, { createFolders: false });
      let rels = await zip.file("word/_rels/header3.xml.rels").async("string");
      rels = rels.replace("media/image2.jpeg", "media/image2." + ext);
      zip.file("word/_rels/header3.xml.rels", rels, { createFolders: false });
    }
    zip.file("word/header3.xml", hdr, { createFolders: false });

    const blob = await zip.generateAsync({
      type: "blob", compression: "DEFLATE",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
    const last = (state.me.last || "LastName").replace(/[^A-Za-z-]/g, "");
    const name = sqSymbol(state.me.sq).replace("-", "") + "_MFR_" + last + "_" + (shortDate(state.date) || "DDMONYYYY") + ".docx";
    return { blob, name };
  }

  /* ---------- PDF export with digital signature fields ----------
     Mirrors the letterhead template: Letter size, 1-inch margins, Times 12 point,
     signature block 4.5 inches from the left edge, page numbers top right from page 2. */
  const PT = 72, PAGE_W = 8.5 * PT, PAGE_H = 11 * PT, MARGIN = PT, BODY_W = PAGE_W - 2 * MARGIN;
  const SIZE = 12, LEAD = 13.8;
  const INDENT = {   // [first-line x offset, wrapped-line x offset], in points from the left margin
    plain: [0, 0], right: [0, 0], from: [0, 43.2], subject: [0, 59.75], refcont: [54, 54], sub: [18, 0], sig: [252, 252]
  };
  const pdfSafe = t => String(t)
    .replace(/(^|[\s(\[{])"/g, "$1“").replace(/"/g, "”").replace(/(^|[\s(\[{])'/g, "$1‘").replace(/'/g, "’")
    .replace(/[‐-‒]/g, "-").replace(/[^\x20-\x7E\xA0-\xFF–—‘’“”•…€]/g, "");

  // Break one block into rows of words that fit the line. Each word keeps its placeholder flag.
  function wrapBlock(b, font) {
    const [first, rest] = INDENT[b.t] || [0, 0];
    const words = [];
    b.segs.forEach(s => {
      pdfSafe(s.text).split(/( +)/).forEach(w => { if (w) words.push({ text: w, ph: !!s.ph }); });
    });
    const rows = []; let row = [], width = 0, max = BODY_W - first;
    const push = () => { rows.push({ t: b.t, words: row }); row = []; width = 0; max = BODY_W - rest; };
    words.forEach(w => {
      const ww = font.widthOfTextAtSize(w.text, SIZE);
      if (/^ +$/.test(w.text)) { if (row.length) { row.push(w); width += ww; } return; }
      if (row.length && width + ww > max) {
        while (row.length && /^ +$/.test(row[row.length - 1].text)) row.pop();
        push();
      }
      row.push(w); width += ww;
    });
    if (row.length || !rows.length) push();
    rows.forEach((r, i) => { r.x = i === 0 ? first : rest; });
    return rows;
  }

  async function fetchBytes(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error("The site could not load " + url + ".");
    return r.arrayBuffer();
  }

  async function exportPdf(state, patch) {
    const P = window.PDFLib;
    const pdf = await P.PDFDocument.create();
    const times = await pdf.embedFont(P.StandardFonts.TimesRoman);
    const head = await pdf.embedFont(P.StandardFonts.HelveticaBold);
    const blue = P.rgb(0, 0, 0.6), black = P.rgb(0, 0, 0), yellow = P.rgb(1, 0.95, 0.69);

    // Lay out every row, remembering where each signature block starts.
    const blocks = buildBlocks(state);
    const rows = [];
    blocks.forEach(b => {
      if (b.t === "blank") rows.push({ t: "blank", words: [] });
      else wrapBlock(b, times).forEach((r, i) => { r.first = i === 0; rows.push(r); });
    });
    const sigStarts = [];
    rows.forEach((r, i) => { if (r.t === "sig" && r.first && (i === 0 || rows[i - 1].t !== "sig")) sigStarts.push(i); });

    // Keep each signature block on the same page as at least two lines of text above it.
    const keepFrom = {};
    sigStarts.forEach(s => {
      let i = s, text = 0;
      while (i > 0 && text < 2) { i--; if (rows[i].t !== "blank") text++; }
      let e = s; while (e + 1 < rows.length && rows[e + 1].t === "sig") e++;
      keepFrom[i] = e;
    });

    // Letterhead images
    const seal = await pdf.embedPng(await fetchBytes("assets/seal.png"));
    let patchImg = null;
    if (patch.mode === "default") patchImg = await pdf.embedJpg(await fetchBytes("assets/cs11-patch.jpg"));
    else if (patch.mode === "upload" && patch.bytes) patchImg = patch.type === "image/png" ? await pdf.embedPng(patch.bytes) : await pdf.embedJpg(patch.bytes);

    const pages = [];
    let page = null, y = 0;
    const newPage = () => {
      page = pdf.addPage([PAGE_W, PAGE_H]); pages.push(page);
      if (pages.length === 1) {
        // Letterhead: seal at the left margin, patch at the right margin, four centered lines.
        const top = PAGE_H - 0.5 * PT;
        page.drawImage(seal, { x: MARGIN, y: top - 15 - PT, width: PT, height: PT });
        if (patchImg) {
          const h = PT * 1.07, w = h * patchImg.width / patchImg.height;
          page.drawImage(patchImg, { x: PAGE_W - MARGIN - w, y: top - 13.5 - h, width: w, height: h });
        }
        const lines = [["DEPARTMENT OF THE AIR FORCE", 12], ["UNITED STATES AIR FORCE ACADEMY", 12], ["AIR FORCE CADET WING", 10.5], ["CADET SQUADRON " + pad2(state.me.sq), 10.5]];
        let ly = top - 12;
        lines.forEach(([t, s]) => {
          page.drawText(t, { x: (PAGE_W - head.widthOfTextAtSize(t, s)) / 2, y: ly, size: s, font: head, color: blue });
          ly -= s + 3;
        });
        y = top - 15 - PT - 0.35 * PT;
      } else {
        const n = String(pages.length);
        page.drawText(n, { x: PAGE_W - MARGIN - times.widthOfTextAtSize(n, SIZE), y: PAGE_H - 0.5 * PT - SIZE, size: SIZE, font: times, color: black });
        y = PAGE_H - MARGIN;
      }
    };
    newPage();

    const sigFields = [];
    const bottom = MARGIN;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (keepFrom[i] !== undefined && y - (keepFrom[i] - i + 1) * LEAD < bottom) newPage();
      if (y - LEAD < bottom) { newPage(); if (r.t === "blank") continue; }
      y -= LEAD;
      if (sigStarts.includes(i)) {
        // A digital signature field over the blank lines above the name: sign it in Adobe Acrobat or Reader with a CAC.
        const sx = MARGIN + INDENT.sig[0];
        const lines = sigFields.length === 0 ? 4 : 3;
        sigFields.push({ page, rect: [sx, y + SIZE, sx + 3 * PT, y + SIZE + (lines - 0.6) * LEAD] });
      }
      if (r.t === "blank" || !r.words.length) continue;
      const lineW = r.words.reduce((a, w) => a + times.widthOfTextAtSize(w.text, SIZE), 0);
      let x = r.t === "right" ? PAGE_W - MARGIN - lineW : MARGIN + r.x;
      const base = y + 3;
      // Draw each run of plain or placeholder words as one string, so the PDF text copies cleanly.
      const runs = [];
      r.words.forEach(w => { const last = runs[runs.length - 1]; if (last && last.ph === w.ph) last.text += w.text; else runs.push({ text: w.text, ph: w.ph }); });
      runs.forEach(w => {
        const ww = times.widthOfTextAtSize(w.text, SIZE);
        if (w.ph) page.drawRectangle({ x, y: base - 3, width: ww, height: LEAD - 1, color: yellow });
        page.drawText(w.text, { x, y: base, size: SIZE, font: times, color: black });
        x += ww;
      });
    }

    // Signature fields
    const acro = pdf.catalog.getOrCreateAcroForm();
    sigFields.forEach((f, i) => {
      const dict = pdf.context.obj({
        Type: "Annot", Subtype: "Widget", FT: "Sig", F: 4,
        T: P.PDFString.of(i === 0 ? "Signature of author" : "Signature of approver"),
        TU: P.PDFString.of(i === 0 ? "Sign here with your Common Access Card" : "Approver signs here"),
        Rect: f.rect, P: f.page.ref
      });
      const ref = pdf.context.register(dict);
      f.page.node.addAnnot(ref);
      acro.addField(ref);
    });

    pdf.setTitle(state.subject || "Memorandum");
    pdf.setProducer("Cadet Paperwork Builder"); pdf.setCreator("Cadet Paperwork Builder");
    const bytes = await pdf.save();
    const last = (state.me.last || "LastName").replace(/[^A-Za-z-]/g, "");
    const name = sqSymbol(state.me.sq).replace("-", "") + "_MFR_" + last + "_" + (shortDate(state.date) || "DDMONYYYY") + ".pdf";
    return { blob: new Blob([bytes], { type: "application/pdf" }), name, signatures: sigFields.length };
  }

  window.MFR = { buildBlocks, exportDocx, exportPdf, longDate, sqSymbol, pad2, personName };
})();
