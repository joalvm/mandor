import { documentRootOf } from '@mandor/interop-core';

/** Whether the root of a JSON or YAML text names an AsyncAPI version. */
export function sniffAsyncapi(text: string): boolean {
    const root = documentRootOf(text);

    return root !== null && 'asyncapi' in root;
}
