import { describe, expect, it } from 'vitest';

import { credentialsAsHeader } from '../../src/url/url-credentials.js';

const BASIC = `Basic ${Buffer.from('user:se cret').toString('base64')}`;

describe('the credentials a Socket.IO address carries', () => {
    it('leave the address and become the Basic authorization they stand for', () => {
        expect(credentialsAsHeader('http://user:se%20cret@a.test/chat', { 'X-A': '1' })).toEqual({
            headers: { Authorization: BASIC, 'X-A': '1' },
            uri: 'http://a.test/chat',
        });
    });

    it('give way to an authorization the connection wrote, in any casing', () => {
        const headers = { AUTHORIZATION: 'Bearer mine' };

        expect(credentialsAsHeader('http://user:secret@a.test/', headers)).toEqual({
            headers,
            uri: 'http://a.test/',
        });
    });

    it('leave as they came an address and headers with none', () => {
        expect(credentialsAsHeader('http://a.test', undefined)).toEqual({
            headers: undefined,
            uri: 'http://a.test',
        });
    });

    it('count a user with no password, and no headers at all', () => {
        expect(credentialsAsHeader('http://user@a.test/', undefined).headers).toEqual({
            Authorization: `Basic ${Buffer.from('user:').toString('base64')}`,
        });
    });

    it('take as written a percent sign that encodes nothing', () => {
        expect(credentialsAsHeader('http://%zz@a.test/', undefined).headers).toEqual({
            Authorization: `Basic ${Buffer.from('%zz:').toString('base64')}`,
        });
    });
});
