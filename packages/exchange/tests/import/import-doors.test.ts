import { describe, expect, it } from 'vitest';

import { IMPORT_DOORS } from '../../src/import/lib/import-doors.js';

describe('the doors of import', () => {
    it('send a collection into the workspace that is open, and compare the plan with it', () => {
        const door = IMPORT_DOORS.collection;

        expect(door.comparedWith('personal')).toEqual({ workspaceId: 'personal' });
        expect(door.target('personal', 'Pasarela')).toEqual({ workspaceId: 'personal' });
    });

    it('cannot send a collection anywhere while no workspace is open', () => {
        const door = IMPORT_DOORS.collection;

        expect(door.comparedWith(null)).toBeNull();
        expect(door.target(null, 'Pasarela')).toBeNull();
    });

    it('send a workspace into a new one named after the document, open workspace or not', () => {
        const door = IMPORT_DOORS.workspace;

        expect(door.comparedWith('personal')).toEqual({});
        expect(door.comparedWith(null)).toEqual({});
        expect(door.target('personal', 'Pasarela')).toEqual({ newWorkspace: 'Pasarela' });
        expect(door.target(null, 'Pasarela')).toEqual({ newWorkspace: 'Pasarela' });
    });
});
