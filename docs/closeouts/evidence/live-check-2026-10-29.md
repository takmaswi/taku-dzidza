# Live check, 29 October 2026

Command: `pnpm live-check --cap 0.10` against the local deployment (convex/notebooks/liveCheck.ts). Model: anthropic/claude-haiku-5.5 (OpenRouter models endpoint, same day: USD 0.10 per million input tokens, USD 0.50 per million output tokens, image input and structured outputs; zero data retention endpoints on Google Vertex, Azure and Anthropic).

| Check | Result | Tokens in / out | Cost USD | Time |
|---|---|---|---|---|
| Cited answer, Only my material | 2 parts, both quotes verified on the page, 0 dropped | 1,230 / 341 | 0.0002935 | 3.8 s |
| Photo of typed notes | All 5 lines read exactly | 1,227 / 102 | 0.0001737 | 2.1 s |
| Total | | | 0.000467 | |

Afterwards the local deployment was switched back to mock mode and the key removed.
