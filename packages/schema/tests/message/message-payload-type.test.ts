import { describe, expect, it } from 'vitest';

import { MESSAGE_PAYLOAD_TYPES, parseMessagePayloadType } from '../../src/index.js';

describe('the payload type of a message', () => {
    it('answers with the type when the value is one of them', () => {
        for (const type of MESSAGE_PAYLOAD_TYPES) {
            expect(parseMessagePayloadType(type)).toBe(type);
        }
    });

    /** An interface offers the three and nothing else; anything else is a file, and JSON reads it. */
    it('falls back to json for anything else', () => {
        expect(parseMessagePayloadType('protobuf')).toBe('json');
    });
});
