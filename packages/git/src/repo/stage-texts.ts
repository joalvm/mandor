import { run, runText } from '../git/run.js';

/**
 * The three texts of a path the merge could not join: what both sides came from, what this
 * side holds and what the origin holds. A side that has no such file — added by one, deleted by
 * the other — is `null`, and that absence is part of the answer, never an empty text.
 */
export type StageTexts = { base: string | null; ours: string | null; theirs: string | null };

const BASE = 1;
const OURS = 2;
const THEIRS = 3;

/** Reads the three texts of one clashing path from the index the open merge left. */
export async function stageTexts(root: string, path: string): Promise<StageTexts> {
    const listing = await run(['ls-files', '--unmerged', '-z', '--', path], root);
    const stages = new Set(
        listing
            .split('\0')
            .map((entry) => /^\d+ [0-9a-f]+ (\d)\t/.exec(entry)?.[1])
            .filter((stage) => stage !== undefined)
            .map(Number),
    );
    const read = (stage: number): Promise<string | null> =>
        stages.has(stage)
            ? runText(['show', `:${String(stage)}:${path}`], root)
            : Promise.resolve(null);

    return { base: await read(BASE), ours: await read(OURS), theirs: await read(THEIRS) };
}
