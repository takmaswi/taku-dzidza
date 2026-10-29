/**
 * Takudzidza safety layer 1: a fast deterministic check on every learner
 * message before anything reaches a model. Ported from Amayi Learn
 * (convex/kids/prefilter.ts at ec3496e) and retuned for learners from Form 1
 * to adults (SPEC.md 3.8). Plain TypeScript, no I/O, so it also runs in the
 * browser; the server always runs it again.
 *
 * Retuning: school subjects must pass. Biology words (sexual reproduction,
 * sex chromosomes, the effects of alcohol), history of wars and weapons, and
 * literature with horror all pass. What is redirected is explicit content,
 * romance or companion roleplay (Taku is never a companion), instructions to
 * hurt people or make weapons, getting drugs, and attempts to change Taku's
 * rules. Gambling and secrets from parents are redirected for under 18s only.
 * Personal details are flagged for under 18s only; adults' notes are theirs.
 */

export const MAX_MESSAGE_TEXT = 4000;

export type Audience = "minor" | "adult";

export type PersonalInfoKind = "phone" | "email" | "address" | "full_name" | "school" | "id_number";

/**
 * Two kinds of distress. Both open the Get help section at once (SPEC.md 3.13).
 *   self_harm  thoughts of hurting themselves, wanting to die or disappear.
 *   harmed     someone hurting them, abuse, neglect, being unsafe.
 * When a message has both, harmed wins.
 */
export type DistressCategory = "self_harm" | "harmed";

export const REDIRECT_CATEGORIES = ["explicit", "romance", "companion", "weapons", "violence", "drugs", "gambling", "rules", "secrets"] as const;
export type RedirectCategory = (typeof REDIRECT_CATEGORIES)[number];

export function isRedirectCategory(value: unknown): value is RedirectCategory {
  return typeof value === "string" && (REDIRECT_CATEGORIES as readonly string[]).includes(value);
}

export type PrefilterResult =
  | { kind: "ok" }
  | { kind: "personal_info"; found: PersonalInfoKind[] }
  | { kind: "distress"; category: DistressCategory; reason: string }
  | { kind: "redirect"; category: RedirectCategory; reason: string };

