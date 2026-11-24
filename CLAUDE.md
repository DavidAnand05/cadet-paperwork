# Cadet Paperwork Builder

A free, public, unofficial website that helps U.S. Air Force Academy cadets write Tongue and Quill memorandums and fill cadet forms. Built for CS-11; it works for any squadron.

- Repository: https://github.com/DavidAnand05/cadet-paperwork (public, branch `main`)
- Live site: https://davidanand05.github.io/cadet-paperwork/ (GitHub Pages from `main`, root folder; updates about a minute after each push)
- Owner: C1C David L. Anand (goes by Gabe), CS-11, Class of 2027

## Rules for working on this project

1. **Follow DAFH 33-337, The Tongue and Quill, in everything users read.** That includes site copy, hints, examples and generated documents:
   - Use "memorandum," not "memo." No contractions in site copy.
   - Use active voice and put the bottom line first.
   - Write dates as day, month and year: 23 November 2026.
   - Use open punctuation (no comma before the final "and"), which T&Q allows; stay consistent.
   - Spell out an acronym on first use.
   - Signature blocks: name in capitals, then grade and service (FIRSTNAME M. LASTNAME, C1C, USAFA), duty title on line 2, 4.5 inches from the left edge, on the 5th line below the text.
2. **Keep it public and private at the same time.** Everything runs in the browser, and nothing a cadet types is sent anywhere. Do not add servers, analytics or accounts.
3. **Never publish real people's information.** Examples use fictional names (Taylor R. Morgan, Jordan A. Reyes, Casey M. Diaz, Jordan P. Lee). Hosted blank forms have staff names removed, and presets use office symbols only (CS-11/Exec, CS-11/AMT, CS-11/CC). A real CS-11 report naming cadets was deliberately left out; never add it.
4. **No build step.** Plain HTML, CSS and JavaScript. Libraries are vendored in `assets/`; do not add a bundler or a CDN dependency.
5. **Test before you push.** Run `python tests/smoke.py`; it must pass in both Chromium and WebKit (Safari's engine). Check any visual change at 390 px and 1400 px wide, in light and dark themes.
6. Ask the owner before deleting features or forms.

## Files

| File | Purpose |
|---|---|
| `index.html` | The page: three tabs (Write a memorandum, Fill a form, Feedback). An inline head script sets `data-theme` before the page draws. |
| `styles.css` | All styles. Design tokens at the top, with a dark theme on `:root[data-theme="dark"]`. U.S. Web Design System conventions. |
| `app.js` | Memorandum builder: 5 steps (Purpose, Recipient, You, Content, Review), state in localStorage (`cadet-mfr-builder-v1`), review checks, export, phone preview sheet. Exposes `window.MFRApp`. |
| `mfr-docx.js` | `MFR.buildBlocks(state)` builds the memorandum as neutral lines, used by both the live preview and the .docx export. `MFR.exportDocx` writes those lines into the letterhead template. |
| `examples.js` | Four finished example memorandums written to T&Q. |
| `fill.js` | Fill a form: reads standard PDF fields, Adobe LiveCycle (XFA) data and Word templates; renders the fields; writes them back. |
| `forms-library.js` | Built-in form definitions (`FORM_DEFS`), the forms list (`FORM_LIBRARY`), eSSS presets and the OCONUS steps. |
| `feedback.js`, `site-config.js` | Feedback sends a prefilled GitHub issue (repo set in `site-config.js`). Set `feedbackEmail` there to show an email button. |
| `download.js` | `window.saveFile(blob, name)`: a normal browser download, or the host's save dialog inside a claude.ai preview. |
| `theme.js` | Auto, Light and Dark switch; Auto follows the device live. Saved as `cadet-theme`. |
| `assets/mfr-template.docx` | Letterhead template (Department of War seal, CS-11 patch). The export replaces the body and swaps the squadron number (the text ` 11` in `word/header3.xml`) and the patch. |
| `assets/mfr-template.docx.b64.txt` | Base64 copy of the template, used when a host will not serve .docx files. Regenerate it whenever the template changes: `base64 -w0 assets/mfr-template.docx > assets/mfr-template.docx.b64.txt`. |
| `assets/forms/` | Blank built-in forms: eSSS (AF Form 1768), AFCW IMT 99, AFCW IMT 10, CW Form 724 feedback worksheet and the OCONUS checklist, Force Protection Plan and itinerary. Also the AFCW Classification Directory (6 August 2025), a reference only, linked from the feedback worksheet; it is not a form to fill. |
| `tests/smoke.py` | End-to-end test in Chromium and WebKit, covering every download. |

## How the forms work

- **eSSS (AF Form 1768)** is a dynamic LiveCycle form with no standard fields. The site edits the XFA `datasets` XML directly, keyed like `AF1768_unlocked/TOONE[0]`, and removes `/Perms` (Reader usage rights), because editing the data invalidates them. The output opens only in Adobe Acrobat or Reader. The summary uses T&Q Chapter 18 headings: Purpose, Background, Discussion, Views of Others, Recommendation. Action terms: Coord, Appr, Sig, Info.
- **AFCW IMT 99** is a static LiveCycle form with standard fields named `TextField1[n]`. Labels were mapped by position, and the page has two identical copies, so each answer writes to both keys. The site deletes the XFA layer and fills the standard fields.
- **AFCW IMT 10** (Report of Conduct) is the same static LiveCycle layout as Form 99, one copy; labels mapped by position. Hosted blank was made from a filled, CAC-signed copy: values, signatures, certificates, XFA data and metadata removed, and rebuilt so no orphaned objects remain.
- **CW Form 724** (Cadet Comprehensive Assessment Worksheet, feedback) is a standard AcroForm. Field names do not match their printed questions (field `7 Do you have Wingmen...` sits under question 7 about high-risk activities), so labels come from position. Rating rows are checkbox sets handled by the `pick` field type (choose one; the site checks it and clears the others). The form links every Initial or Not-Rated box and the Initial assessment-type box into one field. Rich-text flags were cleared because pdf-lib cannot read empty rich-text fields.
- **Character letter** is a memorandum type in `app.js`, matched to the owner's template: MEMORANDUM FOR ALL REVIEWING AUTHORITIES, FROM: grade and name (no office symbol), SUBJECT: Character Letter for (grade and name), four paragraphs (who you are, relationship, opinion with examples and awareness of the allegations, conclusion with contact information).
- **Before hosting any form a cadet supplies,** check field values, signatures (`/Sig` values hold CAC certificates with DoD ID numbers), XFA datasets, document metadata and orphaned objects for real names.
- **OCONUS package:** the eSSS with an OCONUS preset, the checklist (15 rows of initials and dates), the Force Protection Plan (labels from tooltips) and the itinerary. The steps come from the CS-11 OCONUS Package Instruction Manual.
- **Any uploaded PDF or Word file:** PDF labels come from field tooltips when they are unique, otherwise from the field name. Word blanks are highlighted text, `[square brackets]` or `{{double braces}}`; the same text in several places fills together.
- A definition in `FORM_DEFS` also applies automatically when a cadet uploads their own copy of the same form (matched by field keys).

## Gotchas (each one has already caused a bug)

- **pdf-lib strips LiveCycle data the moment you call `getForm()`.** Read the XFA datasets first (see `pdfFields` in `fill.js`).
- **Only write PDF fields the cadet changed.** `fill.js` tracks a `dirty` set; re-saving untouched radio buttons changed their values.
- **Theme:** do not detect Auto with `:root:not([data-theme])` inside a media query. WebKit did not reapply it after reload. Script always sets `data-theme` to `light` or `dark`.
- **Regex edits to CSS:** a find-and-replace on `prop: value` once matched selectors like `li::before` and `.btn:hover` and broke 19 rules. Change declarations inside `{ }` only.
- **JSZip:** pass `{ createFolders: false }` to `zip.file()`, or the .docx gains folder entries that break cloud-hosted Word.
- **The memorandum preview is approximate.** The .docx export is the source of truth for spacing. Keep the preview paper white in both themes.
- **Contrast:** text needs 4.5:1, and borders, focus rings and progress bars need 3:1, in both themes. Touch targets are 44 px on phones and tablets (`pointer: coarse`).

## Status and open items (23 November 2026)

- Done: memorandum builder, form filler, built-in forms, OCONUS guide, examples, feedback, dark mode, phone layout, accessibility pass. All smoke checks pass in Chromium and WebKit.
- Open one filled eSSS in Adobe Acrobat to confirm the LiveCycle output; it cannot be checked outside Adobe.
- Test on a physical iPhone in Safari; WebKit emulation passes.
- Choose a feedback email, if wanted (`site-config.js`).
- The owner is testing the site and will send feedback on changes and improvements.

## Local development

```bash
python -m http.server 8000          # then open http://localhost:8000
pip install playwright pypdf && python -m playwright install chromium webkit
python tests/smoke.py               # must print "All checks passed."
```
