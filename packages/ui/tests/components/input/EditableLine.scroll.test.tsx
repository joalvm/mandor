import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EditableLine } from '../../../src/components/input/EditableLine.js';

const LONG = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)';

describe('where a long line stands when the caret leaves it', () => {
    /**
     * Typing at the end of a long value scrolls the line to the caret. Left like that, the box
     * would show the tail of the value and hide how it starts; a native input shows the start.
     */
    it('goes back to the start of the text', () => {
        render(
            <EditableLine
                disabled={false}
                invalid={false}
                label="URL"
                onValueChange={() => undefined}
                value={LONG}
            />,
        );

        const textbox = screen.getByRole('textbox', { name: 'URL' });

        fireEvent.focus(textbox);
        textbox.scrollLeft = 240;
        fireEvent.blur(textbox);

        expect(textbox.scrollLeft).toBe(0);
    });
});
