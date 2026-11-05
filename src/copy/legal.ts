/**
 * The privacy notice and terms. DRAFTS for legal review, written only from what
 * the app does today (convex/schema.ts, convex/privacy/retention.ts,
 * convex/accounts/deletion.ts, convex/ai/router.ts). They claim compliance with
 * no law. Checked by the copy rule in tests/unit/copy.test.ts.
 */

type Section = { heading: string; body: string[] };

export const legal = {
  draftTitle: "Draft for legal review",
  draftBody: "This text has not been checked by a lawyer yet and may change. It describes what the app does today.",

  privacy: {
    title: "Privacy notice",
    lead: "What Takudzidza stores about you, why, who else handles it and how long it is kept.",
    sections: [
      {
        heading: "What we store",
        body: [
          "Your account: your email address and a scrambled form of your password. If you sign in with Google, your email address and whether Google has verified it. No name or photo is taken from Google.",
          "Your profile: the name Taku calls you, your birth month and year, what you are studying for, your study style and your reading settings.",
          "Your study material: the notes, files, photos, pasted text and web links you add, and the text read from them.",
          "Your study work: your chats with Taku, the study tools Taku makes for you, your flashcards with their review dates, and the marks you save on practice papers.",
          "If you are under 18, the record of your guardian's permission: their name, how they are related to you, their phone number, the version of the words they agreed to and when they agreed.",
          "Counts of how much AI each learner used per day and what it cost, as numbers only, so spending limits can work.",
        ],
      },
      {
        heading: "Why we store it",
        body: [
          "To run the study tools you ask for, to keep your work so you can come back to it, to get a guardian's permission for learners under 18, and to limit spending on AI.",
          "We do not show adverts. Your material is not used to train AI models.",
        ],
      },
      {
        heading: "Who else handles it",
        body: [
          "Convex stores the app's data and files. Vercel serves the website.",
          "When you ask Taku something, the question and the parts of your material it needs go through OpenRouter to an AI model provider. Every request asks for providers that do not collect data and that keep nothing after answering. Reading a photo or a scanned page sends that image the same way.",
          "Resend delivers sign in codes by email, once email is switched on. A text message provider delivers the code to a guardian's phone, once one is chosen. Google is involved only if you choose to sign in with Google.",
          "If error tracking is switched on, Sentry receives technical reports when the app fails. These are set up to leave out your account, your activity trail and permission links.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "Your account and study work stay until you delete them. Deleting your account in Settings removes your profile, notebooks, files, chats, flashcards, marks, permission records and usage counts straight away.",
          "An account for a learner under 18 whose guardian has not given permission is deleted after 30 days.",
          "Permission links stop working after 14 days. Once a guardian has agreed, their link keeps working for 400 days so they can withdraw.",
          "Phone codes for guardians work for 10 minutes and the record of them is deleted after a day. Only a scrambled form of the code is stored.",
          "We keep a count of how many accounts were deleted, with nothing that identifies anyone.",
        ],
      },
      {
        heading: "Learners under 18",
        body: [
          "A learner aged 12 to 17 cannot study until a parent or guardian gives permission from a link, using a code sent to their phone. The guardian can withdraw permission at any time with the same link, and the learner then cannot study until permission is given again.",
          "Questions from under 18s are checked before Taku answers, and phone numbers, addresses and similar details they type are not sent to any AI model when the app spots them.",
        ],
      },
      {
        heading: "Product counts",
        body: [
          "If you are 18 or older and switch on Share usage counts in Settings, the app adds to a daily count of which features are used. The count holds no account, no name and no content. It is off unless you switch it on, and it is never used for under 18s.",
        ],
      },
      {
        heading: "Your choices",
        body: ["You can change your details and settings in Settings, delete single sources, notebooks and chats, and delete your whole account at any time."],
      },
    ] as Section[],
  },

  terms: {
    title: "Terms of use",
    lead: "The rules for using Takudzidza.",
    sections: [
      {
        heading: "Who can use it",
        body: ["Takudzidza is for learners aged 12 and up. Learners under 18 need a parent or guardian's permission before they can study."],
      },
      {
        heading: "What Taku is",
        body: [
          "Taku is an AI study tutor, not a teacher, examiner, doctor or counsellor. Taku can be wrong. Citations show where an answer came from in your notes, and parts marked as Taku's ideas did not come from your notes. Check anything important against your textbook, syllabus or teacher.",
          "Practice papers are written by Taku for practice. They are not real exam papers and say nothing about what will be in your exam.",
        ],
      },
      {
        heading: "Your material",
        body: [
          "What you add stays yours. You give Takudzidza permission to store it and process it to run the tools you ask for, including sending it to AI providers as the privacy notice describes.",
          "Only add material you are allowed to use. Do not upload anything to share it with others.",
        ],
      },
      {
        heading: "Fair use",
        body: [
          "Do not try to break the app, get around its safety checks or spending limits, or use it to harm anyone. Daily limits on Taku apply to every learner.",
          "We may close an account that breaks these rules.",
        ],
      },
      {
        heading: "Your own work",
        body: ["Follow your school's or exam board's rules about AI. Handing in work written by Taku as your own may break them."],
      },
      {
        heading: "Changes",
        body: ["The app is new and will change. Features may be added, changed or removed, and we cannot promise it will always be available. Paid plans do not exist yet."],
      },
    ] as Section[],
  },
} as const;
