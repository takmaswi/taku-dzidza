# Redesign 1: experience and look

Date: 30 October 2026. After Takunda's review: the first version felt plain, had no clear calls to action and no normal chat.

## Research and references
- Takunda's own work: Takubasa (home led by one big task box, ink sidebar, mono date labels, landing with photos in arches and pills, chevron divider, colour bands, grain), Amai Learn (hero photo, big coloured action tiles, picture heavy cards), and the portfolio at portifoliotakunda.vercel.app (repo portifolio_takunda: 3D card ring, rolling titles, rise on scroll with a reduced motion fallback, one easing curve).
- Study apps: Gizmo's home is four input cards (upload, paste, link, scan) and its onboarding asks name, year and goal; Knowunity asks goal and how you learn (screensdesign.com showcases). Duolingo's goal step and progress bar (Appcues Good UX, UX Collective reviews). NotebookLM fixed its empty start with featured notebooks (former Google designer's portfolio on Contra).
- Flip cards: perspective on the wrapper, preserve 3d inside, hidden back faces, a fade instead of a spin for reduced motion, keyboard flip (community guides: camoa dev guides, quackit, animation gallery).

## What changed
- App shell: ink sidebar on desktop with notebooks and recent chats; bottom tab bar on phones (Home, Ask Taku, Notebooks, Review, Settings) with a due cards badge.
- Home: "What are we studying today?" with an Ask Taku box, answer mode switch and starter questions matched to what the learner studies for; bento tiles with photos for Add your notes, Practice paper, Flashcards, Scroll, a sample notebook and the study style; due cards banner; notebooks rail; recent chats.
- A normal chat with Taku (convex/chat/chats.ts) from general knowledge, with the same safety order and caps as notebooks.
- Onboarding: one question per screen with a progress bar: what you study for, three style questions, then your style on photo cards with a live preview.
- Study style cards with photos, depth on hover and an animated check; also in Settings.
- Flashcard review with a 3D flip, keyboard flip and a fade for less motion; making flashcards goes straight to review.
- Landing: rolling headline, arch and pill photo collage, chevron divider, phone mock with a cited answer, ink citation band, 3D ring of study tools, style cards, safety band, final call to action.
- Sign in and setup: split layout with a photo.
- A sample notebook (original Form 3 Biology notes) for an empty start.
- Copy rewritten with the humanizer rules; no dashes or hyphens.

## Codex
Batch 2 prompts in art/ASSETS.md now list the photos the redesign uses first. Batch 1 photos stand in until they land.

## Checks
lint and typecheck clean; 112 tests; build; 12 Playwright journeys on phone and desktop (adds Ask Taku from home).
