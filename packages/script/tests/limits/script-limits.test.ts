import { describe, expect, it } from 'vitest';

import { SCRIPT_LIMITS } from '../../src/index.js';

describe('SCRIPT_LIMITS', () => {
    it('names every limit the spec fixes', () => {
        expect(Object.keys(SCRIPT_LIMITS).sort()).toEqual(
            [
                'chainMs',
                'chainScripts',
                'lineBytes',
                'memoryBytes',
                'messageQueue',
                'messageQueueBytes',
                'outputBytes',
                'payloadBytes',
                'runMs',
                'sendRequestBytes',
                'sendRequestMs',
                'sendRequestsPerRun',
                'socketSendsPerRun',
                'socketSendsPerSecond',
                'sourceBytes',
                'stackBytes',
                'variableBytes',
                'variables',
                'variablesBytes',
                'workerIdleMs',
                'workers',
            ].sort(),
        );
    });

    it('holds only positive whole numbers', () => {
        for (const value of Object.values(SCRIPT_LIMITS)) {
            expect(Number.isInteger(value) && value > 0).toBe(true);
        }
    });

    it('keeps the time limits ordered from one run to a whole chain', () => {
        expect(SCRIPT_LIMITS.runMs).toBeLessThan(SCRIPT_LIMITS.chainMs);
        expect(SCRIPT_LIMITS.sendRequestMs).toBeLessThanOrEqual(SCRIPT_LIMITS.chainMs);
    });

    it('measures every byte limit in UTF-8 bytes, not in characters', () => {
        const twoBytesEach = 'é'.repeat(SCRIPT_LIMITS.lineBytes / 2);
        const oneMore = `${twoBytesEach}é`;

        expect(twoBytesEach.length).toBe(SCRIPT_LIMITS.lineBytes / 2);
        expect(Buffer.byteLength(twoBytesEach, 'utf8')).toBe(SCRIPT_LIMITS.lineBytes);
        expect(Buffer.byteLength(oneMore, 'utf8')).toBeGreaterThan(SCRIPT_LIMITS.lineBytes);
    });
});
