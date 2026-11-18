import { createHash, createHmac } from 'node:crypto';

import type { SyncAwsAuth, SyncRequest } from '../request/sync-request.js';
import { canonicalPath, canonicalQuery } from './aws-canonical.js';
import { awsScopeOf } from './aws-scope.js';

type Header = readonly [string, string];

const ALGORITHM = 'AWS4-HMAC-SHA256';

/**
 * What the signature leaves out: the headers a proxy, the jar or the transport itself may add or
 * change after the signing, as the AWS SDKs leave them out.
 */
const UNSIGNED = new Set([
    'authorization',
    'cookie',
    'connection',
    'expect',
    'keep-alive',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
    'user-agent',
    'x-amzn-trace-id',
]);

function sha256(data: string | Uint8Array): string {
    return createHash('sha256').update(data).digest('hex');
}

function hmac(key: string | Buffer, data: string): Buffer {
    return createHmac('sha256', key).update(data).digest();
}

/** `20150830T123600Z`: the time of the signature as AWS writes it, in UTC to the second. */
function amzDateOf(now: Date): string {
    return now.toISOString().replace(/[-:]|\.\d{3}/g, '');
}

function writtenOf(headers: readonly Header[], name: string): string | undefined {
    return headers.find(([key]) => key.toLowerCase() === name)?.[1];
}

/** The headers the signature covers, by lower-case name: values trimmed, spaces collapsed. */
function canonicalHeaders(host: string, headers: readonly Header[]): Map<string, string> {
    const signed = new Map<string, string>([['host', host]]);

    for (const [name, value] of headers) {
        const key = name.toLowerCase();

        if (UNSIGNED.has(key)) {
            continue;
        }

        const clean = value.trim().replace(/\s+/g, ' ');
        const before = signed.get(key);

        signed.set(key, before === undefined ? clean : `${before},${clean}`);
    }

    return new Map([...signed].sort(([a], [b]) => (a < b ? -1 : 1)));
}

/** The key derived from the secret, one HMAC per part of the scope, signs the string to sign. */
function signatureOf(secretAccessKey: string, scope: string, toSign: string): string {
    const key = scope
        .split('/')
        .reduce<string | Buffer>(
            (previous, part) => hmac(previous, part),
            `AWS4${secretAccessKey}`,
        );

    return createHmac('sha256', key).update(toSign).digest('hex');
}

/**
 * The request with the headers of an AWS Signature Version 4 on it: the time, the session
 * token of temporary keys, the payload hash S3 reads, and the `Authorization` that signs them
 * with the rest of the headers, the url and the body. A payload hash written by hand is signed
 * as it is, `UNSIGNED-PAYLOAD` included.
 */
export function signAwsV4(
    request: SyncRequest,
    auth: Omit<SyncAwsAuth, 'scheme'>,
    now: Date,
): SyncRequest {
    const url = new URL(request.url);
    const { region, service } = awsScopeOf(url.hostname, auth.region, auth.service);
    const amzDate = amzDateOf(now);
    const day = amzDate.slice(0, 8);
    const writtenHash = writtenOf(request.headers, 'x-amz-content-sha256');
    const payloadHash = writtenHash ?? sha256(request.body ?? new Uint8Array());
    const added: Header[] = [['X-Amz-Date', amzDate]];

    if (auth.sessionToken !== undefined && auth.sessionToken !== '') {
        added.push(['X-Amz-Security-Token', auth.sessionToken]);
    }

    if (service === 's3' && writtenHash === undefined) {
        added.push(['X-Amz-Content-Sha256', payloadHash]);
    }

    const headers = [...request.headers, ...added];
    const canonical = canonicalHeaders(url.host, headers);
    const signedNames = [...canonical.keys()].join(';');
    const canonicalRequest = [
        request.method,
        canonicalPath(url.pathname, service),
        canonicalQuery(url.searchParams),
        [...canonical].map(([name, value]) => `${name}:${value}\n`).join(''),
        signedNames,
        payloadHash,
    ].join('\n');
    const scope = `${day}/${region}/${service}/aws4_request`;
    const toSign = [ALGORITHM, amzDate, scope, sha256(canonicalRequest)].join('\n');
    const signature = signatureOf(auth.secretAccessKey, scope, toSign);
    const authorization = `${ALGORITHM} Credential=${auth.accessKeyId}/${scope}, SignedHeaders=${signedNames}, Signature=${signature}`;

    return { ...request, headers: [...headers, ['Authorization', authorization]] };
}
