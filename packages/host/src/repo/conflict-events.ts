const listeners = new Set<(root: string, path: string) => void>();

/** Hears every clash a write or a merge recorded: the repo and the path of the file. */
export function onConflictRecorded(listener: (root: string, path: string) => void): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

/** Tells the listeners a clash was kept for a person to answer, and that the list changed. */
export function announceConflictRecorded(root: string, path: string): void {
    for (const listener of listeners) {
        listener(root, path);
    }

    announceConflictsChanged(root);
}

const changes = new Set<(root: string) => void>();

/** Hears every change of the clashes a repo keeps: one was kept, or one went away. */
export function onConflictsChanged(listener: (root: string) => void): () => void {
    changes.add(listener);

    return () => {
        changes.delete(listener);
    };
}

/** Tells the listeners the clashes of a repo changed, so whoever shows them asks again. */
export function announceConflictsChanged(root: string): void {
    for (const listener of changes) {
        listener(root);
    }
}

const notes = new Set<(message: string) => void>();

/** Hears what a merge decided without asking anybody: a line for the log, nothing for the window. */
export function onMergeNote(listener: (message: string) => void): () => void {
    notes.add(listener);

    return () => {
        notes.delete(listener);
    };
}

/** Tells the listeners a merge settled a clash by itself, and how. */
export function announceMergeNote(message: string): void {
    for (const listener of notes) {
        listener(message);
    }
}
