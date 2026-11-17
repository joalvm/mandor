import type { AuthChainLevel } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import {
    inheritedAuth,
    rulingFolderOf,
} from '../../../../src/renderer/features/requests/lib/inherited-auth.js';

const FOLDER: AuthChainLevel = { place: { kind: 'folder', path: 'pedidos' }, name: 'Pedidos' };
const WORKSPACE: AuthChainLevel = {
    place: { kind: 'workspace' },
    name: 'Personal',
    auth: { type: 'apikey', name: 'X-API-Key', value: 'k', in: 'header' },
};

describe('inheritedAuth', () => {
    it('skips the levels that inherit and names the closest one that carries a scheme', () => {
        expect(inheritedAuth([FOLDER, WORKSPACE])).toEqual({
            name: 'Personal',
            place: { kind: 'workspace' },
            scheme: 'apiKey',
        });
    });

    it('stops at a level that says no auth: that is a scheme too', () => {
        expect(inheritedAuth([{ ...FOLDER, auth: { type: 'none' } }, WORKSPACE])).toEqual({
            name: 'Pedidos',
            place: { kind: 'folder', path: 'pedidos' },
            scheme: 'none',
        });
    });

    it('is null when every level inherits', () => {
        expect(inheritedAuth([FOLDER, { ...WORKSPACE, auth: undefined }])).toBeNull();
        expect(inheritedAuth([])).toBeNull();
    });

    it('says the folder that rules, and nothing when the workspace rules or nobody does', () => {
        const scheme = 'bearer';

        expect(rulingFolderOf({ name: 'Pedidos', place: FOLDER.place, scheme })).toBe('pedidos');
        expect(rulingFolderOf({ name: 'Personal', place: WORKSPACE.place, scheme })).toBeNull();
        expect(rulingFolderOf(null)).toBeNull();
    });
});
