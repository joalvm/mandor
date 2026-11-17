import { describe, expect, it } from 'vitest';

import { E2E_CONFIG } from '../../workspace/e2e-config.mjs';

describe('the end-to-end run every app shares (E2E_CONFIG)', () => {
    it('runs the tests of tests/e2e one at a time, because each one launches the app', () => {
        expect(E2E_CONFIG.testDir).toBe('tests/e2e');
        expect(E2E_CONFIG.workers).toBe(1);
        expect(E2E_CONFIG.fullyParallel).toBe(false);
    });

    it('gives a whole flow more room than one assertion', () => {
        expect(E2E_CONFIG.timeout).toBeGreaterThan(E2E_CONFIG.expect.timeout);
    });

    it('spends at most one retry and three failures, and only where a runner bills by the minute', () => {
        expect(E2E_CONFIG.retries).toBe(process.env['CI'] === undefined ? 0 : 1);
        expect(E2E_CONFIG.maxFailures).toBe(process.env['CI'] === undefined ? 0 : 3);
    });
});
