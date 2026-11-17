import { CHANNELS } from '@mandor/ipc';
import { REDACTED } from '@mandor/vars';
import { afterEach, describe, expect, it } from 'vitest';

import { pushToWindow } from '../../src/ipc/push-to-window.js';
import { forgetSessionSecrets, rememberSessionSecrets } from '../../src/secret/session-secrets.js';
import { spyWindow } from '../../src/testing/handler-harness.js';

afterEach(() => {
    forgetSessionSecrets();
});

describe('pushing a message to the renderer', () => {
    it('sends it on the channel it was given', () => {
        const window = spyWindow();

        pushToWindow(window, CHANNELS.wsState, { connectionId: 'echo', state: 'open' });

        expect(window.sent).toEqual([[CHANNELS.wsState, { connectionId: 'echo', state: 'open' }]]);
    });

    /**
     * A socket outlives the window it was opened from: the user closes it and frames keep
     * arriving. Sending to a destroyed window throws inside Electron, and one throw in a
     * socket callback takes the process with it.
     */
    it('says nothing to a window that is gone', () => {
        const window = spyWindow();

        window.destroy();
        pushToWindow(window, CHANNELS.wsState, { connectionId: 'echo', state: 'closed' });

        expect(window.sent).toEqual([]);
    });

    /**
     * Activity is the surface a user photographs and pastes into a ticket. The batch is
     * redacted here, at the one door out of main, and not by the component that paints it.
     */
    it('hides a secret value carried by the batch on its way to the window', () => {
        const window = spyWindow();

        rememberSessionSecrets(['tok_abcdefgh']);
        pushToWindow(window, CHANNELS.wsActivity, {
            connectionId: 'echo',
            frames: [{ text: 'Authorization: Bearer tok_abcdefgh' }],
        });

        expect(window.sent).toEqual([
            [
                CHANNELS.wsActivity,
                { connectionId: 'echo', frames: [{ text: `Authorization: Bearer ${REDACTED}` }] },
            ],
        ]);
    });
});
