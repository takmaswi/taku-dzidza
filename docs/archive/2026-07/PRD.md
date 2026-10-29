# TAKU-Dzidza PRD

Version 1.0, 14 July 2026. Status: proposed for approval.
Companion documents: [ARCHITECTURE.md](ARCHITECTURE.md) (system design, Path A and Path B), [SOURCES.md](SOURCES.md) (evidence and URLs).

"Dzidza" is Shona for "to learn." TAKU-Dzidza is a tutor built to make students think, not to think for them.

---

## 1. What this document is

This PRD defines a full rebuild of TAKU-Dzidza. It is written for three audiences at once: the build team, investors, and government or challenge reviewers. Every major claim carries a source in [SOURCES.md](SOURCES.md). Every decision that needs a real-device test before it can be trusted is marked **[GATE]** and collected in section 15.

Where this document disagrees with the project's earlier planning assumptions, the disagreement is stated openly and marked **[DISAGREEMENT]**. There are five of them, listed together in section 16.

---

## 2. Mission

Technology and internet access should not decide which children get knowledge. A student in rural Mudzi with a 2GB phone and no data bundle deserves the same quality of explanation, the same currency of information, and the same chance to build real skill as a student in Harare with fibre.

Every design choice in this document is judged by one test: **does it widen access for the child furthest from infrastructure?** Not "does it demo well," not "does it match what urban edtech looks like." If a feature only works with a connection, it is a bonus layer, never the core.

The mission has a second half that is just as binding. Getting an AI into a child's hands is not the goal; getting knowledge and thinking skill into the child is. An AI that hands out answers widens access to answers and narrows access to competence. TAKU-Dzidza is deliberately built the other way.

---

## 3. Who it serves

Primary user: a secondary student on a low-cost Android phone (2 to 4GB RAM), in Zimbabwe first, sitting ZIMSEC or Cambridge exams, with connectivity that ranges from none to occasional to decent. Zimbabwe's numbers frame the problem: roughly 38% of the population uses the internet, 67% live in rural areas, 4G reaches about 65% of people, rural grid electricity reaches under a quarter of households, and mobile data is among the most expensive in the world relative to income. The country is short an estimated 50,000 teachers and loses around 300 more each month.

Secondary users: primary students (simpler content, mother-tongue early grades), students sharing a family laptop, students who can only reach a browser at a school or kiosk, and adult self-learners.

Third circle: teachers and parents. They see effort and progress, not chat transcripts by default. A teacher-facing view is also the natural anti-cheating control, a pattern Khanmigo proved.

Not Zimbabwe-only. The product is a runtime that loads **curriculum packs**. ZIMSEC and Cambridge are the first two packs. Kenya CBC, Zambia ECZ, or any other syllabus is a content project, not a code project. Language, grade structure, and curriculum are data. This is what makes the product adoptable by other countries on the same architecture.

---

## 4. The evidence this product stands on

The strongest replicated finding in recent learning research is uncomfortable for the whole AI-homework category:

