import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ConsoleDock, consoleStore, shellStore } from '../../../src/index.js';

function draw() {
    return render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <ConsoleDock>
                    <p data-part="work">trabajo</p>
                </ConsoleDock>
            </TooltipProvider>
        </MessagesProvider>,
    );
}

afterEach(() => {
    cleanup();
    consoleStore.getState().hide();
    shellStore.getState().reset();
});

describe('the centre of the window with the console under it', () => {
    it('draws only the work while the console is put away', () => {
        draw();

        expect(screen.getByText('trabajo')).toBeVisible();
        expect(screen.queryByRole('region', { name: 'Consola' })).toBeNull();
        expect(screen.queryByRole('separator')).toBeNull();
    });

    it('opens the console under the work without drawing the work anew', () => {
        draw();

        const work = screen.getByText('trabajo');

        act(() => {
            consoleStore.getState().show();
        });

        const panel = screen.getByRole('region', { name: 'Consola' });

        expect(screen.getByText('trabajo')).toBe(work);
        expect(work.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(
            screen.getByRole('separator', { name: 'Cambiar el alto de la consola' }),
        ).toBeVisible();

        act(() => {
            consoleStore.getState().hide();
        });

        expect(screen.getByText('trabajo')).toBe(work);
        expect(screen.queryByRole('region', { name: 'Consola' })).toBeNull();
    });
});
