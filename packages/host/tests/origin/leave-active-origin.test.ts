import { describe, expect, it } from 'vitest';

import { activeOriginRoot, setActiveOrigin } from '../../src/origin/active-origin.js';
import { leaveActiveOrigin } from '../../src/origin/leave-active-origin.js';
import { hasPendingCommit, scheduleCommit } from '../../src/repo/commit-scheduler.js';
import { LONG_CALM, tempRepo } from '../repo/support/temp-repo.js';

const repo = tempRepo();

describe('leaving the active origin', () => {
    it('commits what the origin still owes and leaves the window between origins', async () => {
        setActiveOrigin({ id: 'team', kind: 'remote', name: 'Team', root: repo.root() });
        await repo.write('a.yaml', 'one\n');
        scheduleCommit(
            {
                root: repo.root(),
                key: 'a.yaml',
                paths: ['a.yaml'],
                change: { kind: 'update-item', name: 'a' },
            },
            LONG_CALM,
        );

        await leaveActiveOrigin();

        expect(hasPendingCommit(repo.root(), 'a.yaml')).toBe(false);
        expect(await repo.subjects()).toEqual(['update item a', 'init repo']);
        expect(activeOriginRoot()).toBeNull();
    });

    it('does nothing while the window is between origins', async () => {
        await leaveActiveOrigin();

        expect(activeOriginRoot()).toBeNull();
    });
});
