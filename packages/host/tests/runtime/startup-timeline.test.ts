import { describe, expect, it } from 'vitest';

import type { Logger } from '../../src/log/create-logger.js';
import { createStartupTimeline, logWindowReady } from '../../src/runtime/startup-timeline.js';

function clock(...times: number[]): () => number {
    const left = [...times];

    return () => left.shift() ?? 0;
}

function spyLogger(): Logger & { lines: [string, string][] } {
    const lines: [string, string][] = [];

    return {
        lines,
        log: (level, message) => {
            lines.push([level, message]);
        },
        flush: () => Promise.resolve(),
    };
}

describe('the timeline of a start', () => {
    it('writes the stages in the order they were reached, in whole milliseconds', () => {
        const timeline = createStartupTimeline(clock(3.2, 40.6, 51, 60.4, 90.5, 120));

        for (const stage of [
            'host-start',
            'app-ready',
            'origin-open',
            'window-created',
            'ready-to-show',
            'window-ready',
        ] as const) {
            timeline.mark(stage);
        }

        expect(timeline.line()).toBe(
            'startup host-start=3 app-ready=41 origin-open=51 window-created=60 ready-to-show=91 window-ready=120',
        );
    });

    it('keeps a second window-ready apart, as a reload and not as another start', () => {
        const timeline = createStartupTimeline(clock(10, 5000));

        expect(timeline.mark('window-ready')).toBe('window-ready');
        expect(timeline.mark('window-ready')).toBe('window-reloaded');
        expect(timeline.line('window-reloaded')).toBe('startup window-reloaded=5000');
        expect(timeline.line('window-ready')).toBe('startup window-ready=10');
    });

    it('counts from the start of the process unless it is given another clock', () => {
        const timeline = createStartupTimeline();

        timeline.mark('host-start');

        expect(timeline.line()).toMatch(/^startup host-start=\d+$/);
    });
});

describe('the window saying it is ready', () => {
    it('writes the whole start once, and each reload on its own line', () => {
        const timeline = createStartupTimeline(clock(1, 200, 9000));
        const logger = spyLogger();

        timeline.mark('host-start');
        logWindowReady(timeline, logger);
        logWindowReady(timeline, logger);

        expect(logger.lines).toEqual([
            ['info', 'startup host-start=1 window-ready=200'],
            ['info', 'startup window-reloaded=9000'],
        ]);
    });
});
