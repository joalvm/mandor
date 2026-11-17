import type { ActivityRecord } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { eventNameOf, recordNameOf } from '../../../src/renderer/activity/lib/event-name.js';

describe('the name a frame carries', () => {
    it('reads the event field of a json object', () => {
        expect(eventNameOf('{"event":"DeviceLogin","data":{}}')).toBe('DeviceLogin');
    });

    it('answers nothing for a frame that names no event', () => {
        expect(eventNameOf('{"data":{}}')).toBeNull();
        expect(eventNameOf('{"event":42}')).toBeNull();
        expect(eventNameOf('{"event":""}')).toBeNull();
        expect(eventNameOf('hola')).toBeNull();
        expect(eventNameOf('[1,2]')).toBeNull();
        expect(eventNameOf('{"event":"x')).toBeNull();
        expect(eventNameOf('')).toBeNull();
    });

    it('refuses to parse a frame past the size a row name is worth', () => {
        const big = `{"event":"x","pad":"${'a'.repeat(80 * 1024)}"}`;

        expect(eventNameOf(big)).toBeNull();
    });

    it('names a row by the item that sent the frame, else by what the payload says', () => {
        const frame: ActivityRecord = { at: 1, data: '{"event":"DeviceLogin"}', direction: 'in' };

        expect(recordNameOf({ ...frame, origin: 'Login' })).toBe('Login');
        expect(recordNameOf(frame)).toBe('DeviceLogin');
        expect(recordNameOf({ ...frame, binary: true })).toBeNull();
    });
});
