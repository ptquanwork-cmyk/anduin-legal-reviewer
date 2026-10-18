# Production test, updated introduction video, worker kept online

Date: 19 October 2026.

Request (summarised from the owner's messages):
- Test the live app end to end and make sure every feature works.
- After the tests, work out the numbers with confidence levels, and redo the introduction video on GitHub with the new test numbers and the new features (the revised PDF from step 05 and Vietnamese answers in filled PDFs).
- Keep the worker running, because the app will be submitted to the hackathon and judges will use it.

Decisions:
- Results are reported with 95% Wilson score intervals. They describe uncertainty on this synthetic sample only, not accuracy on real contracts. The manual check of 129 findings from 16 October is kept with its date, because it was not repeated.
- The video keeps its structure. Chapter 3 becomes "Decide, report & revise", with a new Create revised PDF scene, and the passing export shows a Vietnamese answer.
- The worker runs on the owner's machine (`worker/run_local.py`). It stays online only while that machine is on and awake.
