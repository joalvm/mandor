import { fingerprintOf } from '../plan/fingerprint-of.js';

/**
 * What a re-import compares in `workspace.yaml`: the auth an import wrote there, the only thing
 * it writes in the file. Variables stay out: the import merges them without overwriting, so
 * touching one by hand is no conflict.
 */
export function workspaceFingerprint(fields: { auth?: unknown }): string {
    return fingerprintOf({ auth: fields.auth });
}
