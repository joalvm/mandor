import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WsActivityPush } from '@mandor/ipc';

import { createActivityRecorder } from '../../../../src/main/record/activity-recorder.js';
import { RecordingActiveError } from '../../../../src/main/record/recording-active-error.js';
import { rememberSessionSecrets } from '@mandor/host';
import { forgetSecrets } from '@mandor/host/testing';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-record-'));
});

afterEach(async () => {
    forgetSecrets();
    await rm(root, { force: true, recursive: true });
});

function pushOf(connectionId: string, count: number, data = 'hola'): WsActivityPush {
    return {
        connectionId,
        environmentId: null,
        records: Array.from({ length: count }, (_, index) => ({
            at: index,
            data,
            direction: 'in',
        })),
    };
}

function pathOf(name: string): string {
    return join(root, name);
}

describe('the recorder of a connection', () => {
    it('writes one line per record while it runs, each one redacted', async () => {
        rememberSessionSecrets(['tok_abcdefgh']);
        const recorder = createActivityRecorder({ onState: vi.fn() });
        const path = pathOf('echo.jsonl');

        await recorder.start('echo', path);
        recorder.write(pushOf('echo', 1, '{"token":"tok_abcdefgh"}'));
        recorder.write(pushOf('echo', 1, 'nothing to hide'));
        const stopped = await recorder.stop('echo');

        const text = await readFile(path, 'utf8');
        const lines = text.split('\n').filter((line) => line !== '');

        expect(lines).toHaveLength(2);
        expect(lines[0]).toContain('[redacted]');
        expect(lines[0]).not.toContain('tok_abcdefgh');
        expect(text).toContain('nothing to hide');
        expect(stopped).toEqual({ entries: 2, path });
    });

    /**
     * The entry criterion of the plan: a session that outgrows the buffer of the timeline still
     * lands whole on disk. The renderer keeps 500 entries at most; the file keeps them all.
     */
    it('keeps more entries than the timeline buffer ever holds', async () => {
        const recorder = createActivityRecorder({ onState: vi.fn() });
        const path = pathOf('busy.jsonl');
        const BUFFER_LIMIT = 500;

        await recorder.start('busy', path);

        for (let round = 0; round < 12; round += 1) {
            recorder.write(pushOf('busy', 60));
        }

        await recorder.stop('busy');

        const text = await readFile(path, 'utf8');
        const lines = text.split('\n').filter((line) => line !== '');

        expect(lines).toHaveLength(12 * 60);
        expect(lines.length).toBeGreaterThan(BUFFER_LIMIT);
    });

    it('answers whether it writes and how much the file holds', async () => {
        const recorder = createActivityRecorder({ onState: vi.fn() });

        expect(recorder.status('echo')).toEqual({ active: false, entries: 0 });

        await recorder.start('echo', pathOf('echo.jsonl'));
        recorder.write(pushOf('echo', 3));

        expect(recorder.status('echo')).toEqual({ active: true, entries: 3 });
    });

    it('refuses to write one connection into two files at once', async () => {
        const recorder = createActivityRecorder({ onState: vi.fn() });

        await recorder.start('echo', pathOf('one.jsonl'));

        await expect(recorder.start('echo', pathOf('two.jsonl'))).rejects.toBeInstanceOf(
            RecordingActiveError,
        );
    });

    it('refuses a second file asked for while the first one is still opening', async () => {
        const recorder = createActivityRecorder({ onState: vi.fn() });
        const first = recorder.start('echo', pathOf('one.jsonl'));

        await expect(recorder.start('echo', pathOf('two.jsonl'))).rejects.toThrow(
            'already recording',
        );
        await first;
        recorder.write(pushOf('echo', 1));
        await recorder.stop('echo');

        expect(existsSync(pathOf('two.jsonl'))).toBe(false);
        expect(await readFile(pathOf('one.jsonl'), 'utf8')).toContain('hola');
    });

    it('keeps the recordings of two connections apart', async () => {
        const recorder = createActivityRecorder({ onState: vi.fn() });

        await recorder.start('one', pathOf('one.jsonl'));
        await recorder.start('two', pathOf('two.jsonl'));
        recorder.write(pushOf('one', 2));
        recorder.write(pushOf('two', 5));

        const first = await recorder.stop('one');
        const second = await recorder.stop('two');

        expect(first?.entries).toBe(2);
        expect(second?.entries).toBe(5);
    });

    /** Closing the app with a recording active closes it well: whole file, never a corrupt one. */
    it('closes every recording whole when the app goes away', async () => {
        const recorder = createActivityRecorder({ onState: vi.fn() });
        const path = pathOf('echo.jsonl');

        await recorder.start('echo', path);
        recorder.write(pushOf('echo', 4));
        await recorder.disposeAll();

        const text = await readFile(path, 'utf8');
        const lines = text.split('\n').filter((line) => line !== '');

        expect(lines).toHaveLength(4);
        expect(recorder.status('echo')).toEqual({ active: false, entries: 0 });
        expect(await recorder.stop('echo')).toBeUndefined();
    });

    it('says its state as it moves, for the bar of the connection', async () => {
        const onState = vi.fn();
        const recorder = createActivityRecorder({ onState });

        await recorder.start('echo', pathOf('echo.jsonl'));
        recorder.write(pushOf('echo', 2));
        await recorder.stop('echo');

        expect(onState).toHaveBeenCalledWith({
            active: true,
            connectionId: 'echo',
            entries: 0,
        });
        expect(onState).toHaveBeenCalledWith({
            active: true,
            connectionId: 'echo',
            entries: 2,
        });
        expect(onState).toHaveBeenLastCalledWith({
            active: false,
            connectionId: 'echo',
            entries: 2,
        });
    });

    /** A disk that fills up mid-recording ends it where the bar can see, instead of counting on. */
    // skip-policy: /dev/full, the file every write to fails, exists on Linux only.
    it.skipIf(!existsSync('/dev/full'))(
        'stops a recording whose file can no longer be written',
        async () => {
            const onState = vi.fn();
            const recorder = createActivityRecorder({ onState });

            await recorder.start('echo', '/dev/full');
            recorder.write(pushOf('echo', 1));

            await vi.waitFor(() => {
                expect(recorder.status('echo')).toEqual({ active: false, entries: 0 });
            });
            expect(onState).toHaveBeenLastCalledWith({
                active: false,
                connectionId: 'echo',
                entries: 1,
            });
        },
    );

    it('refuses a file the system would not open, and starts nothing', async () => {
        const recorder = createActivityRecorder({ onState: vi.fn() });

        await expect(
            recorder.start('echo', join(root, 'missing-dir', 'echo.jsonl')),
        ).rejects.toThrow();
        expect(recorder.status('echo')).toEqual({ active: false, entries: 0 });
        expect(existsSync(pathOf('echo.jsonl'))).toBe(false);
    });
});
