"""End-to-end smoke test for the Cadet Paperwork Builder.

Serves the site locally, drives it in Chromium and WebKit (Safari's engine),
and checks every download: memorandum, eSSS, Form 99, Form 10, Form 174, the feedback worksheet,
an uploaded fillable PDF and an uploaded Word template.

Setup:  pip install playwright pypdf && python -m playwright install chromium webkit
Run:    python tests/smoke.py
"""
import asyncio, functools, http.server, os, re, sys, tempfile, threading, zipfile
from playwright.async_api import async_playwright
from pypdf import PdfReader

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIX = os.path.join(ROOT, "tests", "fixtures")
PORT = 8765
URL = f"http://localhost:{PORT}/"

def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    h = functools.partial(Quiet, directory=ROOT)
    srv = http.server.ThreadingHTTPServer(("localhost", PORT), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

async def save(pg, sel, out, name):
    async with pg.expect_download() as d:
        await pg.click(sel)
    f = await d.value
    path = os.path.join(out, name)
    await f.save_as(path)
    return path

def make_docx(path, paras):
    """A minimal Word file with one paragraph per string."""
    from xml.sax.saxutils import escape
    body = "".join('<w:p><w:r><w:t xml:space="preserve">%s</w:t></w:r></w:p>' % escape(t) for t in paras)
    with zipfile.ZipFile(path, "w") as z:
        z.writestr("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
        z.writestr("_rels/.rels", '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
        z.writestr("word/document.xml", '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>%s</w:body></w:document>' % body)
    return path

def xfa_datasets(path):
    x = PdfReader(path).trailer["/Root"]["/AcroForm"]["/XFA"]
    return [x[i + 1].get_object().get_data() for i in range(0, len(x), 2) if x[i] == "datasets"][0].decode()

async def run(browser, out, label):
    fails = []
    def check(ok, msg):
        print(("  ok   " if ok else "  FAIL ") + msg)
        if not ok: fails.append(msg)

    ctx = await browser.new_context(viewport={"width": 1400, "height": 900}, accept_downloads=True)
    pg = await ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    await pg.goto(URL)
    await pg.evaluate("localStorage.clear()"); await pg.reload()

    # Memorandum from an example
    await pg.click("#exampleButtons button >> nth=0")
    await pg.click('.stepper button[data-step="4"]')
    p = await save(pg, "#exportDocx", out, "memo.docx")
    with zipfile.ZipFile(p) as z:
        doc = z.read("word/document.xml").decode()
    check("MEMORANDUM FOR" in doc and "APPROVED / DISAPPROVED" in doc, "memorandum exports with approval block")
    check(not await pg.is_visible("#nextStep"), "Next button is hidden on the last step")
    p = await save(pg, "#exportPdf", out, "memo.pdf")
    r = PdfReader(p); text = "".join(pg_.extract_text() for pg_ in r.pages)
    sigs = [k for k, v in (r.get_fields() or {}).items() if v.get("/FT") == "/Sig"]
    check(len(r.pages) == 1 and "MEMORANDUM FOR" in text and "DEPARTMENT OF THE AIR FORCE" in text and "TAYLOR R. MORGAN, C1C, USAFA" in text
          and len(sigs) == 2, "PDF has letterhead, text and author and approver signature fields (%d pages, %d fields)" % (len(r.pages), len(sigs)))

    # A two-page memorandum keeps each signature block whole and with text above it
    await pg.click('.stepper button[data-step="0"]')
    idx = (await pg.eval_on_selector_all("#exampleButtons button", "els => els.map(e => e.textContent)")).index("Event plan")
    ex = pg.locator(f"#exampleButtons button >> nth={idx}"); await ex.click()
    if (await ex.inner_text()) != "Event plan": await ex.click()
    await pg.click('.stepper button[data-step="4"]')
    p = await save(pg, "#exportPdf", out, "event.pdf")
    pages = [x.extract_text() for x in PdfReader(p).pages]
    sig_page = next(t for t in pages if "CASEY M. DIAZ" in t)
    before = sig_page.split("CASEY M. DIAZ")[0].split("\n")
    check("Cadet, CS-11" in sig_page and "JORDAN A. REYES" in sig_page and len([l for l in before if l.strip() and l.strip() != str(pages.index(sig_page) + 1)]) >= 2,
          "page breaks keep signature blocks whole and with text (%d pages)" % len(pages))

    # Character letter follows the owner's template
    await pg.click('.stepper button[data-step="0"]')
    await pg.click("#typeChoices .choice:has-text('Character letter')")
    await pg.click('.stepper button[data-step="4"]')
    p = await save(pg, "#exportDocx", out, "character.docx")
    with zipfile.ZipFile(p) as z:
        doc = z.read("word/document.xml").decode()
    check("ALL REVIEWING AUTHORITIES" in doc and "FROM:  CS-" not in doc, "character letter uses the reviewing-authorities format")

    # eSSS (LiveCycle form)
    await pg.click(".doc-tab[data-doc=fill]")
    await pg.wait_for_selector(".route-row")
    await pg.fill("#fillFields input >> nth=0", "C1C Test")
    p = await save(pg, "#fillDownload", out, "esss.pdf")
    check("C1C Test" in xfa_datasets(p), "eSSS writes LiveCycle data")

    # Form 99 (both copies)
    await pg.click("#formChoices .choice >> nth=1")
    await pg.wait_for_function("document.querySelector('#fillStatus').textContent.startsWith('AFCW IMT 99')")
    await pg.fill("#fillFields input >> nth=0", "Test, Cadet A")
    p = await save(pg, "#fillDownload", out, "f99.pdf")
    n = sum(1 for v in PdfReader(p).get_fields().values() if v.get("/V") == "Test, Cadet A")
    check(n == 2, "Form 99 fills both copies")

    # OCONUS travel package is paused: shown grayed out with a note, and choosing it does nothing
    before = await pg.inner_text("#fillStatus")
    oc = pg.locator("#formChoices .choice:has-text('OCONUS')")
    await oc.click(force=True); await pg.wait_for_timeout(300)
    await oc.dispatch_event("click"); await pg.wait_for_timeout(300)
    check(await oc.is_disabled() and await oc.get_attribute("aria-disabled") == "true" and "future update" in await oc.inner_text()
          and await oc.get_attribute("aria-checked") == "false" and await pg.inner_text("#fillStatus") == before,
          "OCONUS travel package is grayed out with a future-update note")

    # Form 10, Report of Conduct
    await pg.click("#formChoices .choice:has-text('Form 10')")
    await pg.wait_for_function("document.querySelector('#fillStatus').textContent.startsWith('AFCW IMT 10')")
    await pg.wait_for_selector(".fp-page canvas")
    await pg.get_by_label("1. Cadet name (Last, First, MI)").focus()
    await pg.wait_for_function("document.querySelectorAll('.fp-box.on').length === 1")
    await pg.get_by_label("1. Cadet name (Last, First, MI)").fill("Morgan, Taylor R")
    shown = await pg.inner_text(".fp-box.on")
    PAINT = "(() => { const c = document.querySelector('.fp-page canvas'); if (!c || !c.width) return 0; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let dark = 0; for (let i = 0; i < d.length; i += 400) if (d[i] < 128) dark++; return dark; })()"
    try: await pg.wait_for_function(PAINT + " > 50", timeout=15000)
    except Exception: pass
    painted = await pg.evaluate(PAINT)
    check(shown == "Morgan, Taylor R" and painted > 50, "form preview draws Form 10, outlines the blank and shows the answer")
    await pg.get_by_label("8. Reporting official memorandum attached").select_option("Yes")
    p = await save(pg, "#fillDownload", out, "f10.pdf")
    f = PdfReader(p).get_fields(); k = "topmostSubform[0].Page1[0]."
    sizes = []
    for a in PdfReader(p).pages[0].get("/Annots") or []:
        a = a.get_object(); ap = a.get("/AP", {}).get("/N")
        if a.get("/FT") == "/Tx" and ap is not None:
            d = ap.get_object().get_data().decode("latin-1")
            if re.search(r"<[0-9A-Fa-f]+>\s*Tj|\([^)]+\)\s*Tj", d): sizes += [float(x) for x in re.findall(r"([\d.]+) Tf", d)]   # boxes with text only
    check(sizes and max(sizes) <= 10, "Form 10 text uses a standard size, not auto (largest %s pt)" % (max(sizes) if sizes else None))
    check(f[k + "TextField1[2]"].get("/V") == "Morgan, Taylor R" and f[k + "CheckBox1[0]"].get("/V") == "/1"
          and f[k + "CheckBox1[1]"].get("/V") in (None, "/Off"), "Form 10 fills name and Yes box")

    # Feedback worksheet, with the Classification Directory as a reference link
    await pg.click("#formChoices .choice:has-text('Feedback worksheet')")
    href = await pg.get_attribute("#libraryFiles a", "href")
    check(href and (await pg.request.get(URL + href)).ok, "Classification Directory link opens")
    await pg.wait_for_function("document.querySelector('#fillStatus').textContent.startsWith('CW Form 724')")
    await pg.get_by_label("Name (Last, First MI)").fill("Diaz, Casey M")
    await pg.get_by_label("Type of assessment").select_option("Mid-term")
    await pg.get_by_label("1. Duty performance").select_option("Exceeded expectations")
    await pg.get_by_label("7. Do you take part in any high-risk activities?", exact=False).fill("None")
    p = await save(pg, "#fillDownload", out, "feedback.pdf")
    f = PdfReader(p).get_fields()
    check(f["NAME"].get("/V") == "Diaz, Casey M" and f["Check Box15.0.0.0"].get("/V") == "/Yes"
          and f["Check Box12.0.0.1.0.0.1.0"].get("/V") == "/Yes"
          and f["7 Do you have Wingmen  Do you have at least one mentor"].get("/V") == "None", "feedback worksheet fills text, type and rating")

    # AF Form 174, general counseling
    await pg.click("#formChoices .choice:has-text('AF Form 174')")
    await pg.wait_for_function("document.querySelector('#fillStatus').textContent.startsWith('AF Form 174')")
    await pg.get_by_label("9. Summary of counseling").fill("On 23 November 2026 we discussed formation standards.")
    p = await save(pg, "#fillDownload", out, "f174.pdf")
    v = PdfReader(p).get_fields()["9SUMMARYOFCOUNSELING Give details facts specific dates times names sequence of events etc"].get("/V")
    check(v == "On 23 November 2026 we discussed formation standards.", "Form 174 fills the counseling summary")

    # AFCW IMT 311, bed rest or post duty rest
    await pg.click("#formChoices .choice:has-text('AFCW IMT 311')")
    await pg.wait_for_function("document.querySelector('#fillStatus').textContent.startsWith('AFCW IMT 311')")
    await pg.locator("#fillFields").get_by_label("Cadet name (Last, First)").fill("Morgan, Taylor")
    await pg.locator("#fillFields").get_by_label("Lunch").check()
    p = await save(pg, "#fillDownload", out, "f311.pdf")
    f = PdfReader(p).get_fields()
    check(f["CADET NAME Please print Last First"].get("/V") == "Morgan, Taylor" and f["Check Box2"].get("/V") == "/Yes" and f["Check Box1"].get("/V") in (None, "/Off"),
          "Form 311 fills the name and the lunch box")

    # eSSS preview: drawn from its LiveCycle design, with boxes at the design's positions
    await pg.click("#formChoices .choice:has-text('eSSS')")
    await pg.wait_for_selector(".fp-design .fp-box", state="attached", timeout=20000)
    await pg.locator("#fillFields").get_by_label("Subject").focus()
    on = await pg.evaluate("(() => { const b = document.querySelector('.fp-design .fp-box.on'); return b ? [parseFloat(b.style.left), parseFloat(b.style.top), parseFloat(b.style.width)] : null; })()")
    check(on is not None and abs(on[0] - 37.4) < 2 and abs(on[1] - 268.1) < 2 and on[2] > 400, "eSSS preview outlines the Subject box at its printed position (%s)" % on)

    # Uploaded fillable PDF and Word template
    await pg.click("#formChoices .choice:has-text('Your own template')")
    await pg.set_input_files("#fillFile", os.path.join(FIX, "blank_form.pdf"))
    await pg.wait_for_function("document.querySelector('#fillStatus').textContent.startsWith('blank_form')")
    await pg.fill("#ff0", "Upload, Test")
    p = await save(pg, "#fillDownload", out, "upload.pdf")
    check(PdfReader(p).get_fields()["CadetName"].get("/V") == "Upload, Test", "uploaded PDF fills")
    await pg.set_input_files("#fillFile", os.path.join(FIX, "template.docx"))
    await pg.wait_for_function("document.querySelector('#fillStatus').textContent.startsWith('template')")
    await pg.fill("#ff0", "CS-11/CC")
    p = await save(pg, "#fillDownload", out, "template.docx")
    with zipfile.ZipFile(p) as z:
        check("CS-11/CC" in z.read("word/document.xml").decode(), "Word template fills")

    # Paperwork checker: the site's own examples pass, a flawed memorandum is caught
    await pg.click(".doc-tab[data-doc=check]")
    for name in ("memo.docx", "character.docx"):
        await pg.set_input_files("#checkFile", os.path.join(out, name))
        await pg.wait_for_function("document.querySelector('#checkSummary').textContent.startsWith(%r)" % name)
        summary = await pg.inner_text("#checkSummary")
        check(" 0 corrections" in summary or "no problems" in summary, "checker finds no corrections in " + name + " (" + summary + ")")
    bad = make_docx(os.path.join(out, "flawed.docx"), [
        "11/23/2026", "MEMO FOR CS-11/CC", "FROM:  CS-11/C1C Test", "SUBJECT:  request for a pass",
        "I can't attend the memo brief in order to study for [Subject].", "The form was submitted late by the cadet.",
        "taylor r. morgan, C1C, USAFA", "Cadet, CS-11", "Attachments:", "1. One", "2. Two"])
    await pg.set_input_files("#checkFile", bad)
    await pg.wait_for_function("document.querySelector('#checkSummary').textContent.startsWith('flawed')")
    txt = await pg.inner_text("#checkList")
    want = ["MEMORANDUM FOR in full", "day, month and year", "title case", "contractions", "not \"memo", "placeholder",
            "plain words", "passive voice", "capital letters", "number of attachments", "Number the paragraphs"]
    missing = [w for w in want if w.lower() not in txt.lower()]
    check(not missing, "checker catches each problem in a flawed memorandum" + (": missing " + ", ".join(missing) if missing else ""))

    # Feedback email
    await pg.click(".doc-tab[data-doc=feedback]")
    check(await pg.is_visible("#fbEmail") and "c27david.anand@afacademy.af.edu" in await pg.evaluate("window.SITE.feedbackEmail"), "feedback email button is set")

    # Theme override survives reload
    await pg.select_option("#themeSelect", "dark"); await pg.reload()
    check(await pg.evaluate("document.documentElement.dataset.theme") == "dark", "theme choice persists")

    # Phone layout does not overflow
    await pg.set_viewport_size({"width": 390, "height": 844})
    w = await pg.evaluate("[document.documentElement.scrollWidth, innerWidth]")
    check(w[0] <= w[1], "no horizontal overflow at 390px")

    check(not errors, "no page errors" + (": " + "; ".join(errors) if errors else ""))
    await ctx.close()
    return fails

async def main():
    srv = serve()
    out = tempfile.mkdtemp()
    fails = []
    async with async_playwright() as p:
        for name in ("chromium", "webkit"):
            print(name)
            b = await getattr(p, name).launch()
            fails += [name + ": " + f for f in await run(b, out, name)]
            await b.close()
    srv.shutdown()
    print("\nAll checks passed." if not fails else f"\n{len(fails)} check(s) failed.")
    sys.exit(1 if fails else 0)

asyncio.run(main())
