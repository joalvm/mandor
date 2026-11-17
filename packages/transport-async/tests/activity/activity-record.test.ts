import { describe, expect, it } from 'vitest';

import { recordOf } from '../../src/activity/activity-record.js';

describe('the record of a frame', () => {
    it('carries a text frame as it came', () => {
        expect(recordOf('in', 'hola', undefined, 'greet')).toMatchObject({
            data: 'hola',
            direction: 'in',
            event: 'greet',
        });
    });

    /** Bytes are read where they lie: a view into a larger buffer carries only its own bytes. */
    it('encodes only the bytes of a view, never the buffer around it', () => {
        const around = Uint8Array.of(9, 1, 2, 3, 9);

        const record = recordOf('in', around.subarray(1, 4), undefined, undefined);

        expect(record).toMatchObject({ binary: true, data: Buffer.of(1, 2, 3).toString('base64') });
    });
});
