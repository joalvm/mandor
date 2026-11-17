import { createFakeBridge } from '@mandor/ipc/testing';
import { ROOT_GROUP_ID, success, type UiSession } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createPendingWrites, saveOnClose } from '../../src/index.js';
import { createShellStore } from '../../src/shell-store.js';

const ORIGIN = 'local';
const ONE = { id: 'one', kind: 'doc', resource: 'mandor://demo/payments/doc/one.md' };

type Written = { session: UiSession };

const typed: string[] = [];
const edits = createPendingWrites<string, string>((key, text) => {
    typed.push(`${key}=${text}`);

    return Promise.resolve();
});

/** A window with one tab in it, and everything its session was asked to write. */
function windowWithOneTab() {
    const written: Written[] = [];
    const store = createShellStore(
        createFakeBridge({
            session: {
                save: (input: Written) => {
                    written.push(input);

                    return Promise.resolve(success({}));
                },
            },
        }),
    );

    store.setState({ activeOriginId: ORIGIN });
    store.getState().openTab(ROOT_GROUP_ID, ONE);

    return { store, written };
}

describe('the goodbye of a window', () => {
    /** A drag made a tenth of a second before closing is still what the window comes back as. */
    it('writes the arrangement when the window goes away', () => {
        const { store, written } = windowWithOneTab();
        const stop = saveOnClose(store);

        window.dispatchEvent(new Event('pagehide'));

        expect(written[0]?.session.grid).toMatchObject({ id: ROOT_GROUP_ID });

        stop();
    });

    /** A quit that lands inside the pause of the typing would take the last keystrokes with it. */
    it('sends the edits still waiting for their pause when the window goes away', () => {
        const { store } = windowWithOneTab();
        const stop = saveOnClose(store);

        typed.length = 0;
        edits.schedule('notes', 'the last sentence');
        window.dispatchEvent(new Event('pagehide'));

        expect(typed).toEqual(['notes=the last sentence']);

        stop();
    });

    it('stops listening when it is told to', () => {
        const { store, written } = windowWithOneTab();

        typed.length = 0;
        edits.schedule('notes', 'kept for its pause');
        saveOnClose(store)();
        window.dispatchEvent(new Event('pagehide'));

        expect([written, typed]).toEqual([[], []]);

        edits.cancel('notes');
    });
});
