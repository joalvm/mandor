import type { SnippetTarget } from '@mandor/schema';
import { HTTPSnippet } from '@readme/httpsnippet';

import { curlCommandOf } from './curl-command.js';
import type { CurlShell } from './curl-quote.js';
import { harRequestOf } from './har-request-of.js';
import { javascriptCommandOf } from './javascript-command.js';
import { phpCurlCommandOf } from './php-curl-command.js';
import { powershellCommandOf } from './powershell-command.js';
import { SnippetError } from './snippet-error.js';
import { SNIPPET_CLIENTS, type LibraryTarget } from './snippet-clients.js';
import type { SnippetRequest, SnippetSettings } from './snippet-request.js';

type Writer = (request: SnippetRequest, settings: SnippetSettings) => string;
type LibraryOptions = (settings: SnippetSettings) => Record<string, unknown>;

/** The libraries count whole seconds; a part of one is rounded up, so nothing gives up sooner. */
function secondsOf(milliseconds: number | undefined): number | undefined {
    return milliseconds === undefined ? undefined : Math.ceil(milliseconds / 1000);
}

/** An option the request set; one it left to the app is not passed, so the library's stands. */
function optionOf(name: string, value: unknown): Record<string, unknown> {
    return value === undefined ? {} : { [name]: value };
}

function noOptions(): Record<string, unknown> {
    return {};
}

/**
 * What each library can be told of the settings the request kept. The rest write a client that
 * follows its own defaults: their generator has no option for any setting.
 */
const OPTIONS_OF_LIBRARY: Readonly<Record<LibraryTarget, LibraryOptions>> = {
    'python-requests': noOptions,
    'go-native': ({ timeoutMs, validateTls }) => ({
        ...optionOf('timeout', secondsOf(timeoutMs)),
        ...optionOf('insecureSkipVerify', validateTls === false ? true : undefined),
    }),
    'java-okhttp': noOptions,
    'csharp-httpclient': noOptions,
};

function curlWriter(shell: CurlShell): Writer {
    return (request, settings) => curlCommandOf(request, shell, settings);
}

/** Curl counts the redirects it follows; a send that follows none tells it none. */
function phpCurlWriter(request: SnippetRequest, settings: SnippetSettings): string {
    const { followRedirects, maxRedirects, timeoutMs } = settings;

    return phpCurlCommandOf(request, {
        timeoutSeconds: secondsOf(timeoutMs),
        maxRedirects: followRedirects === false ? 0 : maxRedirects,
    });
}

function libraryWriter(target: LibraryTarget): Writer {
    return (request, settings) => {
        const { target: id, client } = SNIPPET_CLIENTS[target];
        const options = OPTIONS_OF_LIBRARY[target](settings);
        const [code] = new HTTPSnippet(harRequestOf(request)).convert(id, client, options);

        if (typeof code !== 'string') {
            throw new SnippetError(target);
        }

        return code;
    };
}

const WRITER_OF_TARGET: Readonly<Record<SnippetTarget, Writer>> = {
    curl: curlWriter('bash'),
    'curl-cmd': curlWriter('cmd'),
    'js-fetch': (request) => javascriptCommandOf(request, 'fetch'),
    'node-axios': (request) => javascriptCommandOf(request, 'axios'),
    'python-requests': libraryWriter('python-requests'),
    'go-native': libraryWriter('go-native'),
    'java-okhttp': libraryWriter('java-okhttp'),
    'csharp-httpclient': libraryWriter('csharp-httpclient'),
    'php-curl': phpCurlWriter,
    'powershell-webrequest': (request) => powershellCommandOf(request),
};

/**
 * The code that sends a request, in one language. The caller redacts before: the library encodes
 * the URL, and a secret that is already encoded no longer matches what was meant to be hidden.
 * The settings are the ones the request kept of its own: what the app fills in by default stays
 * out of the code, as it stays out of the file of the request.
 */
export function snippetOf(
    request: SnippetRequest,
    target: SnippetTarget,
    settings: SnippetSettings,
): string {
    return WRITER_OF_TARGET[target](request, settings);
}
