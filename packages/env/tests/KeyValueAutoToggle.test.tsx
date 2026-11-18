import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { KeyValueAutoLine } from '../src/components/key-value/key-value-line.js';
import { KeyValueAutoToggle } from '../src/components/key-value/KeyValueAutoToggle.js';
import { mountInTable } from './support/key-value-state.js';

afterEach(cleanup);

const AUTO: readonly KeyValueAutoLine[] = [
    { id: 'ct', name: 'Content-Type', value: 'application/json' },
    { id: 'ua', name: 'User-Agent', value: 'Mandor/1.0' },
];

describe('the toggle of the rows the app adds', () => {
    it('is not there when the app adds nothing', () => {
        mountInTable(<KeyValueAutoToggle />);
        expect(screen.queryByRole('button')).toBeNull();

        mountInTable(<KeyValueAutoToggle />, { autoLines: [] });
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('says how many rows hide behind it until someone asks to see them', () => {
        mountInTable(<KeyValueAutoToggle />, { autoLines: AUTO });

        expect(screen.getByRole('button', { name: '2 ocultas' })).toBeVisible();
        expect(screen.getByLabelText('Estado')).toBeEmptyDOMElement();
    });

    it('shows them on the first press and offers to hide them on the second', () => {
        mountInTable(<KeyValueAutoToggle />, { autoLines: AUTO });

        fireEvent.click(screen.getByRole('button', { name: '2 ocultas' }));

        expect(screen.getByLabelText('Estado')).toHaveTextContent('auto');

        fireEvent.click(screen.getByRole('button', { name: 'Ocultar filas que añade la app' }));

        expect(screen.getByLabelText('Estado')).toBeEmptyDOMElement();
        expect(screen.getByRole('button', { name: '2 ocultas' })).toBeVisible();
    });
});
