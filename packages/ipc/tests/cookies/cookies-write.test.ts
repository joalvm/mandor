import { describe, expect, it } from 'vitest';

import {
    cookiesClearRequestSchema,
    cookiesDeleteRequestSchema,
    cookiesSetRequestSchema,
} from '../../src/index.js';

const place = { workspaceId: 'payments', environmentId: 'staging' };
const named = { ...place, domain: 'api.example.com', path: '/', name: 'sid' };

describe('the request of cookies:set', () => {
    it('changes the value of a cookie named by domain, path and name', () => {
        const input = { ...named, value: 'new' };

        expect(cookiesSetRequestSchema.parse(input)).toEqual(input);
    });

    it('may set an empty value', () => {
        expect(cookiesSetRequestSchema.safeParse({ ...named, value: '' }).success).toBe(true);
    });

    it('refuses a cookie with no name', () => {
        expect(cookiesSetRequestSchema.safeParse({ ...named, name: '', value: 'x' }).success).toBe(
            false,
        );
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

    it('does not take a cookie to clear: the jar goes whole', () => {
        expect(cookiesClearRequestSchema.safeParse({ ...named }).success).toBe(false);
    });
});
