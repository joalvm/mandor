import { degradation } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { OpenapiParseError } from '../../../src/openapi/document/openapi-parse-error.js';
import { parseOpenapiDocument } from '../../../src/openapi/document/parse-openapi-document.js';

import { fixtureText } from '../support/fixture-text.js';

const OK = { '200': { description: 'ok' } };

function documentText(extra: Record<string, unknown>): string {
    return JSON.stringify({ openapi: '3.0.3', info: { title: 'T', version: '1' }, ...extra });
}

async function problemsOf(text: string): Promise<string[]> {
    const error: unknown = await parseOpenapiDocument(text).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(OpenapiParseError);

    return (error as OpenapiParseError).problems;
}

describe('reading an OpenAPI document', () => {
    it('lifts Swagger 2.0 to OpenAPI 3.1 and says it did', async () => {
        const { document, notes } = await parseOpenapiDocument(fixtureText('petstore-2.0.json'));

        expect(String(document['openapi'])).toMatch(/^3\.1/u);
        expect(notes).toEqual([degradation('convertedSwagger')]);
    });

    it('lifts OpenAPI 3.0 to 3.1 and says it did', async () => {
        const { document, notes } = await parseOpenapiDocument(fixtureText('petstore-3.0.json'));

        expect(String(document['openapi'])).toMatch(/^3\.1/u);
        expect(notes).toEqual([degradation('convertedOpenapi30')]);
    });

    it('reads JSON and YAML alike, and 3.1 needs no conversion', async () => {
        const { notes } = await parseOpenapiDocument(fixtureText('sample-3.1.yaml'));

        expect(notes.map(({ code }) => code)).not.toContain('convertedOpenapi30');
    });

    it('follows every $ref, so what comes out has no pointers left', async () => {
        const { document } = await parseOpenapiDocument(fixtureText('petstore-3.0.json'));

        expect(JSON.stringify(document)).not.toContain('"$ref"');
    });

    it('keeps a circular schema as a $ref and says which one', async () => {
        const { document, notes } = await parseOpenapiDocument(fixtureText('sample-3.1.yaml'));

        expect(notes).toContainEqual(degradation('circularSchema', { name: 'Node' }));
        expect(() => JSON.stringify(document)).not.toThrow();
    });

    it('turns what the validator only warns about into notes and still reads the document', async () => {
        const text = documentText({
            paths: {
                '/a': { get: { operationId: 'same', responses: OK } },
                '/b': { get: { operationId: 'same', responses: OK } },
            },
        });
        const { notes } = await parseOpenapiDocument(text);

        expect(
            notes.some(({ values }) =>
                values['message']?.includes('operationId `same` is duplicated'),
            ),
        ).toBe(true);
    });

    it('never reads a file or the network for an external $ref: it stays as written', async () => {
        const text = documentText({
            paths: {
                '/a': {
                    get: {
                        responses: {
                            '200': {
                                description: 'ok',
                                content: {
                                    'application/json': { schema: { $ref: './other.json' } },
                                },
                            },
                        },
                    },
                },
            },
        });
        const { document } = await parseOpenapiDocument(text);

        expect(JSON.stringify(document)).toContain('"$ref":"./other.json"');
    });

    it('refuses an invalid document with what is wrong, one line each', async () => {
        const problems = await problemsOf(
            JSON.stringify({ openapi: '3.0.3', info: { title: 'T' }, paths: {} }),
        );

        expect(problems[0]).toMatch(/version/u);
        expect(problems.every((problem) => !problem.includes('\n'))).toBe(true);
    });

    it('refuses text that is neither JSON nor YAML', async () => {
        expect((await problemsOf('a: [unclosed')).length).toBeGreaterThan(0);
    });

    it.each([['{"hello":"world"}'], [''], ['- a list']])(
        'refuses %j: it is not an OpenAPI or Swagger description',
        async (text) => {
            expect(await problemsOf(text)).toEqual([
                'The document is not an OpenAPI or Swagger description: it has no "openapi" or "swagger" field',
            ]);
        },
    );
});
