import type { CurlNotice, RequestBody, RequestFormField } from '@mandor/schema';

import type { FormPart } from './curl-body-part.js';
import { CurlParseError } from './curl-parse-error.js';
import { isRepoFilePath } from './repo-file-path.js';

const MODIFIER = /;(?:type|filename|headers|encoder)=/;

function textField(key: string, value: string): RequestFormField {
    return { key, value, enabled: true, kind: 'text' };
}

// A file of the repo becomes a file field. One with a path that leaves the repo is left out: a
// request that travels in a repo must not be able to name any file of the disk.
function fileField(key: string, path: string, notices: CurlNotice[]): RequestFormField | null {
    if (!isRepoFilePath(path)) {
        notices.push({ code: 'formFilePath', subject: key });

        return null;
    }

    notices.push({ code: 'formFileCopy', subject: path });

    return { key, value: path, enabled: true, kind: 'file' };
}

function fieldOf(part: FormPart, notices: CurlNotice[]): RequestFormField | null {
    const equals = part.value.indexOf('=');

    // The error names the long option, whichever way it was written; a form kind is that name.
    if (equals < 0) {
        throw new CurlParseError('syntax', `--${part.kind}`);
    }

    const key = part.value.slice(0, equals);
    const raw = part.value.slice(equals + 1);

    if (part.kind === 'form-string') {
        return textField(key, raw);
    }

    const [value = ''] = raw.split(MODIFIER, 1);

    if (value.startsWith('@')) {
        return fileField(key, value.slice(1), notices);
    }

    if (value.startsWith('<')) {
        notices.push({ code: 'formFileContent', subject: key });

        return null;
    }

    return textField(key, value);
}

/** The fields of `-F` and `--form-string`, in order, and what had to be left out. */
export function formBody(parts: readonly FormPart[]): { body: RequestBody; notices: CurlNotice[] } {
    const notices: CurlNotice[] = [];
    const fields: RequestFormField[] = [];

    for (const part of parts) {
        const field = fieldOf(part, notices);

        if (field !== null) {
            fields.push(field);
        }
    }

    return { body: { type: 'form', fields }, notices };
}
