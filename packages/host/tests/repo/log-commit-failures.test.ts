import { describe, expect, it } from 'vitest';

import type { LogLevel } from '../../src/log/log-level.js';
import { flushCommits, scheduleCommit } from '../../src/repo/commit-scheduler.js';
import { logCommitFailures } from '../../src/repo/log-commit-failures.js';
import { LONG_CALM, plainFolder, tempRepo } from './support/temp-repo.js';

const repo = tempRepo();

async function refuse(folder: string): Promise<void> {
    scheduleCommit(
        { root: folder, key: 'a', paths: ['a.yaml'], change: { kind: 'update-item', name: 'a' } },
        LONG_CALM,
    );
    await flushCommits(folder);
}

function spyLogger(): { lines: [LogLevel, string][]; log: (l: LogLevel, m: string) => void } {
    const lines: [LogLevel, string][] = [];

    return {
        lines,
        log: (level, message) => {
            lines.push([level, message]);
        },
    };
}

describe('writing the commits git refused into the log', () => {
    it('logs a warning that names the repo', async () => {
        const logger = spyLogger();
        const stop = logCommitFailures({ ...logger, flush: () => Promise.resolve() });
        const folder = await plainFolder(repo);

        await refuse(folder);
        stop();

        expect(logger.lines).toHaveLength(1);
        expect(logger.lines[0]?.[0]).toBe('warn');
        expect(logger.lines[0]?.[1]).toContain(folder);
    });

    it('stops logging once it was stopped', async () => {
        const logger = spyLogger();

        logCommitFailures({ ...logger, flush: () => Promise.resolve() })();

        await refuse(await plainFolder(repo));

        expect(logger.lines).toEqual([]);
    });
});
