# TAKU-Dzidza

TAKU-Dzidza is an AI tutor built to help children learn, even where phones are cheap and the internet is weak or missing. Its purpose is the opposite of most AI homework apps. Instead of handing over answers, it is built to make students think for themselves and to rebuild their confidence and reasoning. "Dzidza" means "to learn" in Shona.

## Why this exists

Many children in rural Africa cannot reach tools like ChatGPT because of low-end devices and poor connectivity. TAKU-Dzidza is designed to reach them, so that access to good, current knowledge is not decided by where a child lives or how they connect.

## What is in this repository

Right now this repository holds the design of the product. The code will follow.

- `docs/PRD.md` is the main product document. It covers the mission, the evidence behind the approach, how a learning session works, how answers are kept trustworthy and matched to the right grade level, the curriculum packs, how it behaves online and offline, how learning is measured, languages, privacy, the roadmap, and the open decisions.
- `docs/ARCHITECTURE.md` is the technical build plan. It separates two build paths. Path A is laptop and mobile only and works with no server. Path B adds a hosted version on national compute to serve many students at once. It also describes a school hub option and the tests that decide the remaining choices.
- `docs/SOURCES.md` lists the research and facts behind the plan, with links.

## The short version of the plan

- The lessons and rules do the teaching, and the AI is a helper on top, so it can run on almost any phone.
- Lessons are packaged, signed, and updatable, so a new curriculum or country is a content project, not a rewrite.
- It works fully offline, refreshes when a connection is available, and can use live information online when there is internet.
- Answers are checked and kept at the student's level, so a young learner never gets a university-level answer.

## Status

Design stage. The next step is to make the key decisions in the documents and begin a first build.
