import { net, session } from 'electron';

import { RENDERER_SCHEME, type RendererProtocol } from '../window/renderer-protocol.js';
import { htmlWithNonce } from './html-with-nonce.js';

/**
 * Answers the app's own scheme with the files behind the entry URL, for as long as the app
 * runs. It is what lets a window load from a stable origin without a web server; whoever
 * opens a URL the renderer cannot produce gets a plain 404.
 *
 * The document goes out with the nonce of the run written into it, because the policy that
 * travels in the header signs the styles with that same value and a page cannot read a header.
 * Only the document is rewritten: every other asset is served as it sits on disk.
 */
export function registerRendererProtocol(renderer: RendererProtocol, cspNonce: string): () => void {
    const fileUrl = renderer.fileUrl;

    if (fileUrl === undefined) {
        return () => undefined;
    }

    session.defaultSession.protocol.handle(RENDERER_SCHEME, async (request) => {
        const target = fileUrl(request.url);

        if (target === null) {
            return new Response(null, { status: 404 });
        }

        const answer = await net.fetch(target);

        if (!target.endsWith('.html')) {
            return answer;
        }

        return new Response(htmlWithNonce(await answer.text(), cspNonce), {
            headers: { 'content-type': 'text/html; charset=utf-8' },
            status: answer.status,
        });
    });

    return () => {
        session.defaultSession.protocol.unhandle(RENDERER_SCHEME);
    };
}
