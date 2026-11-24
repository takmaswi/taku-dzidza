/** Caption start times in seconds for each landing clip, from public/audio/landing/manifest.json (checked by tests/unit/landing.test.ts). */
export const CUES = {
  "summary-calm.mp3": [0.1, 2.9, 6.2, 11.1, 18.6, 23.6],
  "summary-upbeat.mp3": [0.1, 2.8, 5.9, 10.5, 17.5, 22.1],
  "overview-duo.mp3": [0.1, 5.5, 9.3, 16.7, 20.4, 26.8, 30.4, 36.2, 41.5, 49.8],
} as const;

export type Clip = keyof typeof CUES;
