import { describe, expect, it } from 'vitest';

import { cssOf } from './theme-values.js';

/** The declarations of the rule written for exactly this selector, or none. */
function declarationsFor(css: string, selector: string): string {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    return new RegExp(`${escaped} \\{([^}]*)\\}`).exec(css)?.[1] ?? '';
}

describe('how a field line holds a text longer than its box', () => {
    /**
     * A line that only refuses to wrap spills past the edge of the box it lives in, over whatever
     * stands beside it. Clipped, it scrolls inside itself with the caret, the way a native input
     * does, and no bar is drawn on a field that is one line tall.
     */
    it('clips the text at the edge of the box', async () => {
        const rule = declarationsFor(await cssOf('runtime.css'), "[data-part='editable']");

        expect(rule).toMatch(/overflow:\s*hidden/);
    });

    it('ends a placeholder that does not fit in an ellipsis, never cut mid-letter', async () => {
        const rule = declarationsFor(
            await cssOf('runtime.css'),
            "[data-part='editable'][data-placeholder]:empty",
        );

        expect(rule).toMatch(/text-overflow:\s*ellipsis/);
    });
});
