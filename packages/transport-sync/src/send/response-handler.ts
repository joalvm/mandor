import type { Dispatcher } from 'undici';

/** The response head as it crossed the wire: raw order, repeated names kept apart. */
export type RawResponseHead = {
    status: number;
    statusText: string;
    headers: [string, string][];
};

type RawHeaders = Dispatcher.DispatchController['rawHeaders'];

/**
 * Undici 8 names the headers in `onResponseStart` and hands the values over on the controller:
 * `rawHeaders` is the flat `name, value` list as it crossed the socket. The handler flattens it
 * into pairs; an absent list means there is nothing to repeat, so no headers.
 */
function pairsOf(raw: RawHeaders): [string, string][] {
    if (!Array.isArray(raw)) {
        return [];
    }

    const pairs: [string, string][] = [];

    for (let index = 0; index + 1 < raw.length; index += 2) {
        pairs.push([String(raw[index]), String(raw[index + 1])]);
    }

    return pairs;
}

/** The head of one response, and the error it died with if it never finished. */
export class RawResponseHandler {
    head: RawResponseHead = { status: 0, statusText: '', headers: [] };
    error: Error | undefined;

    onResponseStart(
        controller: Dispatcher.DispatchController,
        status: number,
        _names: unknown,
        statusMessage?: string,
    ): boolean {
        this.head = {
            status,
            statusText: statusMessage ?? '',
            headers: pairsOf(controller.rawHeaders),
        };

        return true;
    }

    onResponseEnd(): boolean {
        return true;
    }

    onResponseError(_controller: Dispatcher.DispatchController, error: Error): boolean {
        this.error = error;

        return true;
    }
}
