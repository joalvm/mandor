import { concreteAuthSchema, type ConcreteAuth } from '@mandor/schema';

import { degradation, type Degradation, type DegradationCode } from '../resource/degradation.js';

/**
 * What carries the auth: a request, a folder or a collection whose requests inherit it, or the
 * workspace.
 */
export type AuthSubject = 'request' | 'folder' | 'collection' | 'workspace';

/** The auth Mandor holds for what a document says, and what was given up on the way. */
export type AuthResult = { auth: ConcreteAuth | undefined; degradations: Degradation[] };

/** What a scheme became before the schema of Mandor has had its say. */
export type AuthDraft = { auth: Record<string, unknown>; degradations: Degradation[] };

/**
 * What a level that enters with no auth says of itself, by who it is: the loss when the scheme has
 * no equivalent, the loss when the schema refuses it, and whether it says `none` or has no auth at
 * all. A request, a folder or a collection says `none` so it does not inherit an auth it was never
 * meant to send; the workspace has none.
 */
const SUBJECTS: Record<
    AuthSubject,
    { noEquivalent: DegradationCode; refused: DegradationCode; none: boolean }
> = {
    request: {
        noEquivalent: 'authNoEquivalentRequest',
        refused: 'authRefusedRequest',
        none: true,
    },
    folder: { noEquivalent: 'authNoEquivalentFolder', refused: 'authRefusedFolder', none: true },
    collection: {
        noEquivalent: 'authNoEquivalentCollection',
        refused: 'authRefusedCollection',
        none: true,
    },
    workspace: {
        noEquivalent: 'authNoEquivalentWorkspace',
        refused: 'authRefusedWorkspace',
        none: false,
    },
};

const LOOPBACK = /^http:\/\/(?:127\.0\.0\.1|localhost):(\d+)(?:[/?#]|$)/;

/** The level enters with no auth, and says why. */
function authWithout(type: string, code: DegradationCode, subject: AuthSubject): AuthResult {
    return {
        auth: SUBJECTS[subject].none ? { type: 'none' } : undefined,
        degradations: [degradation(code, { type })],
    };
}

/**
 * A draft made into the auth of Mandor, or the reason it cannot be one. No draft means the
 * scheme has no equivalent; a draft the schema refuses says so.
 */
export function checkedAuth(
    draft: AuthDraft | undefined,
    type: string,
    subject: AuthSubject,
): AuthResult {
    if (draft === undefined) {
        return authWithout(type, SUBJECTS[subject].noEquivalent, subject);
    }

    const checked = concreteAuthSchema.safeParse(draft.auth);

    if (!checked.success) {
        return authWithout(type, SUBJECTS[subject].refused, subject);
    }

    return { auth: checked.data, degradations: draft.degradations };
}

/** The field to spread into a scheme, or none when the document left it empty. */
export function optionalField(key: string, text: string): Record<string, string> {
    return text === '' ? {} : { [key]: text };
}

/**
 * The loopback port Mandor can pin; any other address is said not to be used. `noun` is the
 * word the document's format has for the address, so the note reads in its own terms.
 */
export function loopbackPortOf(
    address: string,
    notes: Degradation[],
    noun: 'URI' | 'URL',
): number | undefined {
    const port = Number(LOOPBACK.exec(address)?.[1]);

    if (port >= 1024 && port <= 65535) {
        return port;
    }

    if (address !== '') {
        notes.push(degradation('redirectNotUsed', { noun, address }));
    }

    return undefined;
}
