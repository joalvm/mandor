import { describe, expect, it } from 'vitest';

import {
    announceConflictRecorded,
    announceConflictsChanged,
    announceMergeNote,
    onConflictRecorded,
    onConflictsChanged,
    onMergeNote,
} from '../../src/repo/conflict-events.js';

describe('telling the world a clash was kept', () => {
    it('names the repo and the file', () => {
        const heard: string[] = [];
        const stop = onConflictRecorded((root, path) => heard.push(`${root}:${path}`));

        announceConflictRecorded('/r', 'a.yaml');
        stop();

        expect(heard).toEqual(['/r:a.yaml']);
    });

    it('stops telling the one who stopped listening', () => {
        const heard: string[] = [];

        onConflictRecorded((root) => heard.push(root))();
        announceConflictRecorded('/r', 'a.yaml');

        expect(heard).toEqual([]);
    });

    it('tells what a merge settled alone, until the listener stops', () => {
        const heard: string[] = [];
        const stop = onMergeNote((message) => heard.push(message));

        announceMergeNote('kept ours');
        stop();
        announceMergeNote('kept theirs');

        expect(heard).toEqual(['kept ours']);
    });

    it('tells the list changed when a clash is kept, and when something else says so', () => {
        const heard: string[] = [];
        const stop = onConflictsChanged((root) => heard.push(root));

        announceConflictRecorded('/r', 'a.yaml');
        announceConflictsChanged('/s');
        stop();
        announceConflictsChanged('/t');

        expect(heard).toEqual(['/r', '/s']);
    });
});
