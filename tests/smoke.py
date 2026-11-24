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

    # Uploaded fillable PDF and Word template
    await pg.click("#formChoices .choice >> nth=5")
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
