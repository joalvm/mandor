import { shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { collectionStore } from '../src/collection-store.js';
import { useCollectionDuplicateKey } from '../src/hooks/useCollectionDuplicateKey.js';

import {
    declareRequestWithExamples,
    EXAMPLE_ROTO,
    exampleSpies,
    WITH_EXAMPLES,
} from './support/login-with-examples.js';

let spies = exampleSpies();
let undo: () => void = () => undefined;

function Tree(): null {
    useCollectionDuplicateKey('events', { current: document.body });

    return null;
}

/** Ctrl and D, which is how the key reaches the tree on every platform but Apple's. */
function pressDuplicate(): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        code: 'KeyD',
        ctrlKey: true,
        key: 'd',
    });

    fireEvent(document.body, event);

    return event;
}

beforeEach(() => {
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    spies = exampleSpies();
    undo = declareRequestWithExamples(spies);
    collectionStore.getState().setNodes(WITH_EXAMPLES);
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    undo();
    collectionStore.getState().reset();
    shellStore.getState().reset();
});

describe('duplicating from the keyboard', () => {
    it('duplicates the example taken, and keeps the key from the browser', () => {
        render(<Tree />);
        collectionStore.getState().setSelected(['acceso/login:Roto']);

        const event = pressDuplicate();

        expect(spies.duplicate).toHaveBeenCalledWith(EXAMPLE_ROTO);
        expect(event.defaultPrevented).toBe(true);
    });

    it('leaves the key alone when what is taken is not one example', () => {
        render(<Tree />);
        collectionStore.getState().setSelected(['acceso/login']);

        const event = pressDuplicate();

        expect(spies.duplicate).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBe(false);
    });

    it('stops listening once the tree is gone', () => {
        const mounted = render(<Tree />);

        collectionStore.getState().setSelected(['acceso/login:Roto']);
        mounted.unmount();
        pressDuplicate();

        expect(spies.duplicate).not.toHaveBeenCalled();
    });
});
