import { readFileSync } from 'node:fs';

import type { FormatFile } from '@mandor/interop-core';
import { compileSchema, loadSchemaChecker, validateValue } from '@mandor/validate';
import { beforeAll, describe, expect, it } from 'vitest';

import { documentsOf as brunoDocuments } from '../../src/bruno/export/documents-of.js';
import { documentsOf as insomniaDocuments } from '../../src/insomnia/export/documents-of.js';
import { documentsOf as postmanDocuments } from '../../src/postman/export/documents-of.js';
import { insomniaCollectionSchema } from './official/insomnia-v5.js';
import { OFFICIAL_SAMPLE } from './official/sample-workspace.js';

const OPEN_COLLECTION = 'opencollection.schema.json';

function schemaText(schemaFile: string): string {
    return readFileSync(new URL(`./official/${schemaFile}`, import.meta.url), 'utf8');
}

function issuesAgainst(text: string, document: unknown): string[] {
    const compiled = compileSchema(text);

    if (!compiled.ok) {
        throw new Error('the schema does not compile');
    }

    return validateValue(compiled.schema, document).map(
        ({ path, message }) => `${path}: ${message}`,
    );
}

function issuesOf(schemaFile: string, document: unknown): string[] {
    return issuesAgainst(schemaText(schemaFile), document);
}

/** A part of OpenCollection: Bruno keeps each folder, request and environment in its own file. */
function issuesOfPart(part: string, document: unknown): string[] {
    const { $defs } = JSON.parse(schemaText(OPEN_COLLECTION)) as { $defs: unknown };

    return issuesAgainst(JSON.stringify({ $ref: `#/$defs/${part}`, $defs }), document);
}

function partOfBrunoFile(path: string): string {
    if (path.startsWith('environments/')) {
        return 'Environment';
    }

    return path.endsWith('folder.yml') ? 'Folder' : 'Item';
}

function pathsOf(files: readonly FormatFile[], suffix: string): FormatFile[] {
    return files.filter(({ path }) => path.endsWith(suffix));
}

describe('what a format writes against the schema of the format', () => {
    beforeAll(async () => {
        await loadSchemaChecker();
    });

    it('postman: every collection meets the schema 2.1 Postman publishes', () => {
        const files = pathsOf(postmanDocuments(OFFICIAL_SAMPLE), '.postman_collection.json');

        expect(files).not.toEqual([]);

        for (const { document } of files) {
            expect(issuesOf('postman-collection-2.1.schema.json', document)).toEqual([]);
        }
    });

    it('bruno: the collection meets the schema OpenCollection publishes', () => {
        const files = pathsOf(brunoDocuments(OFFICIAL_SAMPLE), 'opencollection.yml');

        expect(files).not.toEqual([]);

        for (const { document } of files) {
            expect(issuesOf(OPEN_COLLECTION, document)).toEqual([]);
        }
    });

    it('bruno: every other file meets its part of that schema', () => {
        const files = pathsOf(brunoDocuments(OFFICIAL_SAMPLE), '.yml').filter(
            ({ path }) => !path.endsWith('opencollection.yml'),
        );

        expect(files.map(({ path }) => partOfBrunoFile(path))).toEqual(
            expect.arrayContaining(['Environment', 'Folder', 'Item']),
        );

        for (const { path, document } of files) {
            expect({ path, issues: issuesOfPart(partOfBrunoFile(path), document) }).toEqual({
                path,
                issues: [],
            });
        }
    });

    it('insomnia: every collection reads with the shapes Insomnia reads it with', () => {
        const files = insomniaDocuments(OFFICIAL_SAMPLE);

        expect(files).not.toEqual([]);

        for (const { document } of files) {
            expect(insomniaCollectionSchema.safeParse(document).error?.issues).toBeUndefined();
        }
    });

    it('insomnia: nothing it writes is a key Insomnia drops', () => {
        for (const { document } of insomniaDocuments(OFFICIAL_SAMPLE)) {
            expect(insomniaCollectionSchema.parse(document)).toEqual(document);
        }
    });

    it('insomnia: the environments travel inside the collection', () => {
        const [file] = insomniaDocuments(OFFICIAL_SAMPLE);
        const parsed = insomniaCollectionSchema.parse(file?.document);

        expect(parsed.environments?.subEnvironments?.map(({ name }) => name)).toEqual(['Prod']);
    });
});
