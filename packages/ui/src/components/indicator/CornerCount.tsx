import type { PropsWithChildren } from 'react';

import { cn } from '../../lib/cn.js';

type CornerCountTone = 'accent' | 'error';

type CornerCountProps = PropsWithChildren<{
    count: number;
    /** Red for what broke, the accent for what is new and only waits to be read. */
    tone: CornerCountTone;
}>;

/** Past this many the mark reads as nine and more: it says something waits, the list says how much. */
const MOST = 9;

const MARK = cn(
    'pointer-events-none absolute -top-1 -end-1',
    'flex h-2.5 min-w-2.5 items-center justify-center px-0.5',
    'rounded-full',
    'text-3xs leading-none tabular',
);

/** Each fill with the ink the contrast test holds it to. */
const TONE_CLASSES = {
    accent: 'bg-solid-accent text-text-on-solid-accent',
    error: 'bg-solid-error text-text-on-solid-status',
} as const satisfies Record<CornerCountTone, string>;

/**
 * How many things wait on a control, as a small mark on its top right corner, the way a dock
 * counts what is unread: smaller than the glyph it sits on, so the control still reads first,
 * and gone while there are none. The mark lets the pointer through to the control under it.
 *
 * The mark is only seen: the control says the count in its own name, which is what a reader
 * hears on reaching it, so the number is not heard twice.
 */
export function CornerCount({ children, count, tone }: CornerCountProps) {
    return (
        <span className="relative inline-flex" data-part="corner-count">
            {children}
            <CountMark count={count} tone={tone} />
        </span>
    );
}

type CountMarkProps = Omit<CornerCountProps, 'children'>;

function CountMark({ count, tone }: CountMarkProps) {
    if (count <= 0) {
        return null;
    }

    return (
        <span
            aria-hidden="true"
            className={cn(MARK, TONE_CLASSES[tone])}
            data-part="corner-count-mark"
            data-tone={tone}
        >
            {count > MOST ? `${String(MOST)}+` : String(count)}
        </span>
    );
}
