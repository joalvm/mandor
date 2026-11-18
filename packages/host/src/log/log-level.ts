/**
 * The levels, from the one that always matters to the one only a developer asks for. The order
 * is the meaning: a logger keeps everything up to the level it was given.
 */
export const LOG_LEVELS = ['error', 'warn', 'info', 'debug'] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

const DEFAULT: LogLevel = 'info';

/**
 * Reads the level out of an environment variable. A variable set by hand arrives with whatever
 * case and spacing a person typed, and a typo in it is not worth a process that refuses to
 * start: anything unrecognised falls back to the level a normal run wants.
 */
export function logLevelOf(value: string | undefined): LogLevel {
    const asked = (value ?? '').trim().toLowerCase();

    return LOG_LEVELS.find((level) => level === asked) ?? DEFAULT;
}
