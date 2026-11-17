import { createHash } from 'node:crypto';

import type { DigestChallenge } from './digest-challenge.js';

/** What the answer is worked out from: the request, the pair, and the nonce of the client. */
export type DigestAsked = {
    method: string;
    /** The path and query of the request, as the request line carries them. */
    uri: string;
    body: Uint8Array | undefined;
    username: string;
    password: string;
    cnonce: string;
};

type Hash = (data: string | Uint8Array) => string;

/** The hashes RFC 7616 names, by the name of the algorithm without its `-sess`. */
const HASH_OF_ALGORITHM: Partial<Record<string, string>> = {
    MD5: 'md5',
    'SHA-256': 'sha256',
    'SHA-512-256': 'sha512-256',
};

/** The protection the answer asks for, the plainest first: `auth-int` hashes the body too. */
const QOP_PREFERENCE = ['auth', 'auth-int'];

/** Each challenge is answered once: the count of the nonce is always the first. */
const NONCE_COUNT = '00000001';

function quoted(text: string): string {
    return `"${text.replace(/["\\]/g, '\\$&')}"`;
}

/** What the challenge decides of the answer: its realm and nonce, the protection, the session. */
type Answer = { realm: string; nonce: string; qop: string | undefined; session: boolean };

function answerOf(challenge: DigestChallenge, named: string): Answer {
    const offered = (challenge['qop'] ?? '').split(',').map((word) => word.trim());

    return {
        realm: challenge['realm'] ?? '',
        nonce: challenge['nonce'] ?? '',
        qop: QOP_PREFERENCE.find((qop) => offered.includes(qop)),
        session: named.endsWith('-SESS'),
    };
}

function responseOf(hash: Hash, asked: DigestAsked, answer: Answer): string {
    const { realm, nonce, qop } = answer;
    const userKey = hash(`${asked.username}:${realm}:${asked.password}`);
    const key = answer.session ? hash(`${userKey}:${nonce}:${asked.cnonce}`) : userKey;
    const target = `${asked.method}:${asked.uri}`;
    const integrity = qop === 'auth-int';
    const part = hash(integrity ? `${target}:${hash(asked.body ?? new Uint8Array())}` : target);

    return qop === undefined
        ? hash(`${key}:${nonce}:${part}`)
        : hash(`${key}:${nonce}:${NONCE_COUNT}:${asked.cnonce}:${qop}:${part}`);
}

/** The parameters of the header, in the order RFC 7616 writes them in its examples. */
function fieldsOf(
    asked: DigestAsked,
    challenge: DigestChallenge,
    answer: Answer,
    response: string,
): string[] {
    const { algorithm, opaque } = challenge;
    const { qop } = answer;

    return [
        `username=${quoted(asked.username)}`,
        `realm=${quoted(answer.realm)}`,
        `nonce=${quoted(answer.nonce)}`,
        `uri=${quoted(asked.uri)}`,
        ...(algorithm === undefined ? [] : [`algorithm=${algorithm}`]),
        `response=${quoted(response)}`,
        ...(qop === undefined
            ? []
            : [`qop=${qop}`, `nc=${NONCE_COUNT}`, `cnonce=${quoted(asked.cnonce)}`]),
        ...(opaque === undefined ? [] : [`opaque=${quoted(opaque)}`]),
    ];
}

/**
 * The `Authorization` that answers a Digest challenge, as RFC 7616 works it out — and RFC 2069
 * when the server offers no `qop`. MD5, SHA-256 and SHA-512-256 are known, each with its `-sess`
 * form; an algorithm outside them gets no answer, and the 401 stays as it came.
 */
export function digestAuthorization(
    asked: DigestAsked,
    challenge: DigestChallenge,
): string | undefined {
    const named = (challenge['algorithm'] ?? 'MD5').toUpperCase();
    const hashName = HASH_OF_ALGORITHM[named.replace(/-SESS$/, '')];

    if (hashName === undefined) {
        return undefined;
    }

    const hash: Hash = (data) => createHash(hashName).update(data).digest('hex');
    const answer = answerOf(challenge, named);
    const response = responseOf(hash, asked, answer);

    return `Digest ${fieldsOf(asked, challenge, answer, response).join(', ')}`;
}
