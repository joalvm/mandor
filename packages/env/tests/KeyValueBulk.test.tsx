import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { KeyValueBulk } from '../src/components/key-value/KeyValueBulk.js';
import { mountAlone } from './support/key-value-state.js';

afterEach(cleanup);

describe('the bulk text of a table', () => {
    it('shows the draft in one column, with the note that says what it is', () => {
        mountAlone(<KeyValueBulk draft={'a:1\n//b:2'} onDraftChange={vi.fn()} />);

        expect(screen.getByRole('textbox', { name: 'Edición masiva de pares' })).toHaveValue(
            'a:1\n//b:2',
        );
        expect(screen.getByText(/Un par por línea, clave:valor/)).toBeVisible();
    });

    it('hands every edit of the text to the owner of the draft', () => {
        const onDraftChange = vi.fn();

        mountAlone(<KeyValueBulk draft="a:1" onDraftChange={onDraftChange} />);

        fireEvent.change(screen.getByRole('textbox', { name: 'Edición masiva de pares' }), {
            target: { value: 'a:1\nb:2' },
        });

        expect(onDraftChange).toHaveBeenCalledWith('a:1\nb:2');
    });
});
