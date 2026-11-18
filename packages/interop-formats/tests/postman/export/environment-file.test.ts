import { describe, expect, it } from 'vitest';

import { parsePostmanDocument } from '../../../src/postman/document/parse-postman-document.js';
import { environmentFileOf } from '../../../src/postman/export/environment-file.js';
import { PROD, SECRET_VALUE } from '../support/sample-workspace.js';

describe('environment-file: an environment as the file Postman exports', () => {
    it('lists its variables with the type and the switch Postman gives each', () => {
        expect(environmentFileOf(PROD)).toEqual({
            id: 'prod',
            name: 'Prod',
            values: [
                { key: 'baseUrl', value: 'https://api.test', type: 'default', enabled: true },
                { key: 'token', value: '', type: 'secret', enabled: true },
            ],
            _postman_variable_scope: 'environment',
        });
    });

    it('lets the value of a secret out nowhere', () => {
        expect(JSON.stringify(environmentFileOf(PROD))).not.toContain(SECRET_VALUE);
    });

    it('keeps a variable switched off, switched off', () => {
        const file = environmentFileOf({
            id: 'dev',
            name: 'Dev',
            variables: [{ name: 'off', value: 'nope', enabled: false, secret: false }],
        });

        expect(file['values']).toEqual([
            { key: 'off', value: 'nope', type: 'default', enabled: false },
        ]);
    });

    it('is read back as the environment it was', () => {
        const document = parsePostmanDocument(JSON.stringify(environmentFileOf(PROD)));

        expect(document.kind).toBe('environment');
        expect(document.kind === 'environment' && document.environment.name).toBe('Prod');
    });
});
