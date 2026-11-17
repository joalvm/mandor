import { CURL_TEXT_MAX } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { looksLikeCurl } from '../../../../src/renderer/features/requests/lib/looks-like-curl.js';

describe('telling a curl command from other pasted text', () => {
    it.each([
        'curl https://x',
        '  curl.exe -X POST',
        '/usr/bin/curl x',
        'C:\\bin\\curl.exe x',
        'curl',
        '$ curl x',
        '```bash\ncurl x\n```',
        '# get it\ncurl x',
    ])('takes %j for a curl', (text) => {
        expect(looksLikeCurl(text)).toBe(true);
    });

    it.each(['curly x', 'https://x', 'echo curl', ''])('leaves %j as plain text', (text) => {
        expect(looksLikeCurl(text)).toBe(false);
    });

    it('leaves a paste longer than main reads as plain text', () => {
        expect(looksLikeCurl(`curl ${'a'.repeat(CURL_TEXT_MAX)}`)).toBe(false);
        expect(looksLikeCurl(`curl ${'a'.repeat(CURL_TEXT_MAX - 5)}`)).toBe(true);
    });
});
