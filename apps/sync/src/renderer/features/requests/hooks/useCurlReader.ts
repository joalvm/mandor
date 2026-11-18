import type { ErrorCode } from '@mandor/ipc';
import { useMessages } from '@mandor/i18n';
import type { CurlParse } from '@mandor/schema';
import { fireAndForget, useFailureToast } from '@mandor/shell';
import { useToast } from '@mandor/ui';
import { useCallback } from 'react';

import { syncBridge } from '../../../app/sync-bridge.js';

/** A curl command main could read, with what it could not keep. */
type ParsedCurl = CurlParse & { kind: 'parsed' };

/** What main said of the text, or the code that stopped it. */
type Reading = { error: ErrorCode } | { parse: CurlParse };

async function readCurl(text: string): Promise<Reading> {
    try {
        const result = await syncBridge.codegen.fromCurl({ text });

        return result.ok ? { parse: result.value } : { error: result.error.code };
    } catch {
        return { error: 'unknown' };
    }
}

type CurlReader = {
    /** What the command said that the request could not keep, in words, or nothing. */
    noticesOf: (parse: ParsedCurl) => string | undefined;
    /** Asks main to read the text; what stops it is told as a toast and fills nothing. */
    read: (text: string, fill: (parse: ParsedCurl) => void) => void;
};

/**
 * Reads a curl command for whoever fills a request with it: the url of a request, the import.
 * A fault and a command that cannot be read are told here, once for both, in the same words.
 */
export function useCurlReader(): CurlReader {
    const fail = useFailureToast();
    const labels = useMessages('requests');
    const { notify } = useToast();

    const read = useCallback(
        (text: string, fill: (parse: ParsedCurl) => void) => {
            fireAndForget(
                readCurl(text).then((reading) => {
                    if ('error' in reading) {
                        fail(reading.error);

                        return;
                    }

                    if (reading.parse.kind === 'invalid') {
                        notify({
                            title: labels(`curlInvalid.${reading.parse.reason}`, {
                                subject: reading.parse.subject ?? '',
                            }),
                            tone: 'warning',
                        });

                        return;
                    }

                    fill(reading.parse);
                }),
            );
        },
        [fail, labels, notify],
    );

    const noticesOf = useCallback(
        (parse: ParsedCurl) => {
            const detail = parse.notices
                .map((notice) =>
                    labels(`curlNotice.${notice.code}`, { subject: notice.subject ?? '' }),
                )
                .join(' ');

            return detail.length > 0 ? detail : undefined;
        },
        [labels],
    );

    return { noticesOf, read };
}
