import type { RequestBody } from '@mandor/schema';

/** The path a binary body sends; any other kind sends no file. */
export function bodyFileOf(body: RequestBody): string {
    if (body.type !== 'binary') {
        return '';
    }

    return body.file;
}
