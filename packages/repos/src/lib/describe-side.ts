import type { ConflictSide } from '@mandor/ipc';

/** How a side reads: its words, and whether they need a block of their own to be read at all. */
export type SideText = { block: boolean; text: string };

const INLINE_LIMIT = 80;

function isRow(value: unknown): value is { key: string; value: string } {
    return (
        typeof value === 'object' &&
        value !== null &&
        'key' in value &&
        'value' in value &&
        typeof value.key === 'string' &&
        typeof value.value === 'string'
    );
}

function inline(text: string): SideText {
    return { block: text.includes('\n') || text.length > INLINE_LIMIT, text };
}

/**
 * What a side says, as text the person can read. A side that is not there says `absent`, in the
 * words of whoever asks. A line of a list reads as `key: value`; any other object is JSON,
 * laid out, because that is what a structure looks like once it has no file to be written to.
 */
export function describeSide(side: ConflictSide, absent: string): SideText {
    if (side === null) {
        return { block: false, text: absent };
    }

    const { value } = side;

    if (typeof value === 'string') {
        return inline(value);
    }

    if (isRow(value)) {
        return inline(`${value.key}: ${value.value}`);
    }

    if (typeof value === 'object' && value !== null) {
        return { block: true, text: JSON.stringify(value, null, 2) };
    }

    return { block: false, text: String(value) };
}
