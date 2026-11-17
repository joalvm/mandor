import { describe, expect, it, vi } from 'vitest';

import { remeasureOnEachFontArrival } from '../../../src/editor/monaco/code-type-arrival.js';

describe('a face of the code type arriving after an editor measured it', () => {
    /**
     * An editor measured before a face landed keeps the widths of the fallback, and Monaco keeps
     * that reading for the window: the caret falls behind the letters, a little more each column,
     * until a change of size makes it measure again.
     */
    it('has every editor measure again each time faces land', () => {
        const fonts = new EventTarget() as FontFaceSet;
        const remeasure = vi.fn();

        remeasureOnEachFontArrival(fonts, remeasure);

        expect(remeasure).not.toHaveBeenCalled();

        fonts.dispatchEvent(new Event('loadingdone'));
        fonts.dispatchEvent(new Event('loadingdone'));

        expect(remeasure).toHaveBeenCalledTimes(2);
    });
});
