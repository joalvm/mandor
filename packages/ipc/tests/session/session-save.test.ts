import { describe, expect, it } from 'vitest';

import { sessionSaveRequestSchema } from '../../src/session/session-save.js';
import { EMPTY_UI_SESSION } from '../../src/session/ui-session.js';

describe('sessionSaveRequestSchema', () => {
    it('carries the session and nothing else', () => {
        const request = { session: EMPTY_UI_SESSION };

        expect(sessionSaveRequestSchema.parse(request)).toEqual(request);
    });

    it('refuses a request that names where to write: main owns that', () => {
        const request = { session: EMPTY_UI_SESSION, root: '/somewhere' };

        expect(sessionSaveRequestSchema.safeParse(request).success).toBe(false);
    });

    it('refuses a session that breaks the layout rules', () => {
        const session = { ...EMPTY_UI_SESSION, activeGroupId: 'elsewhere' };

        expect(sessionSaveRequestSchema.safeParse({ session }).success).toBe(false);
    });

    it('refuses a request with no session', () => {
        expect(sessionSaveRequestSchema.safeParse({}).success).toBe(false);
    });
});
