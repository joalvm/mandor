import { cleanup, fireEvent, render } from '@testing-library/react';
import { ROOT_GROUP_ID } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerCommand, shellStore, useShortcuts } from '../../src/index.js';
import type { Shortcut } from '../../src/shortcut/default-shortcuts.js';

const UNREGISTER: (() => void)[] = [];
const RAN: string[] = [];

const TABLE: Shortcut[] = [
    { combination: '$mod+KeyJ', command: 'test.always', scope: 'window' },
    { combination: '$mod+KeyK', command: 'test.split', scope: 'window' },
    { combination: '$mod+KeyL', command: 'test.typing', scope: 'editing' },
];

function Harness() {
    useShortcuts(TABLE);

    return <span contentEditable="plaintext-only" role="textbox" suppressContentEditableWarning />;
}

function press(code: string, target: Element | Window): void {
    fireEvent.keyDown(target, { code, ctrlKey: true, key: code.slice(-1).toLowerCase() });
}

beforeEach(() => {
    shellStore.getState().reset();
    RAN.length = 0;

    for (const id of ['test.always', 'test.typing']) {
        UNREGISTER.push(
            registerCommand({
                category: 'commands:categoryTab',
                icon: 'doc',
                id,
                run: () => {
                    RAN.push(id);
                },
                title: 'commands:closeTab',
            }),
        );
    }

    UNREGISTER.push(
        registerCommand({
            category: 'commands:categoryGroup',
            icon: 'doc',
            id: 'test.split',
            run: () => {
                RAN.push('test.split');
            },
            title: 'commands:closeGroup',
            when: (state) => state.activeGroupId !== ROOT_GROUP_ID,
        }),
    );
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    for (const unregister of UNREGISTER.splice(0)) {
        unregister();
    }
});

describe('the shortcuts of the window', () => {
    it('runs the command its combination points at', () => {
        render(<Harness />);
        press('KeyJ', window);

        expect(RAN).toEqual(['test.always']);
    });

    it('stays quiet for a command the window cannot do right now', () => {
        render(<Harness />);
        press('KeyK', window);

        expect(RAN).toEqual([]);
    });

    it('lets go of the window when it stops being drawn', () => {
        const view = render(<Harness />);

        view.unmount();
        press('KeyJ', window);

        expect(RAN).toEqual([]);
    });

    it('keeps out of the way of whoever is typing, unless the shortcut belongs there', () => {
        const view = render(<Harness />);
        const field = view.getByRole('textbox');

        press('KeyJ', field);

        expect(RAN).toEqual([]);

        press('KeyL', field);

        expect(RAN).toEqual(['test.typing']);
    });
});
