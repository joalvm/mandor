import { describe, expect, it } from 'vitest';

import {
    BYTE_VIEWS,
    defaultViewOf,
    languageOfView,
    TEXT_VIEWS,
} from '../../../../src/renderer/activity/lib/frame-views.js';

describe('the views a frame is read in', () => {
    it('lists the languages first and the ways of reading it as it came after', () => {
        expect(TEXT_VIEWS).toEqual(['json', 'xml', 'html']);
        expect(BYTE_VIEWS).toEqual(['raw', 'hex']);
    });

    /** The dock opens on what the frame is: its language, its text when it has none, its bytes when not text. */
    it('opens each frame on the view its format calls for', () => {
        expect(defaultViewOf('json')).toBe('json');
        expect(defaultViewOf('xml')).toBe('xml');
        expect(defaultViewOf('html')).toBe('html');
        expect(defaultViewOf('text')).toBe('raw');
        expect(defaultViewOf('binary')).toBe('hex');
    });

    it('colours each text view in its own language, and the text as it came in none', () => {
        expect(languageOfView('json')).toBe('jsonc');
        expect(languageOfView('xml')).toBe('xml');
        expect(languageOfView('html')).toBe('html');
        expect(languageOfView('raw')).toBe('plaintext');
    });
});
