import { degradation, interopDocumentSchema } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { parseHarDocument } from '../../../src/har/document/parse-har-document.js';
import { documentToInterop } from '../../../src/har/import/document-to-interop.js';
import { entryOf, fixtureText, harOf } from '../support/fixture.js';

const OK = { status: 200, statusText: 'OK', headers: [] };

function chrome(): ReturnType<typeof documentToInterop> {
    return documentToInterop(parseHarDocument(fixtureText('chrome.har')), 'source');
}

describe('documentToInterop of a recording', () => {
    it('passes the schema of the model every importer shares', () => {
        expect(interopDocumentSchema.safeParse(chrome()).success).toBe(true);
    });

    it('makes a folder per host in the order they first appear', () => {
        expect(chrome().groups?.map((group) => group.path)).toEqual([
            ['api.example.test'],
            ['cdn.example.test'],
        ]);
    });

    it('makes an operation per method and URL, the repeated one merged', () => {
        const names = chrome().operations.map((operation) => operation.name);

        expect(names).toEqual([
            'api.example.test / GET /users',
            'api.example.test / GET /users (2)',
            'api.example.test / POST /users',
            'cdn.example.test / POST /upload',
            'cdn.example.test / GET /logo.png',
        ]);
        expect(chrome().operations[0]?.extras).toEqual({ mergedEntries: 1 });
    });

    it('gives each operation a channel of its own name', () => {
        const { channels, operations } = chrome();

        expect(channels.map((channel) => channel.name)).toEqual(
            operations.map((each) => each.name),
        );
    });

    it('names what it left out, and what it does not carry', () => {
        expect(chrome().notes).toEqual([
            degradation('harEntryBadUrl', { position: '7', url: 'ws://api.example.test/socket' }),
            degradation('harEntryBadUrl', { position: '8', url: 'data:text/plain;base64,aGk=' }),
            degradation('harExtrasNotImported'),
        ]);
    });

    it('carries the source id it was given and nothing of a server', () => {
        expect(chrome()).toMatchObject({ sourceId: 'source', servers: [], security: {} });
    });
});

describe('documentToInterop of the entries', () => {
    it('upper-cases the method and refuses one Mandor cannot send', () => {
        const result = documentToInterop(
            harOf([
                entryOf('get', 'https://a.test/x', { response: OK }),
                entryOf('GET /x', 'https://a.test/y', { response: OK }),
            ]),
            's',
        );

        expect(result.operations.map((each) => each.http?.method)).toEqual(['GET']);
        expect(result.notes[0]).toEqual(
            degradation('harEntryBadMethod', { position: '2', method: 'GET /x' }),
        );
    });

    it('refuses a URL that does not parse', () => {
        const result = documentToInterop(harOf([entryOf('GET', 'not a url')]), 's');

        expect(result.notes).toEqual([
            degradation('harEntryBadUrl', { position: '1', url: 'not a url' }),
        ]);
    });

    it('takes two URLs that differ by the fragment for one request', () => {
        const result = documentToInterop(
            harOf([entryOf('GET', 'https://a.test/x#one'), entryOf('GET', 'https://a.test/x#two')]),
            's',
        );

        expect(result.operations).toHaveLength(1);
        expect(result.operations[0]?.extras).toEqual({ mergedEntries: 1 });
    });

    it('tells the same path with another query by a number', () => {
        const result = documentToInterop(
            harOf([
                entryOf('GET', 'https://a.test/x?p=1'),
                entryOf('GET', 'https://a.test/x?p=2'),
                entryOf('GET', 'https://a.test/x?p=3'),
                entryOf('GET', 'https://b.test/x?p=1'),
            ]),
            's',
        );

        expect(result.operations.map((each) => each.name)).toEqual([
            'a.test / GET /x',
            'a.test / GET /x (2)',
            'a.test / GET /x (3)',
            'b.test / GET /x',
        ]);
    });

    it('keeps the port in the folder, since another port is another service', () => {
        const result = documentToInterop(
            harOf([
                entryOf('GET', 'http://localhost:3000/x'),
                entryOf('GET', 'http://localhost:4000/x'),
            ]),
            's',
        );

        expect(result.groups?.map((group) => group.path)).toEqual([
            ['localhost:3000'],
            ['localhost:4000'],
        ]);
    });
});

describe('the name of the document', () => {
    const entry = entryOf('GET', 'https://a.test/x');

    it('is the title of the first page that has one', () => {
        const result = documentToInterop(
            harOf([entry], [{}, { title: '  ' }, { title: ' My app ' }]),
            's',
        );

        expect(result.name).toBe('My app');
    });

    it('is the host when there is one', () => {
        expect(documentToInterop(harOf([entry]), 's').name).toBe('HAR a.test');
    });

    it('counts the other hosts', () => {
        const other = entryOf('GET', 'https://b.test/x');
        const third = entryOf('GET', 'https://c.test/x');

        expect(documentToInterop(harOf([entry, other, third]), 's').name).toBe(
            'HAR a.test and 2 more hosts',
        );
    });

    it('is just HAR when no entry stayed, and then says nothing of timings', () => {
        const result = documentToInterop(harOf([entryOf('GET', 'ftp://a.test/x')]), 's');

        expect(result.name).toBe('HAR');
        expect(result.notes).toHaveLength(1);
    });
});
