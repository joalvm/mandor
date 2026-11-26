import { describe, expect, it } from 'vitest';

import { cookiesListRequestSchema, cookiesListResultSchema } from '../../src/index.js';
import { cookieRowSchema } from '../../src/cookies/cookies-list.js';

const row = {
    line: 'sid=abc; Path=/; Expires=Thu, 01 Oct 2026 14:32:00 GMT; Secure; HttpOnly; SameSite=Lax',
    domain: 'api.example.com',
    path: '/',
    name: 'sid',
    value: 'abc',
    expires: '2026-10-01T14:32:00.000Z',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
};

describe('the request of cookies:list', () => {
    it('asks for the jar of an environment', () => {
        const input = { workspaceId: 'payments', environmentId: 'staging' };

        expect(cookiesListRequestSchema.parse(input)).toEqual(input);
    });

    it('asks for the jar of the workspace without environment', () => {
        const input = { workspaceId: 'payments', environmentId: null };

        expect(cookiesListRequestSchema.parse(input)).toEqual(input);
    });

    it('refuses an environment that could climb out of the folder', () => {
        expect(
            cookiesListRequestSchema.safeParse({ workspaceId: 'payments', environmentId: '../x' })
                .success,
        ).toBe(false);
    });

    it('does not take a request that forgets the environment', () => {
        expect(cookiesListRequestSchema.safeParse({ workspaceId: 'payments' }).success).toBe(false);
    });
});

describe('a cookie row', () => {
    it('takes a cookie with an end and one of the session', () => {
        expect(cookieRowSchema.parse(row)).toEqual(row);
        expect(cookieRowSchema.parse({ ...row, expires: null, sameSite: null })).toMatchObject({
            expires: null,
        });
    });

    it('refuses a same-site value that is not one', () => {
        expect(cookieRowSchema.safeParse({ ...row, sameSite: 'sometimes' }).success).toBe(false);
    });

    it('refuses a field it does not know', () => {
        expect(cookieRowSchema.safeParse({ ...row, hostOnly: true }).success).toBe(false);
    });
});

describe('the answer of cookies:list', () => {
    it('answers the rows', () => {
        expect(cookiesListResultSchema.parse({ ok: true, value: { cookies: [row] } })).toEqual({
            ok: true,
            value: { cookies: [row] },
        });
    });

    it('answers a refusal with its code', () => {
        expect(
            cookiesListResultSchema.safeParse({
                ok: false,
                error: { code: 'bad-request', message: 'refused' },
            }).success,
        ).toBe(true);
    });
});
