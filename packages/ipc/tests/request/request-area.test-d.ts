import { describe, expectTypeOf, it } from 'vitest';

import type { RequestArea } from '../../src/index.js';
import type { RequestBodyReadRequest } from '../../src/request/request-body-read.js';
import type { RequestSendRequest } from '../../src/request/request-send.js';

describe('the request area of the bridge contract', () => {
    it('sends the request its channel validates', () => {
        expectTypeOf<RequestArea['send']>().parameter(0).toEqualTypeOf<RequestSendRequest>();
    });

    it('reads the body by the window its channel validates', () => {
        expectTypeOf<RequestArea['readBody']>()
            .parameter(0)
            .toEqualTypeOf<RequestBodyReadRequest>();
    });
});
