import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
    ExportFormatMenu,
    type ExportChoices,
} from '../../src/export/components/dialog/ExportFormatMenu.js';

import { AppProviders } from '../support/providers.js';

const FORMATS: ExportChoices = [
    { id: 'openapi', label: 'OpenAPI' },
    { id: 'postman', label: 'Postman' },
];

/** Radix opens the menu on pointerdown of its trigger, and runs the line on click. */
function open(label: string): void {
    fireEvent.pointerDown(screen.getByRole('button', { name: label }), {
        button: 0,
        ctrlKey: false,
    });
}

describe('the format menu of the export', () => {
    it('names the format in use on its button', () => {
        render(<ExportFormatMenu formats={FORMATS} onChange={vi.fn()} value="postman" />, {
            wrapper: AppProviders,
        });

        expect(screen.getByRole('button', { name: 'Format: Postman' })).toHaveTextContent(
            'Postman',
        );
    });

    it('offers every format of the app when it opens', async () => {
        render(<ExportFormatMenu formats={FORMATS} onChange={vi.fn()} value="openapi" />, {
            wrapper: AppProviders,
        });

        open('Format: OpenAPI');

        expect(await screen.findByRole('menuitem', { name: 'OpenAPI' })).toBeVisible();
        expect(screen.getByRole('menuitem', { name: 'Postman' })).toBeVisible();
    });

    it('hands over the id of the format the user picks', async () => {
        const onChange = vi.fn();

        render(<ExportFormatMenu formats={FORMATS} onChange={onChange} value="openapi" />, {
            wrapper: AppProviders,
        });
        open('Format: OpenAPI');
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Postman' }));

        expect(onChange).toHaveBeenCalledWith('postman');
    });

    it('falls back to the first format when the value is not one of them', () => {
        render(<ExportFormatMenu formats={FORMATS} onChange={vi.fn()} value="gone" />, {
            wrapper: AppProviders,
        });

        expect(screen.getByRole('button', { name: 'Format: OpenAPI' })).toBeVisible();
    });
});
