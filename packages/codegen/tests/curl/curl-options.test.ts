import { describe, expect, it } from 'vitest';

import { CURL_OPTIONS, CURL_SHORT_OPTIONS } from '../../src/curl/curl-options.js';

describe('the options the reader knows', () => {
    it('points every short letter at an option', () => {
        for (const [letter, name] of CURL_SHORT_OPTIONS) {
            expect(CURL_OPTIONS.get(name), `-${letter}`).toBeDefined();
        }
    });

    it('names each option once, by its own name', () => {
        for (const [key, option] of CURL_OPTIONS) {
            expect(option.name).toBe(key);
        }
    });

    it('reads what becomes the request and takes a value where curl does', () => {
        expect(CURL_OPTIONS.get('header')).toEqual({
            name: 'header',
            takesValue: true,
            kind: 'read',
        });
        expect(CURL_OPTIONS.get('location')).toEqual({
            name: 'location',
            takesValue: false,
            kind: 'read',
        });
    });

    it('lets pass what changes nothing of the request, and flags what it cannot keep', () => {
        expect(CURL_OPTIONS.get('silent')?.kind).toBe('silent');
        expect(CURL_OPTIONS.get('output')).toMatchObject({ kind: 'silent', takesValue: true });
        expect(CURL_OPTIONS.get('proxy')).toMatchObject({ kind: 'unsupported', takesValue: true });
    });

    it('knows the short letters of the common options', () => {
        expect(CURL_SHORT_OPTIONS.get('X')).toBe('request');
        expect(CURL_SHORT_OPTIONS.get('H')).toBe('header');
        expect(CURL_SHORT_OPTIONS.get('d')).toBe('data');
        expect(CURL_SHORT_OPTIONS.get('k')).toBe('insecure');
        expect(CURL_SHORT_OPTIONS.get('#')).toBe('progress-bar');
    });
});
