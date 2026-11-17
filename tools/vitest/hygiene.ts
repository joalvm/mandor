// What every test file, node or dom, owes the files after it. Whatever a test leaves behind lands
// in the next one, and the next one fails, or worse, passes for a reason it does not state.
//
// A test that writes to the console is saying something nobody reads: an update React saw land
// outside act, a key it found twice, a promise nobody caught. Read by nobody, it piles up until
// the run is a wall of warnings and the one that matters hides among them. So what a test writes
// as an error or a warning fails it, with the text it wrote. A test that expects a warning spies
// on the console itself, and its spy takes the writes while it lives.
import { format } from 'node:util';

import { afterAll, afterEach, vi } from 'vitest';

const SAID = Symbol.for('mandor.console.said');

type Holder = Record<symbol, string[] | undefined>;

function said(): string[] {
    const holder = console as unknown as Holder;
    const existing = holder[SAID];

    if (existing !== undefined) {
        return existing;
    }

    const fresh: string[] = [];

    holder[SAID] = fresh;

    // The files of a worker share one console, so it is wrapped once and read by every file.
    for (const level of ['error', 'warn'] as const) {
        const write = console[level].bind(console);

        console[level] = (...parts: unknown[]) => {
            fresh.push(`console.${level}: ${format(...parts)}`);
            write(...parts);
        };
    }

    return fresh;
}

function failOnWhatWasSaid(when: string): void {
    const lines = said().splice(0);

    if (lines.length > 0) {
        throw new Error(`${when} wrote to the console:\n${lines.join('\n')}`);
    }
}

said();

afterEach(() => {
    failOnWhatWasSaid('The test');
});

// A test that stops the clock gives it back. Left stopped, every wait of the test after it hangs
// until its timeout, and the failure names that test instead of this one.
afterEach(() => {
    if (vi.isFakeTimers()) {
        vi.useRealTimers();
        throw new Error(
            'The test left the clock stopped: it calls vi.useRealTimers() on its way out.',
        );
    }
});

// What lands after the last test, an update or a rejection the file left running, fails the file.
afterAll(() => {
    failOnWhatWasSaid('The file, after its last test,');
});
