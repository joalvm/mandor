import { FORMAT_BYTES } from '@mandor/ipc';
import type { MessagePayloadType } from '@mandor/schema';
import { detectedFormat, languageOfFormat, type EditorLanguage } from '@mandor/ui';

/**
 * The language a draft that declares nothing reads as; bytes are read-only, so not those. A draft
 * past the size a frame is laid out at is not read: it is read again on every key, and parsing
 * megabytes per key lagged the typing.
 */
function typedLanguage(payload: string): EditorLanguage {
    if (payload.length > FORMAT_BYTES) {
        return 'plaintext';
    }

    const language = languageOfFormat(detectedFormat(payload));

    if (language === 'binary') {
        return 'plaintext';
    }

    return language;
}

const LANGUAGE_OF_TYPE: Readonly<Record<MessagePayloadType, (payload: string) => EditorLanguage>> =
    {
        binary: () => 'plaintext',
        json: () => 'jsonc',
        text: typedLanguage,
    };

/**
 * What the editor highlights while a payload is written. A declared type is a decision and is
 * obeyed; `text` declares nothing, so the payload itself is read and a draft that is XML is
 * written as XML. A draft is never shown as bytes, whatever it will be sent as: a hex view is
 * read-only, and the person is here to type.
 */
export function payloadLanguage(payloadType: MessagePayloadType, payload: string): EditorLanguage {
    return LANGUAGE_OF_TYPE[payloadType](payload);
}
