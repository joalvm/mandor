import { run } from '../git/run.js';

/**
 * What the repo has pending, in paths relative to the root and always with forward slashes:
 * the repo travels between platforms and a path with backslashes does not compare.
 */
export type RepoStatus = {
    clean: boolean;
    staged: string[];
    unstaged: string[];
    untracked: string[];
};

/** A file git has never heard of. Listed one by one: a collapsed directory hides items. */
const UNTRACKED = '??';

/** Renamed or copied: git prints the old path as a field of its own right after the new one. */
const WITH_ORIGIN = 'RC';

/** Nothing happened on that side of the entry. */
const IDLE = ' ';

type Entry = { code: string; path: string };

/** Reads what is pending, from the `-z` form of `status` so no path is escaped. */
export async function status(root: string): Promise<RepoStatus> {
    const printed = await run(['status', '--porcelain=v1', '-z', '--untracked-files=all'], root);
    const entries = entriesOf(printed);
    const tracked = entries.filter((entry) => entry.code !== UNTRACKED);

    return {
        clean: entries.length === 0,
        staged: pathsOf(tracked.filter(indexChanged)),
        unstaged: pathsOf(tracked.filter(treeChanged)),
        untracked: pathsOf(entries.filter((entry) => entry.code === UNTRACKED)),
    };
}

/**
 * Each entry is `XY path`, NUL terminated. The `-z` form is the only one that survives a
 * path with a space, a quote or a non-ASCII character without git escaping it first.
 */
function entriesOf(printed: string): Entry[] {
    const fields = printed.split('\0').filter((field) => field !== '');
    const entries: Entry[] = [];
    let origin = false;

    for (const field of fields) {
        if (origin) {
            origin = false;
            continue;
        }

        entries.push({ code: field.slice(0, 2), path: field.slice(3).replaceAll('\\', '/') });
        origin = WITH_ORIGIN.includes(field.charAt(0));
    }

    return entries;
}

/** X is what happened in the index. A space there means nothing did. */
function indexChanged(entry: Entry): boolean {
    return !entry.code.startsWith(IDLE);
}

/** Y is what happened in the working tree, which is what the user has not saved yet. */
function treeChanged(entry: Entry): boolean {
    return entry.code.charAt(1) !== IDLE;
}

function pathsOf(entries: Entry[]): string[] {
    return entries.map((entry) => entry.path);
}