- Bastani et al. (PNAS 2025, randomized trial, about 1,000 high-school students): students with raw GPT-4 access did 48% better on practice but **17% worse on the unaided exam** than students with no AI at all. A hint-only version of the same model removed the harm entirely. Same model, opposite outcome. Interaction design was the variable.
- Kestin et al. (Scientific Reports 2025, randomized trial, N=194): a guardrailed Socratic AI tutor produced about 30% higher post-test scores in about 35% less study time than well-run active-learning classes. The popular summary "roughly doubled learning" refers to gain per unit time.
- A 2025 UK randomized trial found Google's pedagogy-tuned LearnLM at parity with expert human tutors, with a small edge on later independent problem solving.
- The older intelligent-tutoring literature says the ceiling is high: step-based tutoring systems reach effect sizes near human tutoring (d = 0.76 vs 0.79 in VanLehn's review; median d = 0.66 across 50 studies in Kulik and Fletcher).
- Deployed in Africa specifically: Rori, a WhatsApp maths tutor run by Rising Academies in Ghana and Sierra Leone, measured about 0.3 standard deviations of extra maths learning, roughly an added year of progress, on cheap phones over low bandwidth.

Read together: AI tutoring can genuinely work, unguarded AI reliably harms, and the difference is enforced pedagogy, not model quality. A 2026 benchmark (SafeTutors) confirms that default LLMs leak answers under adversarial pressure and prompt-level guardrails are not enough. So the rule this product is built on is:

> **Pedagogy lives in code. Language lives in the model.**

Deterministic application code owns answer withholding, hint progression, effort gating, and assessment. The model is never trusted to hold the line on its own.

---

## 5. The core product insight: content first, model optional

**[DISAGREEMENT 1]** The earlier plan, like most AI-tutor plans, treats the app as a wrapper around an on-device LLM. I think that is the wrong load-bearing wall, and it is the most important thing this rebuild changes.

On a $60 phone, a 1B-parameter model is slow, drains battery, hallucinates, and cannot be trusted with a child's education. Meanwhile, the interventions with the strongest evidence need no generation at all: authored problems with tiered hints, worked solutions, spaced review, retrieval practice, interactive simulations, mastery gating. onebillion won the Global Learning XPRIZE with adaptive software and zero LLM. Rori's measured gains come mostly from structured curriculum content delivered conversationally.

So TAKU-Dzidza is built as **a complete tutor that happens to have a model, not a model that happens to have content**:

- **Layer 1, always works, any phone including 1GB:** curriculum packs (problems, tiered hints, worked solutions, interactive lessons), the pedagogy engine, the math engine (CAS), spaced review, and progress tracking. Fully deterministic, fully offline, zero hallucination risk. This alone is a strong product; it is roughly what the best pre-LLM tutoring systems were, and their effect sizes were large.
- **Layer 2, when the device can run a small model:** natural-language conversation over Layer 1. The model rephrases the current hint in the student's words, answers "what does this mean?" questions grounded in pack content, and does loose grading of self-explanations. It phrases; it does not decide.
- **Layer 3, when connectivity exists:** a larger hosted model (Path B) upgrades the conversation quality, and an online mode adds safely-grounded current information. Same pedagogy engine, same rules.

This ordering changes everything downstream. The floor device drops from "4GB phone that can run a 1B model" to "any Android phone that can run a lightweight app." The trust problem shrinks from "make a small model honest" to "keep a small model inside a fence built of vetted content." And the product degrades gracefully by construction: losing the model loses polish, never function.

---

## 6. The learning experience

### 6.1 The session loop

A session is not an open chat box. It is a guided loop the pedagogy engine drives:

1. **Warm-up retrieval.** Two or three quick recall questions from earlier material (testing effect, spacing).
2. **New problem.** Selected by the engine from the pack, using the student's mastery profile. The student can also photograph a textbook problem (OCR) or type one; the engine matches it to pack content where possible.
3. **Attempt first.** No help of any kind until the student commits an attempt or a written plan. This is the effort gate, the exact mechanism that separated harm from benefit in the Wharton study.
4. **Hint ladder.** If stuck, help arrives in fixed rungs: nudge, then a conceptual hint, then a procedural hint, then one worked step. Never the final answer. Each rung requires a new attempt before the next unlocks. The engine chooses the rung; the model only phrases it.
5. **Socratic refusal.** "Just give me the answer" is met with a question, not a solution. The refusal is enforced in code; the model cannot be argued out of it because the model does not hold the answer.
6. **Self-explanation gate.** After solving, the student explains the key step in their own words before moving on (self-explanation effect, g = 0.66 across 64 studies). The model grades loosely; the engine only needs a pass/retry signal.
7. **Unaided checkpoints.** At intervals, problems arrive with all help disabled. These are the product's honest measure of itself, and they feed the mastery model.
8. **Closing.** One-line recap the student completes ("today I learned..."), and the spaced-review queue is updated (1, 3, 7 day resurfacing).

Scaffolding fades as mastery rises (assistance dilemma, expertise reversal effect): a student who no longer needs the ladder stops being offered it early, and hint depth shrinks. The fade decision is analytics-driven, never the model's judgment.

### 6.2 Struggle without abandonment

Productive struggle has a failure mode: frustration and quitting. The engine treats these as first-class signals, not noise:

- Attempt quality is judged loosely. A genuine wrong attempt opens the ladder; gibberish or instant re-submission does not (rapid-guess detection, from the gaming-the-system literature).
- After two failed rungs on the same problem, the engine can step the difficulty down or switch to a worked example of a *similar* problem, then return. A student is never left grinding on one wall.
- There is an escape hatch: the student can always park a problem and see the full worked solution *of a parallel problem*, never the one that counts toward mastery.
- Session length is capped for younger grades. Streak mechanics are deliberately mild: the app rewards return and effort, never speed or volume, because engagement metrics that reward speed teach answer-hunting.

### 6.3 Interactive, visual, and animated on weak hardware

A plain chat box is the wrong interface for learning and the wrong showcase for this product. The bar is set by Brilliant, PhET, and Desmos: the student manipulates something, predicts, then sees the explanation. PhET's HTML5 simulations run on an iPad 2; this quality is achievable on cheap hardware if it is engineered for, not bolted on.

The approach:

- **Interactive lesson widgets** are a small, constrained runtime: 2D Canvas and SVG, a shared math-rendering component, draggable diagrams, number lines, graph plotters, and step-by-step algebra displays powered by the CAS. Authors compose widgets in packs; they do not write arbitrary code.
- **Motion uses Rive** (or an equivalent lightweight runtime) for character and feedback animation: small files, 60fps on low-end devices, fully offline. Lottie is the fallback. No video as a core teaching medium; video is expensive to ship offline and pedagogically passive.
- **Graceful degradation is explicit:** every widget declares a static fallback (image plus text) used on very weak devices or when the widget runtime is unavailable. Reduced-motion is respected.
- The visual language should feel like a crafted product, not a template: one distinctive direction, strong hierarchy, deliberate color with meaning (state, subject, mastery), and micro-interactions on every answer submission. Details belong to the design phase, but "generic chat app" is ruled out here.

### 6.4 Photographed problems

The camera flow (photograph a problem from a textbook or past paper) uses on-device OCR (ML Kit class, about 4MB, offline). Recognized problems are matched against the pack first; a matched problem gets the full authored ladder. An unmatched problem falls back to model-led tutoring with the trust stack (section 8) and a visible "this problem is not in my library, so I will guide but not confirm answers" state. Honesty about confidence is part of the pedagogy.

---

## 7. The pedagogy engine

The engine is a deterministic state machine, one instance per problem, written once in portable TypeScript and reused unchanged across phone, laptop, hub, and server (see ARCHITECTURE.md).

What is enforced **in code**, and can never be overridden by the model or by prompt injection:

- The effort gate (no help before an attempt).
- The hint ladder position and progression rules.
- Answer withholding: the canonical answer lives in the engine's private state and is *not placed in the model's context*. The model cannot leak what it does not have.
- A post-generation filter that scans model output for the withheld answer (numeric and string forms, CAS-normalized equivalents) and blocks the message if found.
- Unaided checkpoint scheduling, spaced-review scheduling, difficulty selection, and fading.
- Session caps, gaming detection, and escape-hatch rules.

What the **model** does: phrase the current rung naturally, in the student's language and register; answer clarifying questions grounded in retrieved pack content; grade self-explanations loosely; encourage. If the model is absent (Layer 1 devices), authored hint text is shown directly and self-explanation grading falls back to keyword matching plus self-assessment. The product remains whole.

A small fine-tune (DPO on Socratic-versus-answer-giving preference pairs) hardens the model's default behavior so the code gate is a backstop, not the first line of defense. SafeTutors-style adversarial testing (students actively trying to extract answers) is part of the release checklist, not a research afterthought.

---

## 8. Trust: how answers stay correct

No small model, and no large one, is trusted as a free-standing source of facts. Correctness comes from layers, ordered from strongest to weakest:

1. **Authored ground truth.** Pack problems carry canonical answers, worked solutions, and hint text written or reviewed by teachers. For pack content, the model never computes an answer; it presents one.
2. **Deterministic math.** All arithmetic and symbolic algebra is done by a CAS the model tool-calls (mathsteps and nerdamer class, running in the shared core), never by the model's own token prediction. The CAS also produces human-readable steps, which is exactly what a tutor needs.
3. **Retrieval before generation.** Free-form questions are answered from retrieved pack passages, with the source shown ("from your Form 3 Combined Science pack"). Retrieval confidence gates generation: below threshold, the tutor says it does not have that in its library rather than improvising. Fine-tuning small models to say "I don't know" is a known, working technique.
4. **Constrained generation roles.** The model's jobs (phrasing, feedback, loose grading) are chosen so that a wrong generation is annoying, not damaging. It is structurally hard for the model to teach a wrong fact because facts come from layers 1 to 3.
5. **Server-side verification (Path B only).** The hosted tier adds a verifier pass on open-ended answers and periodic sampled audits of tutoring transcripts against the pack. On-device verifier passes are skipped: they roughly double latency for marginal gain at this scale, and layers 1 to 4 carry the guarantee. Self-verification is also known to be unreliable below about 13B parameters.
6. **Online mode (optional, connected users).** Live-web answers come only from an allowlisted source set (curriculum bodies, Wikipedia, vetted science sources), retrieved server-side, cited inline, and filtered through the same grade-band controls. If the allowlist cannot answer, the tutor says so. Web access never bypasses the pedagogy engine.

---

## 9. Right level for every student

A grade 1 learner must never get a university answer, and a university student must never get a grade 1 answer. This is enforced in three places, so no single layer has to be perfect:

1. **Retrieval scope.** Every pack chunk carries grade-band metadata. Retrieval for a Form 2 student searches Form 1 to Form 3 material, nothing else. The knowledge the model can ground on is level-bounded before generation starts.
2. **Curriculum boundaries as content.** Packs encode what is in and out of syllabus at each level, so the engine knows that "explain calculus" from an O-Level student maps to gradient-of-a-curve foundations, not epsilon-delta.
3. **Output register.** The model receives the student's grade band and language level as generation instructions, and the pedagogy fine-tune includes readability-controlled examples. Readability-controlled generation is proven technique (ReadCtrl-class instruction tuning outperformed GPT-4 on level-matching in expert evaluation). A lightweight readability check on output (sentence length, vocabulary list per band) catches drift.

Level is a property of the student profile, set at onboarding and adjustable. A student who wants to read above their level can raise it deliberately; the product stretches students up, it just never does so by accident.

---

## 10. Curriculum packs: the platform

A pack is a signed, versioned bundle of content: syllabus map, problems with canonical answers and tiered hints, worked solutions, lesson widgets, retrieval corpus with grade-band tags, and language variants. Packs are the unit of curriculum, of language, of updates, and of expansion to new countries.

- **Multi-curriculum by construction.** ZIMSEC packs and Cambridge packs coexist on one device; a student selects their exam board per subject. A new country is a new pack set plus review by local educators.
- **Versioned and refreshable.** Packs update independently of the app and the model, as small deltas. An offline student's knowledge stays current through whichever channel reaches them first: a resumable download, a school hub sync, a peer transfer from a classmate's phone, or a microSD card. All packs are cryptographically signed, so content arriving by sneakernet is exactly as trustworthy as content from the server. Distribution mechanics are in ARCHITECTURE.md section 7.
- **Sourcing reality.** ZIMSEC syllabi are publicly published, and Zimbabwe's Heritage-Based Curriculum defines the compulsory subject set (Mathematics, English, Indigenous Language, Combined Science, Heritage Studies), which is the natural pack roadmap. Cambridge past papers are copyrighted and cannot be shipped; Cambridge-aligned packs use original problems written to the public syllabus. Openly licensed corpora (Siyavula's CC-BY maths and science books, OpenStax) seed the retrieval layer where syllabus-appropriate.

