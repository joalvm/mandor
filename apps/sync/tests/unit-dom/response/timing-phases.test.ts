import { describe, expect, it } from 'vitest';

import { timingPhasesOf } from '../../../src/renderer/response/lib/timing-phases.js';

const TIMINGS = {
    connectMs: 10,
    dnsMs: 5,
    firstByteMs: 40,
    tlsMs: 20,
    totalMs: 100,
    viaProxy: false,
};

describe('timingPhasesOf', () => {
    it('lays the phases out in the order they happened, each starting where the last ended', () => {
        expect(timingPhasesOf(TIMINGS)).toEqual([
            { ms: 5, name: 'dns', startMs: 0 },
            { ms: 10, name: 'connect', startMs: 5 },
            { ms: 20, name: 'tls', startMs: 15 },
            { ms: 40, name: 'firstByte', startMs: 35 },
            { ms: 25, name: 'download', startMs: 75 },
        ]);
    });

    it('never makes the download negative when the phases add up to more than the total', () => {
        const phases = timingPhasesOf({ ...TIMINGS, totalMs: 50 });

        expect(phases.at(-1)).toEqual({ ms: 0, name: 'download', startMs: 75 });
    });

    it('has no phases for a send through a proxy, which could not be measured by phase', () => {
        expect(timingPhasesOf({ ...TIMINGS, viaProxy: true })).toEqual([]);
    });
});
