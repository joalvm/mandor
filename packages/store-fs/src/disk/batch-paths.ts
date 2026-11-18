import type { WatchedPath } from './watched-path.js';

export type PathBatch = {
    add: (path: string, renamed: boolean) => void;
    dispose: () => void;
};

/**
 * Collects paths for a window and hands them over as one batch, sorted and without repeats.
 * The window opens with the first path of a batch and never extends, so a repo that changes
 * without pause is still reported as it goes instead of being held back forever.
 */
export function batchPaths(windowMs: number, onBatch: (paths: WatchedPath[]) => void): PathBatch {
    const pending = new Map<string, boolean>();
    let timer: NodeJS.Timeout | undefined;

    function flush(): void {
        const paths = [...pending.keys()]
            .toSorted()
            .map((path) => ({ path, renamed: pending.get(path) === true }));

        timer = undefined;
        pending.clear();
        onBatch(paths);
    }

    return {
        // A rename is followed by writes to the name that arrived. Once a path is renamed it
        // stays renamed for the rest of the window, because that half is what names the move.
        add: (path: string, renamed: boolean): void => {
            pending.set(path, renamed || pending.get(path) === true);
            timer ??= setTimeout(flush, windowMs);
        },
        dispose: (): void => {
            clearTimeout(timer);
        },
    };
}
