import { CHANNELS, failure, success } from '@mandor/ipc';
import { IdError } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { loggedIpc } from '../../src/ipc/logged-ipc.js';
import { spyIpc } from '../../src/testing/handler-harness.js';

function setup() {
    const bare = spyIpc();
    const logged: [string, string][] = [];
    const ipc = loggedIpc(bare, {
        log: (level, message) => {
            logged.push([level, message]);
        },
        flush: () => Promise.resolve(),
    });

    return { bare, ipc, logged };
}

describe('logging what fails in a channel', () => {
    it('answers an unknown failure for a handler that throws, and writes its stack', async () => {
        const { bare, ipc, logged } = setup();
        const error = new Error('out of its try');

        ipc.handle(CHANNELS.collectionTree, () => Promise.reject(error));

        await expect(bare.call(CHANNELS.collectionTree)).resolves.toMatchObject({
            ok: false,
            error: { code: 'unknown' },
        });
        expect(logged).toHaveLength(1);
        expect(logged[0]?.[0]).toBe('error');
        expect(logged[0]?.[1]).toContain(CHANNELS.collectionTree);
        expect(logged[0]?.[1]).toContain(error.stack ?? '');
    });

    it('keeps the code of an error the host knows how to name, and writes it too', async () => {
        const { bare, ipc, logged } = setup();

        ipc.handle(CHANNELS.collectionTree, () => Promise.reject(new IdError('no good')));

        await expect(bare.call(CHANNELS.collectionTree)).resolves.toMatchObject({
            error: { code: 'bad-request' },
        });
        expect(logged).toHaveLength(1);
    });

    it('writes an answer that is an unknown failure, with the channel', async () => {
        const { bare, ipc, logged } = setup();

        ipc.handle(CHANNELS.collectionTree, () =>
            Promise.resolve(failure('unknown', 'Error: boom')),
        );

        await expect(bare.call(CHANNELS.collectionTree)).resolves.toEqual(
            failure('unknown', 'Error: boom'),
        );
        expect(logged).toEqual([
            ['error', `${CHANNELS.collectionTree} answered unknown: Error: boom`],
        ]);
    });

    /** The window only tells the code: which file and why live here, or nowhere. */
    it('writes a fault of the disk or of git as a warning, with its message', async () => {
        const { bare, ipc, logged } = setup();

        ipc.handle(CHANNELS.collectionTree, () =>
            Promise.resolve(failure('fs-read', 'Cannot read item.yaml: EBUSY')),
        );
        ipc.handle(CHANNELS.collectionMove, () =>
            Promise.resolve(failure('git-failed', 'index.lock exists')),
        );
        await bare.call(CHANNELS.collectionTree);
        await bare.call(CHANNELS.collectionMove);

        expect(logged).toEqual([
            ['warn', `${CHANNELS.collectionTree} answered fs-read: Cannot read item.yaml: EBUSY`],
            ['warn', `${CHANNELS.collectionMove} answered git-failed: index.lock exists`],
        ]);
    });

    it('writes nothing for a success or for a refusal the interface already understands', async () => {
        const { bare, ipc, logged } = setup();

        ipc.handle(CHANNELS.collectionTree, () => Promise.resolve(success({})));
        ipc.handle(CHANNELS.collectionMove, () => Promise.resolve(failure('name-taken', 'taken')));
        await bare.call(CHANNELS.collectionTree);
        await bare.call(CHANNELS.collectionMove);

        expect(logged).toEqual([]);
    });

    it('removes the handler through the same object', () => {
        const { bare, ipc } = setup();

        ipc.handle(CHANNELS.collectionTree, () => Promise.resolve(success({})));
        ipc.removeHandler(CHANNELS.collectionTree);

        expect(bare.registered()).toEqual([]);
    });
});
