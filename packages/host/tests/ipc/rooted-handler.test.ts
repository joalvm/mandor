import { failure } from '@mandor/ipc';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { rootedHandler } from '../../src/ipc/rooted-handler.js';
import { setActiveOrigin } from '../../src/origin/active-origin.js';

const schema = z.object({ name: z.string() });

afterEach(() => {
    setActiveOrigin(null);
});

describe('a handler over the disk of the active origin', () => {
    it('refuses what the schema refuses, before it looks for an origin', async () => {
        const handler = rootedHandler(schema, () => Promise.resolve('never'));
        const answer = await handler({ name: 3 });

        expect(answer.ok).toBe(false);
        expect(answer.ok ? '' : answer.error.code).toBe('bad-request');
    });

    it('refuses while the window is between origins', async () => {
        const handler = rootedHandler(schema, () => Promise.resolve('never'));
        const answer = await handler({ name: 'a' });

        expect(answer.ok ? '' : answer.error.message).toBe('no active origin');
    });

    it('hands the work the root of the origin and the request as checked', async () => {
        setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root: '/repo' });

        const handler = rootedHandler(schema, (root, { name }) =>
            Promise.resolve(`${root}:${name}`),
        );

        expect(await handler({ name: 'a' })).toEqual({ ok: true, value: '/repo:a' });
    });

    it('turns what the work threw into the refusal the channel decides on', async () => {
        setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root: '/repo' });

        const handler = rootedHandler(
            schema,
            () => Promise.reject(new Error('boom')),
            () => failure('fs-write', 'said by the channel'),
        );
        const answer = await handler({ name: 'a' });

        expect(answer.ok ? '' : answer.error.code).toBe('fs-write');
    });
});
