/** One side of a conflict. `null` means the thing is not there on that side. */
export type Side = { value: unknown } | null;

/** A question the merge could not answer by itself. */
export type MergeConflict = {
    /** The path joined with `/`: `headers/Accept#0`, `body/content`, `''` for the whole file. */
    id: string;
    path: string[];
    shape: 'value' | 'row' | 'text' | 'file';
    base: Side;
    ours: Side;
    theirs: Side;
    /** Only for `text`: the diff3 merge with ours in the chunks that clash. */
    proposed?: string;
};

/** The merged value and the questions left. `undefined` as a value means «not there». */
export type MergeResult = { value: unknown; conflicts: MergeConflict[] };

/** What the user answered to a question: one of the two sides, or a text they wrote. */
export type Decision = { pick: 'ours' | 'theirs' } | { text: string };

/** Looks up the answer to a question. `undefined` leaves it open. */
export type Decide = (conflict: MergeConflict) => Decision | undefined;

/** The three values of a place in the file and where it sits. */
export type MergeSides = {
    base: unknown;
    ours: unknown;
    theirs: unknown;
    path: readonly string[];
};

/** What a step of the merge is given: the three values and the answers the user already gave. */
export type MergeInput = MergeSides & { decide: Decide };

/** A step of the merge: a kind of value hands a part of itself back to it to be merged. */
export type MergeStep = (input: MergeInput) => MergeResult;

/** Same path, same id: asking again gives the same ids, which is how a choice finds its question. */
export function conflictId(path: readonly string[]): string {
    return path.join('/');
}

export function sideOf(value: unknown): Side {
    return value === undefined ? null : { value };
}

export function conflictOf(shape: MergeConflict['shape'], input: MergeSides): MergeConflict {
    return {
        id: conflictId(input.path),
        path: [...input.path],
        shape,
        base: sideOf(input.base),
        ours: sideOf(input.ours),
        theirs: sideOf(input.theirs),
    };
}
