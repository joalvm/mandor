import type { InteropBodyField, InteropRequestBody } from '@mandor/interop-core';

import type { HarContent, HarPostData } from '../document/har-schema.js';
import { baseMime, isTextMime } from './text-mime.js';

type HarParam = NonNullable<HarPostData['params']>[number];

/** The body a recorded request carried, or the mark that it was bytes no row can hold. */
export function postDataBodyOf(postData: HarPostData | undefined): {
    body: InteropRequestBody | undefined;
    binary: boolean;
} {
    if (postData === undefined) {
        return { body: undefined, binary: false };
    }

    const contentType = baseMime(postData.mimeType);
    const value = postData.text ?? '';
    const fields = fieldsOf(postData, contentType);

    if (fields !== undefined) {
        return { body: { contentType, value, required: true, fields }, binary: false };
    }

    if (isTextMime(contentType)) {
        return { body: { contentType, value, required: true }, binary: false };
    }

    return { body: { contentType, value: '', required: true }, binary: true };
}

/** The body of a recorded response as example text, or the mark that it was bytes. */
export function exampleBodyOf(content: HarContent | undefined): {
    body: string;
    binary: boolean;
} {
    if (content === undefined) {
        return { body: '', binary: false };
    }

    const raw = content.text ?? '';
    const text = (DECODERS.get(content.encoding ?? '') ?? asWritten)(raw);

    if (text === undefined || !isTextMime(baseMime(content.mimeType))) {
        return { body: '', binary: true };
    }

    return { body: text, binary: false };
}

/** How a recorded text is read back by the encoding it was stored in; none stored is as written. */
const DECODERS = new Map<string, (raw: string) => string | undefined>([['base64', decoded]]);

function asWritten(raw: string): string {
    return raw;
}

function decoded(base64: string): string | undefined {
    try {
        return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(base64, 'base64'));
    } catch {
        return undefined;
    }
}

/** The mime types whose body is rows, and how each reads them off the recorded request. */
const ROWS = new Map<string, (postData: HarPostData) => InteropBodyField[]>([
    ['multipart/form-data', (postData) => (postData.params ?? []).map(fieldOf)],
    ['application/x-www-form-urlencoded', urlencodedRows],
]);

function fieldsOf(postData: HarPostData, mime: string): InteropBodyField[] | undefined {
    return ROWS.get(mime)?.(postData);
}

function urlencodedRows(postData: HarPostData): InteropBodyField[] {
    if (postData.params !== undefined) {
        return postData.params.map(fieldOf);
    }

    return [...new URLSearchParams(postData.text ?? '')].map(([key, value]) => ({
        key,
        value,
        enabled: true,
        kind: 'text',
    }));
}

function fieldOf(param: HarParam): InteropBodyField {
    const field: InteropBodyField = {
        key: param.name,
        value: param.fileName ?? param.value ?? '',
        enabled: true,
        kind: param.fileName === undefined ? 'text' : 'file',
    };

    return param.contentType === undefined ? field : { ...field, contentType: param.contentType };
}
