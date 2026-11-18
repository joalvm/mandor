import { editor, Uri } from 'monaco-editor/editor/editor.api.js';
import { afterEach, describe, expect, it } from 'vitest';

import '../../../src/editor/monaco/monaco-setup.js';
import '../../../src/editor/monaco/schema-language.js';
import '../../../src/editor/monaco/schema-service.js';
import '../../../src/editor/monaco/schema-grammar.js';
import { SCHEMA_DOCUMENTS } from '../../../src/editor/monaco/metaschemas/schema-schemas.js';

/** The marks the schema language left on a document written where the app writes them. */
async function marksOf(text: string, key: string): Promise<readonly editor.IMarker[]> {
    const model = editor.createModel(text, 'json', Uri.parse(`inmemory://mandor/${key}`));

    try {
        // The validation runs after the content lands; the poll waits for its first run.
        await expect
            .poll(() => editor.getModelMarkers({ owner: 'json', resource: model.uri }).length, {
                timeout: 5_000,
            })
            .toBeGreaterThan(0);

        return editor.getModelMarkers({ owner: 'json', resource: model.uri });
    } finally {
        model.dispose();
    }
}

/** The marks of a document that should come out clean, waited for the run of the service. */
async function cleanMarks(text: string): Promise<readonly editor.IMarker[]> {
    const model = editor.createModel(text, 'json', Uri.parse('inmemory://mandor/clean-schema'));

    try {
        await expect
            .poll(() => editor.getModelMarkers({ owner: 'json', resource: model.uri }).length, {
                timeout: 5_000,
            })
            .toBe(0);

        return editor.getModelMarkers({ owner: 'json', resource: model.uri });
    } finally {
        model.dispose();
    }
}

describe('the schema language', () => {
    afterEach(() => {
        editor.getModels().forEach((model) => {
            model.dispose();
        });
    });

    it('marks a keyword the metaschema does not know', async () => {
        const marks = await marksOf('{ "type": "strin" }', 'typo');

        expect(marks.length).toBeGreaterThan(0);
        expect(marks[0]?.message).toContain('strin');
    });

    it('marks a trailing comma', async () => {
        const marks = await marksOf('{\n  "type": "object",\n}', 'trailing');

        expect(marks.length).toBe(1);
        expect(marks[0]?.message.toLowerCase()).toContain('trailing');
    });

    /** The comments are the document's own: a schema of the app speaks JSONC. */
    it('forgives the comments a schema is written with', async () => {
        const marks = await cleanMarks('{ // the shape of the event\n  "type": "object"  \n}');

        expect(marks).toEqual([]);
    });

    it('carries the metaschemas of both drafts, taken as data', () => {
        const uris = SCHEMA_DOCUMENTS.map((document) => document.uri);

        expect(uris).toContain('http://json-schema.org/draft-07/schema');
        expect(uris).toContain('https://json-schema.org/draft/2020-12/schema');
    });

    it('checks a document against draft-07 when its $schema names it', async () => {
        const marks = await cleanMarks(
            '{"$schema": "http://json-schema.org/draft-07/schema#", "items": [{"type": "string"}]}',
        );

        expect(marks).toEqual([]);
    });

    it('checks every schema document against 2020-12 without a $schema', async () => {
        const marks = await cleanMarks(
            '{"prefixItems": [{"type": "string"}], "unevaluatedProperties": false}',
        );

        expect(marks).toEqual([]);
        expect(await marksOf('{"items": [{"type": "string"}]}', 'tuple')).not.toEqual([]);
    });

    /** The marks are the service's answer, not an echo of the previous document of a key. */
    it('answers each key with its own marks', async () => {
        const first = await marksOf('{ "type": "strin" }', 'a-key');

        expect(first.length).toBeGreaterThan(0);

        const second = await cleanMarks('{"type": "string"}');

        expect(second).toEqual([]);
    });
});
