import { describe, expectTypeOf, it } from 'vitest';

import type { CoreBridge } from '../../src/index.js';

describe('the core of the bridge contract', () => {
    it('answers what the host serves to every app, and no area only Async has', () => {
        expectTypeOf<CoreBridge>().not.toHaveProperty('ws');
        expectTypeOf<CoreBridge>().not.toHaveProperty('record');
        expectTypeOf<CoreBridge>().not.toHaveProperty('connection');
    });

    it('exports documents, and leaves the lines of what a window was looking at to its app', () => {
        expectTypeOf<keyof CoreBridge['export']>().toEqualTypeOf<'outline' | 'write'>();
    });
});
