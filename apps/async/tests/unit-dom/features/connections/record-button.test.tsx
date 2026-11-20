import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RecordButton } from '../../../../src/renderer/features/connections/components/panel/RecordButton.js';

function draw(recording: { active: boolean; entries: number }, onToggle = vi.fn()): void {
    render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <RecordButton onToggle={onToggle} recording={recording} />
            </TooltipProvider>
        </MessagesProvider>,
    );
}

describe('the recording of a connection', () => {
    it('offers the recording while it holds none', () => {
        const onToggle = vi.fn();

        draw({ active: false, entries: 0 }, onToggle);
        fireEvent.click(screen.getByRole('button', { name: 'Grabar' }));

        expect(onToggle).toHaveBeenCalledOnce();
    });

    it('says that the connection is recording, and how much the file holds', () => {
        draw({ active: true, entries: 123 });

        const recording = screen.getByRole('button', { name: 'Grabando · 123' });

        expect(recording).toBeVisible();
        expect(recording).toHaveClass('bg-surface-selected');
    });

    /** The head keeps its words for its title: the recording is an icon with its tooltip. */
    it('draws the recording as an icon, without words', () => {
        draw({ active: false, entries: 0 });

        expect(screen.getByRole('button', { name: 'Grabar' })).not.toHaveTextContent('Grabar');
    });
});
