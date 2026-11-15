/** The fixed Time Limit for Delivery in Improv Mode. */
export const IMPROV_TIME_LIMIT_SECONDS = 120;

/** How much Overtime is allowed before Delivery ends automatically. */
export const OVERTIME_GRACE_SECONDS = 30;

/** How many Questions the Host asks during Q&A. */
export const QUESTION_COUNT = 3;

/** How many Strengths, and separately how many Improvements, each Reflection section may hold. The Host picks within this range. */
export const REFLECTION_POINTS = { min: 1, max: 5 } as const;
