import { CURL_TEXT_MAX } from '@mandor/ipc';
import { curlCommandFrom } from '@mandor/schema';

/** Only saves a trip: main reads the text and decides whether it is a command. */
export function looksLikeCurl(text: string): boolean {
    return text.length <= CURL_TEXT_MAX && curlCommandFrom(text) !== null;
}
