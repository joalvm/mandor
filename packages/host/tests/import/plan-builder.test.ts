import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { FormatInputError, ImportOtherAppError, type InteropFormat } from '@mandor/interop-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { planBuilder } from '../../src/import/plan-builder.js';
import { readInThread } from '../../src/import/read-import.js';
import { fixtureFormat } from '../interop/fixture-format.js';

const NOTHING = { stores: [], folderSettings: [] };
const build = planBuilder(
    [fixtureFormat],
    { stores: ['message', 'connection'], folderSettings: [] },
    readInThread,
);

describe('the builder of an import plan', () => {
    it('refuses files no listed format recognizes, before it asks for the origin', async () => {
        const answer = await build({
            workspaceId: 'pasarela',
            files: [{ path: 'words.txt', text: 'just words' }],
            scope: 'workspace',
        });

        expect(answer.ok ? '' : answer.error.code).toBe('import-format-unknown');
    });

    it('refuses what the request schema refuses', async () => {
        const answer = await build({
            workspaceId: 'A/B',
            files: [{ path: 'a.json', text: '{"resources": []}' }],
            scope: 'workspace',
        });

        expect(answer.ok ? '' : answer.error.code).toBe('bad-request');
    });

    describe('a format that refuses what it reads', () => {
        let root: string;

        beforeEach(async () => {
            root = await mkdtemp(join(tmpdir(), 'mandor-plan-'));

            setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root });
        });

        afterEach(async () => {
            setActiveOrigin(null);

            await rm(root, { recursive: true, force: true });
        });

        function refusing(error: Error): InteropFormat {
            return {
                ...fixtureFormat,
                load: () =>
                    Promise.resolve({
                        ...fixtureCodec,
                        read: () => Promise.reject(error),
                    }),
            };
        }

        const fixtureCodec = {
            documentsOf: () => [],
            textOf: () => '',
        };

        const request = {
            workspaceId: 'pasarela',
            files: [{ path: 'w.json', text: '"resources"' }],
            scope: 'workspace',
        } as const;

        it('tells a workspace file of the other app by its own code', async () => {
            const other = new ImportOtherAppError('async', 'sync');
            const answer = await planBuilder([refusing(other)], NOTHING, readInThread)(request);

            expect(answer).toEqual({
                ok: false,
                error: { code: 'import-other-app', message: other.message },
            });
        });

        it('tells a file that does not parse as a bad request, listing its problems', async () => {
            const broken = new FormatInputError(['one', 'two']);
            const answer = await planBuilder([refusing(broken)], NOTHING, readInThread)(request);

            expect(answer).toEqual({
                ok: false,
                error: { code: 'bad-request', message: 'one | two' },
            });
        });
    });
});
