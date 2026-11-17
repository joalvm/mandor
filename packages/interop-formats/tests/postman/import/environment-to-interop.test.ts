import { interopDocumentSchema } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { parsePostmanDocument } from '../../../src/postman/document/parse-postman-document.js';
import { environmentToInterop } from '../../../src/postman/import/environment-to-interop.js';
import { fixtureText } from '../support/fixture.js';

function environmentOf(name: string) {
    const document = parsePostmanDocument(fixtureText(name));

    if (document.kind === 'collection') {
        throw new Error('the fixture is an environment');
    }

    return environmentToInterop(document.kind, document.environment);
}

describe('environmentToInterop', () => {
    it('is a document with nothing but the environment, its variables as written', () => {
        const document = environmentOf('environment.json');

        expect(document).toMatchObject({
            name: 'Local',
            sourceId: 'environment:22222222-aaaa-bbbb-cccc-000000000002',
            servers: [],
            channels: [],
            operations: [],
            defaultSecurity: [],
            security: {},
            notes: [],
        });
        expect(document.environments).toEqual([
            {
                name: 'Local',
                extras: { scope: 'environment' },
                variables: [
                    { name: 'base', value: 'http://127.0.0.1:1', enabled: true, secret: false },
                    { name: 'token', value: 'abc123', enabled: true, secret: true },
                    { name: 'off', value: 'nope', enabled: false, secret: false },
                ],
            },
        ]);
    });

    it('names globals by their scope and not by the name of the workspace', () => {
        const document = environmentOf('globals.json');

        expect(document.name).toBe('globals');
        expect(document.sourceId).toBe('globals:33333333-aaaa-bbbb-cccc-000000000003');
        expect(document.environments?.[0]).toMatchObject({
            name: 'globals',
            extras: { scope: 'globals' },
        });
    });

    it('reads a variable with no enabled flag as enabled', () => {
        const document = environmentToInterop('environment', {
            name: 'e',
            values: [{ key: 'a' }],
            _postman_variable_scope: 'environment',
        });

        expect(document.environments?.[0]?.variables).toEqual([
            { name: 'a', value: '', enabled: true, secret: false },
        ]);
    });

    it('comes out valid for the schema of the intermediate document', () => {
        expect(interopDocumentSchema.safeParse(environmentOf('environment.json')).success).toBe(
            true,
        );
        expect(interopDocumentSchema.safeParse(environmentOf('globals.json')).success).toBe(true);
    });
});
