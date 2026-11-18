import { CHANNELS, success } from '@mandor/ipc';
import { REDACTED } from '@mandor/vars';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { redactedIpc } from '../../src/ipc/redacted-ipc.js';
import { forgetSessionSecrets, rememberSessionSecrets } from '../../src/secret/session-secrets.js';
import { spyIpc } from '../../src/testing/handler-harness.js';

beforeEach(() => {
    rememberSessionSecrets(['tok_abcdefgh']);
});

afterEach(() => {
    forgetSessionSecrets();
});

describe('the answers a channel gives back', () => {
    it('hides a secret value inside the answer before it is serialized', async () => {
        const ipc = spyIpc();

        redactedIpc(ipc).handle(CHANNELS.connectionList, () =>
            Promise.resolve(success([{ url: 'wss://example.test/?key=tok_abcdefgh' }])),
        );

        await expect(ipc.call(CHANNELS.connectionList)).resolves.toEqual(
            success([{ url: `wss://example.test/?key=${REDACTED}` }]),
        );
    });

    /**
     * The one exception of the whole process, and it is the point of the channel: the owner
     * asked for this value by name. Redacting it would answer the question with the marker.
     */
    it('gives the revealed value back as it is, because that is what was asked for', async () => {
        const ipc = spyIpc();

        redactedIpc(ipc).handle(CHANNELS.secretReveal, () =>
            Promise.resolve(success({ value: 'tok_abcdefgh' })),
        );

        await expect(ipc.call(CHANNELS.secretReveal)).resolves.toEqual(
            success({ value: 'tok_abcdefgh' }),
        );
    });

    it('takes a handler out through the same door it put it in', () => {
        const ipc = spyIpc();
        const redacting = redactedIpc(ipc);

        redacting.handle(CHANNELS.connectionList, () => Promise.resolve(success([])));
        redacting.removeHandler(CHANNELS.connectionList);

        expect(ipc.registered()).toEqual([]);
    });
});
