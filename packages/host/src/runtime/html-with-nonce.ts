const HEAD = /<head[^>]*>/i;

/**
 * Writes the nonce of the run into the document the window loads, as the tag the renderer
 * looks for. The policy travels in a header, which the document cannot drop; the nonce has to
 * travel in the document, because a header is not something a page can read.
 *
 * It goes first inside the head so that anything the head loads is already able to quote it.
 * A document with no head is left alone: it is a build that broke somewhere else, and hiding
 * it behind a tag the parser relocates makes it harder to see.
 */
export function htmlWithNonce(html: string, nonce: string): string {
    return html.replace(HEAD, (head) => `${head}<meta name="csp-nonce" content="${nonce}">`);
}
