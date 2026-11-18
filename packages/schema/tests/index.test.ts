import { describe, expect, it } from 'vitest';

import * as schema from '../src/index.js';

describe('@mandor/schema', () => {
    it('exposes a public API through a single barrel', () => {
        expect(schema).toBeTypeOf('object');
    });
});
