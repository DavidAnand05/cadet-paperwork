/* Paperwork checker: reads an uploaded memorandum or form in the browser and
   lists Tongue and Quill (DAFH 33-337) corrections and suggestions.
   Nothing is uploaded; the file stays on the device. */
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const MON = MONTHS.map(m => m.slice(0, 3));

  /* ---------- Rules ---------- */
  const CONTRACTIONS = {
    "can't": "cannot", "won't": "will not", "don't": "do not", "doesn't": "does not", "didn't": "did not", "isn't": "is not",
    "aren't": "are not", "wasn't": "was not", "weren't": "were not", "haven't": "have not", "hasn't": "has not", "hadn't": "had not",
    "couldn't": "could not", "shouldn't": "should not", "wouldn't": "would not", "i'm": "I am", "i've": "I have", "i'll": "I will",
    "i'd": "I would", "it's": "it is", "that's": "that is", "there's": "there is", "we're": "we are", "we've": "we have",
    "we'll": "we will", "you're": "you are", "you'll": "you will", "they're": "they are", "let's": "let us"
  };
  const WORDY = [
    [/\bin order to\b/i, "to"], [/\bdue to the fact that\b/i, "because"], [/\bat this point in time\b/i, "now"],
    [/\butiliz(e|es|ed|ing|ation)\b/i, "use"], [/\bprior to\b/i, "before"], [/\bsubsequent to\b/i, "after"],
    [/\bin the event that\b/i, "if"], [/\bfor the purpose of\b/i, "to or for"], [/\b(with|in) regard(s)? to\b/i, "about"],
    [/\bis able to\b/i, "can"], [/\bplease be advised that\b/i, "nothing; start with the point"],
    [/\bit is requested that\b/i, "I request that"], [/\bit is recommended that\b/i, "I recommend that"]
  ];
  const PASSIVE = /\b(am|is|are|was|were|be|been|being)\s+(\w+ed|given|taken|made|done|seen|known|written|sent|held|told|found|brought|kept|paid|shown|chosen|built|caught|put|read)\b/i;
  const SMALL = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or", "the", "to", "via", "with", "from", "into", "nor"]);
  const KNOWN = new Set(["USAF", "USSF", "USAFA", "TAPS", "MEMORANDUM", "FOR", "FROM", "SUBJECT", "RECORD", "APPROVED", "DISAPPROVED",
    "ALL", "REVIEWING", "AUTHORITIES", "DEPARTMENT", "THE", "AIR", "FORCE", "UNITED", "STATES", "ACADEMY", "CADET", "WING",
    "SQUADRON", "PDF", "USA", "USN", "USMC", "USCG", "AM", "PM", "NA", "ID", "OK", "TBD", "OF"]);

  const longDate = (d, m, y) => d + " " + MONTHS[m - 1] + " " + y;
  const fullYear = y => (y.length === 2 ? "20" + y : y);

  /* Each finding: { lvl: "bad" | "warn", msg, where, match, context, fix } */
  function checkText(units, opts) {
    const out = [];
    const add = (lvl, msg, u, m, fix) => out.push({ lvl, msg, where: u.where, match: m ? m[0] : "", context: m ? ctx(u.text, m.index, m[0].length) : "", fix });
    const all = units.map(u => u.text).join("\n");
    const defined = new Set((all.match(/\(([A-Z][A-Za-z0-9&/-]*[A-Z])\)/g) || []).map(a => a.slice(1, -1)));
    const seenAcr = new Set();
    let serial = 0, open = 0, serialUnit = null, serialMatch = null;

    units.forEach(u => {
      const t = u.text;
      if (!t.trim()) return;
      const caps = (t.match(/[A-Z]/g) || []).length / Math.max(1, (t.match(/[A-Za-z]/g) || []).length);
      const isDateField = /\bdate\b/i.test(u.where);

      // Personal information
      let m;
      if ((m = /\b\d{3}-\d{2}-\d{4}\b/.exec(t))) add("bad", "This looks like a Social Security number. Remove it.", u, m, "Delete the number or write a dash.");
      if ((m = /\b\d{10}\b/.exec(t))) add("warn", "If this is a DoD ID number, remove it unless the form requires it.", u, m);

      // Placeholders left from a template
      const ph = /\[[^\]]{1,60}\]|\{\{[^}]{1,60}\}\}|\b(Firstname|FIRSTNAME|Lastname|LASTNAME|FIRST M\. LAST|DDMONYYYY|DD Mmm YY|XXXX?)\b|\((Date|Name of [^)]{1,40}|Insert [^)]{1,60}|Duty Title|phone number|email address|[^)]{0,40}if military[^)]{0,10})\)/;
      if ((m = ph.exec(t))) add("bad", "Template placeholder still in the document.", u, m, "Replace it with the real information.");

      // memo
      if ((m = /\bmemos?\b/i.exec(t))) add("bad", "Write \"memorandum,\" not \"memo.\"", u, m, m[0].toLowerCase().endsWith("s") ? "memorandums" : "memorandum");

      // Contractions
      const cre = /\b[A-Za-z]+['’](t|m|ve|ll|d|s|re)\b/g;
      while ((m = cre.exec(t))) {
        const key = m[0].toLowerCase().replace("’", "'");
        if (CONTRACTIONS[key]) add("bad", "Official writing avoids contractions.", u, m, CONTRACTIONS[key]);
      }

      // Dates: day, month and year
      if (!isDateField || opts.memo) {
        const dre = [
          [/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/, x => longDate(+x[2], +x[1], fullYear(x[3]))],
          [/\b(20\d\d)-(\d\d)-(\d\d)\b/, x => longDate(+x[3], +x[2], x[1])],
          [new RegExp("\\b(" + MONTHS.join("|") + "|" + MON.join("|") + ")\\.? (\\d{1,2})(st|nd|rd|th)?,? (\\d{4})\\b"), x => longDate(+x[2], MON.indexOf(x[1].slice(0, 3)) + 1, x[4])],
          [new RegExp("\\b(\\d{1,2})(st|nd|rd|th) (of )?(" + MONTHS.join("|") + ")\\b"), x => x[1] + " " + x[4]]
        ];
        dre.forEach(([re, fix]) => { const x = re.exec(t); if (x) add("bad", "Write dates as day, month and year.", u, x, fix(x)); });
      }

      // Wordy phrases
      WORDY.forEach(([re, fix]) => { const x = re.exec(t); if (x) add("warn", "Use plain words.", u, x, fix); });

      // Passive voice
      if (caps < 0.6 && (m = PASSIVE.exec(t))) add("warn", "Possible passive voice. Say who does the action, such as \"I request\" instead of \"it is requested.\"", u, m);

      // Long sentences
      if (caps < 0.6) t.split(/(?<=[.?!])\s+/).forEach(s => {
        const n = s.split(/\s+/).filter(Boolean).length;
        if (n > 35) { const i = t.indexOf(s); add("warn", "Long sentence (" + n + " words). Split it into two or more.", u, { 0: s.slice(0, 60) + "...", index: i }); }
      });

      // Exclamation points
      if (caps < 0.6 && (m = /!/.exec(t))) add("warn", "Avoid exclamation points in official writing.", u, m);

      // Acronyms: spell out on first use
      if (caps < 0.6) {
        const are = /\b[A-Z][A-Z&]{1,}[A-Z0-9]*\b/g;
        while ((m = are.exec(t))) {
          const a = m[0];
          if (a.length < 3 || KNOWN.has(a) || defined.has(a) || seenAcr.has(a) || /^(CS|C[1-4]C)/.test(a)) continue;
          // Publication and form designators, such as AFCWI 36-3501 or IMT 10, are identifiers, not acronyms to spell out.
          if (/^\s?(\d|IMT\b|Form\b)/.test(t.slice(m.index + a.length))) continue;
          seenAcr.add(a);
          add("warn", "Spell out " + a + " the first time you use it, unless every reader knows it.", u, m, "Spelled-out name (" + a + ")");
        }
      }

      // Serial comma consistency
      const sc = /\b[\w-]+, [\w-]+(?: [\w-]+){0,3}, (and|or) /.exec(t);
      if (sc) { serial++; if (!serialUnit) { serialUnit = u; serialMatch = sc; } }
      if (/\b[\w-]+, [\w-]+(?: [\w-]+){0,3} (and|or) /.test(t)) open++;
    });
    if (serial && open) add("warn", "Lists mix two comma styles. Tongue and Quill allows either, but use one: with or without a comma before the final \"and.\"", serialUnit, serialMatch);
    return out;
  }

  /* Memorandum format, Tongue and Quill Chapter 13 */
  function checkMemo(units) {
    const out = [];
    const lines = units.filter(u => u.text.trim());
    const add = (lvl, msg, u, fix) => out.push({ lvl, msg, where: u ? u.where : "Whole document", match: "", context: u ? ctx(u.text, 0, 0) : "", fix });
    const find = re => lines.find(u => re.test(u.text.trim()));
    const memoFor = find(/^MEMO(RANDUM)?\s+FOR\b/i);
    if (!memoFor) return out;
    if (/^MEMO\s+FOR/i.test(memoFor.text.trim())) add("bad", "Write MEMORANDUM FOR in full.", memoFor, "MEMORANDUM FOR");
    else if (!/^MEMORANDUM FOR/.test(memoFor.text.trim())) add("bad", "Write MEMORANDUM FOR in capital letters.", memoFor);

    const idx = lines.indexOf(memoFor);
    const dateLine = lines.slice(0, idx).reverse().find(u => /\d/.test(u.text) && u.text.trim().length < 30);
    const dateOk = d => new RegExp("^\\d{1,2} (" + MONTHS.join("|") + "|" + MON.join("|") + ") (\\d{4}|\\d{2})$").test(d.trim());
    if (!dateLine) add("warn", "Add the date above the MEMORANDUM FOR line, such as 23 November 2026.", memoFor);
    else if (!dateOk(dateLine.text)) add("bad", "Write the memorandum date as day, month and year, such as 23 November 2026.", dateLine);

    const from = find(/^FROM:/i);
    if (!from) add("bad", "Add a FROM: line with your office symbol, or your grade and name for a character letter.", memoFor);
    const subj = find(/^SUBJECT:/i);
    if (!subj) add("bad", "Add a SUBJECT: line.", memoFor);
    else {
      const words = subj.text.trim().replace(/^SUBJECT:\s*/i, "").split(/\s+/);
      const lower = words.filter((w, i) => /^[a-z]/.test(w) && (i === 0 || !SMALL.has(w.toLowerCase())));
      if (lower.length) add("bad", "Use title case in the subject. Capitalize: " + lower.join(", ") + ".", subj);
    }

    // Body paragraphs: after SUBJECT (and references) until the signature block
    const sigRe = /^\s*[A-Za-z][A-Za-z .'-]+,\s*(C[1-4]C|[A-Z][A-Za-z0-9 ]{1,9}),\s*(USAFA|USAF|USSF|USA|USN|USMC|DAF|CIV)\b/;
    const start = subj ? lines.indexOf(subj) + 1 : idx + 1;
    let end = lines.findIndex((u, i) => i >= start && sigRe.test(u.text));
    const sig = end >= 0 ? lines[end] : null;
    if (end < 0) end = lines.findIndex((u, i) => i >= start && /^(\d+\s+)?Attachments?:/i.test(u.text.trim()));
    if (end < 0) end = lines.length;
    const body = lines.slice(start, end).filter(u => !/^References?:|^\([a-z]\)\s/i.test(u.text.trim()));
    if (body.length > 1) {
      const nums = body.map(u => (/^(\d+)\.\s/.exec(u.text.trim()) || [])[1]).filter(Boolean).map(Number);
      if (!nums.length) add("bad", "Number the paragraphs (1., 2., 3.) when a memorandum has more than one.", body[0]);
      else nums.forEach((n, i) => { if (n !== i + 1) add("bad", "Paragraph numbers skip or repeat. Expected " + (i + 1) + ".", body.find(u => u.text.trim().startsWith(n + "."))); });
      const subs = body.map(u => (/^([a-z])\.\s/.exec(u.text.trim()) || [])[1]);
      subs.forEach((s, i) => {
        if (s === "a" && subs[i + 1] !== "b") add("bad", "A paragraph has only one subparagraph. Use at least two (a. and b.) or none.", body[i]);
      });
    }

    if (!sig) add("warn", "Add a signature block: FIRSTNAME M. LASTNAME, C1C, USAFA on the first line and your duty title on the second.", lines[lines.length - 1]);
    else {
      const name = sig.text.trim().split(",")[0];
      if (name !== name.toUpperCase()) add("bad", "Write the name in the signature block in capital letters.", sig, name.toUpperCase());
    }

    const att = find(/^(\d+\s+)?Attachments:/i);
    if (att && !/^\d+\s+Attachments:/i.test(att.text.trim())) {
      const n = lines.slice(lines.indexOf(att) + 1).filter(u => /^\d+\.\s/.test(u.text.trim())).length;
      add("bad", "Write the number of attachments before the word, such as \"" + (n || 2) + " Attachments:\".", att, (n || 2) + " Attachments:");
    }
    return out;
  }

  function ctx(text, i, len) {
    const a = Math.max(0, i - 40), b = Math.min(text.length, i + len + 40);
    return { before: (a > 0 ? "..." : "") + text.slice(a, i), hit: text.slice(i, i + len), after: text.slice(i + len, b) + (b < text.length ? "..." : "") };
  }

  /* ---------- Read the file ---------- */
  async function docxUnits(bytes) {
    const zip = await JSZip.loadAsync(bytes);
    const f = zip.file("word/document.xml");
    if (!f) throw new Error("this Word file has no document body.");
    const doc = new DOMParser().parseFromString(await f.async("string"), "application/xml");
    const units = []; let highlighted = [];
    Array.from(doc.getElementsByTagNameNS(W, "p")).forEach((p, i) => {
      let text = "", hl = "";
      (function walk(n) {
        Array.from(n.childNodes).forEach(c => {
          if (c.nodeType !== 1) return;
          if (c.localName === "t") {
            text += c.textContent;
            const r = c.parentNode, h = r && r.getElementsByTagNameNS(W, "highlight")[0];
            if (h && h.getAttributeNS(W, "val") !== "none") hl += c.textContent;
          } else if (c.localName === "tab") text += "\t";
          else if (c.localName === "br") text += " ";
          else if (c.localName !== "p") walk(c);
        });
      })(p);
      const u = { where: "Line " + (units.length + 1) + ": \"" + text.trim().slice(0, 40) + (text.trim().length > 40 ? "..." : "") + "\"", text: text.replace(/\t+/g, " ").replace(/\s{3,}/g, "  ") };
      units.push(u);
      if (hl.trim()) highlighted.push({ u, hl: hl.trim() });
    });
    return { units: units.filter(u => u.text.trim()), highlighted };
  }

  async function pdfUnits(bytes) {
    const K = window.FillKit;
    const { raw } = await K.pdfFields(bytes);
    const def = K.detectDef(raw);
    const label = {};
    if (def) K.buildItems(raw, def).forEach(it => { if (!it.group && it.keys) it.keys.forEach(k => { label[k] = it.label; }); });
    const seen = new Set();
    return raw.filter(r => typeof r.value === "string" && r.value.trim()).filter(r => {
      const k = (label[r.key] || r.label) + "|" + r.value; if (seen.has(k)) return false; seen.add(k); return true;
    }).map(r => ({ where: label[r.key] || r.label, text: r.value }));
  }

  /* ---------- Page ---------- */
  const status = msg => { $("#checkStatus").textContent = msg; };
  let lastReport = "";

  async function run(file) {
    $("#checkResults").hidden = true;
    status("Checking " + file.name + "...");
    try {
      const ext = file.name.toLowerCase().split(".").pop();
      const bytes = await file.arrayBuffer();
      let units, findings = [];
      if (ext === "docx") {
        const r = await docxUnits(bytes);
        units = r.units;
        const memo = units.some(u => /^MEMO(RANDUM)?\s+FOR\b/i.test(u.text.trim()));
        const format = checkMemo(units);
        // A format finding on a line (the date line, MEMO FOR) already covers the general date and "memo" rules there.
        const covered = new Set(format.map(f => f.where));
        findings = format.concat(checkText(units, { memo }).filter(f =>
          !(covered.has(f.where) && /^Write dates|^Write "memorandum,"/.test(f.msg))));
        r.highlighted.forEach(h => findings.push({ lvl: "bad", msg: "Highlighted text is still in the document. Templates highlight what you must replace.", where: h.u.where, match: h.hl, context: ctx(h.u.text, Math.max(0, h.u.text.indexOf(h.hl)), h.hl.length), fix: "Replace the text and remove the highlight." }));
      } else if (ext === "pdf") {
        units = await pdfUnits(bytes);
        if (!units.length) { status("The site found no typed text in this PDF. It reads fillable PDF forms only. Upload the Word (.docx) version of a memorandum, or a fillable PDF."); return; }
        findings = checkText(units, { memo: false });
      } else { status("Upload a Word file (.docx) or a fillable PDF (.pdf)."); return; }
      render(file.name, findings);
      status("");
    } catch (err) {
      status("The site could not read " + file.name + ": " + err.message + " If the file is password protected, remove the password and try again.");
    }
  }

  function render(name, findings) {
    const order = { bad: 0, warn: 1 };
    findings.sort((a, b) => order[a.lvl] - order[b.lvl]);
    const fix = findings.filter(f => f.lvl === "bad").length, sug = findings.length - fix;
    $("#checkSummary").textContent = name + ": " + (findings.length
      ? fix + (fix === 1 ? " correction" : " corrections") + " and " + sug + (sug === 1 ? " suggestion" : " suggestions") + "."
      : "no problems found.");
    const ul = $("#checkList"); ul.innerHTML = "";
    if (!findings.length) {
      const li = document.createElement("li"); li.className = "ok";
      li.textContent = "The checker found nothing to correct. Proofread it once more before you sign it.";
      ul.appendChild(li);
    }
    findings.forEach(f => {
      const li = document.createElement("li"); li.className = f.lvl;
      const tag = document.createElement("span"); tag.className = "finding-tag"; tag.textContent = f.lvl === "bad" ? "Correction" : "Suggestion";
      const msg = document.createElement("strong"); msg.textContent = f.msg;
      li.append(tag, msg);
      if (f.where) { const w = document.createElement("span"); w.className = "finding-where"; w.textContent = f.where; li.appendChild(w); }
      if (f.context && (f.context.hit || f.context.before)) {
        const q = document.createElement("span"); q.className = "finding-quote";
        const mk = document.createElement("mark"); mk.textContent = f.context.hit;
        q.append(document.createTextNode(f.context.before), mk, document.createTextNode(f.context.after));
        li.appendChild(q);
      }
      if (f.fix) { const s = document.createElement("span"); s.className = "finding-fix"; s.textContent = "Suggested: " + f.fix; li.appendChild(s); }
      ul.appendChild(li);
    });
    lastReport = $("#checkSummary").textContent + "\n\n" + findings.map(f =>
      (f.lvl === "bad" ? "Correction: " : "Suggestion: ") + f.msg + (f.where ? "\n  Where: " + f.where : "") + (f.match ? "\n  Text: " + f.match : "") + (f.fix ? "\n  Suggested: " + f.fix : "")).join("\n\n");
    $("#checkResults").hidden = false;
  }

  $("#checkFile").addEventListener("change", e => { if (e.target.files[0]) run(e.target.files[0]); e.target.value = ""; });
  const dz = $("#checkDrop");
  ["dragenter", "dragover"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("over"); }));
  ["dragleave", "drop"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("over"); }));
  dz.addEventListener("drop", e => { const f = e.dataTransfer.files[0]; if (f) run(f); });
  $("#checkCopy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(lastReport); $("#checkCopyStatus").textContent = "Copied."; }
    catch (e) { $("#checkCopyStatus").textContent = "Your browser blocked copying. Select the list and copy it instead."; }
  });

  window.TQCheck = { checkText, checkMemo };
})();