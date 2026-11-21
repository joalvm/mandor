import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { FrameViewMenu } from '../../../src/renderer/activity/components/dock/FrameViewMenu.js';

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

describe('the menu of views over a frame', () => {
    it('names the view on screen and offers the others, languages first', async () => {
        const onChange = vi.fn();

        render(<FrameViewMenu onChange={onChange} value="json" />, { wrapper: Wrapper });

        const trigger = screen.getByRole('button', { name: 'Formato del mensaje: JSON' });

        expect(trigger).toHaveTextContent('JSON');

        fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });

        const items = await screen.findAllByRole('menuitem');

        expect(items.map((item) => item.textContent)).toEqual([
            'JSON',
            'XML',
            'HTML',
            'Raw',
            'Hex',
        ]);

        fireEvent.click(screen.getByRole('menuitem', { name: 'Hex' }));

        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith('hex');
        });
    });

    it('names the bytes when the frame is read as them', () => {
        render(<FrameViewMenu onChange={vi.fn()} value="hex" />, { wrapper: Wrapper });

        expect(screen.getByRole('button', { name: 'Formato del mensaje: Hex' })).toBeVisible();
    });
});