**The authoring pipeline is its own workstream**, as important as the app: an authoring tool (web-based, structured forms plus widget composer), a review workflow with named teacher-reviewers per subject, LLM-assisted drafting of hint ladders with mandatory human sign-off, alignment tagging against the syllabus map, and an error-report loop from the field into the next pack version. Content quality is the product's ceiling. Budget it like engineering, not like an afterthought. Beachhead: O-Level Mathematics, because it has the strongest CAS support, objective answers, and the highest exam stakes.

---

## 11. The connectivity spectrum

The same student moves along this spectrum week to week, so these are modes of one product, not separate products.

| Connectivity | What the student gets | What changes |
|---|---|---|
| Never online | Full tutor: packs, pedagogy engine, CAS, widgets, on-device model if the phone allows | Content freshness depends on offline channels (hub, peer, microSD) |
| Occasionally online | Same, plus background delta sync of packs, progress backup, model upgrades when on Wi-Fi | Downloads are resumable and size-labeled; nothing breaks mid-transfer |
| School with a hub | Same, plus classroom-grade model quality served locally, teacher dashboard, fast pack sync | No internet required at the school at all |
| Online | Same, plus hosted-model conversation quality and the grounded online mode for current events and beyond-pack questions | Zero-rated where telco agreements exist, so online mode costs the student nothing |

