import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { REDACTED } from '@mandor/vars';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createLogger } from '../../src/log/create-logger.js';
import { forgetSessionSecrets, rememberSessionSecrets } from '../../src/secret/session-secrets.js';

let dir = '';
let file = '';

beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mandor-log-'));
    file = join(dir, 'mandor.log');
});

afterEach(async () => {
    forgetSessionSecrets();
    await rm(dir, { recursive: true, force: true });
});

describe('the log of the host', () => {
    it('writes a line with its level and its message', async () => {
        const logger = createLogger({ file, level: 'info' });

        logger.log('warn', 'the window closed with a socket open');
        await logger.flush();

        expect(await readFile(file, 'utf8')).toContain('warn the window closed with a socket open');
    });

    it('keeps the lines in the order they were logged', async () => {
        const logger = createLogger({ file, level: 'info' });

        logger.log('info', 'first');
        logger.log('info', 'second');
        logger.log('info', 'third');
        await logger.flush();

        const written = await readFile(file, 'utf8');

        expect(written.trim().split('\n').map(lastWord)).toEqual(['first', 'second', 'third']);
    });

    /** Below the level asked for, a line is not written at all: a log nobody reads still grows. */
    it('drops a line under the level it was given', async () => {
        const logger = createLogger({ file, level: 'warn' });

        logger.log('debug', 'noise');
        logger.log('error', 'signal');
        await logger.flush();

        const written = await readFile(file, 'utf8');

        expect(written).toContain('signal');
        expect(written).not.toContain('noise');
    });

    /**
     * A log that only grows is the same leak as a buffer that only grows, on disk instead of in
     * memory. One rotation keeps the recent past and gives the ceiling a hard number.
     */
    it('rotates once the file passes its ceiling and keeps the previous one', async () => {
        await writeFile(file, 'x'.repeat(200), 'utf8');

        const logger = createLogger({ file, level: 'info', maxBytes: 128 });

        logger.log('info', 'after the ceiling');
        await logger.flush();

        expect(await readFile(`${file}.1`, 'utf8')).toBe('x'.repeat(200));
        expect(await readFile(file, 'utf8')).toContain('after the ceiling');
    });

    it('never keeps more than one rotated file', async () => {
        const logger = createLogger({ file, level: 'info', maxBytes: 32 });

        for (const message of ['one', 'two', 'three']) {
            logger.log('info', message);
        }

        await logger.flush();

        expect((await stat(`${file}.1`)).isFile()).toBe(true);
        await expect(stat(`${file}.2`)).rejects.toThrow();
    });

    /** A log is the first thing anyone pastes into a ticket. It leaves with nothing in it. */
    it('hides a secret value before the line reaches the file', async () => {
        const logger = createLogger({ file, level: 'info' });

        rememberSessionSecrets(['tok_abcdefgh']);
        logger.log('info', 'opened wss://example.test/?key=tok_abcdefgh');
        await logger.flush();

        const written = await readFile(file, 'utf8');

        expect(written).toContain(`opened wss://example.test/?key=${REDACTED}`);
        expect(written).not.toContain('tok_abcdefgh');
    });
});

function lastWord(line: string): string {
    return line.slice(line.lastIndexOf(' ') + 1);
}
