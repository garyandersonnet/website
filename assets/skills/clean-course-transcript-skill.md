---
name: clean-course-transcript
description: "Create a new Word copy of the attached course transcript with automatic paragraph numbering organized by lecture."
---

# Skill: clean-course-transcript

Create a new Word copy of the attached course transcript with automatic paragraph numbering organized by lecture. The deliverable is a Word (.docx) document only — do not produce a PDF.

## Requirements

- Add an "at a glance" paragraph at the start of each lecture: a boxed, under-100-word overview of the lecture.
- Highlight any key vocabulary or characters distinct to that course.
- Preserve the original document unchanged other than correcting obvious transcription errors.
- Keep the output as a .docx Word document.
- Do not insert paragraph numbers as text — use Word's automatic numbering formatting.
- Number transcript paragraphs using the lecture number followed by the paragraph number:
  - Lecture 1: 1.1, 1.2, 1.3…
  - Lecture 2: 2.1, 2.2, 2.3…
  - Continue the same pattern for every lecture.
- Restart the paragraph count at 1 at the beginning of each lecture.
- Do not number:
  - The cover page
  - The table of contents
  - Lecture headings
  - Lesson-overview / "at a glance" boxes
  - Blank paragraphs
  - Remove any single stray lines (e.g. "slides", "exam") that weren't part of the transcript.
- Style lecture titles as Heading 1.
- Style the course title as Title style.
- Place numbers in a narrow left gutter with a hanging indent so wrapped text aligns beneath the paragraph text, not beneath the number. If any paragraph number in the document reaches 3 digits (e.g. "8.100"), use a gutter wide enough (~0.45in) that it won't collide with the paragraph text — check this before finalizing, not after.
- Use restrained blue, bold formatting for the paragraph numbers.
- Do not alter, rewrite, summarize, remove, or add any transcript wording.
- Begin with the table-of-contents page and course title.
- Save the result in the same directory as the original source transcript file, as a separate file named: `[Original filename] - Numbered Paragraphs.docx`.
- Verify structurally that the transcript text in the finished copy is identical to the source transcript text except for intentional changes.
- Render and visually spot-check the .docx before delivery (see "Verification" below) — cover, TOC, first lecture opening, a lecture-boundary page (confirm the number restarts at X.1), a page with the highest paragraph numbers in the doc (confirm the gutter doesn't clip 2- or 3-digit numbers), and the last page. Fix any clipping, overlap, awkward indentation, broken numbering, stale contents-page references, or poor page breaks found.
- Deliver the .docx to the user.

## PDF — not part of this skill for now

Do not produce a PDF. The deliverable is the validated .docx only. Skipping PDF conversion is intentional — it keeps this step fast and low-cost in output quality. If a PDF is ever needed (e.g. for printing, where Word's automatic numbering may not render reliably), it is a separate, on-demand step run later by converting the final validated .docx (see the numbered-transcripts-to-pdf skill) — never rebuilt independently with reportlab or a from-scratch PDF renderer, which can silently drift out of sync with the Word file's numbering.

## Verification — proportional, not exhaustive

Spot-check the handful of pages listed above (cover, TOC, first lecture, a lecture boundary, the densest-numbering page, the last page) and run one structural text diff of transcript body text (source vs. output, normalized whitespace) to confirm nothing was added, dropped, or reworded beyond the intentional typo fixes. That's sufficient. Re-rendering and re-diffing the entire document repeatedly, or re-verifying after every micro-edit, burns a large share of the budget for no real gain in output quality — do it once, near the end, after the docx is otherwise finished.

## Running this for multiple courses at once

When asked to run this across several courses in one go (e.g. "do this for every course in Semester 1"), the biggest cost driver is spawning one heavyweight, fully-independent agent per course in parallel — each one re-extracts, re-builds, and re-verifies from scratch, and duplicate/overlapping agents on the same course (e.g. resuming one that looks slow, while the original is actually still working) can silently overwrite each other's output and double the cost for zero benefit. To keep this efficient and within rate/usage limits:

- Batch courses in small groups (2-3 at a time), not all at once. Confirm each batch's output exists on disk (`ls` the target files) before starting the next batch.
- Each agent builds and validates the **.docx only** — text extraction, lecture/paragraph parsing, numbering, highlighting, at-a-glance boxes, and the spot-check verification above.
- If an agent seems slow or stalled, check whether its output files already exist on disk before concluding it failed and launching a replacement. If you do need to prod a stalled agent, resume the *same* agent (it has context on what it already did) rather than launching a fresh duplicate on the same file.
- If an agent reports it "launched a background agent" or "handed this off" to do the actual work, that's not a real capability it has — it must do every step itself with its own tool calls. Treat such a report as a stall, not a completion, and check disk state before believing it.
