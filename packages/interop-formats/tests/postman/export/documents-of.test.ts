import { describe, expect, it } from 'vitest';

import { documentsOf } from '../../../src/postman/export/documents-of.js';
import { MASCOTAS, PROD, SYNC_WORKSPACE } from '../support/sample-workspace.js';

describe('documents-of: the workspace as the files Postman takes', () => {
    it('writes a file per collection and per environment, and the globals of the workspace', () => {
        expect(documentsOf(SYNC_WORKSPACE).map((file) => file.path)).toEqual([
            'mascotas.postman_collection.json',
            'prod.postman_environment.json',
            'workspace.postman_globals.json',
        ]);
    });

    it('writes nothing of a workspace with no collection, no environment and no variable', () => {
        expect(
            documentsOf({ ...SYNC_WORKSPACE, collections: [], environments: [], globals: [] }),
        ).toEqual([]);
    });

    it('leaves the globals out when the workspace declares no variable', () => {
        const paths = documentsOf({ ...SYNC_WORKSPACE, globals: [] }).map((file) => file.path);

        expect(paths).not.toContain('workspace.postman_globals.json');
    });

    it('gives two files of one name two names', () => {
        const files = documentsOf({
            ...SYNC_WORKSPACE,
            collections: [MASCOTAS, MASCOTAS],
            environments: [],
            globals: [],
        });

        expect(files.map((file) => file.path)).toEqual([
            'mascotas.postman_collection.json',
            'mascotas-2.postman_collection.json',
        ]);
    });

    it('names a file after its kind when the name has no letter to name it by', () => {
        const files = documentsOf({
            ...SYNC_WORKSPACE,
            collections: [{ ...MASCOTAS, name: '★' }],
            environments: [{ ...PROD, name: '★' }],
            globals: [],
        });

        expect(files.map((file) => file.path)).toEqual([
            'collection.postman_collection.json',
            'environment.postman_environment.json',
        ]);
    });
});
