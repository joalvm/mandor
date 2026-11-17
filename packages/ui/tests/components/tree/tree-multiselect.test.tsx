import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { byPart } from '../../../src/testing/by-part.js';
import { FilesTree, focusedOn, row, selectedNames } from './files-tree.js';

/** Ctrl toggles, Shift takes a range, and the plain press is the only one that opens. */
describe('taking many lines of a tree', () => {
    it('takes a line with a plain click and activates it', () => {
        const onActivate = vi.fn();

        render(<FilesTree onActivate={onActivate} selected={['orders']} />);
        fireEvent.click(byPart('row-label', row('readme')));

        expect(selectedNames()).toEqual(['readme']);
        expect(onActivate).toHaveBeenCalledWith('readme', expect.objectContaining({ keep: false }));
        expect(row('readme')).toHaveAttribute('tabindex', '0');
    });

    it('adds and takes out lines with Ctrl or Cmd held, without activating them', () => {
        const onActivate = vi.fn();

        render(<FilesTree onActivate={onActivate} />);
        fireEvent.click(row('created'));
        fireEvent.click(row('readme'), { ctrlKey: true });
        fireEvent.click(row('paid'), { metaKey: true });

        expect(selectedNames()).toEqual(['created', 'paid', 'readme']);

        fireEvent.click(row('created'), { ctrlKey: true });

        expect(selectedNames()).toEqual(['paid', 'readme']);
        expect(onActivate).toHaveBeenCalledOnce();
    });

    it('takes the range from the last line pressed when Shift is held', () => {
        render(<FilesTree />);
        fireEvent.click(row('paid'));
        fireEvent.click(row('signed-up'), { shiftKey: true });

        expect(selectedNames()).toEqual(['paid', 'users', 'signed-up']);

        fireEvent.click(row('orders'), { shiftKey: true });

        expect(selectedNames()).toEqual(['orders', 'created', 'paid']);
    });

    it('extends the selection with Shift and the arrows', () => {
        render(<FilesTree />);
        fireEvent.click(row('created'));
        focusedOn('created');

        fireEvent.keyDown(row('created'), { key: 'ArrowDown', shiftKey: true });
        fireEvent.keyDown(row('paid'), { key: 'ArrowDown', shiftKey: true });

        expect(row('users')).toHaveFocus();
        expect(selectedNames()).toEqual(['created', 'paid', 'users']);
    });

    it('takes every line with Ctrl+A and lets go of them with Escape', () => {
        render(<FilesTree />);
        focusedOn('orders');

        fireEvent.keyDown(row('orders'), { ctrlKey: true, key: 'a' });
        expect(selectedNames()).toHaveLength(6);

        fireEvent.keyDown(row('orders'), { key: 'Escape' });
        expect(selectedNames()).toEqual([]);
    });

    it('asks to delete the whole selection when the focused line is part of it', () => {
        const onDelete = vi.fn();

        render(<FilesTree onDelete={onDelete} selected={['readme', 'orders/paid']} />);
        focusedOn('readme');
        fireEvent.keyDown(row('readme'), { key: 'Delete' });

        expect(onDelete).toHaveBeenCalledWith(['orders/paid', 'readme']);
    });

    it('asks to delete only the focused line when it stands outside the selection', () => {
        const onDelete = vi.fn();

        render(<FilesTree onDelete={onDelete} selected={['readme']} />);
        focusedOn('created');
        fireEvent.keyDown(row('created'), { key: 'Delete' });

        expect(onDelete).toHaveBeenCalledWith(['orders/created']);
    });

    it('activates on every press when the tree takes no selection', () => {
        const onActivate = vi.fn();

        render(<FilesTree onActivate={onActivate} selectable={false} />);

        expect(screen.getByRole('tree')).not.toHaveAttribute('aria-multiselectable');
        expect(row('readme')).not.toHaveAttribute('aria-selected');

        focusedOn('readme');
        fireEvent.keyDown(row('readme'), { key: 'Enter' });
        fireEvent.click(row('paid'), { ctrlKey: true });

        expect(onActivate).toHaveBeenNthCalledWith(
            1,
            'readme',
            expect.objectContaining({ keep: true }),
        );
        expect(onActivate).toHaveBeenNthCalledWith(
            2,
            'orders/paid',
            expect.objectContaining({ keep: false }),
        );
    });
});
