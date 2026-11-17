import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ExampleStatusPicker } from '../../../../../../src/renderer/features/requests/components/examples/ExampleStatusPicker.js';
import { AppProviders } from '../../../../support/app-providers.js';

afterEach(cleanup);

function draw(value: string, onChange: (status: string) => void = () => undefined): void {
    render(<ExampleStatusPicker onChange={onChange} value={value} />, { wrapper: AppProviders });
}

function open(): void {
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Expected status' }), {
        code: 'ArrowDown',
        key: 'ArrowDown',
    });
}

describe('the status an example stands for', () => {
    it('shows the code with its name, in the tone of its family', () => {
        draw('404');

        const picker = screen.getByRole('combobox', { name: 'Expected status' });

        expect(picker).toHaveTextContent('404 Not Found');
        expect(picker).toHaveClass('text-text-error');
    });

    it('names each code in the list and in the trigger', () => {
        draw('404');

        expect(screen.getByRole('combobox', { name: 'Expected status' })).toHaveTextContent(
            '404 Not Found',
        );

        open();

        expect(screen.getByRole('option', { name: '404 Not Found' })).toBeVisible();
    });

    it('offers the common codes by family, and the code for the rest', () => {
        draw('200');
        open();

        expect(screen.getAllByRole('group').map((group) => group.textContent)).toEqual([
            expect.stringContaining('2xx'),
            expect.stringContaining('3xx'),
            expect.stringContaining('4xx'),
            expect.stringContaining('5xx'),
        ]);
        expect(screen.getByRole('option', { name: '422 Unprocessable Entity' })).toBeVisible();
        expect(screen.getByRole('option', { name: 'default' })).toBeVisible();
    });

    it('hands over the code that is picked', () => {
        const onChange = vi.fn();

        draw('200', onChange);
        open();
        fireEvent.click(screen.getByRole('option', { name: '503 Service Unavailable' }));

        expect(onChange).toHaveBeenCalledWith('503');
    });

    it('is a pill without a border, as wide as the text it says', () => {
        draw('201');

        const picker = screen.getByRole('combobox', { name: 'Expected status' });

        expect(picker).toHaveClass('border-transparent', 'bg-surface-success-tint');
        expect(picker.querySelectorAll('[data-part="select-sizer"]')).toHaveLength(0);
    });

    it('keeps a code the list does not offer, at the top of it', () => {
        draw('418');
        open();

        expect(screen.getAllByRole('option')[0]).toHaveTextContent('418');
    });

    it('does not repeat a code it does offer', () => {
        draw('200');
        open();

        expect(screen.getAllByRole('option', { name: /^200 /u })).toHaveLength(1);
    });
});
