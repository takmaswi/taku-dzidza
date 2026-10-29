/**
 * Every word a learner or guardian reads, in one place, so ChiShona can sit
 * beside it later and tests/unit/copy.test.ts can check the copy rule: no
 * hyphens, en dashes or em dashes (SPEC.md, copy rule).
 */

export const APP_NAME = "Takudzidza";
export const TUTOR = "Taku";

export const copy = {
  appName: APP_NAME,
  byline: "by Taku",
  loading: "Loading",
  menu: { home: "Home", settings: "Settings", help: "Get help", signOut: "Sign out", openMenu: "Open menu", closeMenu: "Close menu" },

  landing: {
    title: "Study smarter with your own notes.",
    lead: "Add your notes, textbook photos and PDFs. Taku turns them into summaries, flashcards, quizzes and practice, for any course or exam.",
    points: [
      "Every answer links to the page it came from",
      "ZIMSEC, Cambridge, university, ACCA and more",
      "Works on any Android phone, even on low data",
    ],
    start: "Get started",
    signIn: "I already have an account",
  },

  auth: {
    signInTitle: "Welcome back",
    signUpTitle: "Create your account",
    email: "Email",
    password: "Password",
    passwordHint: "At least 10 characters, with a letter and a number.",
    signIn: "Sign in",
    signUp: "Create account",
    toSignUp: "New here? Create an account",
    toSignIn: "Have an account? Sign in",
    wrong: "That email and password did not match.",
    failed: "Could not create the account. Try again.",
    working: "Please wait",
  },

  setup: {
    title: "Tell us about you",
    name: "What should Taku call you?",
    birth: "When were you born?",
    month: "Month",
    year: "Year",
    why: "We ask so learners under 18 get a guardian's permission first, as the law asks.",
    next: "Continue",
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  },

  tooYoung: {
    title: "Takudzidza starts at Form 1",
    body: "Takudzidza is for learners aged 12 and up. Amai Learn is made for younger learners from ECD to Grade 7.",
    link: "Go to Amai Learn",
  },

  guardian: {
    title: "Ask a parent or guardian",
    body: "You are under 18, so a parent or guardian needs to say yes before you can start. Send them this link. They open it on their own phone.",
    make: "Make the link",
    whatsapp: "Send on WhatsApp",
    copyLink: "Copy link",
    copied: "Copied",
    shareText: "Please give permission for me to use Takudzidza, a study app: ",
    waiting: "Waiting for your guardian. This page updates by itself when they say yes.",
    withdrawn: "Your guardian withdrew permission. Ask them again with a new link.",
    expires: "The link works for 14 days.",
  },

  consent: {
    title: "Permission for a learner",
    intro: (name: string) => `${name} would like to use Takudzidza, a study app where Taku, an AI tutor, helps learners study from their own notes. Because ${name} is under 18, we need a parent or guardian's permission.`,
    agreeTitle: "What you agree to",
    guardianName: "Your full name",
    relationship: "How are you related to the learner?",
    relationshipHint: "For example mother, father, aunt, guardian",
    contact: "Your email or phone number",
    confirmsGuardian: "I am this learner's parent or legal guardian and I am 18 or older.",
    agrees: "I agree to the points above.",
    give: "Give permission",
    given: "Thank you. Permission is given. Keep this link: you can use it to withdraw permission at any time.",
    withdraw: "Withdraw permission",
    withdrawn: "Permission is withdrawn. The learner can no longer study until a guardian gives permission again.",
    expired: "This link has expired or is not valid. Ask the learner for a new one.",
  },

  quiz: {
    title: "How do you like to study?",
    lead: "Three quick taps so Taku fits you. You can change this any time in Settings.",
    skip: "Skip for now",
    done: "See my style",
    start: "Start studying",
    questions: [
      {
        question: "When you open your notes, you want",
        options: [
          { style: "locked_in", label: "Straight to the point, nothing extra" },
          { style: "cook", label: "Bright, quick and fun" },
          { style: "calm", label: "Clean and quiet" },
        ],
      },
      {
        question: "The best way to remember something is",
        options: [
          { style: "locked_in", label: "Dense summaries I can read fast" },
          { style: "cook", label: "Swiping through quick cards and quizzes" },
          { style: "calm", label: "Going through it slowly, step by step" },
        ],
      },
      {
        question: "Taku should talk like",
        options: [
          { style: "locked_in", label: "An exam board: clear and formal" },
          { style: "cook", label: "A friend who keeps it real" },
          { style: "calm", label: "A patient teacher" },
        ],
      },
    ],
  },

  styles: {
    locked_in: { name: "Locked In", line: "All business, no faff. Plain screens and dense summaries." },
    cook: { name: "Cook Mode", line: "Bright and energetic, with quick cards and quizzes." },
    calm: { name: "Calm", line: "Subtle and quiet, at your own pace." },
  },

  home: {
    hello: (name: string) => `Hello, ${name}`,
    lead: "Your study space is getting ready.",
    notebooksTitle: "Notebooks",
    notebooksBody: "Add your notes, photos and PDFs, and ask Taku about them. Coming next.",
    planTitle: "Your study plan",
    planBody: "Set your exam dates and hours, and Taku plans your week. Coming soon.",
    styleTitle: "Your study style",
    change: "Change",
  },

  settings: {
    title: "Settings",
    name: "Your name",
    save: "Save",
    saved: "Saved",
    styleTitle: "Study style",
    answersTitle: "How Taku answers",
    answer: { name: "Show me the answer", line: "The answer with full working, step by step." },
    guide: { name: "Guide me", line: "Hints and questions first, so you work it out yourself. Learners who work it out remember more." },
    accessTitle: "Reading and accessibility",
    access: {
      dyslexia: { name: "Dyslexia friendly", line: "More space between letters, lines and words." },
      largeText: { name: "Larger text", line: "Bigger text everywhere." },
      readAloud: { name: "Read aloud", line: "Show a read aloud button on answers." },
      shortChunks: { name: "Shorter chunks", line: "Taku keeps answers short and splits long ones up." },
      highContrast: { name: "High contrast", line: "Stronger colours and borders." },
      reducedMotion: { name: "Less motion", line: "Turns off animations." },
    },
    accountTitle: "Your account",
    deleteTitle: "Delete my account",
    deleteBody: "This deletes your account and everything in it, straight away. It cannot be undone.",
    deleteConfirm: "Type your email address to confirm",
    deleteButton: "Delete my account for good",
  },

  help: {
    title: "Get help",
    lead: "If you are not okay, you do not have to deal with it alone.",
    under18Title: "Under 18 in Zimbabwe",
    childline: "Childline Zimbabwe: call 116",
    childlineLine: "Free from any phone in Zimbabwe, day and night. You can talk in English, ChiShona or isiNdebele.",
    callChildline: "Call 116",
    everyoneTitle: "Everyone",
    danger: "If you or someone else is in danger right now, contact your local emergency services or go to the nearest clinic or hospital.",
    talk: "Talking to someone you trust, like a family member, teacher, doctor or friend, can help.",
    taku: "Taku is a study tutor, not a counsellor, but Taku will always point you here.",
  },

  errors: {
    generic: "Something went wrong. Try again.",
    tooYoung: "TOO_YOUNG",
  },
} as const;

export type Copy = typeof copy;
