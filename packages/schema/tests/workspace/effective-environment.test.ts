import { describe, expect, it } from 'vitest';

import { effectiveEnvironment } from '../../src/workspace/effective-environment.js';

describe('effectiveEnvironment', () => {
    it('takes the one chosen, then the default of the workspace, then none', () => {
        expect(effectiveEnvironment('prod', { defaultEnvironment: 'base' })).toBe('prod');
        expect(effectiveEnvironment(null, { defaultEnvironment: 'base' })).toBe('base');
        expect(effectiveEnvironment(null, {})).toBeNull();
        expect(effectiveEnvironment(null, null)).toBeNull();
    });
});
