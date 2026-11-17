import { createEnvironment } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { assertSafeAuthority } from '../../src/resolution/assert-safe-authority.js';
import { UnsafeAuthorityError } from '../../src/resolution/unsafe-authority-error.js';

function environmentWith(value: string) {
    return createEnvironment({
        id: 'local',
        name: 'Local',
        variables: [{ name: 'host', value, enabled: true, secret: false }],
    });
}

describe('assertSafeAuthority', () => {
    it('lets a host with nothing in it that could move the authority through', () => {
        expect(() => {
            assertSafeAuthority('https://{{host}}/x', environmentWith('api.test:8080'), {});
        }).not.toThrow();
    });

    it.each(['evil.test/x', 'a@evil.test', 'evil.test?x', 'evil.test#x'])(
        'refuses a variable in the authority whose value carries `%s`',
        (value) => {
            expect(() => {
                assertSafeAuthority('https://{{host}}/x', environmentWith(value), {});
            }).toThrow(UnsafeAuthorityError);
        },
    );

    it('reads the secret value of the variable, not the empty one the file keeps', () => {
        const environment = createEnvironment({
            id: 'local',
            name: 'Local',
            variables: [{ name: 'host', value: '', enabled: true, secret: true }],
        });

        expect(() => {
            assertSafeAuthority('https://{{host}}/x', environment, { host: 'a@evil.test' });
        }).toThrow(UnsafeAuthorityError);
    });

    it('ignores a variable outside the authority: a path or a query may hold anything', () => {
        expect(() => {
            assertSafeAuthority(
                'https://api.test/{{host}}?q={{host}}',
                environmentWith('a/b?c'),
                {},
            );
        }).not.toThrow();
    });

    it('reads a bare host as authority to the end of the template', () => {
        expect(() => {
            assertSafeAuthority('https://{{host}}', environmentWith('a@evil.test'), {});
        }).toThrow(UnsafeAuthorityError);
    });

    /** A value resolves again until no placeholder is left: what lands in the URL is the end of it. */
    it('refuses a variable whose value moves the authority only once it resolves', () => {
        const environment = createEnvironment({
            id: 'local',
            name: 'Local',
            variables: [
                { name: 'host', value: '{{inner}}', enabled: true, secret: false },
                { name: 'inner', value: 'a@evil.test', enabled: true, secret: false },
            ],
        });

        expect(() => {
            assertSafeAuthority('https://{{host}}/x', environment, {});
        }).toThrow('unsafe authority variable: host');
    });

    it('refuses a value that reaches the authority through a variable of the workspace', () => {
        expect(() => {
            assertSafeAuthority(
                'https://{{host}}/x',
                environmentWith('{{tenant}}.api.test'),
                {},
                { below: { tenant: 'evil.test/' } },
            );
        }).toThrow(UnsafeAuthorityError);
    });

    it('names the variable that is unsafe', () => {
        expect(() => {
            assertSafeAuthority('https://{{host}}/x', environmentWith('a/b'), {});
        }).toThrow('unsafe authority variable: host');
    });

    it('has nothing to check without an environment or a workspace variable', () => {
        expect(() => {
            assertSafeAuthority('https://{{host}}/x', null, {});
        }).not.toThrow();
    });

    it('has nothing to check in a template with no scheme separator', () => {
        expect(() => {
            assertSafeAuthority('{{baseUrl}}/x', environmentWith('a/b'), {});
        }).not.toThrow();
    });

    describe('with variables of the workspace', () => {
        it('refuses one that moves the authority, even with no environment', () => {
            expect(() => {
                assertSafeAuthority(
                    'https://{{host}}/x',
                    null,
                    {},
                    { below: { host: 'a@evil.test' } },
                );
            }).toThrow('unsafe authority variable: host');
        });

        it('lets a safe one through', () => {
            expect(() => {
                assertSafeAuthority(
                    'https://{{host}}/x',
                    null,
                    {},
                    { below: { host: 'api.test:8080' } },
                );
            }).not.toThrow();
        });

        it('reads the value the environment gives the name, which is the one that resolves', () => {
            expect(() => {
                assertSafeAuthority(
                    'https://{{host}}/x',
                    environmentWith('api.test'),
                    {},
                    { below: { host: 'a@evil.test' } },
                );
            }).not.toThrow();
            expect(() => {
                assertSafeAuthority(
                    'https://{{host}}/x',
                    environmentWith('a@evil.test'),
                    {},
                    { below: { host: 'api.test' } },
                );
            }).toThrow(UnsafeAuthorityError);
        });

        it('ignores one outside the authority', () => {
            expect(() => {
                assertSafeAuthority(
                    'https://api.test/{{host}}',
                    null,
                    {},
                    { below: { host: 'a/b?c' } },
                );
            }).not.toThrow();
        });
    });

    describe('with values a script set', () => {
        it('reads them over the environment and refuses one that moves the authority', () => {
            expect(() => {
                assertSafeAuthority(
                    'https://{{host}}/x',
                    environmentWith('api.test'),
                    {},
                    {
                        script: { host: 'a@evil.test' },
                    },
                );
            }).toThrow('unsafe authority variable: host');
        });

        it('lets a safe one through over an unsafe environment', () => {
            expect(() => {
                assertSafeAuthority(
                    'https://{{host}}/x',
                    environmentWith('a@evil.test'),
                    {},
                    {
                        script: { host: 'api.test' },
                    },
                );
            }).not.toThrow();
        });
    });
});
