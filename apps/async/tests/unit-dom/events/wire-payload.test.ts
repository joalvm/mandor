import { describe, expect, it } from 'vitest';

import { wirePayload } from '../../../src/renderer/events/wire-payload.js';

/** How a JSONC text is cleaned is the business of `wireJson`; here, only which payloads get it. */
describe('the wire payload', () => {
    it('sends a json payload as the JSON its comments and trailing commas meant', () => {
        const draft = '{\n  "event": "DeviceLogin",\n  // "data": {}\n}';

        expect(JSON.parse(wirePayload(draft, 'json'))).toEqual({ event: 'DeviceLogin' });
    });

    it('leaves a text payload exactly as it reads', () => {
        const draft = '{ // esto no es json\n';

        expect(wirePayload(draft, 'text')).toBe(draft);
    });

    it('leaves a binary payload exactly as it reads', () => {
        const draft = '{ // esto no es json\n';

        expect(wirePayload(draft, 'binary')).toBe(draft);
    });
});
