import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NumberInput } from '../../../src/index.js';

describe('the NumberInput primitive', () => {
    it('shows the count it is given and hands back each whole one typed', () => {
        const onNumber = vi.fn();

        render(<NumberInput label="Intentos" onNumber={onNumber} value={3} />);

        const field = screen.getByRole('textbox', { name: 'Intentos' });

        expect(field).toHaveTextContent('3');

        fireEvent.input(field, { target: { textContent: '12' } });

        expect(onNumber).toHaveBeenCalledWith(12);
        expect(field).toBeValid();
    });

    it('keeps a half-written count on the line, says it is not one and tells nobody', () => {
        const onNumber = vi.fn();

        render(<NumberInput label="Espera" min={1} onNumber={onNumber} unit="ms" value={500} />);

        const field = screen.getByRole('textbox', { name: 'Espera' });

        fireEvent.input(field, { target: { textContent: 'pronto' } });

        expect(field).toBeInvalid();

        fireEvent.input(field, { target: { textContent: '0' } });

        expect(field).toBeInvalid();
        expect(onNumber).not.toHaveBeenCalled();
    });
});
