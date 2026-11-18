import { degradation, type Degradation } from '../resource/degradation.js';
import { bodyFilePathSchema, type RequestBody } from '@mandor/schema';

import type { BodyMapping, FormRow } from './form-body-of.js';

const NONE: RequestBody = { type: 'none' };

/** The name of a file, wherever the document kept it; empty when Mandor cannot name it in the repo. */
export function fileNameOf(source: string): string {
    const name = source.replace(/^.*[\\/]/su, '');

    return bodyFilePathSchema.safeParse(name).success ? name : '';
}

function copyAdvice(name: string): Degradation {
    return degradation('fileToCopy', { name });
}

/**
 * The row of a form that sends a file. A file is named by its file name alone, since the body
 * reads files from the repo root: the row says the file has to be copied there, or leaves the
 * form when the document named no file Mandor can keep. `kept` is what the row already gave up.
 */
export function fileRowOf(
    row: { key: string; source: string; enabled: boolean },
    kept: readonly Degradation[],
): FormRow {
    const name = fileNameOf(row.source);

    if (name === '') {
        return {
            degradations: [...kept, degradation('fileFieldWithoutFile', { key: row.key })],
        };
    }

    return {
        field: { key: row.key, value: name, enabled: row.enabled, kind: 'file' },
        degradations: [...kept, degradation('fileFieldToCopy', { name, key: row.key })],
    };
}

/** A body that sends one file, by the name alone; with no file the request enters with no body. */
export function binaryBodyOf(source: string): BodyMapping {
    const name = fileNameOf(source);

    if (name === '') {
        return {
            body: NONE,
            degradations: [degradation('fileBodyWithoutFile')],
        };
    }

    return { body: { type: 'binary', file: name }, degradations: [copyAdvice(name)] };
}
