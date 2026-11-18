import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerRendererProtocol } from '../../src/runtime/register-renderer-protocol.js';

type ProtocolHandler = (request: { url: string }) => Promise<Response>;

const electron = vi.hoisted(() => ({
    net: { fetch: vi.fn<(target: string) => Promise<Response>>() },
    protocol: { handle: vi.fn(), unhandle: vi.fn() },
}));

vi.mock('electron', () => ({
    net: electron.net,
    session: { defaultSession: { protocol: electron.protocol } },
}));

const NONCE = 'bm9uY2UtZGUtbGEtY29ycmlkYQ';

beforeEach(() => {
    electron.net.fetch.mockReset();
    electron.protocol.handle.mockReset();
    electron.protocol.unhandle.mockReset();
});

afterEach(() => {
    vi.restoreAllMocks();
});

function installed(): ProtocolHandler {
    const call = electron.protocol.handle.mock.calls[0] as [string, ProtocolHandler] | undefined;

    if (call === undefined) {
        throw new Error('no handler was installed for the scheme');
    }

    return call[1];
}

/** The renderer of a packaged app: every file URL of the app maps to one on disk. */
function packagedRenderer(): { entryUrl: string; fileUrl: (url: string) => string | null } {
    return {
        entryUrl: 'mandor://app/index.html',
        fileUrl: (url) =>
            url.startsWith('mandor://app/') ? url.replace('mandor://app/', 'file:///r/') : null,
    };
}

describe('serving the renderer under its own scheme', () => {
    it('takes the scheme of the app and gives it back when the run ends', () => {
        const dispose = registerRendererProtocol(packagedRenderer(), NONCE);

        expect(electron.protocol.handle).toHaveBeenCalledWith('mandor', expect.any(Function));

        dispose();

        expect(electron.protocol.unhandle).toHaveBeenCalledWith('mandor');
    });

    /** A development server serves the renderer itself: there is no file behind the scheme. */
    it('installs nothing and has nothing to undo when the renderer is not a packaged one', () => {
        const dispose = registerRendererProtocol({ entryUrl: 'http://localhost:5173/' }, NONCE);

        dispose();

        expect(electron.protocol.handle).not.toHaveBeenCalled();
        expect(electron.protocol.unhandle).not.toHaveBeenCalled();
    });

    it('answers a plain 404 to a url the renderer cannot produce', async () => {
        registerRendererProtocol(packagedRenderer(), NONCE);

        const answer = await installed()({ url: 'mandor://other/index.html' });

        expect(answer.status).toBe(404);
        expect(electron.net.fetch).not.toHaveBeenCalled();
    });

    it('serves an asset as it sits on disk', async () => {
        electron.net.fetch.mockResolvedValue(new Response('console.log(1)', { status: 200 }));
        registerRendererProtocol(packagedRenderer(), NONCE);

        const answer = await installed()({ url: 'mandor://app/assets/index.js' });

        expect(electron.net.fetch).toHaveBeenCalledWith('file:///r/assets/index.js');
        expect(await answer.text()).toBe('console.log(1)');
    });

    it('writes the nonce of the run into the document and into nothing else', async () => {
        electron.net.fetch.mockResolvedValue(
            new Response('<html><head><title>x</title></head></html>', { status: 200 }),
        );
        registerRendererProtocol(packagedRenderer(), NONCE);

        const answer = await installed()({ url: 'mandor://app/index.html' });
        const body = await answer.text();

        expect(body).toContain(`<meta name="csp-nonce" content="${NONCE}">`);
        expect(answer.headers.get('content-type')).toBe('text/html; charset=utf-8');
    });

    it('keeps the status the document came with', async () => {
        electron.net.fetch.mockResolvedValue(new Response('<head></head>', { status: 203 }));
        registerRendererProtocol(packagedRenderer(), NONCE);

        const answer = await installed()({ url: 'mandor://app/index.html' });

        expect(answer.status).toBe(203);
    });
});
