import type { ChangedEntity } from '@mandor/schema';
import { type DiskChange, inTurn, readTextOrNull } from '@mandor/store-fs';
import { join } from 'node:path';

import { hasPendingCommit, scheduleCommit } from './commit-scheduler.js';
import { entitiesOfPaths } from './entities-of-paths.js';
import { knownText } from './known-texts.js';

/** The paths a batch of the watcher talks about: both ends of a move. */
function pathsOf(change: DiskChange): string[] {
    if (change.kind === 'moved') {
        return [change.from, change.to];
    }

    return [change.path];
}

/**
 * Whether the disk holds something the window does not know. A path nobody has read and that
 * is not there stays quiet — nothing can have been missed — and a path that cannot be read as
 * text (a folder) is left out: its files report themselves.
 */
async function isForeign(root: string, path: string): Promise<boolean> {
    const known = knownText(root, path);
    const text = await readTextOrNull(join(root, path)).catch(() => undefined);

    if (text === undefined) {
        return false;
    }

    return known === undefined ? text !== null : known !== text;
}

/** An edit the app made waits for its calm under the path itself: it already names the commit. */
function keepForHistory(root: string, path: string): void {
    if (hasPendingCommit(root, path)) {
        return;
    }

    scheduleCommit({
        root,
        key: `outside:${path}`,
        paths: [path],
        change: { kind: 'outside-edit', path },
    });
}

/**
 * Takes one batch of the watcher: every path whose text is not what the window was given is
 * somebody else's edit. Those paths get a commit of their own, after the calm, and the window
 * is told which entities changed. What the app wrote itself is as the window believes it and
 * stays quiet. Runs in the turn of the repo, so a write of the app in flight has finished
 * noting what it wrote before its file is judged.
 */
export function followOutsideChanges(
    root: string,
    changes: DiskChange[],
    push: (entities: ChangedEntity[]) => void,
): Promise<void> {
    return inTurn(root, async () => {
        const foreign: string[] = [];

        for (const path of changes.flatMap(pathsOf)) {
            if (await isForeign(root, path)) {
                foreign.push(path);
                keepForHistory(root, path);
            }
        }

        const entities = entitiesOfPaths(foreign);

        if (entities.length > 0) {
            push(entities);
        }
    });
}
