import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SearchInput } from '../../../src/components/input/SearchInput.js';
import { byPart } from '../../../src/testing/by-part.js';

describe('the field a list is narrowed with', () => {
    it('names its line after what the list is narrowed by', () => {
        render(<SearchInput label="Filtrar" onValueChange={vi.fn()} value="" />);

        expect(screen.getByRole('searchbox', { name: 'Filtrar' })).toBeVisible();
        expect(byPart('input')).toBeInTheDocument();
    });

    /**
     * The glyph is what tells this field apart from every other one-line field, so it is drawn
     * here and is not a slot: it stands in front of the line, at the small optical size.
     */
    it('draws its own filter glyph in front of the line', () => {
        render(<SearchInput label="Filtrar" onValueChange={vi.fn()} value="" />);

        const glyph = byPart('input').querySelector('svg');

        expect(glyph).not.toBeNull();
        expect(glyph).toHaveAttribute('width', '14');
        expect(glyph).toHaveAttribute('aria-hidden', 'true');
    });

    /** It narrows what the panel shows, so it sits on the panel's own surface, drawn by its edge. */
    it('keeps the surface of the panel it stands on', () => {
        render(<SearchInput label="Filtrar" onValueChange={vi.fn()} value="" />);

        expect(byPart('input')).toHaveClass('bg-transparent', 'border-border-strong');
        expect(byPart('input')).not.toHaveClass('bg-surface-sunken');
    });

    /** It changes nothing, so the focus darkens its edge and lifts it, without the accent. */
    it('takes the focus in the quiet frame, not the accent one', () => {
        render(<SearchInput label="Filtrar" onValueChange={vi.fn()} value="" />);

        expect(byPart('input')).toHaveAttribute('data-focus-frame', 'quiet');
    });

    it('reports what the line received', () => {
        const onValueChange = vi.fn();

        render(<SearchInput label="Filtrar" onValueChange={onValueChange} value="" />);

        const textbox = screen.getByRole('searchbox', { name: 'Filtrar' });

        textbox.textContent = 'gateway';
        fireEvent.input(textbox);

        expect(onValueChange).toHaveBeenLastCalledWith('gateway');
    });

    it('hands the editable span to whoever asked to put the caret in it', () => {
        const editableRef = { current: null as HTMLSpanElement | null };

        render(
            <SearchInput
                editableRef={editableRef}
                label="Filtrar"
                onValueChange={vi.fn()}
                value=""
            />,
        );

        expect(editableRef.current).toBe(screen.getByRole('searchbox', { name: 'Filtrar' }));
    });

    /** A search field is announced as one: role searchbox, not the generic textbox. */
    it('is a searchbox, not a plain textbox', () => {
        render(<SearchInput label="Filtrar" onValueChange={vi.fn()} value="" />);

        expect(screen.getByRole('searchbox', { name: 'Filtrar' })).toBeInTheDocument();
    });

    it('carries the placeholder down to the line', () => {
        render(
            <SearchInput label="Filtrar" onValueChange={vi.fn()} placeholder="Buscar" value="" />,
        );

        expect(screen.getByRole('searchbox', { name: 'Filtrar' })).toHaveAttribute(
            'data-placeholder',
            'Buscar',
        );
    });
});
