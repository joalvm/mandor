import { degradation, type Degradation } from '@mandor/interop-core';
import { readFolderSettings } from '@mandor/store-fs';
import { afterEach, describe, expect, it } from 'vitest';

import {
    readPasarela,
    importRepo,
    startImportWorkspace,
    stopImportWorkspace,
    type ImportWorkspace,
} from './support/import-workspace.js';

const repo = importRepo();

let workspace: ImportWorkspace;

afterEach(async () => {
    await stopImportWorkspace(workspace);
});

async function leaves(): Promise<
    { place: string; selected: boolean; leftOut: Degradation | undefined }[]
> {
    const built = await workspace.plan(readPasarela());

    if (!built.ok) {
        throw new Error('the fixture should build a plan');
    }

    return built.value.plan.entries.map((entry) => ({
        place: entry.place,
        selected: entry.selected,
        leftOut: entry.leftOut,
    }));
}

const ORIGIN = { kind: 'mandor', sourceId: 'Tienda' };
const LEVEL_SETTINGS = {
    description: 'Lo suyo',
    variables: [{ name: 'a', value: '1', enabled: true, secret: false }],
    auth: { type: 'bearer', token: '{{t}}' },
    headers: [{ key: 'X-A', value: '1', enabled: true }],
};
const LEVELS_TEXT = JSON.stringify({
    document: { name: 'Tienda' },
    resources: [
        {
            place: 'collection',
            itemKind: null,
            route: 'tienda',
            name: 'Tienda',
            fields: { name: 'Tienda', ...LEVEL_SETTINGS },
            origin: ORIGIN,
            degradations: [],
        },
        {
            place: 'folder',
            itemKind: null,
            route: 'tienda/a',
            name: 'A',
            fields: LEVEL_SETTINGS,
            origin: ORIGIN,
            degradations: [],
        },
    ],
});

describe('importing into an app that keeps only some settings of a level', () => {
    async function firstPlan() {
        const built = await workspace.plan(LEVELS_TEXT);

        if (!built.ok) {
            throw new Error('the document should build a plan');
        }

        return built.value.plan;
    }

    it('leaves the auth and the headers out, with a row, and the level marked', async () => {
        workspace = await startImportWorkspace(repo, [], ['description', 'variables']);

        const plan = await firstPlan();

        expect(plan.entries.map((entry) => entry.selected)).toEqual([true, true]);
        expect(plan.entries[1]?.resource?.degradations).toEqual([
            degradation('folderKeepsNoAuth'),
            degradation('folderKeepsNoHeaders'),
        ]);
    });

    it('writes only what it keeps, and a re-import finds it as it left it', async () => {
        workspace = await startImportWorkspace(repo, [], ['description', 'variables']);

        const plan = await firstPlan();
        const applied = await workspace.apply('Tienda', plan);

        expect(applied.ok).toBe(true);

        const folder = await readFolderSettings(
            workspace.root,
            'pasarela',
            plan.entries[1]?.route ?? '',
        );

        expect(folder.description).toBe('Lo suyo');
        expect(folder.variables).toEqual(LEVEL_SETTINGS.variables);
        expect(folder.auth).toBeUndefined();
        expect(folder.headers).toBeUndefined();

        const again = await firstPlan();

        // The fingerprint measured what was written: nobody edited what no one wrote.
        expect(again.entries.map((entry) => [entry.place, entry.class, entry.selected])).toEqual([
            ['collection', 'update', true],
            ['folder', 'update', true],
        ]);
        expect((await workspace.apply('Tienda', again)).ok).toBe(true);
    });
});

describe('importing into an app that keeps only some kinds of resource', () => {
    it('marks the messages and the connections out, with their reason, in an app of requests', async () => {
        workspace = await startImportWorkspace(repo, ['request']);
        const entries = await leaves();
        const out = entries.filter(
            (entry) => entry.place === 'item' || entry.place === 'connection',
        );

        expect(out.length).toBeGreaterThan(0);
        expect(out.every((entry) => !entry.selected)).toBe(true);
        expect(new Set(out.map((entry) => entry.leftOut?.code))).toEqual(
            new Set(['leftOutMessages', 'leftOutConnections']),
        );
    });

    it('keeps the messages and the connections marked in an app of connections', async () => {
        workspace = await startImportWorkspace(repo);
        const entries = await leaves();

        expect(entries.every((entry) => entry.selected)).toBe(true);
        expect(entries.every((entry) => entry.leftOut === undefined)).toBe(true);
    });
});
