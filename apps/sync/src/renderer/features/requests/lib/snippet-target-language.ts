import type { SnippetTarget } from '@mandor/schema';
import type { EditorLanguage } from '@mandor/ui';

/** The grammar each target is read in, so the code wears the colors of its own language. */
export const SNIPPET_TARGET_LANGUAGES: Record<SnippetTarget, EditorLanguage> = {
    curl: 'shell',
    'curl-cmd': 'bat',
    'js-fetch': 'javascript',
    'node-axios': 'javascript',
    'python-requests': 'python',
    'go-native': 'go',
    'java-okhttp': 'java',
    'csharp-httpclient': 'csharp',
    'php-curl': 'php',
    'powershell-webrequest': 'powershell',
};
