# Cadet Paperwork Builder

A static website that helps cadets write Tongue and Quill memorandums and fill forms.

- **Write a memorandum:** pick the purpose and the recipient, fill in guided fields, check a live preview and download a Word document on the squadron letterhead. Three finished examples show what a correct memorandum looks like.
- **Fill a form:** load a built-in blank form (eSSS / AF Form 1768, AFCW IMT 99, AFCW IMT 10, the CW Form 724 feedback worksheet and the CS-11 OCONUS travel package) or upload any fillable PDF, including Adobe LiveCycle forms, or a Word template with marked blanks. The site lists each blank with Tongue and Quill guidance and downloads the completed form. The OCONUS option adds a step-by-step checklist.
- **Check paperwork:** upload a Word memorandum or a filled fillable PDF; the site lists Tongue and Quill corrections (placeholders, contractions, dates, memorandum format) and suggestions (passive voice, long sentences, wordy phrases, acronyms).
- **Feedback:** cadets send feedback by email or as a GitHub issue. Set the address in `site-config.js`.

Everything runs in the browser. Nothing typed into the site is uploaded or stored anywhere except the cadet's own browser.

## Files

| File | What it does |
|---|---|
| `index.html` | The page |
| `styles.css` | Look and layout |
| `app.js` | The step-by-step form, prompts and review checks |
| `mfr-docx.js` | Builds the memorandum and the .docx download |
| `examples.js` | Finished example memorandums |
| `fill.js` | Reads and fills PDF forms and Word templates |
| `forms-library.js` | Labels, groups and guidance for the built-in forms, and the OCONUS steps |
| `assets/forms/` | Blank built-in forms, with sample names removed |
| `feedback.js` | Feedback form |
| `site-config.js` | Repository name and feedback email |
| `assets/pdf-lib.min.js` | Library that fills PDF forms in the browser |
| `assets/mfr-template.docx` | Letterhead template (Department of War seal, CS-11 patch) |
| `assets/jszip.min.js` | Library that builds the .docx in the browser |
| `assets/fonts/` | Public Sans font files |

## Put it on GitHub Pages

1. Create a new public repository on GitHub, for example `cadet-paperwork`.
2. Upload every file and folder in this directory to the repository's main branch.
3. In the repository, open **Settings**, then **Pages**.
4. Under **Build and deployment**, set **Source** to *Deploy from a branch*, choose `main` and `/ (root)`, then save.
5. After a minute or two the site is live at `https://<your-username>.github.io/cadet-paperwork/`.

## Test

```bash
pip install playwright pypdf && python -m playwright install chromium webkit
python tests/smoke.py
```

## Change the letterhead

Replace `assets/mfr-template.docx` with another Word file that has the letterhead you want. The site replaces everything in the body and keeps the header. The squadron number is swapped in automatically when the header contains the text ` 11`. After replacing it, regenerate the text copy: `base64 -w0 assets/mfr-template.docx > assets/mfr-template.docx.b64.txt`.

## Notes

- Unofficial cadet tool, not endorsed by USAFA or the Department of the Air Force.
- Do not enter CUI, other people's PII or classified information.
