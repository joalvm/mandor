import type { CollectionItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { itemNoteOf } from '../../src/workspace/unkept-of-item.js';
import type { UnkeptLevels } from '../../src/workspace/unkept-parts.js';

const RULES: UnkeptLevels = {
    collection: {},
    folder: {},
    scriptsIn: 'postman',
    request: {
        tags: 'tagsDropped',
        examples: 'examplesDropped',
        settingsKept: ['followRedirects'],
    },
    message: { byName: 'messagesInConnectionOfName', details: 'messageDetailsDropped' },
};

const NOTHING_KEPT_BACK: UnkeptLevels = { collection: {}, folder: {} };

function request(body: Record<string, unknown>, tags: string[] = []): CollectionItem {
    return { kind: 'request', name: 'Pide', tags, body };
}

function message(body: Record<string, unknown>): CollectionItem {
    return { kind: 'message', name: 'Saluda', tags: [], body };
}

describe('what a format loses of an item', () => {
    it('says nothing of a request that holds nothing the format loses', () => {
        expect(itemNoteOf(request({ settings: { followRedirects: false } }), RULES)).toEqual({});
    });

    it('names each thing a request holds and the format has no place for', () => {
        const item = request(
            {
                examples: [{ name: 'ok' }],
                settings: { timeoutMs: 1 },
                importedScripts: [{ event: 'onResponse', dialect: 'insomnia', source: 'a();' }],
            },
            ['api'],
        );

        expect(itemNoteOf(item, RULES).unkept).toEqual([
            'tagsDropped',
            'examplesDropped',
            'settingsDropped',
            'scriptsNotCarried',
        ]);
    });

    it('keeps quiet about the scripts in the dialect the format writes', () => {
        const item = request({
            importedScripts: [{ event: 'onResponse', dialect: 'postman', source: 'a();' }],
        });

        expect(itemNoteOf(item, RULES)).toEqual({});
    });

    it('does not count a setting left undefined as held', () => {
        expect(itemNoteOf(request({ settings: { timeoutMs: undefined } }), RULES)).toEqual({});
    });

    it('takes what does not read as not held, and the row still comes', () => {
        const item = request({ examples: 'x', settings: 3, importedScripts: [{}] });

        expect(itemNoteOf(item, RULES)).toEqual({});
    });

    it('says nothing when the format names nothing', () => {
        const held = request({ examples: [{}], settings: { timeoutMs: 1 } }, ['api']);

        expect(itemNoteOf(held, NOTHING_KEPT_BACK)).toEqual({});
        expect(itemNoteOf(message({ description: 'a' }), NOTHING_KEPT_BACK)).toEqual({});
    });

    it('says where a message goes, and whether its details leave', () => {
        expect(itemNoteOf(message({ payload: 'a', schema: '' }), RULES).unkept).toEqual([
            'messagesInConnectionOfName',
        ]);
        expect(itemNoteOf(message({ channel: 'a' }), RULES).unkept).toContain(
            'messageDetailsDropped',
        );
        expect(
            itemNoteOf(message({ expectAck: { enabled: true, timeoutMs: 1 } }), RULES).unkept,
        ).toContain('messageDetailsDropped');
    });

    it('has nothing to say of an item of any other kind', () => {
        const other: CollectionItem = { kind: 'grpc', name: 'Otro', tags: ['a'], body: {} };

        expect(itemNoteOf(other, RULES)).toEqual({});
    });

    it('says the examples of a GraphQL request, for a format that keeps them only on HTTP', () => {
        const rules: UnkeptLevels = {
            ...NOTHING_KEPT_BACK,
            request: { graphqlExamples: 'examplesDropped' },
        };
        const graphql = { body: { type: 'graphql' }, examples: [{}] };

        expect(itemNoteOf(request(graphql), rules).unkept).toEqual(['examplesDropped']);
        expect(itemNoteOf(request({ ...graphql, examples: [] }), rules)).toEqual({});
        expect(itemNoteOf(request({ ...graphql, body: { type: 'none' } }), rules)).toEqual({});
    });

    it('says the schemas of a request once, wherever it holds them', () => {
        const rules: UnkeptLevels = {
            ...NOTHING_KEPT_BACK,
            request: { schemas: 'schemasDropped' },
        };

        expect(itemNoteOf(request({ examples: [{ schema: '' }] }), rules)).toEqual({});
        expect(itemNoteOf(request({ bodySchema: '{}' }), rules).unkept).toEqual(['schemasDropped']);
        expect(itemNoteOf(request({ responseSchemas: { 200: '{}' } }), rules).unkept).toEqual([
            'schemasDropped',
        ]);
        expect(
            itemNoteOf(request({ bodySchema: '{}', examples: [{ schema: '{}' }] }), rules).unkept,
        ).toEqual(['schemasDropped']);
    });
});
