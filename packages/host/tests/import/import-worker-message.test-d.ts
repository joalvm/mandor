import type { InteropRead } from '@mandor/interop-core';
import { describe, expectTypeOf, it } from 'vitest';

import type { ImportReadReply, ImportReadRequest } from '../../src/import/import-worker-message.js';

describe('the messages between main and the import worker', () => {
    it('asks for a format by its id, never for the format itself', () => {
        expectTypeOf<ImportReadRequest['formatId']>().toEqualTypeOf<string>();
    });

    it('answers a read, a refusal or a failure, and nothing else', () => {
        expectTypeOf<ImportReadReply['kind']>().toEqualTypeOf<'read' | 'refused' | 'failed'>();
    });

    it('carries an error across threads as plain data', () => {
        expectTypeOf<
            Extract<ImportReadReply, { kind: 'read' }>['read']
        >().toEqualTypeOf<InteropRead>();
        expectTypeOf<Extract<ImportReadReply, { kind: 'refused' }>['problems']>().toEqualTypeOf<
            string[]
        >();
        expectTypeOf<
            Extract<ImportReadReply, { kind: 'failed' }>['message']
        >().toEqualTypeOf<string>();
    });
});
