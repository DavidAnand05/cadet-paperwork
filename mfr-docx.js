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
    line("from", { text: "FROM:  " + sym + "/" + s.me.cls + " " }, seg(meName, "Firstname M. Lastname"));
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
      line("plain", { text: atts.length > 1 ? "Attachments:" : "Attachment:" });
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

  window.MFR = { buildBlocks, exportDocx, longDate, sqSymbol, pad2, personName };
})();
