import { describe, expect, it } from 'vitest';

import { baseMime, isTextMime } from '../../../src/har/import/text-mime.js';

describe('baseMime', () => {
    it.each([
        ['Application/JSON; charset=utf-8', 'application/json'],
        ['  text/plain ', 'text/plain'],
        ['', ''],
    ])('tells %j as %j', (written, expected) => {
        expect(baseMime(written)).toBe(expected);
    });
});

describe('isTextMime', () => {
    it.each([
        '',
        'text/html',
        'application/json',
        'application/xml',
        'application/javascript',
        'application/graphql',
        'application/x-www-form-urlencoded',
        'application/ld+json',
        'image/svg+xml',
    ])('reads %j as text', (mime) => {
        expect(isTextMime(mime)).toBe(true);
    });

    it.each(['image/png', 'application/octet-stream', 'application/pdf', 'video/mp4'])(
        'reads %j as bytes',
        (mime) => {
            expect(isTextMime(mime)).toBe(false);
        },
    );
});
