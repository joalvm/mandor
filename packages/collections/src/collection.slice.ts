import type { ErrorCode } from '@mandor/ipc';
import type { CollectionNode } from '@mandor/schema';

export type CollectionSlice = {
    /** The tree of the open workspace: structure, names and order, and no item bodies. */
    nodes: CollectionNode[];
    /**
     * Folded folders, by workspace. What is written down is what somebody closed, because a
     * tree arrives open: storing the open ones instead would fold everything nobody touched.
     */
    folded: Record<string, string[]>;
    /**
     * The items, by workspace, whose examples somebody hid. As with `folded`, what is written
     * down is what somebody closed: an item arrives with its examples in sight, because an
     * example nobody finds is one nobody opens.
     */
    examplesClosed: Record<string, string[]>;
    /** The path being renamed in place, if any. */
    renaming: string | null;
    /** The paths taken in the tree, in the order it stands. Many at once with Ctrl and Shift. */
    selected: string[];
    /** The paths waiting for an answer to «delete these?», until the question is closed. */
    deleting: string[] | null;
    /** What the last write or read was refused with, until whoever draws it has said so. */
    error: ErrorCode | null;
    /** The section each tab of a folder shows, by the id of the tab: a view, never a file. */
    folderSections: Record<string, string>;
};

export function initialCollectionSlice(): CollectionSlice {
    return {
        nodes: [],
        folded: {},
        examplesClosed: {},
        renaming: null,
        selected: [],
        deleting: null,
        error: null,
        folderSections: {},
    };
}
