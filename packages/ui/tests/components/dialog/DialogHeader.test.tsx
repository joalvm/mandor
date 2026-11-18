import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DialogHeader } from '../../../src/components/dialog/DialogHeader.js';
import { byPart } from '../../../src/testing/by-part.js';

describe('the band a dialog is titled in', () => {
    it('holds the title the dialog writes in it, as the band of its header', () => {
        render(
            <DialogHeader>
                <h2>Borrar el entorno Local</h2>
            </DialogHeader>,
        );

        expect(byPart('dialog-header')).toContainElement(
            screen.getByRole('heading', { name: 'Borrar el entorno Local' }),
        );
    });
});
