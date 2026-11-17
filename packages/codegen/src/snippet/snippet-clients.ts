import type { SnippetTarget } from '@mandor/schema';
import type { ClientId, TargetId } from '@readme/httpsnippet/targets';

/**
 * The languages the library writes. Curl is written here, the way DevTools copies it; PHP,
 * PowerShell and JavaScript too, since the library leaves values in literals where they run.
 */
export type LibraryTarget = Exclude<
    SnippetTarget,
    'curl' | 'curl-cmd' | 'php-curl' | 'powershell-webrequest' | 'js-fetch' | 'node-axios'
>;

/** The client of the library each language is written with. */
export const SNIPPET_CLIENTS: Readonly<
    Record<LibraryTarget, { target: TargetId; client: ClientId }>
> = {
    'python-requests': { target: 'python', client: 'requests' },
    'go-native': { target: 'go', client: 'native' },
    'java-okhttp': { target: 'java', client: 'okhttp' },
    'csharp-httpclient': { target: 'csharp', client: 'httpclient' },
};
