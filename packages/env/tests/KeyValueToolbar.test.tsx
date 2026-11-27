import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { KeyValueAutoLine } from '../src/components/key-value/key-value-line.js';
import { KeyValueToolbar } from '../src/components/key-value/KeyValueToolbar.js';
import { mountInTable } from './support/key-value-state.js';

afterEach(cleanup);

const AUTO: readonly KeyValueAutoLine[] = [{ id: 'ct', name: 'Content-Type', value: 'x' }];

describe('the toolbar of a table', () => {
    it('carries the name of what the table holds', () => {
        mountInTable(<KeyValueToolbar title="Parámetros de consulta" />);

        expect(screen.getByText('Parámetros de consulta')).toBeVisible();
    });

    it('carries the toggle of the rows the app adds', () => {
        mountInTable(<KeyValueToolbar title="t" />, { autoLines: AUTO });

        expect(screen.getByRole('button', { name: '1 oculta' })).toBeVisible();
    });
});
