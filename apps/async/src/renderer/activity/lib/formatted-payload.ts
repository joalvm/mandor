import { detectedFormat, formattedJsonc, type PayloadFormat } from '@mandor/ui';

/**
 * The payload as it reads. JSON is laid out, because a single line of it is unreadable and the
 * shape is the whole point, and only its whitespace moves: a number too long for a double reads
 * as it was sent. XML and text are left exactly as they came, since re-indenting them would be
 * showing something the other end did not send; bytes are dumped by the editor that shows them.
 */
export function formattedPayload(
    data: string,
    format: PayloadFormat = detectedFormat(data),
): string {
    if (format !== 'json') {
        return data;
    }

    return formattedJsonc(data) ?? data;
}
