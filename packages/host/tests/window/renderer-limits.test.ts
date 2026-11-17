import { describe, expect, it } from 'vitest';

import { RENDERER_LIMITS } from '../../src/window/renderer-limits.js';

describe('the renderer limits', () => {
    /** Main owns every socket, so a window nobody is looking at has nothing to stay awake for. */
    it('lets chromium put a hidden window to sleep', () => {
        expect(RENDERER_LIMITS.backgroundThrottling).toBe(true);
    });

    it('leaves the subsystems mandor never draws with switched off', () => {
        expect(RENDERER_LIMITS.webgl).toBe(false);
        expect(RENDERER_LIMITS.enableWebSQL).toBe(false);
    });

    /** A dictionary per language stays resident for the whole life of the process. */
    it('never loads a spellchecker', () => {
        expect(RENDERER_LIMITS.spellcheck).toBe(false);
    });
});
