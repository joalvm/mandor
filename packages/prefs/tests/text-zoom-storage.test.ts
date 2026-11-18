import { afterEach, describe, expect, it } from 'vitest';

import { readTextZoom, writeTextZoom } from '../src/text-zoom-storage.js';

afterEach(() => {
    window.localStorage.clear();
});

describe('keeping the size the reader left the text at (text-zoom-storage)', () => {
    it('reads the size of the app when nothing was kept', () => {
        expect(readTextZoom()).toBe(0);
    });

    it('reads back the step it kept', () => {
        writeTextZoom(-2);

        expect(readTextZoom()).toBe(-2);
    });

    /** Whatever else is found under the key, the window still opens, at the size of the app. */
    it('reads the size of the app over what is not a step', () => {
        for (const kept of ['grande', '2.5', '']) {
            window.localStorage.setItem('mandor.textZoom', kept);

            expect(readTextZoom()).toBe(0);
        }
    });
});
