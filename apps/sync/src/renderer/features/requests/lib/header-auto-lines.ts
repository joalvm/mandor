import {
    bodyContentType,
    SEND_DEFAULT_HEADERS,
    type AuthChainLevel,
    type InheritedHeader,
    type RequestItem,
    type RequestLine,
} from '@mandor/schema';
import { authHeaderLines, effectiveAuth } from '@mandor/vars';

/** Why a row the app lays on the headers is there. */
type HeaderAutoKind = 'auth' | 'contentType' | 'default' | 'wire';

/** One row the app adds to the headers, said before the send: what goes out either way. */
export type HeaderAutoLine = {
    id: string;
    kind: HeaderAutoKind;
    name: string;
    value: string;
    calculated?: boolean | undefined;
    /** The row of the table that takes it over: the written one wins, this one stays home. */
    overriddenBy?: string | undefined;
};

/** The key the user wrote for a header, matched without case: what they typed is what shows. */
function writtenNameOf(headers: readonly RequestLine[], name: string): string | undefined {
    return headers.find((line) => line.enabled && line.key.toLowerCase() === name.toLowerCase())
        ?.key;
}

/**
 * The headers the request carries before the user's own, in the order they leave: the one its
 * effective auth produces — the chain of folders and workspace consulted like the send
 * consults it — the content type its body implies, the four defaults a solid send lays when
 * the user wrote none, and the ones the layer that dials computes: where it dials to, how
 * many bytes the body weighs, and the connection it keeps. Said as computed-on-send when only
 * the send can work the value out. An inherited header that goes out takes a row over the way a
 * written one does; the written one is named first, because it wins.
 */
export function headerAutoLinesOf(
    request: RequestItem,
    chain: readonly AuthChainLevel[],
    inherited: readonly InheritedHeader[] = [],
): HeaderAutoLine[] {
    const lines: HeaderAutoLine[] = [];
    const written = [
        ...request.headers,
        ...inherited.filter((header) => header.overriddenBy === undefined).map(({ line }) => line),
    ];

    const effective = effectiveAuth([request.auth, ...chain.map((level) => level.auth)]);

    for (const header of authHeaderLines(effective.auth)) {
        lines.push({
            calculated: header.calculated,
            id: `auth:${header.name.toLowerCase()}`,
            kind: 'auth',
            name: header.name,
            overriddenBy: writtenNameOf(written, header.name),
            value: header.value ?? '',
        });
    }

    const implied = bodyContentType(request.body);

    if (implied !== null) {
        lines.push({
            id: 'content-type',
            kind: 'contentType',
            name: 'Content-Type',
            overriddenBy: writtenNameOf(written, 'content-type'),
            value: implied,
        });
    }

    for (const [name, value] of SEND_DEFAULT_HEADERS) {
        lines.push({
            id: `default:${name}`,
            kind: 'default',
            name,
            overriddenBy: writtenNameOf(written, name),
            value,
        });
    }

    lines.push({
        id: 'host',
        kind: 'wire',
        name: 'Host',
        calculated: true,
        overriddenBy: writtenNameOf(written, 'host'),
        value: '',
    });

    // A body that carries no bytes weighs nothing: no length said on the wire.
    if (request.body.type !== 'none') {
        lines.push({
            id: 'content-length',
            kind: 'wire',
            name: 'Content-Length',
            calculated: true,
            overriddenBy: writtenNameOf(written, 'content-length'),
            value: '',
        });
    }

    lines.push({
        id: 'connection',
        kind: 'wire',
        name: 'Connection',
        calculated: true,
        overriddenBy: writtenNameOf(written, 'connection'),
        value: '',
    });

    return lines;
}
