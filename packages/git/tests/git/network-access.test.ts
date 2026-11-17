import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterEach, describe, expect, it } from 'vitest';

import { networkEnv } from '../../src/git/network-access.js';
import { remoteReachable } from '../../src/git/remote-reachable.js';

const TOKEN = 'glpat-secret-token';

function basic(user: string): string {
    return `Authorization: Basic ${Buffer.from(`${user}:${TOKEN}`, 'utf8').toString('base64')}`;
}

describe('what a network call of git is given', () => {
    it('carries a token as a header scoped to its own url', () => {
        const env = networkEnv({ url: 'https://git.example.test/team/api.git', token: TOKEN });

        expect(env).toEqual({
            GIT_TERMINAL_PROMPT: '0',
            GIT_CONFIG_COUNT: '1',
            GIT_CONFIG_KEY_0: 'http.https://git.example.test/team/api.git.extraHeader',
            GIT_CONFIG_VALUE_0: basic('oauth2'),
        });
    });

    it('uses the name it was given instead of the default one', () => {
        const env = networkEnv({
            url: 'https://git.example.test/a.git',
            token: TOKEN,
            username: 'ana',
        });

        expect(env['GIT_CONFIG_VALUE_0']).toBe(basic('ana'));
    });

    it('scopes the header to the url without whatever the url was signed with', () => {
        const env = networkEnv({ url: 'https://ana:old@git.example.test/a.git', token: TOKEN });

        expect(env['GIT_CONFIG_KEY_0']).toBe('http.https://git.example.test/a.git.extraHeader');
    });

    it.each([
        ['an ssh url', 'git@git.example.test:team/api.git'],
        ['a path on disk', '/srv/git/api.git'],
        ['a file url', 'file:///srv/git/api.git'],
    ])('only forbids prompting for %s: the system has its own credentials', (_name, url) => {
        expect(networkEnv({ url, token: TOKEN })).toEqual({ GIT_TERMINAL_PROMPT: '0' });
    });

    it('only forbids prompting when there is no token', () => {
        const bare = { GIT_TERMINAL_PROMPT: '0' };

        expect(networkEnv({ url: 'https://git.example.test/a.git' })).toEqual(bare);
        expect(networkEnv({ url: 'https://git.example.test/a.git', token: '' })).toEqual(bare);
    });
});

describe('the token on its way to a host', () => {
    let server: Server | undefined;

    afterEach(() => {
        server?.close();
        server?.closeAllConnections();
    });

    function listening(seen: IncomingHttpHeaders[]): Promise<string> {
        server = createServer((request, response) => {
            seen.push(request.headers);
            response.writeHead(404).end();
        });

        return new Promise((resolve) => {
            server?.listen(0, '127.0.0.1', () => {
                const { port } = server?.address() as AddressInfo;

                resolve(`http://127.0.0.1:${String(port)}/team/api.git`);
            });
        });
    }

    it('reaches the host as a basic header, so it never had to be in the url', async () => {
        const seen: IncomingHttpHeaders[] = [];
        const url = await listening(seen);

        await expect(remoteReachable({ url, token: TOKEN })).rejects.toThrow();

        expect(seen.length).toBeGreaterThan(0);
        expect(seen[0]?.authorization).toBe(basic('oauth2').replace('Authorization: ', ''));
    });

    it('does not reach the host when nobody gave one', async () => {
        const seen: IncomingHttpHeaders[] = [];
        const url = await listening(seen);

        await expect(remoteReachable({ url })).rejects.toThrow();

        expect(seen[0]?.authorization).toBeUndefined();
    });

    it('never shows in the message of a failure', async () => {
        const url = await listening([]);
        const failure: unknown = await remoteReachable({ url, token: TOKEN }).catch(
            (error: unknown) => error,
        );

        expect((failure as Error).message).not.toContain(TOKEN);
    });
});
