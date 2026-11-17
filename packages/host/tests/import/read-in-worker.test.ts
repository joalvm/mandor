import { fileURLToPath } from 'node:url';

import { FormatInputError, type InteropFormat } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { ImportCancelledError } from '../../src/import/import-cancelled-error.js';
import { WORKER_LIMITS, readerInWorker } from '../../src/import/read-in-worker.js';
import { fixtureFormat } from '../interop/fixture-format.js';

const SCRIPT = fileURLToPath(new URL('./fixtures/scripted-worker.mjs', import.meta.url));

/** Short enough for a test to wait it out; long enough for a worker to start and answer. */
const read = readerInWorker(SCRIPT, { timeMs: 2_000, memoryMb: 32 });

function scripted(id: string): InteropFormat {
    return { ...fixtureFormat, id };
}

describe('reading an import in a worker of its own', () => {
    it('gives what the worker read', async () => {
        await expect(read(scripted('answers'), [], 'workspace')).resolves.toEqual({
            name: 'workspace',
            resources: [],
        });
    });

    it('keeps the refusal of a format a refusal, with every problem it found', async () => {
        const refusal = read(scripted('refuses'), [], 'workspace');

        await expect(refusal).rejects.toBeInstanceOf(FormatInputError);
        await expect(refusal).rejects.toMatchObject({ problems: ['not a document', 'no version'] });
    });

    it('fails as the app when the read broke for another reason', async () => {
        const failure = read(scripted('fails'), [], 'workspace');

        await expect(failure).rejects.not.toBeInstanceOf(FormatInputError);
        await expect(failure).rejects.toThrow('the parser broke');
    });

    /** A `pattern` that backtracks without end or references that multiply hang the parser. */
    it('refuses a document whose read never ends, once the clock runs out', async () => {
        await expect(read(scripted('hangs'), [], 'workspace')).rejects.toMatchObject({
            problems: ['the document took longer than 2 s to read'],
        });
    });

    /**
     * The clock is out of the way here, so only the ceiling of memory can end the read. Near the
     * ceiling V8 collects again and again before it gives up: on Linux that takes seconds.
     */
    it('refuses a document whose read swells past the memory an import may take', async () => {
        const swollen = readerInWorker(SCRIPT, { timeMs: 120_000, memoryMb: 32 });

        await expect(swollen(scripted('swells'), [], 'workspace')).rejects.toMatchObject({
            problems: ['the document needs more memory than an import may take'],
        });
    }, 120_000);

    it('ends the read the moment the person stops it, without waiting for the clock', async () => {
        const stop = new AbortController();
        const reading = readerInWorker(SCRIPT, { timeMs: 120_000, memoryMb: 32 })(
            scripted('hangs'),
            [],
            'workspace',
            stop.signal,
        );

        stop.abort();

        await expect(reading).rejects.toBeInstanceOf(ImportCancelledError);
    });

    it('fails when the worker stops before it answers', async () => {
        await expect(read(scripted('quits'), [], 'workspace')).rejects.toThrow(
            'the import worker stopped before it answered',
        );
    });

    it('gives a real document a minute and a gigabyte by default', () => {
        expect(WORKER_LIMITS).toEqual({ timeMs: 60_000, memoryMb: 1024 });
    });
});
