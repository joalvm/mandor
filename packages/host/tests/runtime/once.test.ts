import { describe, expect, it, vi } from 'vitest';

import { once } from '../../src/runtime/once.js';

describe('once', () => {
    it('acts on the first call and finds nothing left to do on the rest', () => {
        const act = vi.fn();
        const dispose = once(act);

        dispose();
        dispose();

        expect(act).toHaveBeenCalledOnce();
    });
});
