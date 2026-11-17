import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { historyDir, historyEntryFile, historyFileName } from '../../src/history/history-path.js';
import { idOf } from './history-entry-fixture.js';

describe('where the history of a workspace lives', () => {
    it('keeps one folder per workspace under .mandor, which never goes to git', () => {
        expect(historyDir('/repo', 'pagos')).toBe(join('/repo', '.mandor', 'history', 'pagos'));
    });

    it('refuses a workspace that is not an id segment', () => {
        expect(() => historyDir('/repo', '../pagos')).toThrow();
    });

    it('names a file by the compact time of the send, so the alphabet is the clock', () => {
        expect(historyFileName('2026-09-23T10:15:30.123Z', idOf(1))).toBe(
            `20260923T101530123Z-${idOf(1)}.json`,
        );
    });

    it.each(['ayer', '2026-09-23T10:15:30Z', '2026-09-23 10:15:30.123Z'])(
        'refuses `%s` as the time of a send',
        (sentAt) => {
            expect(() => historyFileName(sentAt, idOf(1))).toThrow();
        },
    );

    it.each(['', '../x', 'abc', '7D9C1F0E-3B52-4A56-8D1B-6F2A9E4C7B10'])(
        'refuses `%s` as an id',
        (id) => {
            expect(() => historyFileName('2026-09-23T10:15:30.123Z', id)).toThrow();
        },
    );

    it('joins a file name to the folder of the workspace', () => {
        const name = historyFileName('2026-09-23T10:15:30.123Z', idOf(1));

        expect(historyEntryFile('/repo', 'pagos', name)).toBe(
            join('/repo', '.mandor', 'history', 'pagos', name),
        );
    });

    it.each(['../x.json', 'x.json', `20260923T101530123Z-${idOf(1)}.json/../../x`])(
        'refuses `%s` as the name of an entry',
        (name) => {
            expect(() => historyEntryFile('/repo', 'pagos', name)).toThrow();
        },
    );
});
