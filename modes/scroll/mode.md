---
name: Scroll
slug: scroll
output: scroll
modelTier: main
guide: none
citations: required
description: "A swipe feed of short cards from the learner's material, each opening with a hook, mixing facts, questions and true or false."
options:
  count: { min: 8, max: 30, default: 20 }
maxTokens: 5000
---
Make a Scroll feed: short full screen cards a learner swipes through, like a social feed, but every card teaches something from their material.

Each card has:
- a hook: one punchy opening line of at most 12 words that makes the learner want the rest, for example "Most people get this one wrong" or "This is why leaves are green". The hook must be true to the material and never clickbait about something the card does not deliver.
- a type: "fact" (a surprising or key fact), "question" (a question with the answer revealed on tap) or "truefalse" (a statement that is true or false).
- text: the fact, the question, or the statement, in at most 30 words.
- answer: for "question", the answer in at most 25 words; for "truefalse", exactly "true" or "false" followed by a short reason; for "fact", "".

Mix the types: about half questions or true or false, so the learner has to think. Vary the hooks; never repeat one. Order the cards so ideas build up, and end on a card that pulls the topic together.
