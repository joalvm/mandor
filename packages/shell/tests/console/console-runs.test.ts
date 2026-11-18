import type { LogLine } from '@mandor/ui';
import { describe, expect, it } from 'vitest';

import {
    CONSOLE_BYTES,
    consoleCounts,
    consoleLinesOf,
    writtenRuns,
} from '../../src/console/console-runs.js';

function line(key: string, text: string, tone: LogLine['tone'] = 'log'): LogLine {
    return { key, tone, text };
}

describe('the runs of the console as they are written (writtenRuns)', () => {
    it('opens a run with its first lines and adds to it after, in the order written', () => {
        const one = writtenRuns([], { id: 'a', title: 'GET altas' }, [line('1', 'antes')]);
        const two = writtenRuns(one, { id: 'a', title: 'GET altas' }, [line('2', 'después')]);

        expect(two).toHaveLength(1);
        expect(two[0]?.lines.map((each) => each.text)).toEqual(['antes', 'después']);
        expect(two[0]?.bytes).toBe(('antes'.length + 'después'.length) * 2);
    });

    it('puts a new run after the ones already there', () => {
        const runs = writtenRuns(
            writtenRuns([], { id: 'a', title: 'A' }, [line('1', 'x')]),
            { id: 'b', title: 'B' },
            [line('1', 'y')],
        );

        expect(runs.map((run) => run.id)).toEqual(['a', 'b']);
    });

    it('lets the oldest runs go once the console weighs more than its ceiling, never the newest', () => {
        const heavy = 'x'.repeat(CONSOLE_BYTES / 4);
        let runs = writtenRuns([], { id: 'a', title: 'A' }, [line('1', heavy)]);

        runs = writtenRuns(runs, { id: 'b', title: 'B' }, [line('1', heavy)]);
        runs = writtenRuns(runs, { id: 'c', title: 'C' }, [line('1', heavy)]);

        expect(runs.map((run) => run.id)).toEqual(['b', 'c']);

        const huge = writtenRuns(runs, { id: 'd', title: 'D' }, [
            line('1', 'x'.repeat(CONSOLE_BYTES)),
        ]);

        expect(huge.map((run) => run.id)).toEqual(['d']);
    });

    it('keeps the same runs when nothing has to go', () => {
        const runs = writtenRuns([], { id: 'a', title: 'A' }, [line('1', 'x')]);

        expect(writtenRuns(runs, { id: 'a', title: 'A' }, [])[0]?.lines).toHaveLength(1);
    });
});

describe('the console read as one list (consoleLinesOf)', () => {
    it('heads every run with its title and keys its lines apart from the other runs', () => {
        let runs = writtenRuns([], { id: 'a', title: 'GET altas' }, [line('log-0', 'x')]);

        runs = writtenRuns(runs, { id: 'b', title: 'POST bajas' }, [line('log-0', 'y')]);

        expect(consoleLinesOf(runs)).toEqual([
            { key: 'a/heading', tone: 'heading', text: 'GET altas' },
            { key: 'a/log-0', tone: 'log', text: 'x' },
            { key: 'b/heading', tone: 'heading', text: 'POST bajas' },
            { key: 'b/log-0', tone: 'log', text: 'y' },
        ]);
    });
});

describe('what the status line counts (consoleCounts)', () => {
    it('counts the faults and the warnings of every run, and nothing else', () => {
        let runs = writtenRuns([], { id: 'a', title: 'A' }, [
            line('1', 'x', 'error'),
            line('2', 'y', 'warn'),
            line('3', 'z', 'info'),
        ]);

        runs = writtenRuns(runs, { id: 'b', title: 'B' }, [line('1', 'w', 'error')]);

        expect(consoleCounts(runs)).toEqual({ errors: 2, warnings: 1 });
        expect(consoleCounts([])).toEqual({ errors: 0, warnings: 0 });
    });
});
