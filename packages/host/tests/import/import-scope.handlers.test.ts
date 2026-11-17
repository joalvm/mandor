import { listEnvironments } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { fixtureText } from '../interop/fixture-format.js';
import {
    importRepo,
    startImportWorkspace,
    stopImportWorkspace,
    type ImportWorkspace,
} from './support/import-workspace.js';

const repo = importRepo();

let workspace: ImportWorkspace;

/** A spec: a collection with its folders and requests, the environments of its servers, the auth of the workspace. */
const SPEC = fixtureText('ida-vuelta-openapi');

beforeEach(async () => {
    workspace = await startImportWorkspace(repo);
});

afterEach(async () => {
    await stopImportWorkspace(workspace);
});

async function placesPlanned(text: string, scope: 'collection' | 'workspace'): Promise<string[]> {
    const built = await workspace.plan(text, scope);

    if (!built.ok) {
        throw new Error('the fixture should build a plan');
    }

    return [...new Set(built.value.plan.entries.map((entry) => entry.place))].toSorted();
}

describe('importing a spec in the scope of a collection', () => {
    it('plans the collection, its folders and its requests, and not the environments or the workspace', async () => {
        expect(await placesPlanned(SPEC, 'collection')).toEqual(['collection', 'folder', 'item']);
    });

    it('plans the environments of its servers and the workspace file when the scope is the workspace', async () => {
        expect(await placesPlanned(SPEC, 'workspace')).toEqual([
            'collection',
            'environment',
            'folder',
            'item',
            'workspace',
        ]);
    });

    it('creates no environment when the plan is applied', async () => {
        const built = await workspace.plan(SPEC, 'collection');

        if (!built.ok) {
            throw new Error('the fixture should build a plan');
        }

        const applied = await workspace.apply(built.value.name, built.value.plan);

        expect(applied.ok).toBe(true);
        expect((await listEnvironments(workspace.root, 'pasarela')).environments).toEqual([]);
    });

    it('does not count as removed what the workspace holds beyond the collection', async () => {
        const first = await workspace.plan(SPEC, 'workspace');

        if (!first.ok) {
            throw new Error('the fixture should build a plan');
        }

        await workspace.apply(first.value.name, first.value.plan);

        const spec = JSON.parse(SPEC) as { resources: { place: string }[] };
        const slimmer = JSON.stringify({
            ...spec,
            resources: spec.resources.filter(({ place }) => place !== 'environment'),
        });
        const removed = async (scope: 'collection' | 'workspace') => {
            const built = await workspace.plan(slimmer, scope);

            return built.ok
                ? built.value.plan.entries
                      .filter((entry) => entry.class === 'removal')
                      .map((entry) => entry.place)
                : [];
        };

        expect(await removed('workspace')).toEqual(['environment', 'environment']);
        expect(await removed('collection')).toEqual([]);
    });
});
