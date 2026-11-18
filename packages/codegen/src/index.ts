// The only barrel in the package. It states the public API and nothing else: inside the
// package every module imports the file that defines the symbol.

export { curlRequestOf } from './curl/curl-request-of.js';
export { snippetOf } from './snippet/snippet-of.js';
export { SnippetError } from './snippet/snippet-error.js';
export type { SnippetBody, SnippetRequest } from './snippet/snippet-request.js';
