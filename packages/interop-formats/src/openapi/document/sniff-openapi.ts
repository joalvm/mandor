import { documentRootOf } from '@mandor/interop-core';

/** Whether the root of a JSON or YAML text names an OpenAPI or a Swagger version. */
export function sniffOpenapi(text: string): boolean {
    const root = documentRootOf(text);

    return root !== null && ('openapi' in root || 'swagger' in root);
}
