# Report evidence

Evidence for the CodingLab report, prepared on 31 October 2026 against local source revision `2b10da7`.

- `tests.txt`: captured combined backend and frontend test run (269 + 39 passed, zero failed/skipped).
- `build.txt`: captured production frontend build; includes the large-chunk warning.
- `metrics.json`: measured code statistics and counting scope.
- `measure-source.cjs`: reproducible measurement using the project's installed Babel parser. From the repository root, run `node doc/report-evidence/measure-source.cjs` after installing frontend dependencies. Tests, seed/import scripts, CSS, configuration and dependencies are excluded from the runtime-source count.
- `figures/`: figures extracted from the supplied design and final-presentation PDFs. Captions in the report identify original page numbers and implementation differences.

The report is supplied as an editable DOCX and Markdown source. No LaTeX is used. To meet the course's Google Docs requirement, upload `doc/final-report.docx` to Google Drive, open it with Google Docs, convert/save it as a Google Doc, refresh the table of contents, and review figure/table pagination. Export the completed Google Doc as PDF to `doc/final-report.pdf` for classroom submission.

The local DOCX is a preparation artifact, not evidence that a Google Doc has already been created. Google Drive access was not connected when it was prepared.

Session dates, attributed supervisor feedback, actual expenses, actual working hours, task-board screenshots and interpersonal meeting records were not supplied. The report labels these gaps and separates illustrative estimates from measured results. Verify these details before submission; do not substitute invented minutes or quotations.

The reported tests use controlled database/service doubles where described. Their passing results are not proof of live provider integration, a production database topology, 100-user capacity, five-second latency or 99.9% uptime.