/** Lower case, zero width characters removed, apostrophes unified, spaces collapsed. */
export function normalise(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/[\u2018\u2019\u02BC`]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// ---- personal information -------------------------------------------------

/** Also catches "kid @ yahoo . com" and "kid(at)gmail dot com". */
const EMAIL = /[a-z0-9._%+-]+\s*(?:@|\(at\))\s*[a-z0-9-]+(?:\s*(?:\.|\bdot\b)\s*[a-z0-9-]+)*\s*(?:\.|\bdot\b)\s*[a-z]{2,}/i;

/** A digit run that may carry spaces, dots, dashes or brackets between digits. */
const DIGIT_RUN = /\+?\(?\d(?:[\s.()-]{0,2}\d){6,15}/g;

const PHONE_CONTEXT = /\b(phone|number|numba|cell|mobile|whatsapp|call me|text me|sms me|contact)\b/;

function isYearList(run: string): boolean {
  const groups = run.split(/[^\d]+/).filter(Boolean);
  return groups.length > 1 && groups.every((g) => g.length === 4 && Number(g) >= 1000 && Number(g) <= 2100);
}

export function hasPhoneNumber(raw: string): boolean {
  const lower = normalise(raw);
  for (const match of raw.matchAll(DIGIT_RUN)) {
    const run = match[0];
    if (isYearList(run)) continue;
    const digits = run.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) continue;
    // Zimbabwe mobile and landline shapes, and anything written internationally.
    if (/^(?:00263|263)\d{7,10}$/.test(digits) || run.trim().startsWith("+")) return true;
    // A number typed for maths rarely starts with 0.
    if (digits.startsWith("0") && digits.length >= 9 && digits.length <= 11) return true;
    // A long number next to a word like "phone" or "whatsapp".
    if (digits.length >= 9 && PHONE_CONTEXT.test(lower)) return true;
  }
  return false;
}

const STREET =
  /\b\d{1,5}[a-z]?\s+(?:[a-z']+\s+){1,3}(street|st|road|rd|avenue|ave|drive|dr|close|crescent|cres|lane|way|place|court|circle|grove)\b/;
const ADDRESS_PHRASES = [
  /\bmy (home |house |full )?address\b/,
  /\bhouse (number|no\.?|#)\s*\d+/,
  /\bstand (number|no\.?|#)?\s*\d+/,
  /\bflat (number|no\.?|#)?\s*\d+/,
  /\bp\.?\s?o\.?\s?box\s*\d+/,
  /\bi live (at|on) (number |no\.? )?\d+/,
];

export function hasHomeAddress(raw: string): boolean {
  const text = normalise(raw);
  return STREET.test(text) || ADDRESS_PHRASES.some((p) => p.test(text));
}

/** Words that can follow a first name without being a surname. */
const NOT_A_SURNAME = new Set([
  "and", "i", "im", "i'm", "but", "from", "in", "at", "age", "aged", "years", "year", "my", "the", "a", "an",
  "this", "so", "too", "also", "here", "now", "today", "grade", "form", "class", "can", "want", "like", "love",
  "please", "only", "not", "very", "really", "just", "sad", "happy", "tired", "bored", "curious", "learning",
  "doing", "going", "asking", "trying", "who", "what", "how", "why", "when", "where", "with", "to", "of", "is",
  "am", "was", "will", "would", "should", "could", "do", "does", "did", "have", "has", "had", "be", "being",
]);

const NAME_INTRO = /\b(?:my (?:full )?name is|my name's|i am called|i'm called|call me|ndini|zita rangu ndi)\s+([a-z'-]{2,})\s+([a-z'-]{2,})/;
/** "I am Tariro Moyo" only counts when both words were typed with capitals. */
const CAPITAL_INTRO = /\b(?:I am|I'm|Im)\s+([A-Z][a-z'-]{1,})\s+([A-Z][a-z'-]{1,})/;

export function hasFullName(raw: string): boolean {
  const lower = normalise(raw);
  const intro = NAME_INTRO.exec(lower);
  if (intro !== null && !NOT_A_SURNAME.has(intro[2])) return true;
  const capital = CAPITAL_INTRO.exec(raw.normalize("NFKC").replace(/[\u2018\u2019]/g, "'"));
  return capital !== null && !NOT_A_SURNAME.has(capital[1].toLowerCase()) && !NOT_A_SURNAME.has(capital[2].toLowerCase());
}

const SCHOOL =
  /\b(?:i go to|i attend|i'm at|i am at|im at|i study at|i learn at|my school is|i'm in (?:grade|form) \d+ at|i am in (?:grade|form) \d+ at|we go to|i'm a (?:pupil|student|learner) at|i am a (?:pupil|student|learner) at)\s+((?:[a-z'.-]+\s+){1,4}?)(?:primary|junior|high|secondary|school|college|academy|convent|group of schools)\b/;

/** "I go to a boarding school" names no school. */
const GENERIC_SCHOOL_WORDS = new Set([
  "a", "an", "the", "my", "our", "this", "that", "big", "small", "new", "local", "boarding", "day", "government",
  "private", "public", "primary", "high", "secondary", "junior", "nice", "good", "cool", "christian", "mission",
]);

export function hasSchoolName(raw: string): boolean {
  const match = SCHOOL.exec(normalise(raw));
  if (match === null) return false;
  return match[1].trim().split(/\s+/).some((word) => !GENERIC_SCHOOL_WORDS.has(word));
}

/** Zimbabwe national ID, for example 63-123456 A 12. */
const NATIONAL_ID = /\b\d{2}\s?-?\s?\d{6,7}\s?-?\s?[a-z]\s?-?\s?\d{2}\b/i;

export function findPersonalInfo(raw: string): PersonalInfoKind[] {
  const found: PersonalInfoKind[] = [];
  if (EMAIL.test(raw)) found.push("email");
  if (NATIONAL_ID.test(raw)) found.push("id_number");
  else if (hasPhoneNumber(raw)) found.push("phone");
  if (hasHomeAddress(raw)) found.push("address");
  if (hasFullName(raw)) found.push("full_name");
  if (hasSchoolName(raw)) found.push("school");
  return found;
}

// ---- distress -------------------------------------------------------------

/**
 * First person only, so "how did Hitler die" is not read as distress. The
 * harmed rules are checked first, as in Amayi Learn: the person hurting a
 * young learner may be at home.
 */
const HARMED: { pattern: RegExp; reason: string }[] = [
  { pattern: /\b(?:someone|somebody|he|she|they|a man|a woman|my [a-z]+|an adult|a grown ?up)\b(?: at (?:home|school|church))? (?:always |keeps |sometimes |often )?(?:hurts|hits|beats|touches|abuses|kicks|burns|slaps|threatens) me\b/, reason: "being hurt" },
  { pattern: /\b(?:i'm|im|i am|i get|i got|i was|i've been|i have been) (?:being )?(?:abused|beaten|molested|touched in a bad way)\b/, reason: "being hurt" },
  { pattern: /\b(?:i'm|im|i am) (?:scared|afraid|too scared) to go home\b|\bi (?:don't|dont) feel safe at home\b/, reason: "unsafe at home" },
  { pattern: /\b(?:nobody|no one|noone) (?:feeds|gives me food|looks after|takes care of) me\b|\bi (?:haven't|have not|didn't|did not) (?:eaten|had food) (?:for|in) (?:days|two days|2 days|three days)\b/, reason: "neglect" },
  // Shona: "baba vanondirova" (father beats me), "anondirova" (he or she beats me), "handinzwe ndakachengeteka kumba" (I don't feel safe at home).
  { pattern: /\b(?:a|va)?nondi(?:rova|kuvadza)\b|\bhandinzw[ei] ndakachengeteka\b/, reason: "being hurt (Shona)" },
];

const SELF_HARM: { pattern: RegExp; reason: string }[] = [
  { pattern: /\b(?:i|i'm|im|i am)\b.{0,40}\b(?:kill myself|killing myself|end my life|want to die|wanna die|commit suicide|hurt myself|hurting myself|cut myself|cutting myself|harm myself)\b/, reason: "self harm" },
  { pattern: /\b(?:i|i'm|im|i am)\b.{0,30}\b(?:want|wanna|going) to (?:disappear|not be here|not exist|vanish forever)\b/, reason: "wants to disappear" },
  { pattern: /\b(?:nobody|no one|noone) (?:would|will) (?:miss|care about|notice) me\b|\bbetter off without me\b|\bi (?:don't|dont) want to live\b/, reason: "very sad" },
  // Shona: "ndinoda kufa" (I want to die), "ndinoda kuzviuraya" (I want to kill myself), "handichadi kurarama" (I no longer want to live).
  { pattern: /\b(?:ndinoda|ndoda) ku(?:fa|zviuraya|zvikuvadza)\b|\bhandichadi kurarama\b/, reason: "self harm (Shona)" },
];

// ---- clearly off limits ---------------------------------------------------

type Rule = { pattern: RegExp; category: RedirectCategory; reason: string; minorsOnly?: boolean };

const REDIRECT: Rule[] = [
  { pattern: /\b(?:porn|porno|pornography|nudes|send (?:me )?nudes|horny|blowjob|erotic|sexting|onlyfans)\b/, category: "explicit", reason: "explicit content" },
  { pattern: /\b(?:be|pretend (?:to be|you are|you're)|act as|act like|roleplay as|role play as|you are now) (?:my |a )?(?:girlfriend|boyfriend|gf|bf|wife|husband|lover|crush|date|bae)\b/, category: "romance", reason: "romance roleplay" },
  { pattern: /\b(?:will|would|can) you (?:date|marry|kiss) me\b/, category: "romance", reason: "romance" },
  { pattern: /\b(?:be|become|pretend to be|act as) my (?:best )?(?:friend|bestie|companion|partner)\b|\b(?:do you|can you) love me\b|\bi love you,? taku\b|\bdo you miss me\b/, category: "companion", reason: "companion roleplay" },
  { pattern: /\b(?:make|build|create|craft|get|buy|get hold of) (?:a |an |my own |some )?(?:bomb|gun|weapon|weapons|explosive|explosives|molotov|grenade|knife to hurt|poison)\b/, category: "weapons", reason: "weapons" },
  { pattern: /\bhow (?:do|can|could|would) (?:i|you|we|someone) (?:kill|hurt|stab|shoot|poison) (?:someone|somebody|a person|people|him|her|them|my)\b/, category: "violence", reason: "violence" },
  { pattern: /\b(?:buy|get|grow|sell|inject|snort) (?:some )?(?:weed|dagga|mbanje|cocaine|crack|meth|crystal meth|mutoriro|bronco|broncleer|codeine|heroin|drugs)\b|\bhow (?:do i|to|can i) get (?:high|drunk)\b/, category: "drugs", reason: "drugs" },
  { pattern: /\b(?:buy|get|smoke|try) (?:some )?(?:cigarettes|vape|vapes|alcohol|beer|zed|kachasu)\b/, category: "drugs", reason: "alcohol or smoking", minorsOnly: true },
  { pattern: /\b(?:betting app|casino|slot machine|place a bet|how to bet|win at betting)\b/, category: "gambling", reason: "gambling", minorsOnly: true },
  { pattern: /\bignore (?:all |your |the |any |previous |prior |earlier |those |these )*(?:rules|instructions|guidelines|limits|filters)\b|\bforget (?:your|all|the|previous) (?:rules|instructions)\b|\b(?:you have|with) no (?:rules|limits|filters)\b|\bdeveloper mode\b|\bjailbreak\b|\bdo anything now\b|\bsystem prompt\b|\bpretend (?:you are|you're) not an ai\b/, category: "rules", reason: "rules override" },
  { pattern: /\b(?:don't|dont|do not|never|wont|won't) tell (?:my |your |the )?(?:mum|mom|mother|mama|amai|dad|father|baba|parents?|guardian|teachers?|gogo|granny|sekuru|anyone|anybody|nobody)\b|\bour (?:little )?secret\b/, category: "secrets", reason: "secrets from guardians", minorsOnly: true },
];

export function prefilter(raw: string, audience: Audience): PrefilterResult {
  const text = normalise(raw);
  // Distress first: a learner in trouble always gets Get help.
  for (const rule of HARMED) if (rule.pattern.test(text)) return { kind: "distress", category: "harmed", reason: rule.reason };
  for (const rule of SELF_HARM) if (rule.pattern.test(text)) return { kind: "distress", category: "self_harm", reason: rule.reason };
  if (audience === "minor") {
    const found = findPersonalInfo(raw);
    if (found.length > 0) return { kind: "personal_info", found };
  }
  for (const rule of REDIRECT) {
    if (rule.minorsOnly === true && audience !== "minor") continue;
    if (rule.pattern.test(text)) return { kind: "redirect", category: rule.category, reason: rule.reason };
  }
  return { kind: "ok" };
}