Degradation is always graceful and always visible in plain language ("working from your library; last updated 3 May"). The app never blocks on a connection, never nags for one, and never silently gives stale information where currency matters; dated content (news-adjacent topics) carries its pack date.

---

## 12. Two build paths

Full engineering detail is in ARCHITECTURE.md. The product-level summary:

**Path A, standalone.** Phones and laptops only. Everything in sections 5 to 11 except the hosted tier: packs, pedagogy engine, CAS, widgets, on-device models scaled to the device, classroom hubs, offline distribution. Path A is fully buildable and shippable by a small team with no national infrastructure, no cloud dependency, and no permission from anyone. It stands on its own as a complete product, and it is the mission-critical path because it is the one that reaches the disconnected child.

**Path B, Pangolin-hosted.** Adds a server tier on national sovereign compute: a 27B-class model behind the same pedagogy engine, a zero-rated browser front-end that reaches any student with any connection and no install, the online grounded mode, fleet analytics, and the pack-distribution origin. Path B multiplies quality and reach for connected students and gives government a sovereign, visible deployment. It depends on GPU procurement under Project Pangolin, telco zero-rating agreements, and an operations capability. Nothing in Path A waits for it.

A middle rung matters more than either extreme: **the classroom hub**, a laptop (optionally with a small GPU) or Raspberry Pi at a school, serving pack updates, progress sync, and shared model inference to a whole classroom over local Wi-Fi with no internet. One roughly $300 to $800 device upgrades 40 students at once from a 1B phone model to an 8B-class tutor. **[DISAGREEMENT 2]** The earlier plan treated deployment as two-tier (device and national web); the hub is where cost per student improved most in every comparable deployment (Kolibri, RACHEL), and it becomes a first-class tier here.

