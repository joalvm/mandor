import { MessagesProvider } from '@mandor/i18n';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PALETTE_SURFACE } from '../../../src/command/window-commands.js';
import { registerSurface } from '../../../src/command/window-surface.js';
import { CommandCenter } from '../../../src/components/title-bar/CommandCenter.js';
import { shellStore } from '../../../src/shell-store.js';

function renderCenter() {
    return render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <CommandCenter />
        </MessagesProvider>,
    );
}

afterEach(() => {
    cleanup();
});

describe('the command centre of the title row', () => {
    it('is a button named for the search, with the keys of the palette at its end', () => {
        renderCenter();

        const button = screen.getByRole('button', { name: 'Buscar comandos' });

        expect(button).toHaveTextContent('Buscar comandos');
        expect(button).toHaveTextContent('Ctrl+Shift+P');
        expect(button).toHaveClass('whitespace-nowrap');
    });

    it('opens the palette the window registered, with the state of the window', () => {
        const open = vi.fn();
        const stop = registerSurface({ id: PALETTE_SURFACE, open });

        renderCenter();
        fireEvent.click(screen.getByRole('button', { name: 'Buscar comandos' }));
        stop();

        expect(open).toHaveBeenCalledOnce();
        expect(open).toHaveBeenCalledWith(shellStore.getState());
    });

    it('does nothing while no palette is registered', () => {
        renderCenter();
        fireEvent.click(screen.getByRole('button', { name: 'Buscar comandos' }));

        expect(screen.getByRole('button', { name: 'Buscar comandos' })).toBeInTheDocument();
    });
});
