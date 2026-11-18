import type { QuickJSSyncVariant } from 'quickjs-emscripten-core';

export type VariantExport = QuickJSSyncVariant | { default: QuickJSSyncVariant };

/**
 * The CommonJS build of the variant reaches an ES import as `{ default: variant }` in some loaders
 * and as the variant itself in others. Whoever wraps the variant (the memory of the instance) must
 * hold the variant, not the object around it, or its options are dropped without a word.
 */
export function unwrapVariant(exported: VariantExport): QuickJSSyncVariant {
    return 'default' in exported ? exported.default : exported;
}
