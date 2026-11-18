import { parseDocument, type Document } from 'yaml';

import { askAboutFile, type FileMerge } from '../file/file-conflict.js';
import type { Decide } from '../value/merge-conflict.js';
import { mergeNode } from '../value/merge-values.js';
import { sameValue } from '../value/same-value.js';
import { writeValues } from './write-values.js';

/** No folding of long lines: a line the user wrote on one line stays on one line. */
const STRINGIFY = { lineWidth: 0, indent: 2 };

/** The three texts of a YAML file. Absent files arrive as `''`, which is an empty document. */
export type YamlSides = { base: string; ours: string; theirs: string };

/** One side read: its document, to write into, and the values it holds, to merge. */
type ReadSide = { document: Document; value: unknown };

/**
 * A side that parses and unfolds. The parser refuses to unfold aliases past what a file of
 * values could mean, which a few lines can ask for: that side cannot be read either.
 */
function readable(text: string): ReadSide | undefined {
    const document = parseDocument(text);

    if (document.errors.length > 0) {
        return undefined;
    }

    try {
        return { document, value: document.toJS() };
    } catch {
        return undefined;
    }
}

/**
 * YAML merges as the values it holds, not as lines, then the result is written into the document
 * of ours so its comments and layout stay. A side that cannot be read makes the file the question.
 */
export function mergeYaml(sides: YamlSides, decide: Decide): FileMerge {
    const base = readable(sides.base);
    const ours = readable(sides.ours);
    const theirs = readable(sides.theirs);

    if (base === undefined || ours === undefined || theirs === undefined) {
        return askAboutFile(sides, decide);
    }

    const current = ours.value;
    const merged = mergeNode({
        base: base.value,
        ours: current,
        theirs: theirs.value,
        path: [],
        decide,
    });

    if (sameValue(merged.value, current)) {
        return { text: sides.ours, conflicts: merged.conflicts };
    }

    writeValues(ours.document, merged.value);

    return { text: ours.document.toString(STRINGIFY), conflicts: merged.conflicts };
}
