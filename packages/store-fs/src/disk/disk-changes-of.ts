import type { DiskChange } from './disk-change.js';
import type { WatchedPath } from './watched-path.js';

/**
 * Reads a batch of watcher events as what happened to the repo. A rename fires one event per
 * name and neither of them says it was a rename, so what tells them apart is the disk: the
 * name that is no longer there went, and the name that is there arrived.
 */
export function diskChangesOf(
    watched: readonly WatchedPath[],
    exists: (path: string) => boolean,
): DiskChange[] {
    const renamed = watched.filter((entry) => entry.renamed).map((entry) => entry.path);
    const gone = renamed.filter((path) => !exists(path));
    const born = renamed.filter((path) => exists(path));

    return [
        ...moves(gone, born),
        ...watched.filter((entry) => !entry.renamed).map((entry) => changed(entry.path)),
    ];
}

/**
 * Only a lone pair names a move. With several names gone and several arrived in one window any
 * pairing is a guess, and a wrong guess renames a resource that nobody renamed.
 */
function moves(gone: readonly string[], born: readonly string[]): DiskChange[] {
    const [from] = gone;
    const [to] = born;

    if (from !== undefined && to !== undefined && gone.length === 1 && born.length === 1) {
        return [{ kind: 'moved', from, to }];
    }

    return [...gone.map(removed), ...born.map(changed)];
}

function changed(path: string): DiskChange {
    return { kind: 'changed', path };
}

function removed(path: string): DiskChange {
    return { kind: 'removed', path };
}
