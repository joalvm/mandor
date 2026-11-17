import type { CollectionItem } from '@mandor/schema';

import type { WorkspaceFolderNode } from './workspace-data.js';

/** What a format writes of each thing a level holds. */
type ChildVisit<T> = {
    folder: (folder: WorkspaceFolderNode, index: number) => readonly T[];
    item: (item: CollectionItem, index: number) => readonly T[];
};

/**
 * Folders and items as a level arranged them: `sequence` says which kind comes next, and whatever
 * it does not reach goes after, folders first.
 */
export function inSequence<T>(
    sequence: readonly ('folder' | 'item')[] | undefined,
    { folders, items }: { folders: readonly T[]; items: readonly T[] },
): T[] {
    const queues = { folder: [...folders], item: [...items] };
    const arranged = (sequence ?? []).flatMap((kind) => queues[kind].splice(0, 1));

    return [...arranged, ...queues.folder, ...queues.item];
}

/**
 * What a format writes of a level, in the order the person arranged it. The index is the place of
 * the thing among those of its kind.
 */
export function childrenInOrder<T>(level: WorkspaceFolderNode, visit: ChildVisit<T>): T[] {
    return inSequence(level.sequence, {
        folders: level.folders.map((folder, index) => () => visit.folder(folder, index)),
        items: level.items.map((item, index) => () => visit.item(item, index)),
    }).flatMap((write) => write());
}
