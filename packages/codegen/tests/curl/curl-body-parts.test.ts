import { describe, expect, it } from 'vitest';

import { bodyPartsOf } from '../../src/curl/curl-body-parts.js';
import type { CurlArg } from '../../src/curl/curl-args.js';

function arg(name: string, flag: string, value: string | null): CurlArg {
    return { name, flag, value };
}

describe('the options of a curl command that name a body', () => {
    it('keeps them in order, with the kind each one has', () => {
        expect(
            bodyPartsOf([
                arg('data', '-d', 'a=1'),
                arg('data-ascii', '--data-ascii', 'b=2'),
                arg('data-raw', '--data-raw', 'c'),
                arg('data-binary', '--data-binary', 'd'),
                arg('data-urlencode', '--data-urlencode', 'e'),
                arg('json', '--json', '{}'),
                arg('form', '-F', 'f=1'),
                arg('form-string', '--form-string', 'g=2'),
            ]),
        ).toEqual({
            parts: [
                { flag: '-d', kind: 'data', value: 'a=1' },
                { flag: '--data-ascii', kind: 'data', value: 'b=2' },
                { flag: '--data-raw', kind: 'raw', value: 'c' },
                { flag: '--data-binary', kind: 'binary', value: 'd' },
                { flag: '--data-urlencode', kind: 'urlencode', value: 'e' },
                { flag: '--json', kind: 'json', value: '{}' },
                { flag: '-F', kind: 'form', value: 'f=1' },
                { flag: '--form-string', kind: 'form-string', value: 'g=2' },
            ],
            get: false,
        });
    });

    it('knows -G was there, and ignores the options that are not a body', () => {
        expect(bodyPartsOf([arg('get', '-G', null), arg('header', '-H', 'A: b')])).toEqual({
            parts: [],
            get: true,
        });
    });
});
