import { SCRIPT_LIMITS } from '@mandor/script';
import { describe, expect, it } from 'vitest';

import { approvalKey } from '../../src/script/approval-key.js';
import { sortEntries, type ChainEntry } from '../../src/script/chain-entries.js';

const PLACE = { origin: 'local', workspaceId: 'ws' };

function entry(name: string, source: string, level: ChainEntry['level'] = 'folder'): ChainEntry {
    return { level, name, event: 'onBeforeRequest', source };
}

function approving(...entries: ChainEntry[]) {
    const keys = new Set(
        entries.map(({ level, event, source }) => approvalKey({ ...PLACE, level, event, source })),
    );

    return { isApproved: (key: string) => Promise.resolve(keys.has(key)) };
}

describe('sortEntries', () => {
    it('runs the approved ones in their order and skips the others, told in order too', async () => {
        const a = entry('A', 'a()');
        const b = entry('B', 'b()');
        const c = entry('C', 'c()', 'request');
        const d = entry('D', 'd()');

        const sorted = await sortEntries([a, b, c, d], PLACE, approving(a, c));

        expect(sorted.runnable).toEqual([a, c]);
        expect(sorted.skipped).toEqual([
            { name: 'B', level: 'folder', event: 'onBeforeRequest', bytes: 3, source: 'b()' },
            { name: 'D', level: 'folder', event: 'onBeforeRequest', bytes: 3, source: 'd()' },
        ]);
        expect(sorted.logs).toEqual([]);
    });

    it('takes an approval for its own place only: another level is a script nobody approved', async () => {
        const folder = entry('A', 'a()');
        const sorted = await sortEntries(
            [entry('A', 'a()', 'collection')],
            PLACE,
            approving(folder),
        );

        expect(sorted.runnable).toEqual([]);
        expect(sorted.skipped).toHaveLength(1);
    });

    it('shows the texts while they fit in an output, and the size alone of the rest', async () => {
        const half = 'x'.repeat(SCRIPT_LIMITS.outputBytes / 2);
        const sorted = await sortEntries(
            [entry('A', half), entry('B', `${half}!`), entry('C', half)],
            PLACE,
            approving(),
        );

        expect(sorted.skipped.map(({ name, source }) => [name, source !== undefined])).toEqual([
            ['A', true],
            ['B', false],
            ['C', true],
        ]);
        expect(sorted.skipped[1]?.bytes).toBe(half.length + 1);
    });

    it('leaves a line for a text over the size of a script, with nothing to approve', async () => {
        const large = entry('A', 'x'.repeat(SCRIPT_LIMITS.sourceBytes + 1));
        const sorted = await sortEntries([large], PLACE, approving(large));

        expect(sorted).toEqual({
            runnable: [],
            skipped: [],
            logs: [
                {
                    level: 'warn',
                    notice: 'script-too-large',
                    params: { event: 'onBeforeRequest', limit: SCRIPT_LIMITS.sourceBytes },
                },
            ],
        });
    });
});
