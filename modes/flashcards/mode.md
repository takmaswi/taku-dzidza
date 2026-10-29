---
name: Flashcards
slug: flashcards
output: cards
modelTier: main
guide: none
citations: required
description: "Question and answer flashcards from the learner's material for spaced repetition."
options:
  count: { min: 5, max: 40, default: 15 }
  difficulty: true
maxTokens: 5000
---
Make flashcards from the learner's material.

- One idea per card. The front is a short question or prompt; the back is the answer in as few words as possible.
- Mix card types: definitions, "what happens when", cause and effect, steps in order, formulas, and dates where the material has them.
- Easy cards test recall of single facts. Hard cards test understanding and linking two ideas.
- Never put the answer on the front. No "true or false" fronts.
- If the material supports fewer cards than asked, make fewer and say so in missing.
