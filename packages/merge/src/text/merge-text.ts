import { diff3Merge } from 'node-diff3';

import { conflictOf, type MergeResult } from '../value/merge-conflict.js';

/**
 * Pairs of equal lines the match may walk, ours and theirs each against the base. The match grows
 * faster than the pairs: a JSON body of a few thousand lines, all `{`, `},` and the same keys,
 * held the process for minutes. A text of lines that do not repeat stays far below.
 */
const LINE_PAIRS_BUDGET = 1_000_000;

type Texts = { base: string; ours: string; theirs: string };

/**
 * Lines, not words: the library splits a string on whitespace unless it is given arrays. The
 * repo is `eol=lf`, so `\n` is the one separator. The empty text has no lines, which is what
 * lets a file that did not exist be merged as «nothing».
 */
function linesOf(text: string): string[] {
    return text === '' ? [] : text.split('\n');
}

function equalPairs(lines: string[], base: string[]): number {
    const counts = new Map<string, number>();

    for (const line of base) {
        counts.set(line, (counts.get(line) ?? 0) + 1);
    }

    return lines.reduce((pairs, line) => pairs + (counts.get(line) ?? 0), 0);
}

function askAboutText(texts: Texts, path: readonly string[], proposed: string): MergeResult {
    const conflict = conflictOf('text', { ...texts, path });

    return { value: proposed, conflicts: [{ ...conflict, proposed }] };
}

function isLines(lines: string[] | undefined): lines is string[] {
    return lines !== undefined;
}

/**
 * Free text: a document, or a string with line breaks. Clean chunks go in whatever side they
 * came from; a chunk both sides edited keeps ours, and the whole text becomes one question that
 * carries the three texts, so the user sees the lines in the place they sit. A text whose lines
 * repeat past the budget is that question at once, without matching lines.
 */
export function mergeText(
    base: string,
    ours: string,
    theirs: string,
    path: readonly string[],
): MergeResult {
    const lines = { base: linesOf(base), ours: linesOf(ours), theirs: linesOf(theirs) };
    const pairs = equalPairs(lines.ours, lines.base) + equalPairs(lines.theirs, lines.base);

    if (pairs > LINE_PAIRS_BUDGET) {
        return askAboutText({ base, ours, theirs }, path, ours);
    }

    const chunks = diff3Merge(lines.ours, lines.base, lines.theirs);
    const value = chunks
        .map((chunk) => chunk.conflict?.a ?? chunk.ok)
        .filter(isLines)
        .flat()
        .join('\n');

    if (chunks.every((chunk) => chunk.conflict === undefined)) {
        return { value, conflicts: [] };
    }

    return askAboutText({ base, ours, theirs }, path, value);
}
