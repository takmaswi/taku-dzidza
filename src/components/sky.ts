import type { ObjectName } from "./ObjectArt";

/** The sky on Home by the learner's own clock: the sun before 12:00, a low sun from 12:00 to 17:00, then the moon. */
export function skyFor(hour: number): Extract<ObjectName, "sun" | "sun-low" | "moon"> {
  if (hour < 12) return "sun";
  if (hour < 17) return "sun-low";
  return "moon";
}
