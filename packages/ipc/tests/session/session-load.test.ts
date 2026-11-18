import { describe, expect, it } from 'vitest';

import { EMPTY_UI_SESSION } from '../../src/session/ui-session.js';
import {
    sessionLoadRequestSchema,
    sessionLoadResultSchema,
} from '../../src/session/session-load.js';

describe('sessionLoadRequestSchema', () => {
    it('carries nothing: main reads the session of the active origin', () => {
        expect(sessionLoadRequestSchema.parse({})).toEqual({});
    });

    it('refuses anything the renderer adds to it', () => {
        expect(sessionLoadRequestSchema.safeParse({ origin: 'local' }).success).toBe(false);
    });
});

describe('sessionLoadResultSchema', () => {
    it('answers with the session as it was left', () => {
        const answer = { ok: true, value: EMPTY_UI_SESSION };

        expect(sessionLoadResultSchema.parse(answer)).toEqual(answer);
    });

    it('refuses a session that breaks the layout rules', () => {
        const session = { ...EMPTY_UI_SESSION, activeGroupId: 'elsewhere' };

        expect(sessionLoadResultSchema.safeParse({ ok: true, value: session }).success).toBe(false);
    });

    it('answers a failure with a code', () => {
        const failure = { ok: false, error: { code: 'fs-read', message: 'gone' } };

        expect(sessionLoadResultSchema.parse(failure)).toEqual(failure);
    });
});
