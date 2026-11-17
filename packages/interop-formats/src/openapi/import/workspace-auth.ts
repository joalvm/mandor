import {
    type Degradation,
    type ImportResource,
    type InteropDocument,
    workspaceFingerprint,
} from '@mandor/interop-core';

import { type AuthMapping, authOfScheme, namedSecurity } from './auth-of-scheme.js';

/** The scheme that speaks for the whole workspace, by the name the document gives it. */
export type WorkspaceAuthChoice = { name: string; mapping: AuthMapping };

/**
 * The first scheme of the security the document asks of everything, else the first it declares:
 * one auth for the workspace, the level every request inherits from.
 */
export function workspaceAuthOf(document: InteropDocument): WorkspaceAuthChoice | undefined {
    const declared = Object.entries(document.security);
    const asked = document.defaultSecurity.map((name) => declared.find(([key]) => key === name));
    const chosen = asked.find((entry) => entry !== undefined) ?? declared[0];

    return chosen === undefined ? undefined : { name: chosen[0], mapping: authOfScheme(chosen[1]) };
}

/**
 * The workspace file as an import writes it: its auth, owned by this document. The fingerprint
 * is over the auth alone, the same keys the workspace is read back with.
 */
export function workspaceResourceOf(document: InteropDocument): ImportResource | undefined {
    const chosen = workspaceAuthOf(document);

    if (chosen === undefined || !('auth' in chosen.mapping)) {
        return undefined;
    }

    const fields = { auth: chosen.mapping.auth };

    return {
        place: 'workspace',
        itemKind: null,
        route: '.',
        name: document.name,
        fields,
        origin: {
            kind: 'openapi',
            sourceId: document.sourceId,
            fingerprint: workspaceFingerprint(fields),
        },
        degradations: [],
    };
}

/** The document says it asks for an auth Mandor cannot hold: the person reads it, once. */
export function workspaceAuthNotesOf(document: InteropDocument): Degradation[] {
    const chosen = workspaceAuthOf(document);

    if (chosen === undefined || !('reason' in chosen.mapping)) {
        return [];
    }

    return [namedSecurity(chosen.name, chosen.mapping.reason)];
}
