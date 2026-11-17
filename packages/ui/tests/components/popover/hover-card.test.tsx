import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HoverCard, HoverCardPanel, HoverCardTrigger } from '../../../src/index.js';

describe('HoverCard, HoverCardTrigger and HoverCardPanel', () => {
    it('opens a hover card after the pointer rests, never on a click, and closes on leaving', async () => {
        render(
            <HoverCard>
                <HoverCardTrigger>
                    <button type="button">142 ms</button>
                </HoverCardTrigger>
                <HoverCardPanel>
                    <span>DNS lookup</span>
                </HoverCardPanel>
            </HoverCard>,
        );

        const trigger = screen.getByRole('button', { name: '142 ms' });

        fireEvent.click(trigger);
        fireEvent.pointerEnter(trigger, { pointerType: 'mouse' });

        expect(screen.queryByText('DNS lookup')).toBeNull();
        expect(await screen.findByText('DNS lookup')).toBeVisible();

        fireEvent.pointerLeave(trigger, { pointerType: 'mouse' });

        await waitFor(() => {
            expect(screen.queryByText('DNS lookup')).toBeNull();
        });
    });

    it('opens a hover card on a focus the keyboard brought, never on the focus of a press', async () => {
        render(
            <HoverCard>
                <HoverCardTrigger>
                    <button type="button">142 ms</button>
                </HoverCardTrigger>
                <HoverCardPanel>
                    <span>DNS lookup</span>
                </HoverCardPanel>
            </HoverCard>,
        );

        const trigger = screen.getByRole('button', { name: '142 ms' });

        fireEvent.pointerDown(trigger, { pointerType: 'mouse' });
        fireEvent.focus(trigger);

        expect(screen.queryByText('DNS lookup')).toBeNull();

        fireEvent.blur(trigger);
        fireEvent.focus(trigger);

        expect(await screen.findByText('DNS lookup')).toBeVisible();
    });
});
