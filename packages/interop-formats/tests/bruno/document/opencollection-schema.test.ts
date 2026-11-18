import { describe, expect, it } from 'vitest';

import {
    authSchema,
    collectionSchema,
    descriptionSchema,
    environmentSchema,
    formEntrySchema,
    graphqlSchema,
    httpSchema,
    itemSchema,
    variableSchema,
    websocketSchema,
} from '../../../src/bruno/document/opencollection-schema.js';

describe('opencollection-schema', () => {
    it('reads a description written as text or as a typed document', () => {
        expect(descriptionSchema.parse('hola')).toBe('hola');
        expect(descriptionSchema.parse({ content: 'hola', type: 'text/markdown' })).toEqual({
            content: 'hola',
            type: 'text/markdown',
        });
        expect(descriptionSchema.parse(null)).toBeNull();
    });

    it('reads the auth that inherits and the one that names a scheme', () => {
        expect(authSchema.parse('inherit')).toBe('inherit');
        expect(authSchema.parse({ type: 'bearer', token: 'x', unknown: 1 })).toEqual({
            type: 'bearer',
            token: 'x',
        });
        expect(() => authSchema.parse('basic')).toThrow();
    });

    it('reads the fields of a form: a text, or a list of the files it sends', () => {
        expect(formEntrySchema.parse({ name: 'a', value: 'x' }).value).toBe('x');
        expect(formEntrySchema.parse({ name: 'a', type: 'file', value: ['f.png'] }).value).toEqual([
            'f.png',
        ]);
    });

    it('keeps the value of a variable as it was written', () => {
        expect(
            variableSchema.parse({ name: 'a', value: { type: 'string', data: 'x' } }).value,
        ).toEqual({ type: 'string', data: 'x' });
    });

    it('reads an HTTP request with a body, or with a list of bodies one of which is selected', () => {
        expect(
            httpSchema.parse({ method: 'GET', body: { type: 'json', data: '{}' } }).body,
        ).toEqual({ type: 'json', data: '{}' });
        expect(
            httpSchema.parse({
                body: [{ selected: true, body: { type: 'text', data: 'x' } }],
            }).body,
        ).toEqual([{ selected: true, body: { type: 'text', data: 'x' } }]);
    });

    it('reads a GraphQL request with its query and its variables', () => {
        expect(graphqlSchema.parse({ body: { query: '{ a }', variables: '{}' } }).body).toEqual({
            query: '{ a }',
            variables: '{}',
        });
        expect(
            graphqlSchema.parse({ body: [{ selected: true, body: { query: '{ a }' } }] }).body,
        ).toEqual([{ selected: true, body: { query: '{ a }' } }]);
    });

    it('reads an item of any kind, with what it holds when it is a folder', () => {
        expect(itemSchema.parse({ info: { name: 'a', seq: 2, tags: ['x'] }, items: [] })).toEqual({
            info: { name: 'a', seq: 2, tags: ['x'] },
            items: [],
        });
    });

    it('reads an environment and a collection, whose parts are all optional', () => {
        expect(environmentSchema.parse({})).toEqual({});
        expect(collectionSchema.parse({ opencollection: '1.0.0' })).toEqual({
            opencollection: '1.0.0',
        });
        expect(
            collectionSchema.parse({ config: { environments: [{ name: 'Prod' }] } }).config,
        ).toEqual({ environments: [{ name: 'Prod' }] });
    });

    it('refuses a part that is the wrong type', () => {
        expect(() => collectionSchema.parse({ items: 'x' })).toThrow();
        expect(() => itemSchema.parse({ info: { seq: 'x' } })).toThrow();
    });

    it('reads a WebSocket request with one message, or with titled variants one of which is selected', () => {
        expect(
            websocketSchema.parse({ url: 'wss://a', message: { type: 'json', data: '{}' } })
                .message,
        ).toEqual({ type: 'json', data: '{}' });
        expect(
            websocketSchema.parse({
                message: [{ title: 'Hola', selected: true, message: { type: 'text', data: 'x' } }],
            }).message,
        ).toEqual([{ title: 'Hola', selected: true, message: { type: 'text', data: 'x' } }]);
    });

    it('reads an item that holds a WebSocket request, with the settings it keeps', () => {
        const item = itemSchema.parse({ websocket: { url: 'wss://a' }, settings: { timeout: 5 } });

        expect(item.websocket?.url).toBe('wss://a');
        expect(item.settings).toEqual({ timeout: 5 });
    });
});
