import { describe, expect, it } from 'vitest';

import { createWorkspace, FormatError, parseWorkspace } from '../../src/index.js';

describe('createWorkspace', () => {
    it('returns a workspace that passes its own parse, under the id it was given', () => {
        const workspace = createWorkspace({ id: 'p3q8w1m4k7x2', name: 'Api Pagos', kind: 'sync' });

        expect(parseWorkspace(workspace)).toEqual(workspace);
        expect(workspace).toEqual({ id: 'p3q8w1m4k7x2', name: 'Api Pagos', kind: 'sync' });
    });

    it('lets two workspaces share a name: the id tells them apart', () => {
        const first = createWorkspace({ id: 'aaaaaaaaaaaa', name: 'Api Pagos', kind: 'sync' });
        const second = createWorkspace({ id: 'bbbbbbbbbbbb', name: 'Api Pagos', kind: 'async' });

        expect(second.name).toBe(first.name);
        expect(second.id).not.toBe(first.id);
    });

    it('rejects an id that could leave its folder', () => {
        expect(() => createWorkspace({ id: '../pagos', name: 'Pagos', kind: 'sync' })).toThrow(
            FormatError,
        );
    });
});
