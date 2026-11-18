import type { OutlineLoss, OutlineNode } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { pickableIds } from '../../src/choice/lib/choice-state.js';
import { exportChoiceNodes } from '../../src/export/lib/export-choice-nodes.js';

const NO_WORDS = {};

function lossWords(loss: OutlineLoss): string {
    return `dice ${loss}`;
}

function node(kind: OutlineNode['kind'], id: string, children: OutlineNode[] = []): OutlineNode {
    return { children, id, kind, label: id };
}

describe('the nodes of an export outline', () => {
    it('keep the route and the name of each node, and the shape of the tree', () => {
        const nodes = exportChoiceNodes(
            [node('collection', 'collection/0', [node('request', 'collection/0/item/0')])],
            NO_WORDS,
            lossWords,
        );

        expect(nodes.map((each) => each.id)).toEqual(['collection/0']);
        expect(nodes[0]?.children.map((each) => [each.id, each.label])).toEqual([
            ['collection/0/item/0', 'collection/0/item/0'],
        ]);
    });

    it('say in their note what the format does not keep, and nothing when it keeps it all', () => {
        const nodes = exportChoiceNodes(
            [
                { ...node('folder', 'a'), unkept: ['noVariables', 'headersCopied'] },
                node('folder', 'b'),
            ],
            NO_WORDS,
            lossWords,
        );

        expect(nodes.map((each) => each.note)).toEqual([
            'dice noVariables · dice headersCopied',
            undefined,
        ]);
    });

    it('wear the glyph of their kind, a request the one of HTTP', () => {
        const nodes = exportChoiceNodes(
            [
                node('connection', 'a'),
                node('environment', 'b'),
                node('collection', 'c', [
                    node('folder', 'd', [node('request', 'e')]),
                    node('message', 'f'),
                    node('other', 'g'),
                ]),
                node('settings', 'h'),
                node('doc', 'i'),
            ],
            NO_WORDS,
            lossWords,
        );

        expect(nodes.map((each) => each.icon)).toEqual([
            'connection',
            'environment',
            'collection',
            'braces',
            'doc',
        ]);
        expect(nodes[2]?.children.map((each) => each.icon)).toEqual(['folder', 'message', 'file']);
        expect(nodes[2]?.children[0]?.children[0]?.icon).toBe('http');
    });

    it('carry the mark main sent, which only a request wears', () => {
        const nodes = exportChoiceNodes(
            [{ ...node('request', 'a'), mark: 'GET' }, node('message', 'b')],
            NO_WORDS,
            lossWords,
        );

        expect(nodes.map((each) => each.mark)).toEqual(['GET', undefined]);
    });

    it('open the collections and fold the rest', () => {
        const [collection, folder] = exportChoiceNodes(
            [
                node('collection', 'a', [node('message', 'b')]),
                node('folder', 'c', [node('message', 'd')]),
            ],
            NO_WORDS,
            lossWords,
        );

        expect(collection?.open).toBe(true);
        expect(folder?.open).toBeUndefined();
    });

    it('carry the reason of the format, so a barred node has nothing to pick', () => {
        const nodes = exportChoiceNodes(
            [{ ...node('request', 'a'), reason: 'messagesNotHttp' }, node('message', 'b')],
            NO_WORDS,
            lossWords,
        );

        expect(nodes.map((each) => each.reason)).toEqual(['dice messagesNotHttp', undefined]);
        expect(nodes.flatMap(pickableIds)).toEqual(['b']);
    });

    it('call by the words of the window the kinds main cannot name, and keep the other names', () => {
        const nodes = exportChoiceNodes(
            [node('settings', 'settings'), node('doc', 'doc/leeme.md')],
            { settings: 'Settings and variables' },
            lossWords,
        );

        expect(nodes.map((each) => each.label)).toEqual(['Settings and variables', 'doc/leeme.md']);
    });

    it('say why a node does not leave, and nothing for a branch barred by its children', () => {
        const nodes = exportChoiceNodes(
            [
                { ...node('message', 'a'), reason: 'messagesNotHttp' },
                { ...node('folder', 'b'), reason: '' },
                node('request', 'c'),
            ],
            NO_WORDS,
            lossWords,
        );

        expect(nodes.map((each) => each.reason)).toEqual(['dice messagesNotHttp', '', undefined]);
    });
});
