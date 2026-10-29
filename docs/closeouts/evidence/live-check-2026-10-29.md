# Live check, 29 October 2026

Command: `pnpm live-check --cap 0.10` against the local deployment (convex/notebooks/liveCheck.ts). Model: anthropic/claude-haiku-5.5 (OpenRouter models endpoint, same day: USD 0.10 per million input tokens, USD 0.50 per million output tokens, image input and structured outputs; zero data retention endpoints on Google Vertex, Azure and Anthropic).

| Check | Result | Tokens in / out | Cost USD | Time |
|---|---|---|---|---|
| Cited answer, Only my material | 2 parts, both quotes verified on the page, 0 dropped | 1,230 / 341 | 0.0002935 | 3.8 s |
| Photo of typed notes | All 5 lines read exactly | 1,227 / 102 | 0.0001737 | 2.1 s |
| Total | | | 0.000467 | |

Afterwards the local deployment was switched back to mock mode and the key removed.

## Quiz checks (Phase 3)

`pnpm live-check --cap 0.10 --only quiz`, Only my material, Locked In style, 4 questions, medium, 15 minutes.

| Run | Result | Tokens in / out | Cost USD |
|---|---|---|---|
| 1 | 3 questions in exam style, all quotes verified; but the multiple choice answer was empty and prompts carried their own numbers | 1,581 / 1,785 | 0.0010506 |
| 2 (after the fix) | The model returned one unusable multiple choice question, which the new check left out | not recorded | 0.0007005 |
| 3 (after the fix) | 3 questions, multiple choice answer "Oxygen", no numbering in prompts, all quotes verified | not recorded | 0.000973 |

Fixes from run 1: the quiz mode now tells the model not to number prompts and to give the exact option text as the answer; the server strips leading numbers and finds the answer from text, a letter or the marking points, and leaves out any multiple choice question it cannot mark.

Live spend on 29 October 2026 in total: about USD 0.0032.
