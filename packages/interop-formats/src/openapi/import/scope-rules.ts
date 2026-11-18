import type { InteropDocument, InteropScope, InteropServer } from '@mandor/interop-core';

import { workspaceAuthOf } from './workspace-auth.js';

/** What the import leans on above the requests, which only the workspace has. */
type ScopeRules = {
    /** What the url of every request starts with, before its path. */
    base: (document: InteropDocument) => string;
    /** The scheme the requests inherit, by name; without a workspace file each keeps its own. */
    inheritedScheme: (document: InteropDocument) => string | undefined;
};

/** A server address as a person would type it: each `{name}` takes the value the server defaults it to. */
function literalUrlOf(server: InteropServer): string {
    return server.url
        .replace(
            /\{([^{}]+)\}/gu,
            (_match, name: string) => server.variables[name]?.default ?? `{{${name}}}`,
        )
        .replace(/\/+$/u, '');
}

/** The address of the first server the document lists, or none when it names no server. */
function firstServerOf(document: InteropDocument): string {
    const [first] = document.servers;

    return first === undefined ? '' : literalUrlOf(first);
}

/**
 * The workspace has an environment for the servers and a file for the auth, so a request leans on
 * `{{baseUrl}}` and on the scheme the workspace carries. A collection has neither above it: its
 * requests carry the address of the first server and the auth they ask for.
 */
const SCOPE_RULES: Readonly<Record<InteropScope, ScopeRules>> = {
    workspace: {
        base: () => '{{baseUrl}}',
        inheritedScheme: (document) => workspaceAuthOf(document)?.name,
    },
    collection: {
        base: firstServerOf,
        inheritedScheme: () => undefined,
    },
};

/** What an import of this scope leans on above the requests. */
export function scopeRulesOf(scope: InteropScope): ScopeRules {
    return SCOPE_RULES[scope];
}
