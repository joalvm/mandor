import { describe, expectTypeOf, it } from 'vitest';

import type { Connection } from '@mandor/schema';

import type { ConnectionArea, Result } from '../../src/index.js';
import type { ConnectionCreateRequest } from '../../src/connection/connection-create.js';

describe('the connection area of the bridge contract', () => {
    it('creates from the request its channel validates and answers the connection', () => {
        expectTypeOf<ConnectionArea['create']>()
            .parameter(0)
            .toEqualTypeOf<ConnectionCreateRequest>();
        expectTypeOf<ConnectionArea['create']>().returns.resolves.toEqualTypeOf<
            Result<Connection>
        >();
    });

    it('lists, updates and deletes, and nothing else', () => {
        expectTypeOf<keyof ConnectionArea>().toEqualTypeOf<
            'create' | 'list' | 'update' | 'delete'
        >();
    });
});
