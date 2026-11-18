import type { InteropDocument } from '@mandor/interop-core';

/**
 * The security the document asks for: the shape of every scheme under the name it answers to,
 * and — when the workspace has a default — one requirement per scheme of the default. The
 * values never leave: the schemes say what the shape asks for, not who fulfils it.
 */
export function securityOfDocument(ir: InteropDocument): {
    securitySchemes?: Record<string, unknown>;
    security?: unknown;
} {
    const schemes = Object.entries(ir.security);

    if (schemes.length === 0 && ir.defaultSecurity.length === 0) {
        return {};
    }

    return {
        ...(schemes.length === 0
            ? {}
            : {
                  securitySchemes: Object.fromEntries(
                      schemes.map(([name, scheme]) => [
                          name,
                          { type: scheme.type, ...scheme.extras },
                      ]),
                  ),
              }),
        ...(ir.defaultSecurity.length === 0
            ? {}
            : { security: ir.defaultSecurity.map((name) => ({ [name]: [] })) }),
    };
}
