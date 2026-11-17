import { fingerprintOf } from '../plan/fingerprint-of.js';

/** Names only: the values of an environment belong to the person who filled them in. */
export function environmentFingerprint(fields: {
    name: string;
    variables: readonly { name: string }[];
}): string {
    return fingerprintOf({
        name: fields.name,
        variables: fields.variables.map((variable) => variable.name),
    });
}
