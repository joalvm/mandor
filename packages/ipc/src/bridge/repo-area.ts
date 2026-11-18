import type { ConflictRecordedPush, RepoChangedPush } from '../repo/repo-changed.js';

/** What the window hears about the open repo that it did not do itself. */
export type RepoArea = {
    /** Files of the repo changed outside the window: whoever shows them reloads them. */
    onChanged: (handler: (push: RepoChangedPush) => void) => () => void;
    /** A write or a merge kept a clash for a person to answer. */
    onConflictRecorded: (handler: (push: ConflictRecordedPush) => void) => () => void;
};
