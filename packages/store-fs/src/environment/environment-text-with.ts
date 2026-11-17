import { type Environment, parseEnvironment } from '@mandor/schema';
import type { Document } from 'yaml';

import { documentTextWith } from '../disk/document-text.js';
import { parsedDocument } from '../disk/parsed-document.js';
import { withoutSecretValues } from './without-secret-values.js';

export type EnvironmentPatch = Partial<Omit<Environment, 'id'>>;

/** The environment a patch makes of the current one, and the text of the file that holds it. */
export type EditedEnvironment = {
    updated: Environment;
    safe: Environment;
    text: string;
};

/**
 * Applies a patch inside the loaded document, so comments, key order and unknown keys survive.
 * The variables go in already emptied of their secret values: the file never holds one, and
 * `updated` is the only place the clear values still are, for whoever keeps them.
 */
export function editEnvironmentDocument(
    document: Document,
    current: Environment,
    changes: EnvironmentPatch,
): EditedEnvironment {
    const updated = parseEnvironment({ ...current, ...changes });
    const safe = withoutSecretValues(updated, current);
    const written =
        changes.variables === undefined ? changes : { ...changes, variables: safe.variables };

    return { updated, safe, text: documentTextWith(document, { ...written }) };
}

/**
 * The text of an environment file once `changes` are in it. A text that is not an environment is
 * a refusal: writing over it would destroy what it says.
 */
export function environmentTextWith(text: string, changes: EnvironmentPatch): string {
    const document = parsedDocument(text);

    return editEnvironmentDocument(document, parseEnvironment(document.toJS()), changes).text;
}
