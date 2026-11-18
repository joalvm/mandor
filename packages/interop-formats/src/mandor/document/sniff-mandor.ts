import { documentRootOf } from '@mandor/interop-core';

/** Whether the root of a YAML or JSON text says it is an Mandor workspace. */
export function sniffMandor(text: string): boolean {
    return documentRootOf(text)?.['mandor'] === 'workspace';
}
