import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    setTextZoom,
    textZoom,
    watchTextZoom,
    zoomedTextSize,
    zoomTextBy,
} from '../../src/lib/text-zoom.js';

afterEach(() => {
    setTextZoom(0);
});

describe('the size the text of the window is read at (text-zoom)', () => {
    it('opens at the size of the app', () => {
        expect(textZoom()).toBe(0);
        expect(zoomedTextSize(12)).toBe(12);
    });

    /** A step is a tenth of the size of the app, whatever that size: the code and the prose alike. */
    it('grows the size of the app a tenth for each step up and shrinks it for each step down', () => {
        zoomTextBy(5);

        expect(zoomedTextSize(12)).toBe(18);
        expect(zoomedTextSize(16)).toBe(24);

        zoomTextBy(-6);

        expect(textZoom()).toBe(-1);
        expect(zoomedTextSize(16)).toBeCloseTo(14.4);
    });

    /** A wheel that keeps turning stops at the ends: text too small to read, or a page of words. */
    it('stays within the steps there are, however far it is pushed', () => {
        setTextZoom(99);

        expect(textZoom()).toBe(10);
        expect(zoomedTextSize(12)).toBe(24);

        setTextZoom(-99);

        expect(textZoom()).toBe(-2);
    });

    it('tells whoever watches each step it moves to, and nothing once they stop watching', () => {
        const heard = vi.fn();
        const stop = watchTextZoom(heard);

        zoomTextBy(1);
        setTextZoom(1);
        stop();
        zoomTextBy(1);

        expect(heard.mock.calls).toEqual([[1]]);
    });
});
