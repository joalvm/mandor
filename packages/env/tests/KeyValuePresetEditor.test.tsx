import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    KeyValuePresetEditor,
    type KeyValuePresetDraft,
} from '../src/components/key-value/KeyValuePresetEditor.js';
import { mountAlone } from './support/key-value-state.js';

afterEach(cleanup);

const DRAFT: KeyValuePresetDraft = {
    id: 'web',
    lines: [{ disabled: false, id: '0', name: 'Accept', value: 'text/html' }],
    name: 'web',
};

function draw(draft: KeyValuePresetDraft = DRAFT) {
    const spies = { onCancel: vi.fn(), onDraftChange: vi.fn(), onSave: vi.fn() };

    mountAlone(<KeyValuePresetEditor draft={draft} {...spies} />);

    return spies;
}

/** Text under the focus, the way an editable line receives an edit. */
function write(cell: HTMLElement, text: string): void {
    fireEvent.focus(cell);
    cell.textContent = text;
    fireEvent.input(cell);
}

describe('one preset being written', () => {
    it('shows the name and the rows of the draft in the table every list of pairs is', () => {
        draw();

        expect(screen.getByRole('textbox', { name: 'Nombre del preajuste' })).toHaveTextContent(
            'web',
        );
        expect(screen.getByText('Filas del preajuste')).toBeVisible();
        expect(screen.getAllByRole('textbox', { name: 'Clave' })[0]).toHaveTextContent('Accept');
    });

    it('hands the draft back with the name it was given', () => {
        const { onDraftChange } = draw();

        write(screen.getByRole('textbox', { name: 'Nombre del preajuste' }), 'web2');

        expect(onDraftChange).toHaveBeenCalledWith({ ...DRAFT, name: 'web2' });
    });

    it('hands the draft back with the rows the table wrote', () => {
        const { onDraftChange } = draw({ ...DRAFT, lines: [] });

        write(screen.getByRole('textbox', { name: 'Clave' }), 'X-Device');

        expect(onDraftChange).toHaveBeenCalledWith({
            ...DRAFT,
            lines: [{ disabled: false, id: '0', name: 'X-Device', value: '' }],
        });
    });

    it('saves the draft it holds', () => {
        const { onSave } = draw();

        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        expect(onSave).toHaveBeenCalledWith(DRAFT);
    });

    it('does not save a preset whose name is blank', () => {
        draw({ ...DRAFT, name: '   ' });

        expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    });

    it('gives the preset up on cancel', () => {
        const { onCancel, onSave } = draw();

        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(onCancel).toHaveBeenCalledOnce();
        expect(onSave).not.toHaveBeenCalled();
    });
});
