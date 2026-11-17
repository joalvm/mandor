import type { Environment } from '@mandor/schema';

import { composeScope } from './compose-scope.js';
import { resolveText } from './resolve-text.js';
import { scanTemplate } from './scan-template.js';
import { UnsafeAuthorityError } from './unsafe-authority-error.js';

const AUTHORITY_END = /[/?#]/u;
const MOVES_AUTHORITY = /[/@?#]/u;

/** The levels around the environment that a name of the authority can resolve from. */
type AuthorityLevels = {
    /** What resolves below the environment: the globals of the origin. */
    below?: Readonly<Record<string, string>>;
    /** What scripts set: it resolves above everything. */
    script?: Readonly<Record<string, string>>;
};

/**
 * Refuses a template whose authority holds a variable that could move it. The check runs on
 * the template and the values, before the resolved URL exists: afterwards `a@evil.test` is just
 * a host. A template with no `://` has no authority to protect — a leading `{{baseUrl}}` is
 * allowed to be a whole origin — and is let through.
 *
 * `secrets` shadows the file: the environment keeps an empty string for a secret variable, and
 * the value that gets substituted is the one the keyring holds. The variables of the workspace
 * are the level below the environment: a name the environment declares is read from it, because
 * that is the value that resolves. A value can hold placeholders of its own, so what is measured
 * is the value once it resolves, the same way the request will. A value a script set wins over all
 * of them, as it does when the request resolves.
 */
export function assertSafeAuthority(
    template: string,
    environment: Environment | null,
    secrets: Record<string, string>,
    levels: AuthorityLevels = {},
): void {
    const separator = template.indexOf('://');

    if (separator === -1) {
        return;
    }

    const scope = composeScope({ environment: valuesOf(environment, secrets, levels) });
    const unsafe = [...authorityNames(template, separator + 3)].find((name) =>
        MOVES_AUTHORITY.test(resolveText(`{{${name}}}`, scope).text),
    );

    if (unsafe !== undefined) {
        throw new UnsafeAuthorityError(unsafe);
    }
}

/** The value each name resolves to, weakest level first so the strongest is the one kept. */
function valuesOf(
    environment: Environment | null,
    secrets: Record<string, string>,
    levels: AuthorityLevels,
): Record<string, string> {
    const values = new Map(Object.entries(levels.below ?? {}));

    for (const variable of environment?.variables ?? []) {
        values.set(variable.name, secrets[variable.name] ?? variable.value);
    }

    for (const [name, value] of Object.entries(levels.script ?? {})) {
        values.set(name, value);
    }

    return Object.fromEntries(values);
}

/** The names of the variables written between the `://` and the first `/`, `?` or `#`. */
function authorityNames(template: string, start: number): Set<string> {
    const marker = template.slice(start).search(AUTHORITY_END);
    const end = marker === -1 ? template.length : start + marker;
    const names = new Set<string>();

    for (const segment of scanTemplate(template)) {
        if (segment.kind === 'variable' && segment.index >= start && segment.index < end) {
            names.add(segment.name);
        }
    }

    return names;
}
