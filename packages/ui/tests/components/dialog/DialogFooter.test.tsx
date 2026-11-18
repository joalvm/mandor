import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '../../../src/components/button/Button.js';
import { DialogFooter } from '../../../src/components/dialog/DialogFooter.js';

describe('where a dialog ends', () => {
    it('lays the actions of the dialog in the closing edge, reachable by role', () => {
        render(
            <DialogFooter>
                <Button onClick={vi.fn()}>Cancelar</Button>
                <Button onClick={vi.fn()}>Guardar</Button>
            </DialogFooter>,
        );

        const footer = screen.getByRole('contentinfo');

        expect(footer).toHaveAttribute('data-part', 'dialog-footer');
        expect(screen.getByRole('button', { name: 'Cancelar' })).toBeVisible();
        expect(screen.getByRole('button', { name: 'Guardar' })).toBeVisible();
    });

    it('keeps whatever else the dialog wrote in it, in the order it was written', () => {
        render(
            <DialogFooter>
                <Button onClick={vi.fn()}>Cancelar</Button>
                <Button onClick={vi.fn()}>Guardar</Button>
            </DialogFooter>,
        );

        const footer = screen.getByRole('contentinfo');
        const actions = [...footer.querySelectorAll('button')].map((button) => button.textContent);

        expect(actions).toEqual(['Cancelar', 'Guardar']);
    });
});
