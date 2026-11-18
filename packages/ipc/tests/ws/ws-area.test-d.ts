import { describe, expectTypeOf, it } from 'vitest';

import type { WsArea } from '../../src/index.js';
import type { WsOpenRequest } from '../../src/ws/ws-open.js';
import type { WsStatePush } from '../../src/ws/ws-state.js';

describe('the ws area of the bridge contract', () => {
    it('opens a socket for the request its channel validates', () => {
        expectTypeOf<WsArea['open']>().parameter(0).toEqualTypeOf<WsOpenRequest>();
    });

    it('delivers the state main pushes and hands back its own unsubscribe', () => {
        expectTypeOf<WsArea['onState']>().parameter(0).toEqualTypeOf<(push: WsStatePush) => void>();
        expectTypeOf<WsArea['onState']>().returns.toEqualTypeOf<() => void>();
    });
});
