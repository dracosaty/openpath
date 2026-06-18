// Spaced-repetition scheduling — a pruned SM-2.
// We expose three grades instead of SM-2's 0–5 to keep the UI one tap:
//   "again" (failed recall) · "good" (recalled) · "easy" (effortless).

export type Grade = "again" | "good" | "easy";

export interface SrsState {
  ease: number; // ease factor, min 1.3
  intervalDays: number; // current interval in days
  repetitions: number; // consecutive successful reviews
  dueAt: string; // ISO timestamp the item is next due
}

export const DEFAULT_SRS: Omit<SrsState, "dueAt"> = {
  ease: 2.5,
  intervalDays: 0,
  repetitions: 0,
};

const DAY_MS = 86_400_000;
const RELEARN_MS = 10 * 60_000; // failed items come back in ~10 min

/** Apply a grade to an item's SRS state and return the next state. */
export function schedule(
  state: Pick<SrsState, "ease" | "intervalDays" | "repetitions">,
  grade: Grade,
  now: number = Date.now(),
): SrsState {
  let { ease, intervalDays, repetitions } = state;

  if (grade === "again") {
    repetitions = 0;
    intervalDays = 0;
    ease = Math.max(1.3, ease - 0.2);
    return { ease, intervalDays, repetitions, dueAt: new Date(now + RELEARN_MS).toISOString() };
  }

  // SM-2 quality: good = 4, easy = 5.
  const q = grade === "easy" ? 5 : 4;
  repetitions += 1;
  if (repetitions === 1) intervalDays = 1;
  else if (repetitions === 2) intervalDays = 6;
  else intervalDays = Math.round(intervalDays * ease);
  if (grade === "easy") intervalDays = Math.round(intervalDays * 1.3);

  ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  return { ease, intervalDays, repetitions, dueAt: new Date(now + intervalDays * DAY_MS).toISOString() };
}

/** Human label for when an item will next appear (used on the grade buttons). */
export function intervalLabel(grade: Grade, state: Pick<SrsState, "ease" | "intervalDays" | "repetitions">): string {
  if (grade === "again") return "10 min";
  const next = schedule(state, grade).intervalDays;
  if (next <= 1) return "1 day";
  if (next < 30) return `${next} days`;
  const months = Math.round(next / 30);
  return months <= 1 ? "1 month" : `${months} months`;
}
