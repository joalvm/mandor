import { answerRedactor } from '@mandor/host';
import { failure, success, type Result } from '@mandor/ipc';
import { httpResponseSchema, type HttpResponse } from '@mandor/schema';

type Hide = (text: string) => string;
type Cookie = HttpResponse['cookies'][number];

function hiddenCookie(cookie: Cookie, hide: Hide): Cookie {
    return {
        ...cookie,
        ...(cookie.domain !== undefined && { domain: hide(cookie.domain) }),
        ...(cookie.path !== undefined && { path: hide(cookie.path) }),
        value: hide(cookie.value),
    };
}

function hiddenBody(body: HttpResponse['body'], hide: Hide): HttpResponse['body'] {
    if (body?.kind !== 'inline' || body.encoding !== 'utf8') {
        return body;
    }

    return { ...body, text: hide(body.text) };
}

/**
 * The answer of a server with every secret of the session hidden, of any length and however the
 * server wrote it back, before it is kept in a file others read. Only what the server could have
 * echoed changes: a status, the name of a header or the kind of a body still have to mean the same.
 */
export function hideAnswer(raw: unknown): Result<HttpResponse> {
    const input = httpResponseSchema.safeParse(raw);

    if (!input.success) {
        return failure('bad-request', input.error.message);
    }

    const hide = answerRedactor();
    const response = input.data;

    return success({
        ...response,
        body: hiddenBody(response.body, hide),
        cookies: response.cookies.map((cookie) => hiddenCookie(cookie, hide)),
        headers: response.headers.map(([name, value]) => [name, hide(value)]),
        statusText: hide(response.statusText),
    });
}
