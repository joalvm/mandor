import { describe, expect, it } from 'vitest';

import { SEND_DEFAULT_HEADERS, withSendDefaults } from '../../src/request/send-default-headers.js';

describe('sendDefaultHeaders', () => {
    it('names the four that make a request solid, in the order they leave', () => {
        expect(SEND_DEFAULT_HEADERS).toEqual([
            ['accept', '*/*'],
            ['accept-encoding', 'gzip, deflate, br, zstd'],
            ['cache-control', 'no-cache'],
            ['user-agent', 'Mandor/1.0'],
        ]);
    });

    it('the send carries them beside what the user wrote', () => {
        expect(withSendDefaults([['x-trace', '1']])).toEqual([
            ['x-trace', '1'],
            ['accept', '*/*'],
            ['accept-encoding', 'gzip, deflate, br, zstd'],
            ['cache-control', 'no-cache'],
            ['user-agent', 'Mandor/1.0'],
        ]);
    });

    it('a name the user wrote, matched without case, keeps the default home', () => {
        expect(withSendDefaults([['User-Agent', 'mine/2']])).toEqual([
            ['User-Agent', 'mine/2'],
            ['accept', '*/*'],
            ['accept-encoding', 'gzip, deflate, br, zstd'],
            ['cache-control', 'no-cache'],
        ]);
        expect(withSendDefaults([['ACCEPT', 'text/html']])).toEqual([
            ['ACCEPT', 'text/html'],
            ['accept-encoding', 'gzip, deflate, br, zstd'],
            ['cache-control', 'no-cache'],
            ['user-agent', 'Mandor/1.0'],
        ]);
    });
});
