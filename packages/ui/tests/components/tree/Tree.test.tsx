import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useTreeLine } from '../../../src/components/tree/tree-scope.js';
import { RowLabel, Tree, TreeRow } from '../../../src/index.js';
import { allByPart } from '../../../src/testing/by-part.js';
import { FilesTree, focusedOn, row, selectedNames } from './files-tree.js';

/** Every key and click below reaches the tree through useTreeCommands, one table of commands. */
/** The click on the mark of a line, which is the gutter the tree reserves for it. */
function pressGutter(name: string): void {
    allByPart('row-gutter', row(name)).forEach((gutter) => {
        fireEvent.click(gutter);
    });
}

describe('a tree', () => {
    it('names itself and exposes levels, folds and a single tab stop', () => {
        render(<FilesTree />);

        const tree = screen.getByRole('tree', { name: 'Archivos' });
        const rows = screen.getAllByRole('treeitem');

        expect(tree).toHaveAttribute('aria-multiselectable', 'true');
        expect(tree).toHaveAttribute('data-part', 'tree');
        expect(rows).toHaveLength(6);
        expect(rows.filter((line) => line.tabIndex === 0)).toEqual([row('orders')]);
        expect(row('orders')).toHaveAttribute('aria-level', '1');
        expect(row('orders')).toHaveAttribute('aria-expanded', 'true');
        expect(row('created')).toHaveAttribute('aria-level', '2');
        expect(row('created')).not.toHaveAttribute('aria-expanded');
        expect(row('created')).toHaveAttribute('aria-selected', 'false');
    });

    it('opens with the tab stop on the first line taken', () => {
        render(<FilesTree selected={['users']} />);

        expect(row('users')).toHaveAttribute('tabindex', '0');
        expect(row('orders')).toHaveAttribute('tabindex', '-1');
    });

    /** Focus and selection are two things: the arrows carry the first and leave the second. */
    it('moves the focus with the arrows and leaves the selection where it was', () => {
        render(<FilesTree selected={['orders']} />);
        focusedOn('orders');

        fireEvent.keyDown(row('orders'), { key: 'ArrowDown' });

        expect(row('created')).toHaveFocus();
        expect(row('created')).toHaveAttribute('tabindex', '0');
        expect(row('orders')).toHaveAttribute('tabindex', '-1');
        expect(selectedNames()).toEqual(['orders']);

        fireEvent.keyDown(row('created'), { key: 'End' });
        expect(row('readme')).toHaveFocus();

        fireEvent.keyDown(row('readme'), { key: 'Home' });
        expect(row('orders')).toHaveFocus();
    });

    it('steps out to the parent, folds it, unfolds it and steps back in with the side arrows', () => {
        render(<FilesTree />);
        focusedOn('created');

        fireEvent.keyDown(row('created'), { key: 'ArrowLeft' });
        expect(row('orders')).toHaveFocus();

        fireEvent.keyDown(row('orders'), { key: 'ArrowLeft' });
        expect(row('orders')).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByRole('treeitem', { name: 'created' })).toBeNull();

        fireEvent.keyDown(row('orders'), { key: 'ArrowRight' });
        expect(row('orders')).toHaveAttribute('aria-expanded', 'true');

        fireEvent.keyDown(row('orders'), { key: 'ArrowRight' });
        expect(row('created')).toHaveFocus();
    });

    /** The row folds where it is clicked: what activating a folder means is the owner's word. */
    it('hands a click on a folder to the owner, and folds nothing by itself', () => {
        const onActivate = vi.fn();

        render(<FilesTree onActivate={onActivate} selected={['readme']} />);

        fireEvent.click(row('orders'));

        expect(onActivate).toHaveBeenCalledWith('orders', expect.anything());
        expect(row('orders')).toHaveAttribute('aria-expanded', 'true');
        expect(selectedNames()).toEqual(['orders']);
    });

    /** Nothing out of sight stays taken: a key pressed later would act on what nobody sees. */
    it('lets go of what a fold hides and brings the focus back to the folder', () => {
        render(<FilesTree selected={['orders/created', 'readme']} />);
        focusedOn('created');

        fireEvent.keyDown(row('created'), { key: 'ArrowLeft' });
        fireEvent.keyDown(row('orders'), { key: 'ArrowLeft' });

        expect(selectedNames()).toEqual(['readme']);
        expect(row('orders')).toHaveFocus();
        expect(row('orders')).toHaveAttribute('tabindex', '0');
    });

    it('leaves the keys pressed on a control inside a row to that control', () => {
        const onDelete = vi.fn();

        render(
            <Tree
                label="Archivos"
                lines={[{ id: 'readme', level: 1 }]}
                onDelete={onDelete}
                onExpandedChange={vi.fn()}
                onSelectedChange={vi.fn()}
                selected={[]}
            >
                <TreeRow>
                    <RowLabel>readme</RowLabel>
                    <button type="button">Opciones</button>
                </TreeRow>
            </Tree>,
        );

        fireEvent.keyDown(screen.getByRole('button', { name: 'Opciones' }), { key: 'Delete' });

        expect(onDelete).not.toHaveBeenCalled();
    });

    /** The gutter is reserved either way; only a tree that asks for chevrons fills the folders'. */
    it('draws the chevron of each folder only when asked to', () => {
        const { unmount } = render(<FilesTree />);

        expect(allByPart('icon', row('orders'))).toHaveLength(0);
        unmount();

        render(<FilesTree chevrons />);

        expect(allByPart('icon', row('orders'))).toHaveLength(1);
        expect(allByPart('icon', row('users'))).toHaveLength(1);
        expect(allByPart('icon', row('created'))).toHaveLength(0);
        expect(allByPart('row-gutter', row('created'))).toHaveLength(1);
    });

    it('folds and opens a folder with the click on its chevron, without activating it', () => {
        const onActivate = vi.fn();

        render(<FilesTree chevrons onActivate={onActivate} />);

        pressGutter('orders');

        expect(row('orders')).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByRole('treeitem', { name: 'created' })).toBeNull();

        pressGutter('orders');

        expect(row('orders')).toHaveAttribute('aria-expanded', 'true');
        expect(onActivate).not.toHaveBeenCalled();
    });

    it('activates the line on a click in its gutter when no chevron is drawn there', () => {
        const onActivate = vi.fn();

        render(<FilesTree onActivate={onActivate} />);
        pressGutter('orders');

        expect(onActivate).toHaveBeenCalledWith('orders', expect.anything());
    });

    it('refuses to draw a line outside a tree', () => {
        const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        expect(() => renderHook(() => useTreeLine())).toThrow(/inside a Tree/);
        quiet.mockRestore();
    });
});

describe('a line asked for from outside the tree', () => {
    it('takes the focus and says it is shown', () => {
        const onRevealed = vi.fn();

        render(<FilesTree onRevealed={onRevealed} revealed="users/signed-up" />);

        expect(row('signed-up')).toHaveFocus();
        expect(row('signed-up')).toHaveAttribute('tabindex', '0');
        expect(onRevealed).toHaveBeenCalledTimes(1);
    });

    it('waits for a line that is not among the lines yet', () => {
        const onRevealed = vi.fn();

        render(<FilesTree onRevealed={onRevealed} revealed="nowhere" />);

        expect(onRevealed).not.toHaveBeenCalled();
    });
});
