import { failure } from '@mandor/ipc';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { formattedHandler } from '../../src/ipc/formatted-handler.js';
import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { fixtureFormat } from '../interop/fixture-format.js';

const schema = z.object({ format: z.string(), text: z.string() });
const FORMATS = [fixtureFormat];

afterEach(() => {
    setActiveOrigin(null);
});

describe('a handler over a request that names a format', () => {
    it('refuses a format the app did not list, without asking for the origin', async () => {
        const run = vi.fn(() => Promise.resolve('never'));
        const answer = await formattedHandler(schema, FORMATS, run)({ format: 'nope', text: '' });

        expect(answer.ok ? '' : answer.error.message).toBe('no format is registered as nope');
        expect(run).not.toHaveBeenCalled();
    });

    it('refuses what the schema refuses', async () => {
        const answer = await formattedHandler(schema, FORMATS, () => Promise.resolve('never'))({});

        expect(answer.ok ? '' : answer.error.code).toBe('bad-request');
    });

    it('refuses while the window is between origins', async () => {
        const answer = await formattedHandler(schema, FORMATS, () => Promise.resolve('never'))({
            format: fixtureFormat.id,
            text: '',
        });

        expect(answer.ok ? '' : answer.error.message).toBe('no active origin');
    });

    it('hands the work the root, the format found and the request as checked', async () => {
        setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root: '/repo' });

        const handler = formattedHandler(schema, FORMATS, (root, found, { text }) =>
            Promise.resolve(`${root}:${found.id}:${text}`),
        );

        expect(await handler({ format: fixtureFormat.id, text: 'doc' })).toEqual({
            ok: true,
            value: `/repo:${fixtureFormat.id}:doc`,
        });
    });

    it('turns what the work threw into the refusal the channel decides on', async () => {
        setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root: '/repo' });

        const handler = formattedHandler(
            schema,
            FORMATS,
            () => Promise.reject(new Error('boom')),
            () => failure('fs-read', 'said by the channel'),
        );
        const answer = await handler({ format: fixtureFormat.id, text: '' });

        expect(answer.ok ? '' : answer.error.code).toBe('fs-read');
    });
});
