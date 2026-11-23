import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Tabs, TabsList, TabsPanel, TabsTab } from '../../../src/index.js';

/** The moments of a script, as a column beside the panel of the one open. */
function showColumn(onValueChange = vi.fn()): ReturnType<typeof vi.fn> {
    render(
        <Tabs onValueChange={onValueChange} orientation="vertical" value="before">
            <TabsList label="Momentos">
                <TabsTab label="Antes del request" value="before" />
                <TabsTab label="Tras la response" muted value="after" />
            </TabsList>
            <TabsPanel value="before">
                <p>Lo que corre antes</p>
            </TabsPanel>
            <TabsPanel value="after">
                <p>Lo que corre después</p>
            </TabsPanel>
        </Tabs>,
    );

    return onValueChange;
}

describe('the sections in a column', () => {
    it('tells whoever reads it aloud that the list stands upright', () => {
        showColumn();

        expect(screen.getByRole('tablist', { name: 'Momentos' })).toHaveAttribute(
            'aria-orientation',
            'vertical',
        );
        expect(screen.getByText('Lo que corre antes')).toBeVisible();
    });

    it('walks the sections with the arrows up and down', async () => {
        const onValueChange = showColumn();

        fireEvent.keyDown(screen.getByRole('tab', { name: 'Antes del request' }), {
            key: 'ArrowDown',
        });

        await waitFor(() => {
            expect(onValueChange).toHaveBeenCalledWith('after');
        });
    });

    it('dims the name of a section whose content is set aside, and only that one', () => {
        showColumn();

        expect(screen.getByRole('tab', { name: 'Tras la response' })).toHaveAttribute('data-muted');
        expect(screen.getByRole('tab', { name: 'Antes del request' })).not.toHaveAttribute(
            'data-muted',
        );
    });
});