---

## 13. Measuring real learning

In-app completion is a trap: in the Wharton study, practice scores rose while real learning fell. The product measures itself the honest way:

- **Unaided checkpoint performance** (help disabled), the primary metric.
- **Delayed retention**: spaced re-tests of material learned 1 to 4 weeks earlier.
- **Transfer**: performance on structurally different problems of the same concept.
- **Hint-dependency ratio**: share of problems solved without opening the ladder, expected to trend up per concept as fading works.
- **Gaming rate**: rapid-guess and hint-abuse patterns (from Baker's detection literature), expected to trend down.
- **Confidence calibration**: stated confidence versus actual correctness at checkpoints.

Explicitly not success metrics: problems completed, minutes in app, streak length, messages sent. They are monitored only as health signals. Where possible, deployments partner with schools to compare term exam results against matched non-user cohorts; that is the claim an investor or ministry should be shown, and the roadmap budgets for a proper evaluation study rather than testimonials.

All measurement runs on an append-only local event log (xAPI-style) that syncs opportunistically; no connectivity is needed for the analytics to accumulate.

---

## 14. Languages

- **English first.** It is the language of instruction from grade 3 in Zimbabwe and of both exam boards, and it is where small-model quality is strongest.
- **Shona second.** Real but limited model support exists (Afrique continued-pretraining models cover broad African language sets, though verified Shona quality is thin). The plan is honest: collect Shona tutoring dialogue and content data as part of pack authoring from day one, fine-tune an adapter, and ship Shona conversation only when it passes level-appropriate quality review. Pack *content* (hints, explanations) can ship in Shona earlier because authored text does not depend on model fluency. Mother-tongue instruction is policy for early grades, so Shona and Ndebele authored content is the path into primary school, independent of model readiness.
- **Ndebele third**, same authored-content-first approach; no usable off-the-shelf model exists, so the model side is a data-collection R&D track (with Masakhane-style community partners) rather than a promise.
- Every language beyond these follows the same recipe, which is the point: languages are pack variants plus optional model adapters, not rewrites.

---

## 15. Privacy, sovereignty, and safety

- **Local-first data.** A student's record lives on their device and works forever without an account. Sync to a hub or server is opt-in and carries the minimum: mastery states and event summaries, not chat transcripts by default.
- **Zimbabwe's Cyber and Data Protection Act** applies: children under 18 require guardian consent for personal-data processing, and data controllers must be licensed with POTRAZ (SI 155 of 2024). The build includes a guardian-consent flow for any sync feature, a data-protection registration, and a designated DPO role. Anonymous local-only use requires no consent because nothing leaves the device.
- **Sovereignty.** Path B runs in-country on national infrastructure; packs and student data never need to leave Zimbabwe. For other countries, the same property holds by deployment choice. This aligns directly with the strategy's computational-sovereignty pillar.
- **Child safety.** The model layers run behind a safety filter tuned for minors (self-harm, abuse disclosures get signposting to help, not conversation), and the constrained roles of the model sharply limit exposure. Off-syllabus conversation is redirected, which is both a safety and a pedagogy control.

---

## 16. Alignment with national strategy and AI4I

Zimbabwe's National AI Strategy 2026 to 2030 (cabinet-approved October 2025, launched March 2026) names education adoption, computational sovereignty via Project Pangolin, and the Nzwisiso.ai literacy campaign among its pillars and flagships. TAKU-Dzidza maps onto it without stretching:

- Path B is a concrete first workload for Pangolin with visible public benefit.
- An anti-dependence tutor is an AI-literacy story: it teaches students to think with AI, which is Nzwisiso.ai's stated goal for the school channel.
- The AI for Impact Challenge (POTRAZ, ITU, ICT Ministry, ZCHPC; Development track; up to USD 80,000 milestone-based support) is the natural funding and legitimacy vehicle; its submission deadline is 14 July 2026, with the Mutare bootcamp from 27 July.
- The heritage curriculum's compulsory subjects define the pack roadmap, and the teacher shortage defines the need.

---

## 17. Roadmap

**Phase 0, de-risk (4 to 6 weeks).** Everything here is a [GATE] test, run before framework and engine commitments:
- Device bake-off on real Zimbabwe-market handsets (a 2GB and a 4GB Android): llama.cpp vs ExecuTorch vs Cactus vs LiteRT-LM on the candidate models. Measure tokens/sec, RAM ceiling, battery per session, thermals, cold start.
- WebView UI performance test on the same handsets (settles the app-shell choice, see ARCHITECTURE.md section 9).
- Pedagogy engine prototype in portable TypeScript, exercised in the existing desktop shell against 20 authored maths problems.
- Cactus license and format verification in writing, or it is out.
- Hub prototype: llama.cpp server on a laptop, 10 concurrent simulated students, measure queue behavior.

**Phase 1, MVP (Path A device tier).** Android app, English, O-Level Mathematics pack (about 300 problems across 10 topics), full pedagogy loop including unaided checkpoints, CAS integration, OCR intake, model tiers with zero-model fallback, resumable pack and model delivery, peer APK and pack sharing. Pilot in 2 to 4 schools, one rural. Exit criteria: checkpoint scores and hint-dependency trending correctly in pilot, session retention above a set floor, no answer-leak found in adversarial testing.

**Phase 2, reach (Path A complete).** Classroom hub (pack origin, progress sync, shared inference), laptop app, teacher dashboard, Combined Science pack, spaced review and fading fully on, Shona authored content, DPO answer-withholding fine-tune, formal evaluation study design with a university partner.

**Phase 3, scale (Path B plus depth).** Pangolin deployment and zero-rated web front-end, online grounded mode, English pack and Cambridge variants, Shona model adapter if quality passes, Ndebele content, authoring tool opened to vetted teacher-authors, additional-country pilot pack as proof of portability.

Sequencing rationale: the mission-critical risk is the offline device experience, so it ships first; the hub multiplies it; Path B multiplies it again but depends on external actors (GPU procurement, telcos), so nothing on the critical path waits for them.

---

## 18. Risks

| Risk | Judgment | Mitigation |
|---|---|---|
| Content authoring is slower and costlier than expected | Most likely failure mode of the whole plan | Beachhead one subject; LLM-assisted drafting with human review; recruit teacher-authors early; treat pack tooling as core engineering |
| Small-model quality on 2 to 3GB phones disappoints | Likely, and survivable | Layer-1-first design means the product still works; zero-model mode is a feature, not an apology |
| Productive struggle drives abandonment | Real tension | Escape hatches, difficulty step-downs, mild reward mechanics, pilot-measured retention with explicit kill criteria for over-strict gates |
| Pangolin GPU capacity does not materialize on time | Outside our control | Path A is complete without it; Path B design also runs on any rented in-region GPUs as a stopgap if sovereignty rules allow |
| Zero-rating agreements stall | Possible | Path B web tier still works metered; app and packs distribute offline regardless |
| Curriculum body relations (ZIMSEC, Cambridge) | Manageable | Use public syllabi, original problems, no past-paper redistribution; seek ZIMSEC endorsement early via AI4I channels |
| Data-protection compliance burden | Known, bounded | Local-first default minimizes scope; licensing and consent flows budgeted in Phase 2 |
| Team capacity across two paths | Real | Shared core keeps surfaces thin; Path B is deferred until Path A is in pilot |

---

## 19. Open decisions that need tests [GATE list]

1. **App shell:** Capacitor/WebView-based single codebase vs React Native. Settled by the Phase 0 WebView performance test and inference-plugin audit on real low-end handsets (full argument in ARCHITECTURE.md section 9).
2. **Inference engine:** llama.cpp vs ExecuTorch vs Cactus vs LiteRT-LM. Settled by the Phase 0 bake-off; Cactus additionally gated on written license clarity.
3. **Default model:** Qwen3 1.7B vs Gemma 4 E2B (device tier); Gemma 3 27B vs Qwen3 32B (Path B). Settled by tutoring-quality evals on pack content, not leaderboard scores.
4. **Hub concurrency:** how many simultaneous students one CPU-only laptop actually serves before a small GPU is required. Settled by the Phase 0 hub prototype.
5. **Effort-gate strictness:** how strict the attempt requirement can be before abandonment rises. Settled by pilot A/B, with the Wharton design as the default.
6. **Self-explanation grading quality** at 1 to 2B model size: good enough, or fall back to keyword-plus-self-assessment? Settled by a labeled sample from the pilot.
7. **Path B sizing:** real tokens/sec and concurrency on whatever GPUs Pangolin procures. Settled by load test at deployment; the design carries wide safety margins (ARCHITECTURE.md section 6).

---

## 20. Where this PRD breaks from the earlier plan

1. **Content-first, model-optional** (section 5). The earlier plan made the on-device LLM the core and the content bank a safety mechanism. This PRD inverts that: the authored pack plus deterministic engine is the product; the model is an enhancement tier. This lowers the device floor to 1GB phones, shrinks the trust problem, and matches where the learning evidence actually is.
2. **The classroom hub is a first-class tier** (section 12), not a footnote. It is the cheapest quality upgrade per student in the whole design and the natural offline update channel.
3. **Multi-curriculum is structural, not aspirational** (sections 3 and 10). Curriculum, language, and grade are pack data. Zimbabwe is the first deployment, not the design boundary. The earlier plan said ZIMSEC-first in a way that leaked into architecture.
4. **The interactive experience is specified as a product requirement** (section 6.3) with an authoring-constrained widget runtime, not left as "UI to be designed later." On weak hardware, interactivity is an engineering commitment or it does not happen.
5. **Path B is sized honestly** (ARCHITECTURE.md sections 5 and 6). ZCHPC's published cluster is 2015-era with about 12 accelerator nodes; the earlier plan implicitly assumed usable national GPU capacity. Path B is therefore specified against new Pangolin procurement with concrete concurrency math and a rented-GPU fallback, so its promises survive due diligence.
