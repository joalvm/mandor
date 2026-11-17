import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    readPasarela,
    importRepo,
    startImportWorkspace,
    stopImportWorkspace,
    type ImportWorkspace,
} from './support/import-workspace.js';

const repo = importRepo();

let workspace: ImportWorkspace;

beforeEach(async () => {
    workspace = await startImportWorkspace(repo);
});

afterEach(async () => {
    await stopImportWorkspace(workspace);
});

describe('building the plan of an import', () => {
    it('names the document and states the whole difference before anything is written', async () => {
        const built = await workspace.plan(readPasarela());

        if (!built.ok) {
            throw new Error('the fixture should build a plan');
        }

        expect(built.value.name).toBe('Pasarela');
        expect(built.value.plan.entries.map((entry) => entry.class)).toEqual([
            'add',
            'add',
            'add',
            'add',
            'add',
            'add',
        ]);
    });

    it('carries one identity, and every resource names it as its origin', async () => {
        const built = await workspace.plan(readPasarela());

        if (!built.ok) {
            throw new Error('the fixture should build a plan');
        }

        const identity = built.value.plan.entries[0]?.resource?.origin;

        expect(identity).not.toBeUndefined();

        for (const entry of built.value.plan.entries) {
            // Folders carry no fingerprint and connections do; what names the source is the same.
            expect(entry.resource?.origin).toMatchObject({
                kind: 'asyncapi',
                sourceId: identity?.sourceId,
            });
        }

        expect(built.value.plan.identity).toMatchObject({
            kind: 'asyncapi',
            sourceId: identity?.sourceId,
        });
    });
});
