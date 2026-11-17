import { afterEach, describe, expect, it, vi } from 'vitest';

import { fakeClock } from './fake-clock.js';
import { inertUpdatePort, type UpdatePort } from '../../src/update/update-port.js';
import { scheduleChecks, systemTimers } from '../../src/update/update-schedule.js';

const SECOND = 1000;
const HOUR = 60 * 60 * SECOND;

function start(support: 'full' | 'manual-only' | 'unsupported' = 'full') {
    const clock = fakeClock();
    const checkForUpdates = vi.fn<UpdatePort['checkForUpdates']>(() => Promise.resolve());
    const setChannel = vi.fn<UpdatePort['setChannel']>();
    const setAutoDownload = vi.fn<UpdatePort['setAutoDownload']>();
    const port: UpdatePort = {
        ...inertUpdatePort('0.1.0'),
        checkForUpdates,
        setChannel,
        setAutoDownload,
    };
    const schedule = scheduleChecks({ port, support, timers: clock.timers });

    return { clock, checkForUpdates, schedule, setAutoDownload, setChannel };
}

describe('the looks for a version that main makes by itself', () => {
    it('looks ten seconds after the window is ready and chosen, and every six hours', () => {
        const { clock, checkForUpdates, schedule } = start();

        schedule.configure({ mode: 'auto', channel: 'stable' });
        schedule.ready();
        clock.advance(9 * SECOND);

        expect(checkForUpdates).not.toHaveBeenCalled();

        clock.advance(SECOND);

        expect(checkForUpdates).toHaveBeenCalledTimes(1);

        clock.advance(6 * HOUR);

        expect(checkForUpdates).toHaveBeenCalledTimes(2);

        clock.advance(6 * HOUR);

        expect(checkForUpdates).toHaveBeenCalledTimes(3);
    });

    it('counts the wait from the later of the two: the window ready and the choice made', () => {
        const { clock, checkForUpdates, schedule } = start();

        schedule.ready();
        clock.advance(HOUR);
        schedule.configure({ mode: 'notify', channel: 'stable' });
        clock.advance(10 * SECOND);

        expect(checkForUpdates).toHaveBeenCalledTimes(1);
    });

    it('never looks in manual mode', () => {
        const { clock, checkForUpdates, schedule } = start();

        schedule.ready();
        schedule.configure({ mode: 'manual', channel: 'stable' });
        clock.advance(24 * HOUR);

        expect(checkForUpdates).not.toHaveBeenCalled();
    });

    it('stops looking when the person goes to manual', () => {
        const { clock, checkForUpdates, schedule } = start();

        schedule.ready();
        schedule.configure({ mode: 'auto', channel: 'stable' });
        clock.advance(11 * SECOND);
        schedule.configure({ mode: 'manual', channel: 'stable' });
        clock.advance(24 * HOUR);

        expect(checkForUpdates).toHaveBeenCalledTimes(1);
        expect(clock.pending()).toBe(0);
    });

    it('keeps the clock it has when the choice changes between two modes that look', () => {
        const { clock, checkForUpdates, schedule } = start();

        schedule.ready();
        schedule.configure({ mode: 'auto', channel: 'stable' });
        clock.advance(5 * SECOND);
        schedule.configure({ mode: 'notify', channel: 'beta' });
        clock.advance(5 * SECOND);

        expect(checkForUpdates).toHaveBeenCalledTimes(1);
    });

    it('does not look, and does not start a clock, on an install that cannot update', () => {
        const { clock, checkForUpdates, schedule } = start('unsupported');

        schedule.ready();
        schedule.configure({ mode: 'auto', channel: 'stable' });
        clock.advance(24 * HOUR);

        expect(checkForUpdates).not.toHaveBeenCalled();
        expect(clock.pending()).toBe(0);
    });

    it('downloads by itself only in auto mode, and only where the install can take it', () => {
        const full = start('full');
        const byHand = start('manual-only');

        full.schedule.configure({ mode: 'auto', channel: 'stable' });
        full.schedule.configure({ mode: 'notify', channel: 'stable' });
        byHand.schedule.configure({ mode: 'auto', channel: 'stable' });

        expect(full.setAutoDownload.mock.calls).toEqual([[true], [false]]);
        expect(byHand.setAutoDownload.mock.calls).toEqual([[false]]);
    });

    it('hands the channel to the port every time the person chooses', () => {
        const { schedule, setChannel } = start();

        schedule.configure({ mode: 'auto', channel: 'beta' });
        schedule.configure({ mode: 'auto', channel: 'stable' });

        expect(setChannel.mock.calls).toEqual([['beta'], ['stable']]);
    });

    it('cancels what waits when it is disposed', () => {
        const { clock, checkForUpdates, schedule } = start();

        schedule.ready();
        schedule.configure({ mode: 'auto', channel: 'stable' });
        schedule.dispose();
        clock.advance(24 * HOUR);

        expect(checkForUpdates).not.toHaveBeenCalled();
    });
});

describe('the clock of the process', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('runs once after the wait and then at every period, and cancels', () => {
        vi.useFakeTimers();

        const once = vi.fn();
        const often = vi.fn();
        const cancelOnce = systemTimers.after(once, 10);
        const cancelOften = systemTimers.every(often, 10);

        vi.advanceTimersByTime(25);
        cancelOnce();
        cancelOften();
        vi.advanceTimersByTime(100);

        expect(once).toHaveBeenCalledTimes(1);
        expect(often).toHaveBeenCalledTimes(2);
    });
});
