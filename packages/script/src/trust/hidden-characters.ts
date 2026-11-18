/**
 * Characters that change what a text means without showing: bidi controls, zero widths, line and
 * paragraph separators, variation selectors, tags, hangul fillers and the private use area. Named by
 * Unicode property rather than by a table of ranges, so a new Unicode version keeps it current.
 * Spaces, NBSP, U+3000 and homoglyphs stay out: Monaco already marks them in the editor.
 */
const HIDDEN = /[\p{Default_Ignorable_Code_Point}\p{Cf}\p{Co}\p{Zl}\p{Zp}]/gu;

const NAME_LENGTH = 80;

const CUT = '…';

/** How many hidden characters a text carries; an emoji joiner counts, as the band never blocks. */
export function hiddenCharactersIn(text: string): number {
    return text.match(HIDDEN)?.length ?? 0;
}

/**
 * A name from someone else, safe to paint: each hidden character written as its `\u{…}` escape,
 * cut to 80 characters without splitting a character or an escape.
 */
export function visibleName(name: string): string {
    const pieces = Array.from(name).map(escapeHidden);
    const length = pieces.reduce((total, piece) => total + Array.from(piece).length, 0);

    if (length <= NAME_LENGTH) {
        return pieces.join('');
    }

    return `${takeUpTo(pieces, NAME_LENGTH - 1)}${CUT}`;
}

/** A character of a name, or its escape when it is hidden. `Array.from` gives no empty piece. */
function escapeHidden(character: string): string {
    if (character.match(HIDDEN) === null) {
        return character;
    }

    const codePoint = Number(character.codePointAt(0));

    return `\\u{${codePoint.toString(16).toUpperCase()}}`;
}

/** The whole pieces that fit in a number of characters; the first that does not fit ends it. */
function takeUpTo(pieces: readonly string[], room: number): string {
    let taken = '';
    let used = 0;

    for (const piece of pieces) {
        used += Array.from(piece).length;

        if (used > room) {
            break;
        }

        taken += piece;
    }

    return taken;
}
