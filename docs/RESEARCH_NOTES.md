# Research Notes and Open Ideas

A living list of ideas to explore later. Each note is dated and given an honest first-pass assessment. Nothing here is a commitment. It is a place to park good instincts so they are not lost.

---

## 2026-07-14 — Delivering tiny data over the ZESA meter signal

**The idea.** ZESA prepaid and smart meters already send a signal to the utility. Instead of full internet, could that existing low-power signal carry small amounts of data that our system could read and turn into something useful, for example a "new lesson pack is ready" flag or tiny updates.

**First-pass assessment.** The signal is real, but it is a narrow, locked, utility-owned channel. Points to keep in mind:

- It is built for meter readings, which are tiny. The usable bandwidth is very small, measured in bits, not the megabytes a lesson pack needs.
- It runs on ZESA's private system and licensed frequencies. A third party cannot just inject data into it. This would need a formal ZESA and Powertel partnership.
- The meter talks to the utility, not to a student's phone. To reach a learning device you would need extra hardware at the meter that bridges the signal into the home over Bluetooth or Wi-Fi. That is a hardware and institutional project, not a quick add-on.
- Power cuts also cut the meter link, the same load-shedding weakness that pushed us to offline-first in the first place.

So the realistic version is not "internet through the meter." It is at most "a very small, one-way trickle of data, if ZESA opens the channel and we add bridging hardware." Useful for tiny notifications at best, not for content.

**What to research further.**

- Ask ZESA and Powertel what their meters actually use to communicate: narrowband power-line communication, RF mesh, or cellular. Many modern smart meters use cellular, which changes the whole answer.
- Look at NB-IoT and cell broadcast as the realistic low-bandwidth channels for tiny updates. They are designed for exactly this and do not depend on the power wire.
- Look at datacasting, sending small data one way over FM radio or TV signals, as another trickle option with wide rural reach.
- Compare all of these against what we already plan: resumable downloads, phone-to-phone Wi-Fi Direct sharing, microSD, and school-hub delivery. The bar any new channel must beat is simple: cheaper or wider reach than sneakernet and peer sharing.

**Why it still matters.** The core instinct is right: use channels that already reach rural homes. Keep the idea alive, but treat the meter signal as a possible tiny-notification channel at best, and keep the product fully working offline so it never depends on it.

### Refinement (same day): trickle to the school hub, not the phone

A stronger shape. Do not aim the tiny channel at each phone. Aim it at the school hub, which is one fixed point with power and storage, and which already hands updates to phones over local Wi-Fi for free. Let a slow, always-on link drip small packets to the hub around the clock. The hub collects them, and phones sync from the hub at no cost. This is a known, solid pattern, sometimes called store-and-forward or delay-tolerant delivery.

Why it works:

- One fixed target per school, not thousands of phones.
- Our pack updates are small deltas, only a few megabytes, so even a slow 24/7 link can keep a school current.
- Phones never pay, because they sync from the hub over local Wi-Fi.

Realistic pipes for the hub trickle, best first:

- A cheap cellular SIM, ordinary or NB-IoT, pulling deltas at off-peak hours. A few megabytes a day costs cents, and could be free if zero-rated by Econet or Powertel.
- Zero-rated data for our origin domain, the Econet Zero pattern we already plan to use.
- Datacasting over FM or TV, one way to a cheap receiver at the school.
- The ZESA meter or power-line signal, only if ZESA opens it and we add bridging hardware. Still the least certain option, because it is tiny, one-way, and utility-owned.

Honest answer to "24/7 at little to no cost": yes for the hub, if the data stays small and ideally zero-rated. The always-on slow drip to one fixed point is the right idea. The open question is only which pipe, and the meter signal is one candidate among better ones.
