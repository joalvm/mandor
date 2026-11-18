import { describe, expect, it } from 'vitest';

import { wantsNextWindow } from '../../../../src/renderer/response/lib/next-window.js';

const SCREEN = { height: 400, scrollLeft: 0, scrollTop: 0, width: 800 };

describe('when a body read by windows asks for the next one', () => {
    it('asks at once for a text that fits the view', () => {
        expect(wantsNextWindow({ ...SCREEN, scrollHeight: 200, scrollWidth: 800 })).toBe(true);
    });

    /** One long line wraps into a tall text: its top is far from its end. */
    it('waits while the view stands more than a screen above the end', () => {
        expect(wantsNextWindow({ ...SCREEN, scrollHeight: 90_000, scrollWidth: 800 })).toBe(false);
    });

    it('asks once the view comes within a screen of the end', () => {
        expect(
            wantsNextWindow({
                ...SCREEN,
                scrollHeight: 90_000,
                scrollTop: 89_300,
                scrollWidth: 800,
            }),
        ).toBe(true);
    });

    /** One long line unwrapped is a screenful down and far across: its start is not its end. */
    it('waits on a line wider than the view until the view nears its end across', () => {
        const wide = { ...SCREEN, scrollHeight: 400, scrollWidth: 2_000_000 };

        expect(wantsNextWindow(wide)).toBe(false);
        expect(wantsNextWindow({ ...wide, scrollLeft: 1_999_000 })).toBe(true);
    });

    /** A small overflow on either axis cannot ask for unread text far away on the other. */
    it.each([
        { scrollHeight: 90_000, scrollWidth: 801 },
        { scrollHeight: 401, scrollWidth: 2_000_000 },
    ])('waits while an overflowing axis remains far from its end (%j)', (size) => {
        expect(wantsNextWindow({ ...SCREEN, ...size })).toBe(false);
    });

    it('asks when both overflowing axes come within a screen of their end', () => {
        expect(
            wantsNextWindow({
                ...SCREEN,
                scrollHeight: 90_000,
                scrollTop: 89_300,
                scrollLeft: 1_999_000,
                scrollWidth: 2_000_000,
            }),
        ).toBe(true);
    });

    it('asks for nothing while the view has no size, off screen', () => {
        expect(
            wantsNextWindow({ ...SCREEN, height: 0, scrollHeight: 0, scrollWidth: 0, width: 0 }),
        ).toBe(false);
        expect(wantsNextWindow(undefined)).toBe(false);
    });
});
