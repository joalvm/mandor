import type { AuthChainLevel, InheritedHeader, RequestItem, RequestLine } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { headerAutoLinesOf } from '../../../../src/renderer/features/requests/lib/header-auto-lines.js';

function line(key: string, value = '', enabled = true): RequestLine {
    return { enabled, key, value };
}

function request(parts: Partial<RequestItem>): RequestItem {
    return {
        body: { type: 'none' },
        examples: [],
        headers: [],
        method: 'GET',
        name: 'crear pedido',
        pathParams: [],
        query: [],
        settings: { followRedirects: true, maxRedirects: 5, timeoutMs: 30000, validateTls: true },
        url: '{{base}}/pedidos',
        ...parts,
    };
}

function level(auth: AuthChainLevel['auth']): AuthChainLevel {
    return {
        auth,
        name: 'nivel',
        place: { kind: 'workspace' },
    };
}

function idsOf(lines: readonly { id: string }[]): string[] {
    return lines.map((each) => each.id);
}

describe('the headers the request adds by itself', () => {
    it('says the four defaults a solid send lays, and the ones the dialing layer computes', () => {
        expect(idsOf(headerAutoLinesOf(request({}), []))).toEqual([
            'default:accept',
            'default:accept-encoding',
            'default:cache-control',
            'default:user-agent',
            'host',
            'connection',
        ]);
    });

    it('the content type rides with the body that implies it, the length with the bytes', () => {
        const json = headerAutoLinesOf(request({ body: { type: 'json', content: '{}' } }), []);

        expect(idsOf(json)).toContain('content-type');
        expect(idsOf(json)).toContain('content-length');

        const binary = headerAutoLinesOf(request({ body: { type: 'binary', file: 'a.png' } }), []);

        expect(idsOf(binary)).not.toContain('content-type');
        expect(idsOf(binary)).toContain('content-length');
    });

    it('says the values the send lays, and the computed ones as computed on send', () => {
        const lines = headerAutoLinesOf(request({}), []);
        const accept = lines.find((each) => each.id === 'default:accept');
        const host = lines.find((each) => each.id === 'host');

        expect(accept).toEqual({
            id: 'default:accept',
            kind: 'default',
            name: 'accept',
            value: '*/*',
        });
        expect(host).toEqual({
            calculated: true,
            id: 'host',
            kind: 'wire',
            name: 'Host',
            value: '',
        });
    });

    it('says the header the effective auth stands for, the chain consulted like the send does', () => {
        const lines = headerAutoLinesOf(
            request({ auth: { inherit: true }, body: { type: 'json', content: '{}' } }),
            [level({ inherit: true }), level({ token: 't', type: 'bearer' })],
        );

        expect(lines[0]).toEqual({
            id: 'auth:authorization',
            kind: 'auth',
            name: 'Authorization',
            value: 'Bearer t',
        });
    });

    it('a level that says none wins over the one above: the auth stops there', () => {
        const lines = headerAutoLinesOf(request({ auth: { inherit: true } }), [
            level({ type: 'none' }),
            level({ token: 't', type: 'bearer' }),
        ]);

        expect(lines.filter((each) => each.kind === 'auth')).toEqual([]);
    });

    it('says the row a written header takes over, matched without case and only when it is on', () => {
        const lines = headerAutoLinesOf(
            request({
                auth: { token: 't', type: 'bearer' },
                body: { type: 'json', content: '{}' },
                headers: [
                    line('authorization', 'x'),
                    line('CONTENT-TYPE', 'y', false),
                    line('Accept', 'text/html'),
                ],
            }),
            [],
        );

        const pisadas = new Map(lines.map((each) => [each.id, each.overriddenBy]));

        expect(pisadas.get('auth:authorization')).toBe('authorization');
        expect(pisadas.get('content-type')).toBeUndefined();
        expect(pisadas.get('default:accept')).toBe('Accept');
    });

    it('says a value only the send can work out as computed on send', () => {
        const [auth] = headerAutoLinesOf(
            request({
                auth: { password: '{{pass}}', type: 'basic', username: 'ana' },
            }),
            [],
        );

        expect(auth?.calculated).toBe(true);
    });

    it('a key that travels in the query or a cookie adds no header row', () => {
        expect(
            headerAutoLinesOf(
                request({ auth: { in: 'query', name: 'key', type: 'apikey', value: 'k' } }),
                [],
            ).filter((each) => each.kind === 'auth'),
        ).toEqual([]);
    });

    it('an inherited header that goes out takes the row over, as a written one does', () => {
        const inherited: InheritedHeader[] = [
            { label: 'Pedidos', line: line('accept', 'text/plain') },
        ];
        const accept = headerAutoLinesOf(request({}), [], inherited).find(
            (each) => each.id === 'default:accept',
        );

        expect(accept?.overriddenBy).toBe('accept');
    });

    it('an inherited header overridden on its way takes nothing over', () => {
        const inherited: InheritedHeader[] = [
            {
                label: 'Pedidos',
                line: line('Accept', 'text/plain'),
                overriddenBy: { by: 'level', name: 'Altas' },
            },
        ];
        const accept = headerAutoLinesOf(request({}), [], inherited).find(
            (each) => each.id === 'default:accept',
        );

        expect(accept?.overriddenBy).toBeUndefined();
    });
});
