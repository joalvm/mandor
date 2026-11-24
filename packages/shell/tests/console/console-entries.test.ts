import { describe, expect, it } from 'vitest';

import {
    CONSOLE_BYTES,
    consoleCounts,
    consoleWritesOf,
    recordsOf,
    writtenEntries,
} from '../../src/console/console-entries.js';

describe('the entries of the console', () => {
    it('keys each one from the first number on and weighs it by its texts and its parts', () => {
        const [entry] = recordsOf(
            [
                {
                    level: 'log',
                    text: 'ab',
                    detail: 'c',
                    sections: [{ title: 'h', value: { a: 1 } }],
                },
            ],
            7,
            50,
        );

        expect(entry).toMatchObject({ key: '7', at: 50, text: 'ab' });
        // `ab` and `c` are three characters, `{"a":1}` seven: two bytes each.
        expect(entry?.bytes).toBe(20);
    });

    it('weighs nothing for a part that cannot be written out', () => {
        const circle: Record<string, unknown> = {};

        circle['self'] = circle;

        const [entry] = recordsOf(
            [{ level: 'log', text: '', sections: [{ title: 'x', value: circle }] }],
            0,
            0,
        );

        expect(entry?.bytes).toBe(0);
    });

    it('lets the oldest leave until all fit under the ceiling, never one just written', () => {
        const old = recordsOf([{ level: 'log', text: 'old' }], 0, 0).map((entry) => ({
            ...entry,
            bytes: CONSOLE_BYTES,
        }));
        const fresh = recordsOf([{ level: 'log', text: 'fresh' }], 1, 0).map((entry) => ({
            ...entry,
            bytes: CONSOLE_BYTES + 1,
        }));

        expect(writtenEntries(old, fresh).map((entry) => entry.text)).toEqual(['fresh']);
        expect(writtenEntries([], old).map((entry) => entry.text)).toEqual(['old']);
    });

    it('reads every tone of a log as a level of the console, with where it came from', () => {
        const writes = consoleWritesOf(
            [
                { tone: 'error', text: 'a' },
                { tone: 'failed', text: 'b' },
                { tone: 'heading', text: 'c' },
                { tone: 'info', text: 'd' },
                { tone: 'log', text: 'e' },
                { tone: 'note', text: 'f' },
                { tone: 'passed', text: 'g' },
                { tone: 'warn', text: 'h', detail: 'why' },
            ],
            'GET altas',
        );

        expect(writes.map((write) => write.level)).toEqual([
            'error',
            'error',
            'log',
            'info',
            'log',
            'info',
            'info',
            'warn',
        ]);
        expect(writes[7]).toEqual({ level: 'warn', text: 'h', detail: 'why', source: 'GET altas' });
    });

    it('counts the faults and the warnings', () => {
        const entries = recordsOf(
            [
                { level: 'error', text: '' },
                { level: 'warn', text: '' },
                { level: 'error', text: '' },
                { level: 'log', text: '' },
            ],
            0,
            0,
        );

        expect(consoleCounts(entries)).toEqual({ errors: 2, warnings: 1 });
    });
});
