import { describe, expect, it, vi } from 'vitest';

import type { Logger } from '../../src/log/create-logger.js';
import { announceConflictRecorded, announceMergeNote } from '../../src/repo/conflict-events.js';
import { logConflictRecords } from '../../src/repo/log-conflict-records.js';

describe('logging the clashes that were kept', () => {
    it('writes a warning with the file, until it is stopped', () => {
        const log = vi.fn<Logger['log']>();
        const stop = logConflictRecords({ log, flush: () => Promise.resolve() });

        announceConflictRecorded('/r', 'a.yaml');
        stop();
        announceConflictRecorded('/r', 'b.yaml');

        expect(log).toHaveBeenCalledTimes(1);
        expect(log).toHaveBeenCalledWith('warn', expect.stringContaining('a.yaml'));
    });

    it('writes a warning with what a merge settled alone, until it is stopped', () => {
        const log = vi.fn<Logger['log']>();
        const stop = logConflictRecords({ log, flush: () => Promise.resolve() });

        announceMergeNote('kept ours in mandor.yaml');
        stop();
        announceMergeNote('kept ours in other.yaml');

        expect(log).toHaveBeenCalledTimes(1);
        expect(log).toHaveBeenCalledWith('warn', 'kept ours in mandor.yaml');
    });
});
