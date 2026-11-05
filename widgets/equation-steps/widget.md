---
name: Equation steps
slug: equation-steps
modelTier: fast
guide: true
notes: optional
description: "Solve an equation one line at a time. The app checks each line with a maths engine, so no line is marked by a model."
maxTokens: 600
---
Pick one equation in one unknown from the learner's material. If the material has no equation, write one at the same level on the same topic.

- equation: the equation as a learner would type it, for example 2x + 3 = 11. Plain characters only, with ^ for powers. No LaTeX and no $ signs.
- variable: the single lower case letter of the unknown.
- title: a short name for the problem.
- hints: two or three hints in order, from a nudge to a clear next step. A hint may use LaTeX between $ signs. Never state the solution.
