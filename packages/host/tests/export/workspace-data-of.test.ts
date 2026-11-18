import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { irDiff, workspaceToIr } from '@mandor/interop-core';
import { createWorkspace, writeRepoTree } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { workspaceDataOf } from '../../src/export/workspace-data-of.js';
import { readFixture, type FixtureName } from '../interop/fixture-format.js';
import { writeImportedResources } from './support/imported-resources.js';

let dir: string;

beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mandor-round-trip-'));
    await writeRepoTree(dir, 'Demo');
    await createWorkspace(dir, { id: 'almacen', name: 'Almacen', kind: 'async' });
});

afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
});

/**
 * The half of the round trip that is the host's: what an import wrote, read back off the disk,
 * is the model the format then writes. The other half — that model written and read again with
 * no difference — is tested with the format that writes it.
 */
describe('the trip from what an import wrote back to the model', () => {
    it.each<FixtureName>(['ida-vuelta-3', 'ida-vuelta-2'])(
        'reads back what %s wrote, every sendable operation under its address',
        async (name) => {
            const { document: original, resources, held: expected } = readFixture(name);

            await writeImportedResources(dir, 'almacen', resources);

            const held = workspaceToIr(await workspaceDataOf(dir, 'almacen'));

            // The collection only holds the operations the client can send, and it holds them all,
            // each one under the address it travels.
            const sendable = original.operations.filter(
                (operation) => operation.direction === 'outgoing',
            );
            const addressOf = (channel: string): string =>
                original.channels.find((candidate) => candidate.name === channel)?.address ??
                channel;

            expect(held.channels.map((channel) => channel.address)).toEqual(
                sendable.map((operation) => addressOf(operation.channel)),
            );

            if (expected === undefined) {
                throw new Error(`${name} keeps what the workspace held`);
            }

            expect(irDiff(held, expected)).toEqual([]);
        },
    );
});
