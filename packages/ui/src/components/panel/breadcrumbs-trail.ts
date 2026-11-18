/** One stretch of the trail as drawn: its place in the whole trail, and what it stands for. */
export type TrailStretch = {
    /** Where it stands in the whole trail, so the same name can stand at two levels. */
    at: number;
    /** The stretches it stands in for, when it is the fold; none when it is a stretch itself. */
    folded: readonly string[];
    text: string;
};

/**
 * The stretches a trail draws. Whole, every one; folded, the first, one fold in place of the
 * middle and the last, so the one under the reader and where it starts both stay readable. A
 * trail of two has no middle to fold.
 */
export function trailShown(parts: readonly string[], folded: boolean): TrailStretch[] {
    const whole = parts.map((text, at) => ({ at, folded: [], text }));

    if (!folded || parts.length < 3) {
        return whole;
    }

    const last = parts.length - 1;

    return [
        { at: 0, folded: [], text: parts[0] ?? '' },
        { at: 1, folded: parts.slice(1, last), text: '…' },
        { at: last, folded: [], text: parts[last] ?? '' },
    ];
}
