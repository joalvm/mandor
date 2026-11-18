import { createI18n } from '@mandor/i18n';
import type { AuthTokenStatus } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { tokenStateText } from '../src/lib/token-state-text.js';

const messages = createI18n('en').getFixedT('en', 'auth');

describe('what the row of the token says', () => {
    it('says there is none, or that it ran out, without a time', () => {
        expect(tokenStateText({ expiresAt: null, state: 'none' }, messages, 'en')).toBe(
            'No token yet',
        );
        expect(tokenStateText({ expiresAt: null, state: 'expired' }, messages, 'en')).toBe(
            'Expired',
        );
    });

    it('says until when a held token is good: the hour today, the day too after', () => {
        const tonight = new Date();
        const later = new Date(tonight.getTime() + 36 * 60 * 60 * 1000);

        tonight.setHours(23, 59, 0, 0);

        const hour = tonight.toLocaleString('en', { timeStyle: 'short' });
        const day = later.toLocaleString('en', { dateStyle: 'short', timeStyle: 'short' });

        expect(
            tokenStateText({ expiresAt: tonight.toISOString(), state: 'valid' }, messages, 'en'),
        ).toBe(`Valid until ${hour}`);
        expect(
            tokenStateText(
                { expiresAt: later.toISOString(), state: 'memory-only' },
                messages,
                'en',
            ),
        ).toContain(`valid until ${day}`);
    });

    it('writes the time in the language the window speaks, not in the one of the system', () => {
        const later = new Date(Date.now() + 36 * 60 * 60 * 1000);
        const spanish = later.toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
        const status: AuthTokenStatus = { expiresAt: later.toISOString(), state: 'valid' };

        expect(tokenStateText(status, messages, 'es')).toBe(`Valid until ${spanish}`);
    });
});
