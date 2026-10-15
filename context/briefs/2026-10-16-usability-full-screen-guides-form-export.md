# Usability: faithful conversion, full-screen panels, guides, form export

Date: 16 October 2026. Owner request after a manual walkthrough with the long subscription booklet.

| Request | Decision |
| --- | --- |
| Source quality: a Word upload must produce a PDF identical to the Word file and repair problems automatically; PDF uploads need no conversion | Microsoft Word renders the PDF (print-quality export, structure tags; glyphs of non-embeddable fonts drawn as images). If Word fails or any text differs, conversion is retried once automatically and the better attempt is kept. When the text matches word for word and the only difference is a font missing on the conversion machine, the source is verified with a note instead of blocking. A typeface that is not installed cannot be reproduced; the note says how to embed fonts. PDF uploads are unchanged |
| A button to open any part of a screen full window | Every panel with a fixed height has a corner button. It opens the panel over the whole window and closes with Esc, the button or a click outside. PDF pages, the Word view and the relationship graph re-render at the larger size |
| Decision / report was hard to use; where are needs-confirmation items confirmed and finalised? | The decision buttons (Confirm, Approve as exception, Dismiss, Needs clarification, Reopen) are now also on the report, pinned under the preview. A "Next step" line states exactly what still blocks Continue to annotation |
| A usage guide for every page, written as a workflow | "How to use" in the top bar on every screen: purpose, numbered steps naming the buttons to click, when to move on, and tips |
| Form preview: export as an HTML or Google-Form-like form so people fill it quickly and the results come back | "Export HTML form" downloads one self-contained page with the full contract text and the fields. Submit checks required fields and saves an answers file, which "Import answers" in Responses loads for that exact form version. A hosted share link was not built because it would expose contract text to anyone holding the link |
