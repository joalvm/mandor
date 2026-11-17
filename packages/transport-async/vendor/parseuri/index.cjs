'use strict';

/**
 * Stands in for `parseuri`, the address parser of the Socket.IO v2 client, through an npm
 * override: its expression can hang on a crafted address, and its fixed versions answer in another
 * shape. This one gives the fields that client reads, from the URL of the runtime.
 */
const SCHEME = /^(https?|wss?):\/\//;
const UNREADABLE = { host: '', path: '', port: '', query: '' };

function partsOf(url) {
    return {
        host: url.hostname.replace(/^\[|\]$/g, ''),
        path: url.pathname,
        port: url.port,
        query: url.search.slice(1),
    };
}

function parseuri(text) {
    const protocol = SCHEME.exec(text)?.[1] ?? '';
    const url = URL.parse(protocol === '' ? `http://${text}` : text);

    return { ...(url === null ? UNREADABLE : partsOf(url)), protocol, source: text };
}

module.exports = parseuri;
