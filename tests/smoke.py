"""End-to-end smoke test for the Cadet Paperwork Builder.

Serves the site locally, drives it in Chromium and WebKit (Safari's engine),
and checks every download: memorandum, eSSS, Form 99, OCONUS checklist,
an uploaded fillable PDF and an uploaded Word template.

Setup:  pip install playwright pypdf && python -m playwright install chromium webkit
Run:    python tests/smoke.py
"""
import asyncio, functools, http.server, os, sys, tempfile, threading, zipfile
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
    await pg.click("#libraryFiles button >> nth=0")
    await pg.wait_for_selector(".route-row")
    await pg.fill("#fillFields input >> nth=0", "C1C Test")
    p = await save(pg, "#fillDownload", out, "esss.pdf")
    check("C1C Test" in xfa_datasets(p), "eSSS writes LiveCycle data")

    # Form 99 (both copies)
    await pg.click("#formChoices .choice >> nth=1")
    await pg.click("#libraryFiles button >> nth=0")
    await pg.wait_for_function("document.querySelector('#fillStatus').textContent.startsWith('AFCW IMT 99')")
    await pg.fill("#fillFields input >> nth=0", "Test, Cadet A")
    p = await save(pg, "#fillDownload", out, "f99.pdf")
    n = sum(1 for v in PdfReader(p).get_fields().values() if v.get("/V") == "Test, Cadet A")
    check(n == 2, "Form 99 fills both copies")

    # OCONUS checklist
    await pg.click("#formChoices .choice >> nth=2")
    await pg.click("#libraryFiles button >> nth=1")
    await pg.wait_for_function("document.querySelector('#fillStatus').textContent.startsWith('CW Foreign')")
    await pg.fill("#fillFields input >> nth=0", "TCA")
    p = await save(pg, "#fillDownload", out, "checklist.pdf")
    check(PdfReader(p).get_fields()["Initial When CompletedRow1"].get("/V") == "TCA", "OCONUS checklist fills")

    # Form 10, Report of Conduct
    await pg.click("#formChoices .choice:has-text('Form 10')")
    await pg.click("#libraryFiles button >> nth=0")
    await pg.wait_for_function("document.querySelector('#fillStatus').textContent.startsWith('AFCW IMT 10')")
    await pg.get_by_label("1. Cadet name (Last, First, MI)").fill("Morgan, Taylor R")
    await pg.get_by_label("8. Reporting official memorandum attached").select_option("Yes")
    p = await save(pg, "#fillDownload", out, "f10.pdf")
    f = PdfReader(p).get_fields(); k = "topmostSubform[0].Page1[0]."
    check(f[k + "TextField1[2]"].get("/V") == "Morgan, Taylor R" and f[k + "CheckBox1[0]"].get("/V") == "/1"
          and f[k + "CheckBox1[1]"].get("/V") in (None, "/Off"), "Form 10 fills name and Yes box")

    # Feedback worksheet, with the Classification Directory as a reference link
    await pg.click("#formChoices .choice:has-text('Feedback worksheet')")
    href = await pg.get_attribute("#libraryFiles a", "href")
    check(href and (await pg.request.get(URL + href)).ok, "Classification Directory link opens")
    await pg.click("#libraryFiles button >> nth=0")
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
    await pg.click("#libraryFiles button >> nth=0")
    await pg.wait_for_function("document.querySelector('#fillStatus').textContent.startsWith('AF Form 174')")
    await pg.get_by_label("9. Summary of counseling").fill("On 23 November 2026 we discussed formation standards.")
    p = await save(pg, "#fillDownload", out, "f174.pdf")
    v = PdfReader(p).get_fields()["9SUMMARYOFCOUNSELING Give details facts specific dates times names sequence of events etc"].get("/V")
    check(v == "On 23 November 2026 we discussed formation standards.", "Form 174 fills the counseling summary")

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
