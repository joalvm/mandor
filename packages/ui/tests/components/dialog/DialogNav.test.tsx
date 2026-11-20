import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '../../../src/components/button/Button.js';
import { DialogNav } from '../../../src/components/dialog/DialogNav.js';
import { byPart } from '../../../src/testing/by-part.js';

describe('the column of sections of a dialog', () => {
    it('holds whatever the dialog writes in it, in the order it was written', () => {
        render(
            <DialogNav>
                <Button onClick={vi.fn()}>General</Button>
                <Button onClick={vi.fn()}>Avanzado</Button>
            </DialogNav>,
        );

        const names = within(byPart('dialog-nav'))
            .getAllByRole('button')
            .map((button) => button.textContent);

        expect(names).toEqual(['General', 'Avanzado']);
        expect(screen.getByRole('button', { name: 'General' })).toBeVisible();
    });

    it('stands on the ground of its dialog, with no fill of its own', () => {
        render(<DialogNav>General</DialogNav>);

        expect(byPart('dialog-nav').className).not.toMatch(/(^|\s)bg-/);
    });
});
