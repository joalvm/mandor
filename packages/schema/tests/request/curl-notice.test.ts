import { describe, expect, it } from 'vitest';

import {
    CURL_INVALID_REASONS,
    CURL_NOTICE_CODES,
    curlNoticeSchema,
} from '../../src/request/curl-notice.js';

describe('what a pasted curl said that the request could not keep', () => {
    it.each(CURL_NOTICE_CODES)('reads the code %s', (code) => {
        expect(curlNoticeSchema.parse({ code })).toEqual({ code });
    });

    it('keeps the subject the text named', () => {
        expect(curlNoticeSchema.parse({ code: 'extraUrl', subject: 'https://b' })).toEqual({
            code: 'extraUrl',
            subject: 'https://b',
        });
    });

    it('refuses a code it does not know and a field it did not ask for', () => {
        expect(curlNoticeSchema.safeParse({ code: 'mystery' }).success).toBe(false);
        expect(curlNoticeSchema.safeParse({ code: 'comment', value: 'x' }).success).toBe(false);
    });

    it('lists the reasons a paste is not read at all', () => {
        expect(CURL_INVALID_REASONS).toEqual(['notCurl', 'noUrl', 'syntax', 'missingArgument']);
    });
});
