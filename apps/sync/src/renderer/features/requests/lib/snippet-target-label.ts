import type { SnippetTarget } from '@mandor/schema';

/** Proper names of tools and libraries: they read the same in every language of the interface. */
export const SNIPPET_TARGET_LABELS: Record<SnippetTarget, string> = {
    curl: 'cURL (bash)',
    'curl-cmd': 'cURL (cmd)',
    'js-fetch': 'JavaScript fetch',
    'node-axios': 'Node.js axios',
    'python-requests': 'Python requests',
    'go-native': 'Go net/http',
    'java-okhttp': 'Java OkHttp',
    'csharp-httpclient': 'C# HttpClient',
    'php-curl': 'PHP cURL',
    'powershell-webrequest': 'PowerShell Invoke-WebRequest',
};
