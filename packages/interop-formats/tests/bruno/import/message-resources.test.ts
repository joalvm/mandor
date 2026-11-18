import { importResourceSchema, type TakenRoutes } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { messageResourcesOf } from '../../../src/bruno/import/message-resources.js';
import { websocketNode } from '../support/trees.js';

function spotOf(parent = 'tienda') {
    const taken: TakenRoutes = new Map();

    return { sourceId: 'collection:c', parent, taken };
}

describe('messageResourcesOf', () => {
    it('writes a message of the collection for each one the request keeps, named after both', () => {
        const resources = messageResourcesOf(
            websocketNode({
                name: 'Feed',
                messages: [
                    { title: 'Hola', type: 'json', data: '{"a":1}' },
                    { title: 'Adiós', type: 'binary', data: 'AAEC' },
                ],
            }),
            spotOf(),
        );

        expect(resources.map((each) => [each.name, each.route, each.fields])).toEqual([
            ['Feed: Hola', 'tienda/feed-hola', { payload: '{"a":1}', payloadType: 'json' }],
            ['Feed: Adiós', 'tienda/feed-adios', { payload: 'AAEC', payloadType: 'binary' }],
        ]);
        expect(resources[0]).toMatchObject({
            place: 'item',
            itemKind: 'message',
            origin: { kind: 'bruno', sourceId: 'collection:c' },
            degradations: [],
        });
        expect(importResourceSchema.safeParse(resources[0]).success).toBe(true);
    });

    it('calls a message with no title by the request when it is the only one, else by its place', () => {
        const only = messageResourcesOf(
            websocketNode({ name: 'Feed', messages: [{ title: '', type: 'text', data: 'x' }] }),
            spotOf(),
        );
        const several = messageResourcesOf(
            websocketNode({
                name: 'Feed',
                messages: [
                    { title: '', type: 'text', data: 'x' },
                    { title: '', type: 'text', data: 'y' },
                ],
            }),
            spotOf('otra'),
        );

        expect(only.map((each) => each.name)).toEqual(['Feed']);
        expect(several.map((each) => each.name)).toEqual(['Feed 1', 'Feed 2']);
    });

    it('types as text what Bruno types as xml or as something it does not know', () => {
        const resources = messageResourcesOf(
            websocketNode({
                messages: [
                    { title: 'a', type: 'xml', data: '<a/>' },
                    { title: 'b', type: 'raro', data: 'x' },
                ],
            }),
            spotOf(),
        );

        expect(resources.map((each) => each.fields['payloadType'])).toEqual(['text', 'text']);
    });

    it('leaves out a message that says nothing, and names the request when it has no name', () => {
        const resources = messageResourcesOf(
            websocketNode({
                name: ' ',
                messages: [
                    { title: 'Vacío', type: 'text', data: '' },
                    { title: 'Lleno', type: 'text', data: 'x' },
                ],
            }),
            spotOf(),
        );

        expect(resources.map((each) => each.name)).toEqual(['WebSocket: Lleno']);
    });

    it('keeps two messages of the same name apart under one parent', () => {
        const spot = spotOf();
        const message = { title: 'Hola', type: 'text', data: 'x' };
        const first = messageResourcesOf(
            websocketNode({ name: 'Feed', messages: [message] }),
            spot,
        );
        const second = messageResourcesOf(
            websocketNode({ name: 'Feed', messages: [message] }),
            spot,
        );

        expect([first[0]?.route, second[0]?.route]).toEqual([
            'tienda/feed-hola',
            'tienda/feed-hola-2',
        ]);
    });
});
