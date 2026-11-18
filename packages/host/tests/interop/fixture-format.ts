import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
    workspaceToIr,
    type ImportResource,
    type InteropCodec,
    type InteropDocument,
    type InteropFormat,
} from '@mandor/interop-core';
import { slugify } from '@mandor/schema';

/**
 * What a fixture keeps: the model a document of the app reads to, what that model asks the
 * workspace to hold, and — for a round trip — what the workspace holds once it is written.
 */
export type Fixture = {
    document: InteropDocument;
    resources: ImportResource[];
    held?: InteropDocument;
};

export type FixtureName = 'pasarela-3' | 'ida-vuelta-2' | 'ida-vuelta-3' | 'ida-vuelta-openapi';

/** The text of a fixture: the document the fixture format reads. */
export function fixtureText(name: FixtureName): string {
    return readFileSync(fileURLToPath(new URL(`./fixtures/${name}.json`, import.meta.url)), 'utf8');
}

export function readFixture(name: FixtureName): Fixture {
    return JSON.parse(fixtureText(name)) as Fixture;
}

const codec: InteropCodec = {
    read: (files) => {
        const fixture = JSON.parse(files[0]?.text ?? '{}') as Fixture;

        return Promise.resolve({ name: fixture.document.name, resources: fixture.resources });
    },
    documentsOf: (data) => [
        { path: `${slugify(data.name)}.json`, document: { ...workspaceToIr(data) } },
    ],
    textOf: (document) => JSON.stringify(document, null, 2),
};

/**
 * A format that stands for any the app lists. Its text is a fixture as JSON, and its document
 * is the model itself, so the host's pipeline is tested without the host naming a format of
 * the app. The fixtures were taken from the AsyncAPI documents of `interop-formats`.
 */
export const fixtureFormat: InteropFormat = {
    id: 'fixture',
    label: 'Fixture',
    reads: ['json'],
    writes: ['json'],
    scopes: ['collection'],
    input: 'file',
    unwritten: { request: 'messagesNotHttp' },
    unkept: { collection: {}, folder: {} },
    sniff: (files) => files.some(({ text }) => text.includes('"resources"')),
    load: () => Promise.resolve(codec),
};
