import { describe, expect, it } from 'vitest';

import type { RepoArea } from '../../src/bridge/repo-area.js';
import { createFakeBridge } from '../../src/testing/fake-bridge.js';

describe('the repo area of the bridge', () => {
    it('offers exactly what the window hears about files it did not write', () => {
        const verbs = { onChanged: 1, onConflictRecorded: 1 } satisfies Record<
            keyof RepoArea,
            number
        >;

        expect(Object.keys(verbs)).toHaveLength(2);
    });

    it('lets the double deliver both pushes and stop at the unsubscribe', () => {
        const bridge = createFakeBridge();
        const changed: unknown[] = [];
        const clashes: unknown[] = [];
        const stop = bridge.repo.onChanged((push) => changed.push(push));

        bridge.repo.onConflictRecorded((push) => clashes.push(push));
        bridge.emitRepoChanged({ changes: [{ area: 'repo' }] });
        stop();
        bridge.emitRepoChanged({ changes: [] });
        bridge.emitConflictRecorded({ entity: { area: 'repo' }, name: '' });

        expect(changed).toEqual([{ changes: [{ area: 'repo' }] }]);
        expect(clashes).toEqual([{ entity: { area: 'repo' }, name: '' }]);
    });
});
