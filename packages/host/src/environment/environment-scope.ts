import {
    effectiveEnvironment,
    type Environment,
    type FolderChainLevel,
    type Workspace,
} from '@mandor/schema';
import { readEnvironment, readFolderChain, readGlobals, readWorkspace } from '@mandor/store-fs';
import {
    chainValues,
    composeScope,
    computeDynamicValues,
    globalsSecretKey,
    type VariableScope,
} from '@mandor/vars';

import type { ReadSecretValue } from '../secret/read-secret-value.js';
import { rememberSessionSecrets } from '../secret/session-secrets.js';
import { environmentSecretValues, secretValuesAt } from './environment-secret-values.js';

/** Where the work lives, which origin it belongs to, and how a kept value is asked for. */
export type EnvironmentPlace = {
    root: string;
    repo: string;
    readSecret: ReadSecretValue;
};

/**
 * An environment as a resolution needs it: the file, its plain values and its kept ones; the
 * enabled variables of the workspace, the level below the environment; and the chain of the
 * item, read once, from which the variables of its folders and the auth of the send both come.
 */
export type EnvironmentScope = {
    environment: Environment | null;
    values: Record<string, string>;
    secrets: Record<string, string>;
    /** The globals of the origin: plain values from the file, secret ones from this machine. */
    globals: { values: Record<string, string>; secrets: Record<string, string> };
    chain: FolderChainLevel[];
};

/**
 * Reads an environment and everything a template may need from it. Every border that resolves
 * —opening a socket, sending a frame, sending a request— goes through here, so the values of an environment are
 * gathered in one place and the two never drift into resolving against different things.
 */
export async function environmentScope(
    place: EnvironmentPlace,
    workspaceId: string,
    environmentId: string | null,
    /** The folder the item hangs from; null when what resolves lives in no folder. */
    parentPath: string | null,
): Promise<EnvironmentScope> {
    const workspace = await workspaceOf(place.root, workspaceId);
    // Nobody chose one: the default of the workspace rules, as it does in the window.
    const effective = effectiveEnvironment(environmentId, workspace);
    const environment = await environmentOf(place.root, workspaceId, effective);
    const secrets = await secretsOf(place, workspaceId, effective, environment);

    const globals = await globalsOf(place);

    // As soon as the values are known, before anything can refuse and write down why: an
    // error message about this resolution is already a border out of the process.
    rememberSessionSecrets([...Object.values(secrets), ...Object.values(globals.secrets)]);

    return {
        environment,
        values: valuesOf(environment),
        secrets,
        globals,
        chain: await readFolderChain(place.root, workspaceId, parentPath),
    };
}

/**
 * The levels a template resolves against: the folders of the item, the environment with the
 * values this machine keeps for it, the collection, the globals of the origin and the dynamic
 * values, in the order `composeScope` alone knows. The kept names are marked secret, so what a
 * template builds from them — through a folder's value too — is hidden wherever it is shown.
 * What scripts set goes on top of everything, when the caller has it.
 */
export function variableScopeOf(
    scope: EnvironmentScope,
    script?: Readonly<Record<string, string>>,
): VariableScope {
    return composeScope({
        ...(script === undefined ? {} : { script }),
        chain: chainValues(scope.chain),
        dynamic: computeDynamicValues(),
        environment: { ...scope.values, ...scope.secrets },
        secret: Object.keys(scope.secrets),
        globals: { ...scope.globals.values, ...scope.globals.secrets },
        globalsSecret: Object.keys(scope.globals.secrets),
    });
}

/** What the globals give a url, the secret values included: the level below the environment. */
export function globalValuesOf(scope: EnvironmentScope): Record<string, string> {
    return { ...scope.globals.values, ...scope.globals.secrets };
}

async function environmentOf(
    root: string,
    workspaceId: string,
    environmentId: string | null,
): Promise<Environment | null> {
    if (environmentId === null) {
        return null;
    }

    return readEnvironment(root, workspaceId, environmentId);
}

async function secretsOf(
    place: EnvironmentPlace,
    workspaceId: string,
    environmentId: string | null,
    environment: Environment | null,
): Promise<Record<string, string>> {
    if (environment === null || environmentId === null) {
        return {};
    }

    return environmentSecretValues(
        place.readSecret,
        { repo: place.repo, workspaceId, environmentId },
        environment,
    );
}

/**
 * The values the file of the environment carries, which are never the secret ones: what the
 * file holds for a name declared secret is an empty string, and an empty string sent as a
 * credential is a broken request nobody was warned about. A secret this machine keeps no value
 * for stays undefined, so its placeholder survives and the resolution reports it missing.
 */
function valuesOf(environment: Environment | null): Record<string, string> {
    if (environment === null) {
        return {};
    }

    return Object.fromEntries(
        environment.variables
            .filter((variable) => variable.enabled && !variable.secret)
            .map((variable) => [variable.name, variable.value]),
    );
}

/** The workspace file, or nothing when it does not load: it resolves as one that says nothing. */
async function workspaceOf(root: string, workspaceId: string): Promise<Workspace | null> {
    const read = await readWorkspace(root, workspaceId);

    return read.ok ? read.value : null;
}

/** The globals of the origin as a resolution reads them; an unreadable file resolves nothing. */
async function globalsOf(place: EnvironmentPlace): Promise<EnvironmentScope['globals']> {
    const globals = await readGlobals(place.root).catch(() => ({ variables: [] }));
    const values = Object.fromEntries(
        globals.variables
            .filter((variable) => variable.enabled && !variable.secret)
            .map((variable) => [variable.name, variable.value]),
    );
    const secrets = await secretValuesAt(
        place.readSecret,
        (name) => globalsSecretKey(place.repo, name),
        globals.variables,
    );

    return { values, secrets };
}
