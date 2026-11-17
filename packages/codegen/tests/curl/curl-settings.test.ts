import { describe, expect, it } from 'vitest';

import { settingsOf } from '../../src/curl/curl-settings.js';
import type { CurlArg } from '../../src/curl/curl-args.js';

function arg(name: string, flag: string, value: string | null = null): CurlArg {
    return {
        name,
        flag,
        value,
    };
}

describe('the settings a curl command names', () => {
    it('names none when the command says nothing', () => {
        expect(settingsOf([])).toEqual({ settings: {}, notices: [] });
    });

    it('reads -L, -k, --max-redirs and -m', () => {
        expect(
            settingsOf([
                arg('location', '-L'),
                arg('insecure', '-k'),
                arg('max-redirs', '--max-redirs', '3'),
                arg('max-time', '-m', '2.5'),
            ]),
        ).toEqual({
            settings: {
                followRedirects: true,
                validateTls: false,
                maxRedirects: 3,
                timeoutMs: 2500,
            },
            notices: [],
        });
    });

    it('keeps the method on a redirect when --post301 or --post302 says so', () => {
        expect(settingsOf([arg('post301', '--post301')]).settings).toEqual({
            keepMethodOnRedirect: true,
        });
        expect(settingsOf([arg('post302', '--post302')]).settings).toEqual({
            keepMethodOnRedirect: true,
        });
    });

    it.each([
        ['a negative number of redirects', arg('max-redirs', '--max-redirs', '-1'), '--max-redirs'],
        [
            'a number of redirects that is not a number',
            arg('max-redirs', '--max-redirs', 'x'),
            '--max-redirs',
        ],
        ['a timeout of zero', arg('max-time', '-m', '0'), '-m'],
        ['a timeout that is not a number', arg('max-time', '-m', 'soon'), '-m'],
    ])('leaves out %s and says so', (_name, option, flag) => {
        expect(settingsOf([option])).toEqual({
            settings: {},
            notices: [{ code: 'settingOutOfRange', subject: flag }],
        });
    });

    it('ignores the options that are not settings', () => {
        expect(settingsOf([arg('header', '-H', 'A: b')])).toEqual({ settings: {}, notices: [] });
    });
});
