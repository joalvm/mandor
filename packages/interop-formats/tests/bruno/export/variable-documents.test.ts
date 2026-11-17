import { describe, expect, it } from 'vitest';

import {
    ENVIRONMENTS_DIR,
    environmentFilesOf,
    variableDocumentsOf,
} from '../../../src/bruno/export/variable-documents.js';
import { PROD, SECRET_VALUE } from '../support/sample-workspace.js';

describe('variableDocumentsOf', () => {
    it('writes a variable with its value, and the switch only when it is off', () => {
        expect(
            variableDocumentsOf([
                { name: 'a', value: '1', enabled: true, secret: false },
                { name: 'b', value: '2', enabled: false, secret: false },
            ]),
        ).toEqual([
            { name: 'a', value: '1' },
            { name: 'b', value: '2', disabled: true },
        ]);
    });

    it('lets a secret out with its name and no value, since only an environment marks one', () => {
        const documents = variableDocumentsOf(PROD.variables);

        expect(documents[1]).toEqual({ name: 'token' });
        expect(JSON.stringify(documents)).not.toContain(SECRET_VALUE);
    });

    it('leaves out a variable with no name', () => {
        expect(
            variableDocumentsOf([{ name: '', value: 'x', enabled: true, secret: false }]),
        ).toEqual([]);
    });
});

describe('environmentFilesOf', () => {
    it('writes a file for each environment in its directory, named after it', () => {
        const files = environmentFilesOf([PROD]);

        expect(ENVIRONMENTS_DIR).toBe('environments');
        expect(files).toEqual([
            {
                path: 'environments/prod.yml',
                document: {
                    name: 'Prod',
                    variables: [
                        { name: 'baseUrl', value: 'https://api.test' },
                        { name: 'token', secret: true },
                        { name: 'off', value: 'x', disabled: true },
                    ],
                },
            },
        ]);
    });

    it('numbers environments whose names would share a file', () => {
        const files = environmentFilesOf([
            { ...PROD, id: 'a', name: 'Prod' },
            { ...PROD, id: 'b', name: 'PROD' },
        ]);

        expect(files.map((file) => file.path)).toEqual([
            'environments/prod.yml',
            'environments/prod-2.yml',
        ]);
    });

    it('writes nothing for a workspace with no environment', () => {
        expect(environmentFilesOf([])).toEqual([]);
    });
});
