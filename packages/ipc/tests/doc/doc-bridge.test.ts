import { describe, expect, it } from 'vitest';

import { failure } from '../../src/index.js';
import { createFakeBridge } from '../../src/testing/fake-bridge.js';

const NOTAS = { workspaceId: 'eventos', name: 'notas.md' };
const NUEVA = { workspaceId: 'eventos', title: 'Notas' };

describe('the doc bridge', () => {
    /** Everything the renderer may do to the markdown of a workspace, and nothing else. */
    it('answers every doc channel of the contract', async () => {
        const bridge = createFakeBridge();

        expect(await bridge.doc.create(NUEVA)).toEqual({ ok: true, value: '' });
        expect(await bridge.doc.rename({ ...NOTAS, title: 'Guía' })).toEqual({
            ok: true,
            value: {},
        });
        expect(Object.keys(bridge.doc).sort()).toEqual([
            'create',
            'delete',
            'list',
            'read',
            'rename',
            'revert',
            'write',
        ]);
    });

    /** A name disk already holds is the one answer these two channels have to be able to give. */
    it('carries a refusal back with the code of a name that is taken', async () => {
        const bridge = createFakeBridge({
            doc: { create: () => Promise.resolve(failure('name-taken', 'ya existe')) },
        });

        expect(await bridge.doc.create(NUEVA)).toEqual({
            ok: false,
            error: { code: 'name-taken', message: 'ya existe' },
        });
        expect(await bridge.doc.list({ workspaceId: 'eventos' })).toEqual({ ok: true, value: [] });
    });
});
