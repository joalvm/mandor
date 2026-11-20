import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InlineNameInput } from '../../../src/components/input/InlineNameInput.js';

describe('the inline name in place of a row name', () => {
    it('melts into the row: no border, no height, one solid surface of its own', () => {
        render(
            <InlineNameInput
                label="Nombre"
                value="gateway"
                onCancel={vi.fn()}
                onCommit={vi.fn()}
            />,
        );

        const line = screen.getByRole('textbox', { name: 'Nombre' });

        // It draws its grey line, and the focus leaves that line as it is.
        expect(line).toHaveClass('border', 'border-border-strong');
        expect(line).not.toHaveClass('rounded-md');
        expect(line).not.toHaveClass('h-control-xs');
        expect(line).not.toHaveAttribute('data-focus-frame');
        // White on any ground: the name being written stands out of the row it renames.
        expect(line).toHaveClass('bg-surface-card');
        expect(line).not.toHaveClass('bg-transparent');
    });

    it('paints a draft the row rejects until the line changes', () => {
        render(
            <InlineNameInput
                label="Nombre"
                value="gateway"
                onCancel={vi.fn()}
                onCommit={vi.fn(() => false)}
            />,
        );

        const line = screen.getByRole('textbox', { name: 'Nombre' });

        fireEvent.keyDown(line, { key: 'Enter' });

        expect(line).toHaveAttribute('aria-invalid', 'true');
        expect(line).toHaveClass('underline');
        expect(line).toHaveClass('decoration-wavy');

        fireEvent.input(line);

        expect(line).toHaveAttribute('aria-invalid', 'false');
        expect(line).not.toHaveClass('underline');
    });

    it('commits the name it holds when the focus leaves', () => {
        const onCancel = vi.fn();
        const onCommit = vi.fn(() => true);

        render(
            <InlineNameInput
                label="Nombre"
                value="gateway"
                onCancel={onCancel}
                onCommit={onCommit}
            />,
        );
        fireEvent.blur(screen.getByRole('textbox', { name: 'Nombre' }));

        expect(onCommit).toHaveBeenCalledWith('gateway');
        expect(onCancel).not.toHaveBeenCalled();
    });

    /** A field nobody filled, or filled with a name the row refuses, does not stay behind. */
    it('lets go when the focus leaves it empty or refused', () => {
        const onCancel = vi.fn();
        const onCommit = vi.fn(() => false);
        const view = render(
            <InlineNameInput label="Nombre" value="" onCancel={onCancel} onCommit={onCommit} />,
        );

        fireEvent.blur(screen.getByRole('textbox', { name: 'Nombre' }));

        expect(onCommit).not.toHaveBeenCalled();
        expect(onCancel).toHaveBeenCalledTimes(1);

        view.unmount();
        render(
            <InlineNameInput label="Otro" value="taken" onCancel={onCancel} onCommit={onCommit} />,
        );
        fireEvent.blur(screen.getByRole('textbox', { name: 'Otro' }));

        expect(onCommit).toHaveBeenCalledWith('taken');
        expect(onCancel).toHaveBeenCalledTimes(2);
    });
});
