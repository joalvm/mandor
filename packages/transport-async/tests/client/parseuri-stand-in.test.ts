import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

type Parsed = Record<'host' | 'path' | 'port' | 'protocol' | 'query' | 'source', string>;

// By its name, as the v2 client asks for it: this also proves the override is in place.
const parseuri = createRequire(import.meta.url)('parseuri') as (text: string) => Parsed;

describe('the stand-in for parseuri', () => {
    it('gives the fields the v2 client reads', () => {
        expect(parseuri('https://example.com:8443/chat?token=a&room=b')).toEqual({
            host: 'example.com',
            path: '/chat',
            port: '8443',
            protocol: 'https',
            query: 'token=a&room=b',
            source: 'https://example.com:8443/chat?token=a&room=b',
        });
    });

    it('takes an address without a scheme, as the client does with a bare host', () => {
        expect(parseuri('example.com')).toMatchObject({
            host: 'example.com',
            port: '',
            protocol: '',
        });
    });

    it('takes the host of an IPv6 address without its brackets', () => {
        expect(parseuri('ws://[::1]:3000/')).toMatchObject({
            host: '::1',
            port: '3000',
            protocol: 'ws',
        });
    });

    it('leaves the port empty when it is the default, and the client fills it in', () => {
        expect(parseuri('http://example.com:80').port).toBe('');
    });

    it('answers with empty fields for an address that cannot be read', () => {
        expect(parseuri('http://')).toEqual({
            host: '',
            path: '',
            port: '',
            protocol: 'http',
            query: '',
            source: 'http://',
        });
    });

    it('answers a crafted address without hanging', () => {
        const crafted = `http://${'a:'.repeat(50_000)}@`;

        expect(parseuri(crafted).source).toBe(crafted);
    });
});
