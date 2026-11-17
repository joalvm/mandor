import { describe, expect, it } from 'vitest';

import { newGuestClock } from '../../src/engine/guest-clock.js';

function fakeNow(): { now: () => number; advance: (ms: number) => void } {
    let time = 1_000;

    return {
        now: () => time,
        advance: (ms) => {
            time += ms;
        },
    };
}

describe('newGuestClock', () => {
    it('lets the guest run while its time inside the limit', () => {
        const { now, advance } = fakeNow();
        const clock = newGuestClock(100, now);

        const stopped = clock.measure(() => {
            advance(99);

            return clock.interrupt();
        });

        expect(stopped).toBe(false);
        expect(clock.exceeded).toBe(false);
    });

    it('stops the guest once the time of the running segment passes the limit', () => {
        const { now, advance } = fakeNow();
        const clock = newGuestClock(100, now);

        const stopped = clock.measure(() => {
            advance(101);

            return clock.interrupt();
        });

        expect(stopped).toBe(true);
        expect(clock.exceeded).toBe(true);
    });

    it('adds the segments together', () => {
        const { now, advance } = fakeNow();
        const clock = newGuestClock(100, now);

        clock.measure(() => {
            advance(60);
        });

        expect(
            clock.measure(() => {
                advance(50);

                return clock.interrupt();
            }),
        ).toBe(true);
    });

    it('does not count the time between segments, which is the wait for the network', () => {
        const { now, advance } = fakeNow();
        const clock = newGuestClock(100, now);

        clock.measure(() => {
            advance(60);
        });
        advance(10_000);

        expect(
            clock.measure(() => {
                advance(30);

                return clock.interrupt();
            }),
        ).toBe(false);
    });

    it('counts a segment that threw, and passes the throw on', () => {
        const { now, advance } = fakeNow();
        const clock = newGuestClock(100, now);

        expect(() =>
            clock.measure(() => {
                advance(150);
                throw new Error('guest');
            }),
        ).toThrow('guest');
        expect(clock.interrupt()).toBe(true);
    });

    it('answers from what was spent when asked outside a segment', () => {
        const { now, advance } = fakeNow();
        const clock = newGuestClock(100, now);

        expect(clock.interrupt()).toBe(false);

        clock.measure(() => {
            advance(101);
        });

        expect(clock.interrupt()).toBe(true);
    });

    it('stays exceeded once it has said stop', () => {
        const { now, advance } = fakeNow();
        const clock = newGuestClock(100, now);

        clock.measure(() => {
            advance(101);
        });
        clock.interrupt();

        expect(clock.measure(() => clock.interrupt())).toBe(true);
    });

    it('reads the real clock when none is given', () => {
        const clock = newGuestClock(60_000);

        expect(clock.measure(() => clock.interrupt())).toBe(false);
    });
});
