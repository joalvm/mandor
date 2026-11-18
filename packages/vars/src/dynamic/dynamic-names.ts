/**
 * The names the three built-in dynamic variables answer to, exactly as text may reference
 * them. The display layer reads it to paint a reference the scope cannot declare; the
 * engine never consults it, it computes the values instead.
 */
export const DYNAMIC_NAMES = ['$uuid', '$timestamp', '$randomInt'] as const;
