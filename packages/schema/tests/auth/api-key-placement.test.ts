import { describe, expect, it } from 'vitest';

import { API_KEY_PLACEMENTS } from '../../src/auth/api-key-placement.js';

describe('API_KEY_PLACEMENTS', () => {
    it('lists the four places a key may travel, and nothing else', () => {
        expect(API_KEY_PLACEMENTS).toEqual(['header', 'query', 'cookie', 'subprotocol']);
    });
});
