import { appendFile, rename, stat } from 'node:fs/promises';

import { redact } from '@mandor/vars';

import { sessionSecrets } from '../secret/session-secrets.js';
import { LOG_LEVELS, type LogLevel } from './log-level.js';

const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;

export type LoggerOptions = {
    file: string;
    level: LogLevel;
    maxBytes?: number;
};

export type Logger = {
    log: (level: LogLevel, message: string) => void;
    /** Settles once everything logged so far is on disk. */
    flush: () => Promise<void>;
};

/**
 * The log of the host: one file, one generation of history, and a ceiling. A log that only
 * grows is the same leak as a buffer that only grows, on disk instead of in memory.
 *
 * `log` hands nothing back on purpose. A caller that had to await it would either slow the path
 * it is describing or leave a floating promise behind, and neither is worth a line of text.
 */
export function createLogger(options: LoggerOptions): Logger {
    const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
    let written: Promise<void> = Promise.resolve();

    return {
        log: (level, message) => {
            if (LOG_LEVELS.indexOf(level) > LOG_LEVELS.indexOf(options.level)) {
                return;
            }

            // Chained so the lines land in the order they were logged, and swallowed so a disk
            // that refuses one line does not take the process down with it.
            written = written
                .then(() => append(options.file, maxBytes, line(level, message)))
                .catch(() => undefined);
        },
        flush: () => written,
    };
}

/** Redacted here, at the last step before the text becomes a line of a file anyone reads. */
function line(level: LogLevel, message: string): string {
    return `${new Date().toISOString()} ${level} ${redact(message, sessionSecrets())}\n`;
}

async function append(file: string, maxBytes: number, text: string): Promise<void> {
    await rotate(file, maxBytes);
    await appendFile(file, text, 'utf8');
}

/**
 * Keeps exactly one rotated file. The previous one is replaced rather than numbered, so the
 * whole log has a hard ceiling of two files instead of a directory that grows with uptime.
 */
async function rotate(file: string, maxBytes: number): Promise<void> {
    const info = await stat(file).catch(() => null);

    if (info === null || info.size < maxBytes) {
        return;
    }

    await rename(file, `${file}.1`);
}
