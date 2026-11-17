import { describe, expect, it } from 'vitest';

import {
    UPDATE_CHANNEL_NAMES,
    UPDATE_MODES,
    updateConfigureRequestSchema,
} from '../../src/update/update-configure.js';

describe('the configuration of the updates', () => {
    it('names the modes and the channels the settings offer', () => {
        expect(UPDATE_MODES).toEqual(['auto', 'notify', 'manual']);
        expect(UPDATE_CHANNEL_NAMES).toEqual(['stable', 'beta']);
    });

    it('takes a mode and a channel and nothing else', () => {
        expect(
            updateConfigureRequestSchema.safeParse({ mode: 'notify', channel: 'beta' }).success,
        ).toBe(true);
        expect(updateConfigureRequestSchema.safeParse({ mode: 'notify' }).success).toBe(false);
        expect(
            updateConfigureRequestSchema.safeParse({ mode: 'always', channel: 'beta' }).success,
        ).toBe(false);
        expect(
            updateConfigureRequestSchema.safeParse({ mode: 'auto', channel: 'stable', url: 'x' })
                .success,
        ).toBe(false);
    });
});
