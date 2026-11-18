import type { RequestSettingsOverrides } from '@mandor/schema';

/** A request with every template resolved and every secret already replaced. */
export type SnippetRequest = {
    method: string;
    url: string;
    headers: [string, string][];
    body: SnippetBody;
};

export type SnippetBody =
    | { type: 'none' }
    | { type: 'text'; contentType: string; text: string }
    | { type: 'urlencoded'; fields: [string, string][] }
    | { type: 'form'; fields: { name: string; value: string; kind: 'text' | 'file' }[] };

/** What the request set of its own about the wire; what it left to the app goes unsaid. */
export type SnippetSettings = Pick<
    RequestSettingsOverrides,
    'followRedirects' | 'keepMethodOnRedirect' | 'maxRedirects' | 'timeoutMs' | 'validateTls'
>;
