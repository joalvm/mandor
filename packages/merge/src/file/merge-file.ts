import { NO_DECISION, settleResult } from '../choice/settle-conflict.js';
import { mergeText } from '../text/merge-text.js';
import type { Decide } from '../value/merge-conflict.js';
import { mergeYaml, type YamlSides } from '../yaml/merge-yaml.js';
import { askAboutFile, fileMergeOf, type FileMerge, type FileSides } from './file-conflict.js';

/** A file of the repo: where it is, and its text on each side (`null` when it is not there). */
export type FileInput = FileSides & { path: string };

type Merger = (sides: YamlSides, decide: Decide) => FileMerge;

/** A document is free text: the whole file is one text, merged by lines. */
function mergeMarkdown(sides: YamlSides, decide: Decide): FileMerge {
    const merged = mergeText(sides.base, sides.ours, sides.theirs, []);

    return fileMergeOf(settleResult(merged, decide));
}

/** Kinds of file by extension. Anything not listed is not guessed at: it is a question. */
const MERGERS = new Map<string, Merger>([
    ['yaml', mergeYaml],
    ['md', mergeMarkdown],
]);

function extensionOf(path: string): string {
    return (/\.([^./\\]+)$/u.exec(path)?.[1] ?? '').toLowerCase();
}

/**
 * The same merge as `mergeFile`, with the answers the user already gave. Whole-file shortcuts
 * first: nothing to merge when a side did not move. A deleted side against a changed one is
 * a question, and so is a file of a kind the merge does not read.
 */
export function mergeFileWith(input: FileInput, decide: Decide): FileMerge {
    const { base, ours, theirs } = input;

    if (ours === theirs || base === theirs) {
        return { text: ours, conflicts: [] };
    }

    if (base === ours) {
        return { text: theirs, conflicts: [] };
    }

    const merger = MERGERS.get(extensionOf(input.path));

    if (ours === null || theirs === null || merger === undefined) {
        return askAboutFile({ base, ours, theirs }, decide);
    }

    return merger({ base: base ?? '', ours, theirs }, decide);
}

/** Three texts of one file give one text and the questions left; ours stays where it clashes. */
export function mergeFile(input: FileInput): FileMerge {
    return mergeFileWith(input, NO_DECISION);
}
