import { describe, expect, it } from 'vitest';

import {
    cookiesClearRequestSchema,
    cookiesDeleteRequestSchema,
    cookiesSetRequestSchema,
} from '../../src/index.js';

const place = { workspaceId: 'payments', environmentId: 'staging' };
const named = { ...place, domain: 'api.example.com', path: '/', name: 'sid' };

describe('the request of cookies:set', () => {
    const written = { ...place, domain: 'api.example.com', line: 'sid=new; Path=/' };

    it('writes a cookie from its line, for the domain it goes under', () => {
        expect(cookiesSetRequestSchema.parse(written)).toEqual(written);
    });

    it('names the cookie the line was opened from, when it replaces one', () => {
        const input = {
            ...written,
            replaces: { domain: 'api.example.com', path: '/', name: 'sid' },
        };

        expect(cookiesSetRequestSchema.parse(input)).toEqual(input);
    });

    it('refuses an empty line, or one with no domain', () => {
        expect(cookiesSetRequestSchema.safeParse({ ...written, line: '' }).success).toBe(false);
        expect(cookiesSetRequestSchema.safeParse({ ...written, domain: '' }).success).toBe(false);
    });

    it('refuses a cookie to replace that is not named whole', () => {
        expect(
            cookiesSetRequestSchema.safeParse({
                ...written,
                replaces: { domain: 'a.test', path: '/' },
            }).success,
        ).toBe(false);
    });
});

describe('the request of cookies:delete', () => {
    it('deletes a cookie named by domain, path and name', () => {
        expect(cookiesDeleteRequestSchema.parse(named)).toEqual(named);
    });

    it('refuses a cookie with no domain or no path', () => {
        expect(cookiesDeleteRequestSchema.safeParse({ ...named, domain: '' }).success).toBe(false);
        expect(cookiesDeleteRequestSchema.safeParse({ ...named, path: '' }).success).toBe(false);
    });
});

describe('the request of cookies:clear', () => {
    it('empties the jar of an environment, or of none', () => {
        expect(cookiesClearRequestSchema.parse(place)).toEqual(place);
        expect(
            cookiesClearRequestSchema.parse({ workspaceId: 'payments', environmentId: null }),
        ).toMatchObject({ environmentId: null });
    });

    it('may take only the cookies of one domain', () => {
        const input = { ...place, domain: 'api.example.com' };

        expect(cookiesClearRequestSchema.parse(input)).toEqual(input);
        expect(cookiesClearRequestSchema.safeParse({ ...place, domain: '' }).success).toBe(false);
    });

    it('does not take one cookie to clear: that is a delete', () => {
        expect(cookiesClearRequestSchema.safeParse({ ...named }).success).toBe(false);
    });
});
