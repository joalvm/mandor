import type { Dispatcher } from 'undici';

/** The response head as it crossed the wire: raw order, repeated names kept apart. */
export type RawResponseHead = {
    status: number;
    statusText: string;
    headers: [string, string][];
};

type RawHeaders = Dispatcher.DispatchController['rawHeaders'];

/** What the handler reads of the controller undici hands it: the header list as it crossed. */
type HeadController = Pick<Dispatcher.DispatchController, 'rawHeaders'>;

/** HTTP/1.1 hands the head over as the flat `name, value` list that crossed the socket. */
function pairsOfList(raw: readonly (Buffer | string)[]): [string, string][] {
    const pairs: [string, string][] = [];

    for (let index = 0; index + 1 < raw.length; index += 2) {
        pairs.push([String(raw[index]), String(raw[index + 1])]);
    }

    return pairs;
}

/**
 * HTTP/2 hands it over as the record `node:http2` built: names already lowercase, a repeated
 * header (`set-cookie`) as a list of values. Each value becomes a pair, in the record's order.
 */
function pairsOfRecord(raw: object): [string, string][] {
    return Object.entries(raw).flatMap(([name, value]: [string, unknown]) => {
        const values: readonly unknown[] = Array.isArray(value) ? value : [value];

        return values
            .filter((one) => typeof one === 'string')
            .map((one): [string, string] => [name, one]);
    });
}

/**
 * Undici 8 names the headers in `onResponseStart` and hands the values over on the controller,
 * as `rawHeaders`: a flat list over HTTP/1.1, the record `node:http2` built over h2. Read as one
 * of them alone, every h2 answer lost its headers, and with them the `content-encoding` that
 * says how to read its body. An absent head means there is nothing to repeat, so no headers.
 */
function pairsOf(raw: RawHeaders): [string, string][] {
    if (Array.isArray(raw)) {
        return pairsOfList(raw);
    }

    return typeof raw === 'object' && raw !== null ? pairsOfRecord(raw) : [];
}

/** The head of one response, and the error it died with if it never finished. */
export class RawResponseHandler {
    head: RawResponseHead = { status: 0, statusText: '', headers: [] };
    error: Error | undefined;

    onResponseStart(
        controller: HeadController,
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

    onResponseError(_controller: HeadController, error: Error): boolean {
        this.error = error;

        return true;
    }
}
