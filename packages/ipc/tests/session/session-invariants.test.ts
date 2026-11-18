import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { GridNode } from '../../src/session/grid-node.js';
import { checkLayout } from '../../src/session/session-invariants.js';

const schema = z
    .object({ grid: z.custom<GridNode>(), activeGroupId: z.string() })
    .superRefine(checkLayout);

function tab(id: string): { id: string; kind: string; resource: string } {
    return { id, kind: 'doc', resource: `mandor://demo/payments/doc/${id}.md` };
}

function split(...children: GridNode[]): GridNode {
    return { kind: 'branch', axis: 'row', sizes: children.map(() => 50), children };
}

function messagesOf(grid: GridNode, activeGroupId: string): { message: string; path: unknown[] }[] {
    const result = schema.safeParse({ grid, activeGroupId });

    return result.success
        ? []
        : result.error.issues.map(({ message, path }) => ({ message, path }));
}

describe('checkLayout', () => {
    it('lets a layout with distinct groups, distinct tabs and a real active group through', () => {
        const grid = split(
            { kind: 'leaf', id: 'left', tabs: [tab('a')], activeTab: 'a' },
            { kind: 'leaf', id: 'right', tabs: [tab('b')], activeTab: null },
        );

        expect(messagesOf(grid, 'right')).toEqual([]);
    });

    it('reports two groups that share an id', () => {
        const grid = split(
            { kind: 'leaf', id: 'twin', tabs: [], activeTab: null },
            { kind: 'leaf', id: 'twin', tabs: [], activeTab: null },
        );

        expect(messagesOf(grid, 'twin')).toEqual([
            { message: 'Group ids must be unique', path: ['grid'] },
        ]);
    });

    it('reports one tab id that two groups answer to', () => {
        const grid = split(
            { kind: 'leaf', id: 'left', tabs: [tab('a')], activeTab: null },
            { kind: 'leaf', id: 'right', tabs: [tab('a')], activeTab: null },
        );

        expect(messagesOf(grid, 'left')).toEqual([
            { message: 'Tab ids must be unique', path: ['grid'] },
        ]);
    });

    it('reports an active group that no leaf answers to', () => {
        const grid: GridNode = { kind: 'leaf', id: 'root', tabs: [], activeTab: null };

        expect(messagesOf(grid, 'elsewhere')).toEqual([
            {
                message: 'The active group must be one of the groups of the grid',
                path: ['activeGroupId'],
            },
        ]);
    });

    it('reports every broken rule at once, not only the first', () => {
        const grid = split(
            { kind: 'leaf', id: 'twin', tabs: [tab('a')], activeTab: null },
            { kind: 'leaf', id: 'twin', tabs: [tab('a')], activeTab: null },
        );

        expect(messagesOf(grid, 'elsewhere')).toHaveLength(3);
    });
});
