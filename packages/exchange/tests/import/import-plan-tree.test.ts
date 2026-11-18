import type { Degradation } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { pickableIds } from '../../src/choice/lib/choice-state.js';
import { importChoiceNodes } from '../../src/import/lib/import-plan-tree.js';
import { entryOf, leftOutEntry, planOf } from '../support/plan-entries.js';

const WORDS = {
    conflict: 'something else holds this name',
    removal: 'the document no longer carries it',
    loss: ({ code }: Degradation) => `said ${code}`,
};

const SAMPLE = planOf([
    entryOf('connection', 'produccion'),
    entryOf('folder', 'pedidos'),
    entryOf('item', 'pedidos/registrar'),
    entryOf('item', 'pedidos/avisar'),
]);

describe('the nodes of an import plan', () => {
    it('hang items under the folder they travel to, and connections at the top', () => {
        const nodes = importChoiceNodes(SAMPLE, WORDS);

        expect(nodes.map((node) => node.label)).toEqual(['produccion', 'pedidos']);
        expect(nodes[1]?.children.map((child) => child.label)).toEqual([
            'pedidos/registrar',
            'pedidos/avisar',
        ]);
    });

    it('are named by where their entry sits in the plan', () => {
        const nodes = importChoiceNodes(SAMPLE, WORDS);

        expect(nodes.map((node) => node.id)).toEqual(['0', '1']);
        expect(nodes[1]?.children.map((child) => child.id)).toEqual(['2', '3']);
    });

    it('hang the folders under the collection, open, and the items under both', () => {
        const [collection] = importChoiceNodes(
            planOf([
                entryOf('collection', 'tienda'),
                entryOf('folder', 'tienda/pedidos'),
                entryOf('item', 'tienda/pedidos/registrar'),
                entryOf('item', 'tienda/salud'),
            ]),
            WORDS,
        );

        expect(collection?.open).toBe(true);
        expect(collection?.children.map((child) => child.id)).toEqual(['1', '3']);
        expect(collection?.children[0]?.open).toBeUndefined();
        expect(collection?.children[0]?.children.map((child) => child.id)).toEqual(['2']);
    });

    it('keep an environment and a folder of one route as two roots', () => {
        const nodes = importChoiceNodes(
            planOf([
                entryOf('folder', 'pedidos'),
                entryOf('environment', 'pedidos'),
                entryOf('item', 'pedidos/registrar'),
            ]),
            WORDS,
        );

        expect(nodes.map((node) => node.icon)).toEqual(['folder', 'environment']);
        expect(nodes[1]?.children).toEqual([]);
        expect(nodes[0]?.children.map((child) => child.id)).toEqual(['2']);
    });

    it('wear the glyph of their place, and an item the one of its kind', () => {
        const nodes = importChoiceNodes(
            planOf([
                entryOf('connection', 'a'),
                entryOf('workspace', 'b'),
                entryOf('collection', 'c'),
                entryOf('item', 'c/d'),
            ]),
            WORDS,
        );

        expect(nodes.map((node) => node.icon)).toEqual(['connection', 'key', 'collection']);
        expect(nodes[2]?.children[0]?.icon).toBe('message');
    });

    it('give a request the glyph of a request, as the export does', () => {
        const item = entryOf('item', 'c/d');
        const [collection] = importChoiceNodes(
            planOf([
                entryOf('collection', 'c'),
                { ...item, resource: { ...item.resource, itemKind: 'request' } },
            ]),
            WORDS,
        );

        expect(collection?.children[0]?.icon).toBe('http');
    });

    /** The kind is the document's text, not ours: a name an object answers to wears no glyph of its own. */
    it('give an item of a kind no glyph knows the glyph of its place', () => {
        const item = entryOf('item', 'c/d');
        const [collection] = importChoiceNodes(
            planOf([
                entryOf('collection', 'c'),
                { ...item, resource: { ...item.resource, itemKind: 'constructor' } },
            ]),
            WORDS,
        );

        expect(collection?.children[0]?.icon).toBe('file');
    });

    it('carry the method of a request as its mark, and nothing else wears one', () => {
        const request = entryOf('item', 'c/d');
        const nodes = importChoiceNodes(
            planOf([
                entryOf('collection', 'c'),
                {
                    ...request,
                    resource: {
                        ...request.resource,
                        fields: { method: 'POST' },
                        itemKind: 'request',
                    },
                },
                entryOf('item', 'c/e'),
            ]),
            WORDS,
        );

        expect(nodes[0]?.mark).toBeUndefined();
        expect(nodes[0]?.children.map((child) => child.mark)).toEqual(['POST', undefined]);
    });

    it('bar what the app leaves out, with the reason it was left out', () => {
        const nodes = importChoiceNodes(planOf([leftOutEntry('colas')]), WORDS);

        expect(nodes.map((node) => node.reason)).toEqual(['said leftOutConnections']);
        expect(nodes.flatMap(pickableIds)).toEqual([]);
    });

    it('bar what has nothing to write, with the word of its class', () => {
        const conflict = {
            ...entryOf('connection', 'taken'),
            class: 'conflict' as const,
            resource: null,
        };
        const removal = { ...conflict, class: 'removal' as const, route: 'gone', name: 'gone' };
        const nodes = importChoiceNodes(planOf([conflict, removal]), WORDS);

        expect(nodes.map((node) => node.reason)).toEqual([WORDS.conflict, WORDS.removal]);
        expect(nodes.flatMap(pickableIds)).toEqual([]);
    });

    it('bar nothing else', () => {
        expect(importChoiceNodes(SAMPLE, WORDS).map((node) => node.reason)).toEqual([
            undefined,
            undefined,
        ]);
    });
});
