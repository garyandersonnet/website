---
name: numbered-transcripts-to-pdf
description: "Convert finished numbered-paragraph transcript Word files (.docx) into printable PDFs, one or many at a time, by converting the actual .docx (never rebuilding from scratch)."
---

# Skill: numbered-transcripts-to-pdf

Convert already-finished numbered transcript Word documents (the `[... ] - Numbered Paragraphs.docx` files produced by the clean-course-transcript skill) into printable PDFs. Use this as a separate, on-demand step — for printing, or when a search tool cites paragraph numbers incorrectly from the .docx.

The PDF must be produced by converting the actual validated .docx. Never render an independent PDF from scratch (e.g. with reportlab, weasyprint, or any from-scratch renderer) — a separately-built PDF can silently drift out of sync with the Word file's numbering, at-a-glance boxes, and layout.

## Inputs

- A single .docx path, a list of them, or a folder to convert. When given a folder, convert every `*.docx` whose name ends in `- Numbered Paragraphs.docx` (skip other .docx such as study guides unless the user says otherwise).
- If the user is vague ("convert the numbered transcripts"), confirm the target folder first, then list what you'll convert before starting.

## Conversion command

Convert with LibreOffice headless. Each PDF is written next to its source .docx unless the user asks for a different output folder.

macOS (LibreOffice is often NOT on PATH even when installed — use the full path, don't conclude it's missing):
```
/Applications/LibreOffice.app/Contents/MacOS/soffice --headless --convert-to pdf --outdir "OUTPUT_DIR" "path/to/file - Numbered Paragraphs.docx"
```

Linux / cloud:
```
soffice --headless --convert-to pdf --outdir "OUTPUT_DIR" "path/to/file - Numbered Paragraphs.docx"
```

Notes:
- `--outdir` defaults to the source file's own directory. The output filename is the source basename with `.pdf`.
- Do NOT use Pages, Numbers, `textutil`, or AppleScript/`osascript` to convert — driving another app via Automation triggers a macOS permission prompt and isn't a reliable substitute.
- If LibreOffice genuinely isn't installed, say so and ask the user to install it — do not silently fall back to a from-scratch PDF renderer.
- Run one `soffice` invocation at a time. Converting many files in a single directory: loop over them, or pass multiple file paths to one invocation, but don't launch several concurrent `soffice` processes — they can collide on the shared user profile and fail.

## Batch handling

- For a folder or long list, convert in small groups and confirm each expected `.pdf` exists on disk (`ls` the target) before moving on.
- Skip a file if an up-to-date PDF already exists (same basename, newer than the .docx), unless the user asks to re-convert.
- Report a short summary at the end: how many converted, skipped, and any that failed.

## Verification

- After converting, confirm each expected `.pdf` exists and is non-empty.
- Spot-check one PDF per batch by opening/rendering a couple of pages — the cover/TOC, a lecture-boundary page, and the densest-numbering page — to confirm the paragraph numbers, at-a-glance boxes, and gutter survived the conversion (Word's automatic numbering can render differently in PDF). If numbers are missing or clipped, flag it to the user rather than silently delivering — the fix is in the source .docx, not the PDF.
- Do not re-verify exhaustively; a spot-check per batch is enough.

## Delivery

- Deliver the resulting PDF(s) to the user, saved alongside the source transcripts (or in the requested output folder).
