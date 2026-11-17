import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DisabledControlTooltip } from '../../../src/components/tooltip/DisabledControlTooltip.js';
import { TooltipProvider } from '../../../src/index.js';

function draw(reason?: string) {
    render(
        <TooltipProvider delayDuration={0}>
            <DisabledControlTooltip reason={reason}>
                <button disabled type="button">
                    Send
                </button>
            </DisabledControlTooltip>
        </TooltipProvider>,
    );
}

describe('a disabled control with a reason', () => {
    it('draws the control alone when nothing is to be said about it', () => {
        draw();

        expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
        expect(document.querySelector('[data-part="disabled-control"]')).toBeNull();
    });

    it('keeps the control inside a box that can be hovered', () => {
        draw('Nothing to send yet');

        const box = document.querySelector('[data-part="disabled-control"]');

        expect(box).not.toBeNull();
        expect(box?.contains(screen.getByRole('button', { name: 'Send' }))).toBe(true);
    });

    it('says the reason when the box is reached', async () => {
        draw('Nothing to send yet');

        const box = document.querySelector('[data-part="disabled-control"]');

        if (box === null) {
            throw new Error('the box is drawn');
        }

        fireEvent.focus(box);

        expect(await screen.findByRole('tooltip')).toHaveTextContent('Nothing to send yet');
    });
});
