import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ImportPlan } from '@mandor/interop-core';
import { createWorkspace, docFile, writeRepoTree } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyPlan } from '../../src/import/apply-plan.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-apply-docs-'));

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'pasarela', name: 'Pasarela', kind: 'async' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

const identity = { kind: 'openapi', sourceId: 'abc' } as const;

type Entry = ImportPlan['entries'][number];

function doc(route: string, text: string): Entry {
    return {
        class: 'add',
        place: 'doc',
        route,
        name: route,
        selected: true,
        resource: {
            place: 'doc',
            itemKind: null,
            route,
            name: route,
            fields: { text },
            origin: identity,
            degradations: [],
        },
    };
}

describe('applyPlan with docs', () => {
    it('writes each accepted note into the docs of the workspace', async () => {
        const applied = await applyPlan(root, 'pasarela', {
            identity,
            entries: [doc('guia.md', '# Guía'), doc('alta.md', '# Alta')],
        });

        expect(applied.map((entry) => entry.ok)).toEqual([true, true]);
        await expect(readFile(docFile(root, 'pasarela', 'guia.md'), 'utf8')).resolves.toBe(
            '# Guía',
        );
        await expect(readFile(docFile(root, 'pasarela', 'alta.md'), 'utf8')).resolves.toBe(
            '# Alta',
        );
    });

    it('leaves a note the person wrote alone: its conflict has nothing to write', async () => {
        const conflict: Entry = {
            class: 'conflict',
            place: 'doc',
            route: 'guia.md',
            name: 'guia.md',
            resource: null,
            selected: true,
        };

        const applied = await applyPlan(root, 'pasarela', { identity, entries: [conflict] });

        expect(applied).toEqual([
            { place: 'doc', route: 'guia.md', ok: false, reason: 'conflict' },
        ]);
    });

    it('writes the notes after the places they do not depend on, and before the removals', async () => {
        const environment: Entry = {
            class: 'add',
            place: 'environment',
            route: 'prod',
            name: 'Prod',
            selected: true,
            resource: {
                place: 'environment',
                itemKind: null,
                route: 'prod',
                name: 'Prod',
                fields: { name: 'Prod', variables: [] },
                origin: identity,
                degradations: [],
            },
        };
        const removal: Entry = {
            class: 'removal',
            place: 'environment',
            route: 'old',
            name: 'Old',
            resource: null,
            selected: false,
        };

        const applied = await applyPlan(root, 'pasarela', {
            identity,
            entries: [removal, doc('guia.md', '# Guía'), environment],
        });

        expect(applied.map(({ place }) => place)).toEqual(['environment', 'doc', 'environment']);
    });
});
