(function () {
  "use strict";
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const STORE = "cadet-mfr-builder-v1";

  /* ---------- What the memo is for ---------- */
  const TYPES = {
    request: {
      name: "Request", desc: "Ask for approval: a pass, waiver, event or exception.",
      approval: true, to: "sqcc",
      subject: "Request for ...",
      prompts: [
        "State the request in one or two sentences: what you need approved, for whom, when and where.",
        "Give the purpose and justification. Why should the approver say yes?",
        "Cite the authority, such as the paragraph of AFCWI 36-3501 that lets this person approve it, and any limits you will stay within.",
        "Lay out the plan: sign-out, return time, transportation, the cadet in charge and how you will manage risk."
      ]
    },
    response: {
      name: "Response to a Report of Conduct", desc: "Your memorandum attached to a Form 10: accept, contest or explain.",
      approval: false, to: "sqcc",
      subject: "Response to AFCW IMT 10, Report of Conduct, Dated ...",
      refs: ["AFCW IMT 10, Report of Conduct, "],
      prompts: [
        "State what you are responding to (the Report of Conduct and its date) and summarize your position on each allegation.",
        "Address each allegation: accept responsibility, or explain why you contest it and cite the standard you followed.",
        "State the outcome you request, such as the sanction you request or an allegation you want removed.",
        "Close with what you will do going forward."
      ],
      note: "A Form 10 response is due within 3 duty days of receiving the Form 10."
    },
    record: {
      name: "Memorandum for Record", desc: "Document what happened, a decision or a conversation for the file.",
      approval: false, to: "record",
      subject: "...",
      prompts: [
        "What happened: who, what, when and where.",
        "Actions taken or decisions made.",
        "Follow-up required, if any, and the point of contact."
      ]
    },
    recommendation: {
      name: "Recommendation or support", desc: "Recommend or vouch for another cadet.",
      approval: false, to: "sqcc",
      subject: "Letter of Recommendation for ...",
      prompts: [
        "How you know the cadet and for how long.",
        "Specific examples of their performance, character or leadership.",
        "Your bottom-line recommendation.",
        "Offer to answer questions."
      ]
    },
    character: {
      name: "Character letter", desc: "Speak to a cadet's character for the authorities reviewing a case, such as a Form 10 or an honor case.",
      approval: false, to: "reviewing",
      subject: "Character Letter for Grade Firstname M. Lastname",
      prompts: [
        "Tell the reviewing authorities who you are and why you can speak to the cadet's character: your name, grade, duty title, squadron and time in service. Add how many people you supervise, how long you have supervised and your accomplishments.",
        "Describe your relationship with the cadet: how long you have known them and whether your contact is duty-related, social or both. Describe your role and theirs and how often you observe them, such as daily or weekly.",
        "Give your opinion of the cadet and support it with specific examples: duty performance, military bearing, community service, attitude and goals. Describe times the cadet stood out. State that you are aware of the allegations against the cadet.",
        "Conclude the letter. Invite the reader to contact you, and give your phone number and email address."
      ],
      note: "A character letter goes to every reviewing authority, so write it for a reader who does not know you or the cadet."
    },
    general: {
      name: "Something else", desc: "A general memorandum. You write the structure.",
      approval: false, to: "sqcc",
      subject: "...",
      prompts: ["Bottom line up front: the main point or the action you want.", "Supporting details.", "Closing or point of contact."]
    }
  };

  /* ---------- Who it goes to ---------- */
  const RECIPIENTS = {
    sqcc: { name: "Squadron Commander (Air Officer Commanding)", symbol: sym => sym + "/CC", title: sym => "Commander, " + sym, grade: "Maj" },
    amt: { name: "Academy Military Trainer", symbol: sym => sym + "/AMT", title: sym => "Academy Military Trainer, " + sym, grade: "MSgt" },
    cadetcc: { name: "Cadet Squadron Commander", symbol: sym => sym + "/C/CC", title: sym => "Cadet Commander, " + sym, grade: "C1C" },
    gpcc: { name: "Group Air Officer Commanding or Commander", symbol: () => "", title: () => "", grade: "Lt Col" },
    cwcc: { name: "Commandant of Cadets", symbol: () => "USAFA/CW", title: () => "Commandant of Cadets", grade: "Brig Gen" },
    reviewing: { name: "All reviewing authorities", symbol: () => "ALL REVIEWING AUTHORITIES", title: () => "", grade: "Maj" },
    record: { name: "Record only (no addressee)", symbol: () => "", title: () => "", grade: "Maj" },
    other: { name: "Someone else", symbol: () => "", title: () => "", grade: "Maj" }
  };

  const COMMON_REFS = [
    "AFCWI 36-3501, Cadet Standards and Duties, 1 August 2025",
    "AFCWI 51-201, Cadet Discipline",
    "DAFI 36-2903, Dress and Personal Appearance of Department of the Air Force Personnel",
    "DAFH 33-337, The Tongue and Quill"
  ];

  /* ---------- State ---------- */
  const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  function freshState(type = "request") {
    const T = TYPES[type];
    return {
      step: 0, type,
      to: { kind: T.to, symbol: RECIPIENTS[T.to].symbol("CS-11"), symbolEdited: false },
      approval: { on: T.approval, first: "", mi: "", last: "", grade: RECIPIENTS[T.to].grade, service: "USAF", title: RECIPIENTS[T.to].title("CS-11"), titleEdited: false },
      me: { first: "", mi: "", last: "", cls: "C1C", sq: "11", title: "" },
      date: today(), subject: "",
      refs: (T.refs || []).slice(),
      paras: T.prompts.map(p => ({ text: "", sub: false, prompt: p })),
      atts: [],
      patchMode: "default"
    };
  }
  let S;
  try { S = JSON.parse(localStorage.getItem(STORE)) || freshState(); } catch (e) { S = freshState(); }
  let patchUpload = null; // { bytes, type } kept in memory only
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } };
  const sym = () => MFR.sqSymbol(S.me.sq);

  /* ---------- Paperwork tabs ---------- */
  function showDoc(doc) {
    $$(".doc-tab").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.doc === doc)));
    $$(".doc-view").forEach(v => { v.hidden = v.id !== "doc-" + doc; });
  }
  $$(".doc-tab").forEach(b => b.addEventListener("click", () => showDoc(b.dataset.doc)));

  /* ---------- Choice cards ---------- */
  function choiceCard(label, desc, checked, onPick) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "choice"; b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", String(checked));
    b.innerHTML = '<span class="dot" aria-hidden="true"></span><strong></strong>' + (desc ? '<span class="desc"></span>' : "");
    b.querySelector("strong").textContent = label;
    if (desc) b.querySelector(".desc").textContent = desc;
    b.addEventListener("click", onPick);
    return b;
  }
  function renderTypes() {
    const box = $("#typeChoices"); box.innerHTML = "";
    Object.entries(TYPES).forEach(([k, T]) => box.appendChild(choiceCard(T.name, T.desc, S.type === k, () => setType(k))));
  }
  function setType(k) {
    if (S.type === k) return;
    const T = TYPES[k];
    const hasText = S.paras.some(p => p.text.trim());
    S.type = k;
    S.approval.on = T.approval;
    setRecipient(T.to, true);
    if (!hasText) S.paras = T.prompts.map(p => ({ text: "", sub: false, prompt: p }));
    else S.paras.forEach((p, i) => { p.prompt = T.prompts[i] || "Paragraph text"; });
    if (T.refs && !S.refs.length) S.refs = T.refs.slice();
    renderAll();
  }
  function renderRecipients() {
    const box = $("#toChoices"); box.innerHTML = "";
    Object.entries(RECIPIENTS).forEach(([k, R]) => box.appendChild(choiceCard(R.name, "", S.to.kind === k, () => { setRecipient(k); renderAll(); })));
  }
  function setRecipient(k, quiet) {
    const R = RECIPIENTS[k];
    S.to.kind = k; S.to.symbolEdited = false; S.to.symbol = R.symbol(sym());
    S.approval.grade = R.grade; S.approval.titleEdited = false; S.approval.title = R.title(sym());
    if (k === "record") S.approval.on = false;
    if (!quiet) save();
  }

  /* ---------- Bind simple fields ---------- */
  function bind(id, get, set) {
    const el = $("#" + id);
    el.addEventListener("input", () => { set(el.type === "checkbox" ? el.checked : el.value); save(); renderPreview(); renderSmall(); });
    el._sync = () => { const v = get(); if (el.type === "checkbox") el.checked = v; else if (document.activeElement !== el) el.value = v; };
  }
  bind("toSymbol", () => S.to.symbol, v => { S.to.symbol = v; S.to.symbolEdited = true; });
  bind("approvalOn", () => S.approval.on, v => { S.approval.on = v; });
  bind("apFirst", () => S.approval.first, v => { S.approval.first = v; });
  bind("apMi", () => S.approval.mi, v => { S.approval.mi = v.toUpperCase(); });
  bind("apLast", () => S.approval.last, v => { S.approval.last = v; });
  bind("apGrade", () => S.approval.grade, v => { S.approval.grade = v; });
  bind("apService", () => S.approval.service, v => { S.approval.service = v; });
  bind("apTitle", () => S.approval.title, v => { S.approval.title = v; S.approval.titleEdited = true; });
  bind("meFirst", () => S.me.first, v => { S.me.first = v; });
  bind("meMi", () => S.me.mi, v => { S.me.mi = v.toUpperCase(); });
  bind("meLast", () => S.me.last, v => { S.me.last = v; });
  bind("meCls", () => S.me.cls, v => { S.me.cls = v; });
  bind("meSq", () => S.me.sq, v => {
    const old = sym(); S.me.sq = v; const now = sym();
    const R = RECIPIENTS[S.to.kind];
    if (!S.to.symbolEdited) S.to.symbol = R.symbol(now);
    if (!S.approval.titleEdited) S.approval.title = R.title(now);
    if (S.me.title === "Cadet, " + old) S.me.title = "";
  });
  bind("meTitle", () => S.me.title, v => { S.me.title = v; });
  bind("date", () => S.date, v => { S.date = v; });
  bind("subject", () => S.subject, v => { S.subject = v; });

  // Patch
  $$('input[name="patch"]').forEach(r => r.addEventListener("change", () => {
    S.patchMode = r.value; save();
    if (r.value === "upload" && !patchUpload) $("#patchFile").click();
    renderSmall(); renderPreview();
  }));
  $("#patchFile").addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f) return;
    patchUpload = { bytes: await f.arrayBuffer(), type: f.type, url: URL.createObjectURL(f), name: f.name };
    renderSmall(); renderPreview();
  });

  /* ---------- Lists: references, paragraphs, attachments ---------- */
  function listItem(tag, value, placeholder, { textarea, sub, onInput, onRemove, onUp, onDown }) {
    const row = document.createElement("div");
    row.className = "item" + (sub ? " sub" : "");
    const t = document.createElement("span"); t.className = "tag"; t.textContent = tag;
    const input = document.createElement(textarea ? "textarea" : "input");
    if (!textarea) input.type = "text";
    input.value = value; input.placeholder = placeholder;
    input.setAttribute("aria-label", (tag ? tag + " " : "") + placeholder);
    input.addEventListener("input", () => { onInput(input.value); save(); renderPreview(); });
    const tools = document.createElement("div"); tools.className = "tools";
    const mk = (label, fn, aria) => { if (!fn) return; const b = document.createElement("button"); b.type = "button"; b.className = "icon-btn"; b.textContent = label; b.setAttribute("aria-label", aria); b.addEventListener("click", fn); tools.appendChild(b); };
    mk("Move up", onUp, "Move up"); mk("Move down", onDown, "Move down"); mk("Remove", onRemove, "Remove");
    row.append(t, input, tools);
    return row;
  }
  const move = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; };

  function renderRefs() {
    const box = $("#refList"); box.innerHTML = "";
    S.refs.forEach((r, i) => box.appendChild(listItem("(" + String.fromCharCode(97 + i) + ")", r, "Publication number, title, date", {
      onInput: v => { S.refs[i] = v; },
      onRemove: () => { S.refs.splice(i, 1); save(); renderAll(); },
      onUp: i > 0 ? () => { move(S.refs, i, -1); save(); renderAll(); } : null,
      onDown: i < S.refs.length - 1 ? () => { move(S.refs, i, 1); save(); renderAll(); } : null
    })));
    const chips = $("#refChips"); chips.innerHTML = "";
    COMMON_REFS.filter(c => !S.refs.includes(c)).forEach(c => {
      const b = document.createElement("button"); b.type = "button"; b.className = "chip";
      b.textContent = "Add " + c.split(",")[0];
      b.title = c;
      b.addEventListener("click", () => { S.refs.push(c); save(); renderAll(); });
      chips.appendChild(b);
    });
  }
  function paraTags() {
    const mains = S.paras.filter(p => !p.sub).length;
    const numbered = !(mains <= 1 && S.paras.length <= 1);
    let n = 0, s = 0;
    return S.paras.map(p => p.sub ? String.fromCharCode(97 + s++) + "." : (s = 0, numbered ? ++n + "." : ""));
  }
  function renderParas() {
    const box = $("#paraList"); box.innerHTML = "";
    const tags = paraTags();
    S.paras.forEach((p, i) => {
      const row = listItem(tags[i], p.text, p.prompt || "Paragraph text", {
        textarea: true, sub: p.sub,
        onInput: v => { p.text = v; },
        onRemove: S.paras.length > 1 ? () => { S.paras.splice(i, 1); save(); renderAll(); } : null,
        onUp: i > 0 ? () => { move(S.paras, i, -1); save(); renderAll(); } : null,
        onDown: i < S.paras.length - 1 ? () => { move(S.paras, i, 1); save(); renderAll(); } : null
      });
      if (i > 0) {
        const b = document.createElement("button"); b.type = "button"; b.className = "icon-btn";
        b.textContent = p.sub ? "Outdent" : "Indent";
        b.setAttribute("aria-label", p.sub ? "Make a main paragraph" : "Make a subparagraph");
        b.addEventListener("click", () => { p.sub = !p.sub; save(); renderAll(); });
        row.querySelector(".tools").appendChild(b);
      }
      box.appendChild(row);
    });
  }
  function renderAtts() {
    const box = $("#attList"); box.innerHTML = "";
    S.atts.forEach((a, i) => box.appendChild(listItem((i + 1) + ".", a, "Title of the attachment, date", {
      onInput: v => { S.atts[i] = v; },
      onRemove: () => { S.atts.splice(i, 1); save(); renderAll(); }
    })));
  }
  $("#addRef").addEventListener("click", () => { S.refs.push(""); save(); renderAll(); focusLast("#refList input"); });
  $("#addPara").addEventListener("click", () => { S.paras.push({ text: "", sub: false, prompt: "Paragraph text" }); save(); renderAll(); focusLast("#paraList textarea"); });
  $("#addSub").addEventListener("click", () => { S.paras.push({ text: "", sub: true, prompt: "Subparagraph text" }); save(); renderAll(); focusLast("#paraList textarea"); });
  $("#addAtt").addEventListener("click", () => { S.atts.push(""); save(); renderAll(); focusLast("#attList input"); });
  const focusLast = sel => { const els = $$(sel); if (els.length) els[els.length - 1].focus(); };

  /* ---------- Preview ---------- */
  function renderPreview() {
    const paper = $("#paper");
    const blocks = MFR.buildBlocks(S);
    let patchHtml = "";
    if (S.patchMode === "default" && S.me.sq && MFR.pad2(S.me.sq) === "11") patchHtml = '<img class="patch-img" src="assets/cs11-patch.jpg" alt="CS-11 patch">';
    else if (S.patchMode === "upload" && patchUpload) patchHtml = '<img class="patch-img" src="' + patchUpload.url + '" alt="Squadron patch">';
    const lh = '<div class="lh"><img src="assets/seal.png" alt="Department of War seal"><div class="lh-text">' +
      '<div class="l1">DEPARTMENT OF THE AIR FORCE</div><div class="l1">UNITED STATES AIR FORCE ACADEMY</div>' +
      '<div class="l2">AIR FORCE CADET WING</div><div class="l2">CADET SQUADRON ' + esc(MFR.pad2(S.me.sq)) + "</div></div>" + patchHtml + "</div>";
    paper.innerHTML = lh + blocks.map(b => {
      if (b.t === "blank") return '<p class="blank"></p>';
      const txt = b.segs.map(s => s.ph ? '<span class="ph">' + esc(s.text) + "</span>" : esc(s.text)).join("");
      return '<p class="b-' + b.t + '">' + txt + "</p>";
    }).join("");
  }
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- Review checks ---------- */
  const SMALL = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or", "the", "to", "via", "with", "from", "into"]);
  function checks() {
    const out = [];
    const add = (lvl, msg) => out.push({ lvl, msg });
    const T = TYPES[S.type];
    if (!S.me.first || !S.me.last) add("bad", "Add your first and last name in step 3.");
    if (!S.subject.trim()) add("bad", "Add a subject in step 4.");
    else {
      const words = S.subject.trim().split(/\s+/);
      const lower = words.filter((w, i) => /^[a-z]/.test(w) && (i === 0 || !SMALL.has(w.toLowerCase())));
      if (lower.length) add("warn", "Use title case in the subject. Capitalize: " + lower.join(", ") + ".");
      else add("ok", "The subject is in title case.");
    }
    if (S.to.kind !== "record" && !S.to.symbol.trim()) add("bad", "Add the recipient's office symbol in step 2.");
    const empty = S.paras.filter(p => !p.text.trim()).length;
    if (empty) add("bad", empty + (empty === 1 ? " paragraph is" : " paragraphs are") + " still empty. Fill or remove " + (empty === 1 ? "it" : "them") + " in step 4.");
    else add("ok", "Every paragraph has text.");
    // T&Q: never a lone subparagraph
    let lone = false;
    S.paras.forEach((p, i) => {
      if (p.sub && (i === 0 || !S.paras[i - 1].sub) && !(S.paras[i + 1] && S.paras[i + 1].sub)) lone = true;
    });
    if (lone) add("warn", "A paragraph has only one subparagraph. Tongue and Quill says to use at least two (a. and b.) or none.");
    if (S.type === "request" && !S.approval.on) add("warn", "Requests should include an approve or disapprove block so the approver has a clear decision to sign.");
    if (S.approval.on && (!S.approval.first || !S.approval.last)) add("bad", "Add the approver's name in step 2.");
    const body = S.paras.map(p => p.text).join(" ");
    const defined = new Set((body.match(/\(([A-Z]{2,})\)/g) || []).map(a => a.slice(1, -1)));
    const acr = Array.from(new Set((body.match(/\b[A-Z]{3,}\b/g) || []).filter(a => !defined.has(a) && !["CS", "USAF", "USAFA", "TAPS", "IAW"].includes(a))));
    if (acr.length) add("warn", "Spell out acronyms the first time you use them unless every reader knows them: " + acr.slice(0, 6).join(", ") + ".");
    if (/\b(can't|won't|don't|didn't|isn't|it's|I'm|I've|we're)\b/i.test(body)) add("warn", "Official memorandums avoid contractions. Write them out.");
    if (/\bIAW\b/.test(body) && !/in accordance with \(IAW\)/i.test(body)) add("warn", "Spell out IAW as \"in accordance with\" the first time, or write it out each time.");
    if (T.note) add("warn", T.note);
    add("warn", "Sign it before you submit. An unsigned memorandum is not official.");
    return out;
  }
  function renderChecks() {
    $("#checks").innerHTML = checks().map(c => '<li class="' + c.lvl + '">' + esc(c.msg) + "</li>").join("");
  }

  /* ---------- Steps ---------- */
  const STEPS = 5;
  function goStep(n) {
    S.step = Math.max(0, Math.min(STEPS - 1, n)); save();
    $$(".step").forEach(el => { el.hidden = Number(el.dataset.step) !== S.step; });
    $$(".stepper button").forEach(b => {
      const k = Number(b.dataset.step);
      if (k === S.step) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      b.classList.toggle("done", k < S.step);
    });
    const names = ["Purpose", "Recipient", "You", "Content", "Review"];
    $("#stepCount").textContent = "Step " + (S.step + 1) + " of " + STEPS + ": " + names[S.step];
    $("#prevStep").style.visibility = S.step === 0 ? "hidden" : "visible";
    $("#nextStep").hidden = S.step === STEPS - 1;
    if (S.step < STEPS - 1) $("#nextStep").textContent = "Next: " + names[S.step + 1];
    if (S.step === 4) renderChecks();
  }
  $$(".stepper button").forEach(b => b.addEventListener("click", () => goStep(Number(b.dataset.step))));
  $("#prevStep").addEventListener("click", () => { goStep(S.step - 1); $(".form-col").scrollIntoView({ block: "start" }); });
  $("#nextStep").addEventListener("click", () => { goStep(S.step + 1); $(".form-col").scrollIntoView({ block: "start" }); });

  /* ---------- Phone preview sheet ---------- */
  function setPreview(open) {
    document.body.classList.toggle("preview-open", open);
    $("#previewOpen").setAttribute("aria-expanded", String(open));
    if (open) $("#previewClose").focus(); else $("#previewOpen").focus();
  }
  $("#previewOpen").addEventListener("click", () => setPreview(true));
  $("#previewClose").addEventListener("click", () => setPreview(false));
  document.addEventListener("keydown", e => { if (e.key === "Escape" && document.body.classList.contains("preview-open")) setPreview(false); });

  /* ---------- Export ---------- */
  async function exportAs(kind) {
    const status = $("#exportStatus");
    status.textContent = "Building your memorandum...";
    try {
      const patch = { mode: S.patchMode === "default" ? (MFR.pad2(S.me.sq) === "11" ? "default" : "none") : S.patchMode };
      if (patch.mode === "upload") { if (patchUpload) Object.assign(patch, patchUpload); else patch.mode = "none"; }
      const out = kind === "pdf" ? await MFR.exportPdf(S, patch) : await MFR.exportDocx(S, "assets/mfr-template.docx", patch);
      const result = await window.saveFile(out.blob, out.name);
      if (result === "declined") { status.textContent = "Download canceled."; return; }
      status.textContent = kind === "pdf"
        ? "Downloaded " + out.name + ". Open it in Adobe Acrobat or Reader, proofread it and select the signature box above your name to sign."
        : "Downloaded " + out.name + ". Open it in Word to check it, then save it as a PDF and sign it.";
    } catch (e) {
      status.textContent = "Download failed: " + e.message + " Reload the page and try again.";
    }
  }
  $("#exportPdf").addEventListener("click", () => exportAs("pdf"));
  $("#exportDocx").addEventListener("click", () => exportAs("docx"));
  $("#resetAll").addEventListener("click", () => {
    if (!confirmReset()) return;
    S = freshState(); patchUpload = null; save(); renderAll(); goStep(0);
  });
  function confirmReset() {
    const btn = $("#resetAll");
    if (btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = "Start a new memorandum"; return true; }
    btn.dataset.armed = "1"; btn.textContent = "Click again to clear everything";
    setTimeout(() => { delete btn.dataset.armed; btn.textContent = "Start a new memorandum"; }, 4000);
    return false;
  }

  /* ---------- Render ---------- */
  function renderSmall() {
    $$("input, select").forEach(el => el._sync && el._sync());
    $("#approvalBox").querySelectorAll(".field-row").forEach(r => { r.style.opacity = S.approval.on ? 1 : 0.45; });
    $$("#approvalBox .field-row input, #approvalBox .field-row select").forEach(el => { el.disabled = !S.approval.on; });
    $("#approvalBox").hidden = S.to.kind === "record";
    $("#toSymbol").closest("label").hidden = S.to.kind === "record";
    $("#subject").placeholder = TYPES[S.type].subject;
    $("#meTitle").placeholder = "Cadet, " + sym();
    $("#apTitle").placeholder = "Commander, " + sym();
    const is11 = MFR.pad2(S.me.sq) === "11";
    $("#patchDefaultLabel").textContent = is11 ? "CS-11 patch" : "No patch (only the CS-11 patch is built in)";
    $$('input[name="patch"]').forEach(r => { r.checked = r.value === S.patchMode; });
    $("#patchHint").textContent = S.patchMode === "upload"
      ? (patchUpload ? "Using " + patchUpload.name + ". Uploaded images stay on your device." : "Choose a PNG or JPG of your squadron patch.")
      : "";
  }
  function renderAll() {
    renderTypes(); renderRecipients(); renderRefs(); renderParas(); renderAtts();
    renderSmall(); renderPreview();
    if (S.step === 4) renderChecks();
  }

  renderAll();
  goStep(S.step || 0);

  window.MFRApp = {
    hasDraft: () => S.paras.some(p => p.text.trim()) || !!S.subject.trim(),
    loadExample(ex) {
      const base = freshState(ex.type);
      S = Object.assign(base, JSON.parse(JSON.stringify(ex.state)));
      S.paras = S.paras.map((p, i) => Object.assign({ sub: false, prompt: (TYPES[ex.type].prompts[i] || "Paragraph text") }, p));
      save(); renderAll(); goStep(3);
      $(".form-col").scrollIntoView({ block: "start" });
    },
    showDoc
  };
})();
