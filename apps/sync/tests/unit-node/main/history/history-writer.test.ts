import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { forgetSecrets } from '@mandor/host/testing';
import { REDACTED } from '@mandor/vars';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { historyEntryOf } from '../../../../src/main/history/history-entry-of.js';
import { recordHistory } from '../../../../src/main/history/history-writer.js';
import { rememberSessionSecrets } from '@mandor/host';
import { idOf, sendOf } from './history-fixture.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-history-writer-'));
});

afterEach(async () => {
    forgetSecrets();
    await rm(root, { recursive: true, force: true });
});

describe('writing the history of a send', () => {
    it('writes one file per send, named by its time and its id', async () => {
        await recordHistory(root, await historyEntryOf(root, sendOf(root, 1)));
        await recordHistory(root, await historyEntryOf(root, sendOf(root, 2)));

        const names = await readdir(join(root, '.mandor', 'history', 'pagos'));

        expect(names.sort()).toEqual([
            `20260901T000001000Z-${idOf(1)}.json`,
            `20260901T000002000Z-${idOf(2)}.json`,
        ]);
    });

    /** A secret was resolved into the request, so it is in the entry: the file must not have it. */
    it('hides a secret of the session before the entry reaches the disk', async () => {
        rememberSessionSecrets(['tok_disk_secret_value']);

        const entry = await historyEntryOf(
            root,
            sendOf(root, 1, { headers: [['Authorization', 'Bearer tok_disk_secret_value']] }),
        );

        await recordHistory(root, entry);

        const [name] = await readdir(join(root, '.mandor', 'history', 'pagos'));
        const text = await readFile(join(root, '.mandor', 'history', 'pagos', name ?? ''), 'utf8');

        expect(text).toContain(`Bearer ${REDACTED}`);
        expect(text).not.toContain('tok_disk_secret_value');
    });
});
