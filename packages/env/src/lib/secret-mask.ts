/** The shortest a hidden value still shows dots for: shorter, the dots would lie. */
const MINIMUM = 6;

/** The ceiling the mask grows to: a long secret reads as long, never as its exact length. */
const MAXIMUM = 14;

/**
 * The text a secret value wears while it stays hidden: one dot per character up to the
 * ceiling, never under the floor — the reader sees that there is something, not how much.
 */
export function maskOf(value: string): string {
    return '•'.repeat(Math.min(Math.max(value.length, MINIMUM), MAXIMUM));
}
