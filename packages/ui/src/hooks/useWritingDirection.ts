import { Direction } from 'radix-ui';

/** Which way the text of the window runs: from the left, or from the right. */
export type WritingDirection = 'ltr' | 'rtl';

/**
 * The way the window reads, as the nearest `TextDirection` says it. A divider dragged by the
 * pointer reads it to know which edge its box starts at, and which arrow key moves it forward.
 */
export function useWritingDirection(): WritingDirection {
    return Direction.useDirection();
}
