// Most patterns read the same with or without `u`; a property escape, a code point escape or a
// character past U+FFFF does not, and keeps it.
export const NEEDS_UNICODE = /\\[pP]\{|\\u\{|[\uD800-\uDFFF]/;

/**
 * The pieces of a pattern, one at a time: an escape, a whole class, the opening of a group, a
 * closing, a bar, a quantifier with its lazy mark, or one character. The classes come whole so
 * that what is written inside one says nothing about groups.
 */
const PIECES =
    /\\k<|\\[1-9]|\\[^]|\[(?:\\[^]|[^\]\\])*\]|\(\?[=!]|\((?:\?(?:<[=!]|<[^>]*>|:))?|\)|\||\{\d+(?:,\d*)?\}\??|[*+]\??|\?\??|[^]/g;

type Piece =
    'backreference' | 'lookahead' | 'open' | 'close' | 'bar' | 'many' | 'optional' | 'atom';

/** The first kind whose test the piece passes; anything else is one atom. */
const KIND_OF_PIECE: readonly [RegExp, Piece][] = [
    [/^\\(?:k<|[1-9])/, 'backreference'],
    [/^\(\?[=!]/, 'lookahead'],
    [/^\(/, 'open'],
    [/^\)$/, 'close'],
    [/^\|$/, 'bar'],
    [/^(?:[*+]|\{\d)/, 'many'],
    [/^\?/, 'optional'],
];

/** A group as the walk finds it: whether something inside it repeats, or chooses. */
type Group = { repeats: boolean; chooses: boolean };

/** The group being read, the ones around it, the group that just closed, and the verdict so far. */
type Walk = { top: Group; outer: Group[]; closed: Group | null; risky: boolean };

function kindOf(piece: string): Piece {
    return KIND_OF_PIECE.find(([test]) => test.test(piece))?.[1] ?? 'atom';
}

function open(walk: Walk): void {
    walk.outer.push(walk.top);
    walk.top = { repeats: false, chooses: false };
}

/** What a group held is held by the group around it too. A closing that opens nothing is no group. */
function close(walk: Walk): void {
    const around = walk.outer.pop();

    if (around === undefined) {
        walk.closed = null;

        return;
    }

    around.repeats ||= walk.top.repeats;
    around.chooses ||= walk.top.chooses;
    walk.closed = walk.top;
    walk.top = around;
}

/**
 * A group repeated as a whole that already repeats or chooses inside: the ways to split one text
 * between its turns grow with every character.
 */
function many(walk: Walk): void {
    const repeated = walk.closed;

    walk.risky ||= repeated !== null && (repeated.repeats || repeated.chooses);
    walk.top.repeats = true;
}

/** Once or never is one choice per turn of what holds it, never more ways than that. */
function optional(walk: Walk): void {
    walk.top.repeats = true;
}

const STEP_OF_PIECE: Record<Piece, (walk: Walk) => void> = {
    backreference: (walk) => {
        walk.risky = true;
    },
    lookahead: (walk) => {
        walk.risky = true;
        open(walk);
    },
    open,
    close,
    bar: (walk) => {
        walk.top.chooses = true;
    },
    many,
    optional,
    atom: () => undefined,
};

/**
 * Whether a pattern is written the way an exponential pattern is: a lookahead, a backreference, a
 * group repeated over what repeats or chooses inside it, or a reading that needs `u`, which no
 * engine but the backtracking one takes.
 */
function writtenRisky(pattern: string): boolean {
    const walk: Walk = {
        top: { repeats: false, chooses: false },
        outer: [],
        closed: null,
        risky: false,
    };

    for (const [piece] of pattern.matchAll(PIECES)) {
        const kind = kindOf(piece);

        STEP_OF_PIECE[kind](walk);

        if (kind !== 'close') {
            walk.closed = null;
        }
    }

    return walk.risky || NEEDS_UNICODE.test(pattern);
}

/**
 * Whether V8's linear engine reads the pattern: the app turns it on, and past a number of
 * backtracks V8 answers with it. A runtime without it reads nothing with it.
 */
function linearReads(pattern: string, flags: string): boolean {
    try {
        new RegExp(pattern, `l${flags}`);

        return true;
    } catch {
        return false;
    }
}

function isRegex(pattern: string, flags: string): boolean {
    try {
        new RegExp(pattern, flags);

        return true;
    } catch {
        return false;
    }
}

/**
 * True for a pattern the checker leaves out: written the way an exponential pattern is, and out
 * of reach of the linear engine, the one answer in time for a text shaped against it. The schema
 * and the frames it judges can come from the same hand, and a check that never ends holds the
 * window. A long repetition of one thing is out of reach too, and checked: it grows with the
 * text, not past it. A text that is no regex at all is the checker's to refuse.
 */
export function uncheckedPattern(pattern: string): boolean {
    const flags = NEEDS_UNICODE.test(pattern) ? 'u' : '';

    return writtenRisky(pattern) && isRegex(pattern, flags) && !linearReads(pattern, flags);
}
