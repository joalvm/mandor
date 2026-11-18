import { describe, expect, it } from 'vitest';

import {
    LOG_MESSAGE_MAX,
    LOG_SOURCES,
    LOG_STACK_MAX,
    logWriteRequestSchema,
} from '../../src/log/log-write.js';
import { createFakeBridge } from '../../src/testing/fake-bridge.js';

const LINE = { level: 'error', source: 'react-uncaught', message: 'boom' } as const;

describe('a line the window asks main to write', () => {
    it('carries a level, where it came from, a message and optionally a stack', () => {
        const withStack = { ...LINE, stack: 'Error: boom\n    at render' };

        expect(logWriteRequestSchema.parse(LINE)).toEqual(LINE);
        expect(logWriteRequestSchema.parse(withStack)).toEqual(withStack);
    });

    it.each(LOG_SOURCES)('accepts %s as a source', (source) => {
        expect(logWriteRequestSchema.safeParse({ ...LINE, source }).success).toBe(true);
    });

    it('refuses a level or a source it does not know, and anything else it was handed', () => {
        expect(logWriteRequestSchema.safeParse({ ...LINE, level: 'info' }).success).toBe(false);
        expect(logWriteRequestSchema.safeParse({ ...LINE, source: 'somewhere' }).success).toBe(
            false,
        );
        expect(logWriteRequestSchema.safeParse({ ...LINE, path: '/etc' }).success).toBe(false);
    });

    it('refuses a message or a stack longer than its ceiling, and takes one of exactly that', () => {
        const long = (size: number) => 'x'.repeat(size);

        expect(
            logWriteRequestSchema.safeParse({ ...LINE, message: long(LOG_MESSAGE_MAX) }).success,
        ).toBe(true);
        expect(
            logWriteRequestSchema.safeParse({ ...LINE, message: long(LOG_MESSAGE_MAX + 1) })
                .success,
        ).toBe(false);
        expect(
            logWriteRequestSchema.safeParse({ ...LINE, stack: long(LOG_STACK_MAX) }).success,
        ).toBe(true);
        expect(
            logWriteRequestSchema.safeParse({ ...LINE, stack: long(LOG_STACK_MAX + 1) }).success,
        ).toBe(false);
    });
});

describe('the log area of the bridge', () => {
    it('takes every line in the double, and answers that it did', async () => {
        const bridge = createFakeBridge();

        await expect(bridge.log.write(LINE)).resolves.toEqual({ ok: true, value: {} });
    });
});
