import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { RepoChange } from '@mandor/git';
import { mergeFile } from '@mandor/merge';
import { atomicWrite, readTextOrNull, writeConflict } from '@mandor/store-fs';

import { announceConflictRecorded } from './conflict-events.js';
import { knownText, rememberText } from './known-texts.js';
import { writeInRepo } from './write-in-repo.js';

/** An edit of a whole entity, as the window made it over the text it had. */
export type GuardedWriteRequest = {
    root: string;
    /** Relative to the root, forward slashes. */
    path: string;
    change: RepoChange | Promise<RepoChange>;
    /** The text the edit makes of the text the window had (`null`: it had no file), applied over that base. */
    oursFrom: (base: string | null) => string;
    /** Work owed before a single byte is written, on either path: where secrets go, for one. */
    beforeWrite?: () => Promise<void>;
    /** The write of an edit nobody raced: the file is as the window left it. */
    write: () => Promise<void>;
};

/**
 * The door for the edits of a whole entity, which the window sends without saying over which
 * version it edited. Host remembers what the window was last given: if the file is still that,
 * the edit is written as always. If it changed on disk since, the edit is merged into what is
 * there instead of being laid over it — the change of a colleague that arrived while a tab was
 * open is not undone by the next save.
 *
 * A merge that cannot decide leaves the file with the window's version where the two clash and
 * the other side's changes everywhere else, and keeps the question in a record for a person.
 * The window is told nothing here: it reloads when it hears the file changed.
 */
export function guardedWrite(request: GuardedWriteRequest): Promise<void> {
    const { root, path, change } = request;

    return writeInRepo({ root, path, change }, () => settle(request));
}

async function settle(request: GuardedWriteRequest): Promise<void> {
    const { root, path } = request;
    const file = join(root, path);
    const theirs = await readTextOrNull(file);
    const base = knownText(root, path);

    await request.beforeWrite?.();

    if (base === undefined || base === theirs) {
        await request.write();
        rememberText(root, path, await readTextOrNull(file));

        return;
    }

    const ours = request.oursFrom(base);
    const merged = mergeFile({ path, base, ours, theirs });

    if (merged.text !== null) {
        await mkdir(dirname(file), { recursive: true });
        await atomicWrite(file, merged.text);
    }

    if (merged.conflicts.length > 0) {
        await writeConflict(root, {
            path,
            source: 'write',
            base,
            theirs,
            at: new Date().toISOString(),
        });
        announceConflictRecorded(root, path);
    }

    rememberText(root, path, ours);
}
