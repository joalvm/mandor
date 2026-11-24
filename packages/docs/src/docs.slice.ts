import type { ErrorCode, ListedDoc } from '@mandor/ipc';

import type { DocViewState } from './doc-view-state.js';

export type DocsSlice = {
    /** The file name asked to be deleted, while the question stands. */
    deleting: string | null;
    /** What the last read or write was refused with, until whoever draws it has said so. */
    error: ErrorCode | null;
    /** The docs of the open workspace: the file each one lives in and the title it wears. */
    docs: ListedDoc[];
    /** Whether the list of the open workspace has landed: until then, no doc has a title. */
    listed: boolean;
    /** Resources whose text was asked for and has not arrived. */
    reading: string[];
    /** The file name being renamed in place, if any. */
    renaming: string | null;
    /**
     * Whether the row being renamed was made a moment ago and this field is the first name it
     * gets: Escape there takes the making back. Any other rename, and any end of this one, clears it.
     */
    justMade: boolean;
    /** The text of each doc, by resource: two tabs on one file share one entry. */
    texts: Record<string, string>;
    /** How each open tab is showing its doc, by tab. A tab that closes takes its entry along. */
    views: Record<string, DocViewState>;
    /**
     * The words of each collection or folder a tab showed, by `folderKey`: the description in its
     * own file. Read once per place, and again when the tree changes on disk.
     */
    folderDescriptions: Record<string, string>;
};

export function initialDocsSlice(): DocsSlice {
    return {
        deleting: null,
        docs: [],
        listed: false,
        error: null,
        reading: [],
        renaming: null,
        justMade: false,
        texts: {},
        views: {},
        folderDescriptions: {},
    };
}
