import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { KeyValueDescriptionCell } from '../src/components/key-value/KeyValueDescriptionCell.js';
import { BOTH, mountRowsInTable, VALUE_ONLY } from './support/key-value-state.js';

afterEach(cleanup);

describe('the description of a row', () => {
    it('is not drawn while the table hides that column', () => {
        mountRowsInTable(
            <tr>
                <KeyValueDescriptionCell onChange={() => undefined} value="nota" />
            </tr>,
            {
                columns: VALUE_ONLY,
            },
        );

        expect(screen.queryByRole('textbox', { name: 'Descripción' })).toBeNull();
    });

    it('speaks what it was given and hands every edit to its row', () => {
        const onChange = vi.fn();

        mountRowsInTable(
            <tr>
                <KeyValueDescriptionCell onChange={onChange} value="nota" />
            </tr>,
            {
                columns: BOTH,
            },
        );

        const cell = screen.getByRole('textbox', { name: 'Descripción' });

        expect(cell).toHaveTextContent('nota');

        fireEvent.focus(cell);
        cell.textContent = 'otra';
        fireEvent.input(cell);

        expect(onChange).toHaveBeenLastCalledWith('otra');
    });
});
