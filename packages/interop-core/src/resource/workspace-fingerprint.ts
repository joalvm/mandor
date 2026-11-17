import { fingerprintOf } from '../plan/fingerprint-of.js';

/**
 * What a re-import compares in `workspace.yaml`: the auth and the scripts an import wrote there.
 * Variables stay out: the import merges them without overwriting, so touching one by hand is no
 * conflict.
 */
export function workspaceFingerprint(fields: {
    auth?: unknown;
    importedScripts?: readonly unknown[] | undefined;
}): string {
    const scripts = fields.importedScripts;

    return fingerprintOf({
        auth: fields.auth,
        importedScripts: scripts !== undefined && scripts.length > 0 ? scripts : undefined,
    });
}
