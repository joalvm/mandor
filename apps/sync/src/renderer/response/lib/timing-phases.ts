import type { HttpResponse } from '@mandor/schema';

export type TimingPhaseName = 'connect' | 'dns' | 'download' | 'firstByte' | 'tls';

export type TimingPhase = {
    /** How long the phase took. */
    ms: number;
    name: TimingPhaseName;
    /** How long the phases before it took together: where its bar starts. */
    startMs: number;
};

type Timings = HttpResponse['timings'];

/**
 * The phases of a send in the order they happened, each with where it starts. The download is
 * what is left of the total once the other four are taken out, never less than nothing: it is
 * worked out here because the transport measures up to the first byte and not past it. A send
 * that went through a proxy could not be measured by phase and has none.
 */
export function timingPhasesOf(timings: Timings): TimingPhase[] {
    if (timings.viaProxy) {
        return [];
    }

    const measured = [
        { ms: timings.dnsMs, name: 'dns' },
        { ms: timings.connectMs, name: 'connect' },
        { ms: timings.tlsMs, name: 'tls' },
        { ms: timings.firstByteMs, name: 'firstByte' },
    ] as const;
    const spent = measured.reduce((sum, phase) => sum + phase.ms, 0);
    const download = { ms: Math.max(0, timings.totalMs - spent), name: 'download' } as const;
    const phases = [...measured, download];
    let startMs = 0;

    return phases.map((phase) => {
        const placed = { ...phase, startMs };

        startMs += phase.ms;

        return placed;
    });
}
