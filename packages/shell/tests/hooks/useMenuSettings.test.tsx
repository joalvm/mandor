import { cleanup, render } from '@testing-library/react';
import { windowBridge } from '@mandor/ipc/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    registerShellCommands,
    registerSurface,
    shellStore,
    useMenuSettings,
} from '../../src/index.js';

const OPENED: string[] = [];
const UNDO: (() => void)[] = [];

function Harness() {
    useMenuSettings();

    return <span />;
}

beforeEach(() => {
    shellStore.getState().reset();
    OPENED.length = 0;
    UNDO.push(registerShellCommands());
});

afterEach(() => {
    // The window goes first: the commands and the surface are taken down under a mounted tree.
    cleanup();

    for (const undo of UNDO.splice(0)) {
        undo();
    }
});

describe('the Settings entry of the menu', () => {
    it('opens the settings where the window built them', () => {
        UNDO.push(registerSurface({ id: 'settings', open: () => OPENED.push('settings') }));
        render(<Harness />);

        windowBridge().emitMenuSettings();

        expect(OPENED).toEqual(['settings']);
    });

    /** The dialog arrives with the app that builds it; until then the click has nothing to open. */
    it('does nothing while nobody has built the settings', () => {
        render(<Harness />);

        windowBridge().emitMenuSettings();

        expect(OPENED).toEqual([]);
    });

    it('stops listening once the window is taken down', () => {
        UNDO.push(registerSurface({ id: 'settings', open: () => OPENED.push('settings') }));
        const view = render(<Harness />);

        view.unmount();
        windowBridge().emitMenuSettings();

        expect(OPENED).toEqual([]);
    });
});
