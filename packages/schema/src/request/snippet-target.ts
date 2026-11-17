import { z } from 'zod';

/** The languages a request can be copied as, in the order the dialog lists them. */
export const SNIPPET_TARGETS = [
    'curl',
    'curl-cmd',
    'js-fetch',
    'node-axios',
    'python-requests',
    'go-native',
    'java-okhttp',
    'csharp-httpclient',
    'php-curl',
    'powershell-webrequest',
] as const;
export type SnippetTarget = (typeof SNIPPET_TARGETS)[number];

export const snippetTargetSchema = z.enum(SNIPPET_TARGETS);
