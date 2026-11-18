import { describe, expect, it } from 'vitest';

describe('the worker every script of the app runs in', () => {
    it('does nothing when main loads it, since it has no parent to answer', async () => {
        await expect(import('../../../src/main/script-worker.js')).resolves.toBeDefined();
    });
});
