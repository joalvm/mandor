/**
 * What tells one secret from every other one. Four parts because each of them repeats on its
 * own: two workspaces with an environment `prod` each, and a `TOKEN` in each, are two secrets
 * and not one. «Repo» is the word of the code for what the interface calls the origin.
 */
export type SecretParts = {
    repo: string;
    workspace: string;
    environment: string;
    name: string;
};

/** Not part of any encoded part, which is what keeps the four of them apart. */
const SEPARATOR = '/';

/**
 * The opaque key a secret is stored under. Pure on purpose: the derivation is the same on
 * every machine and can be read without an Electron process around it.
 *
 * Each part is encoded before joining. Without that, a workspace named `payments/prod` writes
 * the key of the environment `prod` of the workspace `payments`, which is another user's
 * secret sitting in the same store.
 */
export function secretKey(parts: SecretParts): string {
    return [parts.repo, parts.workspace, parts.environment, parts.name]
        .map((part) => encodeURIComponent(part))
        .join(SEPARATOR);
}

/**
 * The key of a global of an origin: the place of an environment with no workspace and no
 * environment. No id is empty, so it never meets the key of a variable of an environment.
 */
export function globalsSecretKey(repo: string, name: string): string {
    return secretKey({ repo, workspace: '', environment: '', name });
}
