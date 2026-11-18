import { documentRootOf, ImportOtherAppError } from '@mandor/interop-core';
import {
    FormatVersionError,
    BUNDLE_FORMAT,
    workspaceBundleSchema,
    type WorkspaceBundle,
    type WorkspaceKind,
} from '@mandor/schema';

import { MandorParseError } from './mandor-parse-error.js';

const NOT_A_WORKSPACE = 'This is not an Mandor workspace file';

/**
 * The text of a workspace bundle, read and checked whole. Every version up to the one this build
 * writes is read; a newer one, or one that never existed, is refused and named. A bundle of
 * the other app is refused too, since its items would have no tab here.
 */
export function parseMandorDocument(text: string, app: WorkspaceKind): WorkspaceBundle {
    const root = documentRootOf(text);

    if (root?.['mandor'] !== 'workspace') {
        throw new MandorParseError([NOT_A_WORKSPACE]);
    }

    const version = root['formatVersion'];

    if (typeof version === 'number' && !readable(version)) {
        throw new FormatVersionError(version, BUNDLE_FORMAT);
    }

    const parsed = workspaceBundleSchema.safeParse(root);

    if (!parsed.success) {
        throw new MandorParseError(
            parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
        );
    }

    if (parsed.data.app !== app) {
        throw new ImportOtherAppError(parsed.data.app, app);
    }

    return parsed.data;
}

/** A version this build reads: from the first one up to the one it writes. */
function readable(version: number): boolean {
    return Number.isInteger(version) && version >= 1 && version <= BUNDLE_FORMAT;
}
