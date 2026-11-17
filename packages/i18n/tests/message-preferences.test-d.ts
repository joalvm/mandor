import { describe, expectTypeOf, it } from 'vitest';

import type { MessagePreferences } from '../src/message-preferences.js';

describe('the message preferences', () => {
    it('hold a language that may be left unsaid', () => {
        expectTypeOf<MessagePreferences>().toEqualTypeOf<{ language?: string | undefined }>();
    });
});
