import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { collectionStore } from '../src/collection-store.js';
import { focusedPathOf } from '../src/lib/focused-path.js';
import { useCollectionRenameKey } from '../src/hooks/useCollectionRenameKey.js';

function Tree(): null {
    useCollectionRenameKey({ current: document.body });

    return null;
}

/** A line of the tree as the collection draws it: the tree item, inside the box holding its path. */
function lineOf(path: string): HTMLElement {
    const box = document.createElement('div');
    const line = document.createElement('div');

    box.setAttribute('data-path', path);
    line.setAttribute('role', 'treeitem');
    box.appendChild(line);
    document.body.appendChild(box);

    return line;
}

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    collectionStore.getState().reset();
    document.body.replaceChildren();
});

describe('renaming from the keyboard', () => {
    it('says where a keypress stands: the line of the tree it came from', () => {
        expect(focusedPathOf(lineOf('pedidos'))).toBe('pedidos');
        expect(focusedPathOf(null)).toBeNull();
    });

    /** Alt and an arrow inside the rename field move the caret, never the node around it. */
    it('stands nowhere when the key comes from a field inside the line', () => {
        const field = document.createElement('span');

        field.setAttribute('role', 'textbox');
        lineOf('pedidos').appendChild(field);

        expect(focusedPathOf(field)).toBeNull();
    });

    /** F2 names the row the reader stands on; a keypress away from the tree names nothing. */
    it('opens the rename field of the pressed row on F2', () => {
        render(<Tree />);

        const row = lineOf('pedidos');

        fireEvent.keyDown(row, { code: 'F2', key: 'F2' });

        expect(collectionStore.getState().renaming).toBe('pedidos');
    });

    it('renames nothing when the key lands away from any row', () => {
        render(<Tree />);

        const outside = document.createElement('div');

        document.body.appendChild(outside);

        fireEvent.keyDown(outside, { code: 'F2', key: 'F2' });

        expect(collectionStore.getState().renaming).toBeNull();
    });
});
