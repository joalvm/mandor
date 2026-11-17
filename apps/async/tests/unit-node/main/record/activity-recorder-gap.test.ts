import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WsActivityPush } from '@mandor/ipc';

import { createActivityRecorder } from '../../../../src/main/record/activity-recorder.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-record-gap-'));
});

afterEach(async () => {
    await rm(root, { force: true, recursive: true });
});

function pushOf(first: number, count: number): WsActivityPush {
    return {
        connectionId: 'echo',
        environmentId: null,
        records: Array.from({ length: count }, (_, index) => ({
            at: first + index,
            data: 'hola',
            direction: 'in',
        })),
    };
}

async function linesOf(path: string): Promise<unknown[]> {
    const text = await readFile(path, 'utf8');

    return text
        .split('\n')
        .filter((line) => line !== '')
        .map((line): unknown => JSON.parse(line));
}

/**
 * A disk slower than the socket leaves the lines waiting in memory. Past the limit of that
 * queue the recorder drops lines instead of holding them, and says in the file how many it
 * dropped and between which moments, so a reader never takes the file for the whole session.
 */
describe('the recorder of a connection, when the disk falls behind', () => {
    it('drops the lines past the limit and writes how many it dropped', async () => {
        const recorder = createActivityRecorder({ onState: vi.fn(), queueLimit: 1 });
        const path = join(root, 'echo.jsonl');

        await recorder.start('echo', path);
        recorder.write(pushOf(0, 5));
        const stopped = await recorder.stop('echo');

        expect(await linesOf(path)).toEqual([
            { at: 0, data: 'hola', direction: 'in' },
            { dropped: 4, from: 1, to: 4 },
        ]);
        expect(stopped).toEqual({ entries: 1, path });
    });

    it('goes on writing once the disk catches up', async () => {
        const recorder = createActivityRecorder({ onState: vi.fn(), queueLimit: 1 });
        const path = join(root, 'echo.jsonl');

        await recorder.start('echo', path);
        recorder.write(pushOf(0, 3));
        await vi.waitFor(async () => {
            expect((await stat(path)).size).toBeGreaterThan(0);
        });
        recorder.write(pushOf(10, 1));
        await recorder.stop('echo');

        expect(await linesOf(path)).toEqual([
            { at: 0, data: 'hola', direction: 'in' },
            { dropped: 2, from: 1, to: 2 },
            { at: 10, data: 'hola', direction: 'in' },
        ]);
    });
});
